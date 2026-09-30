import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Layers, 
  Filter, 
  Users, 
  Clock, 
  HeartHandshake, 
  ShieldAlert, 
  Building2, 
  CheckCircle, 
  Phone,
  RefreshCw,
  Info,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Bus,
  X
} from 'lucide-react';
import { requestsApi, resourcesApi } from '../services/api';
import socketService from '../services/socket';
import { RequestItem, Resource, UrgencyLevel } from '../types';
import { useLanguage } from '../i18n';
import { MobilityLayerModal } from '../components/MobilityLayerModal';


// Haversine distance calculator
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Distinctive pulsating "You are here" marker
const createUserLocationMarker = (label: string) => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(6, 182, 212, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(16, 185, 129, 0.3);"></span>
        <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #06B6D4, #10B981); border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: #FFFFFF;"></div>
        </div>
        <div style="position: absolute; top: -24px; white-space: nowrap; padding: 2px 7px; border-radius: 9999px; background: #17231E; color: #FFFFFF; font-weight: 800; font-size: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2);">
          ${label} 📍
        </div>
      </div>
    `,
    className: 'custom-user-location-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Custom colored leaflet marker creator matching charity design
const createMarkerIcon = (color: string, label: string = '', isResource: boolean = false) => {
  const iconHtml = isResource ? `
    <div style="
      background-color: #159B5B;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 2px solid white;
      box-shadow: 0 4px 8px rgba(23,35,30,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 15px;
    ">
      🏛️
    </div>
  ` : `
    <div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 4px 8px rgba(23,35,30,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 11px;
    ">
      ${label}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-map-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

const getUrgencyColor = (level: UrgencyLevel) => {
  switch (level) {
    case 'CRITICAL': return '#ef4444'; // Red
    case 'HIGH': return '#F2A33A';     // Warm Orange
    case 'MEDIUM': return '#eab308';   // Yellow
    case 'LOW': return '#159B5B';      // Charity Green
    default: return '#64748b';
  }
};

// Map controller to center view when selection changes
const MapCenterer: React.FC<{ coords: [number, number] | null }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 14, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
};

export const LiveMap: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [showResources, setShowResources] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [flyCoords, setFlyCoords] = useState<[number, number] | null>(null);

  // User Current Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'unavailable'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  
  // Mobile responsive view state
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  // Mobility Layer state (Phase 3)
  const [isMobilityModalOpen, setIsMobilityModalOpen] = useState(false);
  const [selectedMobilityResource, setSelectedMobilityResource] = useState<{ id?: number; name?: string; address?: string } | null>(null);


  const defaultCenter: [number, number] = [11.0168, 76.9558]; // Coimbatore center

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqData, resData] = await Promise.all([
        requestsApi.getAll(),
        resourcesApi.getAll()
      ]);
      setRequests(reqData);
      setResources(resData);
    } catch (err) {
      console.error('Error loading map data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket.IO real-time map synchronization
    const handleNewReq = (data: { request: RequestItem }) => {
      setRequests((prev) => [data.request, ...prev]);
    };

    const handleStatusUpdate = (update: { request_id: number; new_status: any }) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === update.request_id ? { ...r, status: update.new_status } : r))
      );
    };

    socketService.on('new_request', handleNewReq);
    socketService.on('request_status_updated', handleStatusUpdate);

    return () => {
      socketService.off('new_request', handleNewReq);
      socketService.off('request_status_updated', handleStatusUpdate);
    };
  }, []);

  // Handle "Use My Current Location" workflow
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setLocationError(t('location.unavailableDesc'));
      return;
    }

    setLocationStatus('locating');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setLocationStatus('success');
        setFlyCoords([lat, lng]);

        try {
          const resData = await resourcesApi.getAll({
            category: categoryFilter === 'ALL' ? undefined : categoryFilter,
            lat,
            lon: lng,
            radius: radiusKm
          });
          if (resData && resData.length > 0) {
            setResources(resData);
          } else {
            setResources((prev) =>
              prev.map(r => ({
                ...r,
                distance_km: calculateDistanceKm(lat, lng, r.latitude, r.longitude)
              })).sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
            );
          }
        } catch (e) {
          setResources((prev) =>
            prev.map(r => ({
              ...r,
              distance_km: calculateDistanceKm(lat, lng, r.latitude, r.longitude)
            })).sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
          );
        }

        // Also calculate distance for requests
        setRequests((prev) =>
          prev.map(req => ({
            ...req,
            distance_km: calculateDistanceKm(lat, lng, req.latitude, req.longitude)
          }))
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationError(t('location.deniedDesc'));
        } else {
          setLocationStatus('unavailable');
          setLocationError(t('location.unavailableDesc'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Automatic Get Directions from User Current Location
  const handleGetDirections = (destLat: number, destLng: number) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destLat},${destLng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (navigator.geolocation) {
      setLocationStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          setLocationStatus('success');
          setFlyCoords([lat, lng]);
          const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${destLat},${destLng}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        () => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRadiusChange = async (newRadius: number) => {
    setRadiusKm(newRadius);
    if (userLocation) {
      try {
        const resData = await resourcesApi.getAll({
          category: categoryFilter === 'ALL' ? undefined : categoryFilter,
          lat: userLocation.lat,
          lon: userLocation.lng,
          radius: newRadius
        });
        if (resData) setResources(resData);
      } catch (e) {
        // keep client side
      }
    }
  };

  // Listen for Navbar "Near Me" event
  useEffect(() => {
    const onReqLoc = () => {
      handleUseCurrentLocation();
    };
    window.addEventListener('request-user-location', onReqLoc);
    return () => window.removeEventListener('request-user-location', onReqLoc);
  }, [categoryFilter, radiusKm]);

  // Handle URL query parameters (?category=food, ?nearMe=true, ?id=1)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setCategoryFilter(cat.toUpperCase());
    }
    const nearMe = searchParams.get('nearMe');
    if (nearMe === 'true') {
      handleUseCurrentLocation();
    }
  }, [searchParams]);

  useEffect(() => {
    const resId = searchParams.get('id');
    if (resId && resources.length > 0) {
      const match = resources.find(r => r.id === parseInt(resId, 10));
      if (match) {
        setSelectedResource(match);
        setSelectedRequest(null);
        setFlyCoords([match.latitude, match.longitude]);
      }
    }
  }, [searchParams, resources]);

  // Filter and sort requests (by distance when userLocation is present)
  const filteredRequests = requests
    .filter((r) => {
      if (categoryFilter !== 'ALL' && r.dnn_category !== categoryFilter && r.category !== categoryFilter) return false;
      if (urgencyFilter !== 'ALL' && r.urgency_level !== urgencyFilter) return false;
      return true;
    })
    .map((r) => {
      if (userLocation && (r as any).distance_km === undefined) {
        return {
          ...r,
          distance_km: calculateDistanceKm(userLocation.lat, userLocation.lng, r.latitude, r.longitude)
        };
      }
      return r;
    })
    .sort((a, b) => {
      if (userLocation) {
        return ((a as any).distance_km ?? 999) - ((b as any).distance_km ?? 999);
      }
      return 0;
    });

  return (
    <div className="min-h-[calc(100vh-60px)] lg:min-h-[calc(100vh-80px)] flex flex-col lg:flex-row bg-[#FFF9ED] dark:bg-[#0C1410] relative transition-colors duration-300">
      
      {/* Mobile View Segmented Control (Map View vs List View) */}
      <div className="lg:hidden flex items-center justify-between p-2.5 bg-white dark:bg-[#121C18] border-b border-[#EAE3D2] dark:border-[#24332D] sticky top-14 z-30 shadow-sm">
        <div className="flex items-center space-x-1 w-full bg-[#FFF9ED] dark:bg-[#0C1410] p-1 rounded-xl border border-[#EAE3D2] dark:border-[#24332D]">
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-[#159B5B] text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{t('resources.mapView')}</span>
          </button>
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              mobileTab === 'list'
                ? 'bg-[#159B5B] text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('resources.listView')} ({filteredRequests.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Left Sidebar / Filter & Discovery Panel                                    */}
      {/* ========================================================================= */}
      <div className={`w-full lg:w-[400px] shrink-0 bg-white dark:bg-[#121C18] border-r border-[#EAE3D2] dark:border-[#24332D] flex-col z-20 shadow-sm lg:h-[calc(100vh-80px)] overflow-hidden ${
        mobileTab === 'list' ? 'flex' : 'hidden lg:flex'
      }`}>
        
        {/* Panel Header */}
        <div className="p-4 border-b border-[#EAE3D2] dark:border-[#24332D] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 flex items-center justify-center text-[#159B5B] dark:text-emerald-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-[#17231E] dark:text-[#FFF9ED] leading-none">{t('map.title')}</h2>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">{t('map.subtitle')}</span>
              </div>
            </div>
            <button 
              onClick={fetchData}
              className="p-1.5 text-stone-400 hover:text-[#17231E] dark:hover:text-[#FFF9ED] rounded-full hover:bg-[#FFF9ED] dark:hover:bg-[#1A2621] transition-colors"
              title={t('map.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* "Use My Current Location" Button & Permission State */}
          {locationStatus === 'idle' && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="w-full py-2.5 px-4 bg-[#159B5B] hover:bg-[#12834D] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{t('map.currentLocation')}</span>
            </button>
          )}

          {locationStatus === 'locating' && (
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 text-cyan-900 dark:text-cyan-300 flex items-center space-x-2 text-xs font-bold animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>📍 {t('map.locating')}</span>
            </div>
          )}

          {locationStatus === 'success' && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold mb-1.5">
                <span className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>✓ {t('map.active')}</span>
                </span>
                <button 
                  onClick={handleUseCurrentLocation}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
                >
                  <RefreshCw className="w-3 h-3 mr-0.5" />
                  <span>{t('common.update')}</span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-stone-500">{t('map.radius')}:</span>
                <div className="flex items-center space-x-1">
                  {[1, 5, 10, 25].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRadiusChange(r)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                        radiusKm === r
                          ? 'bg-[#159B5B] text-white'
                          : 'bg-white dark:bg-[#121C18] border border-[#EAE3D2] dark:border-[#24332D] text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {r}k
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {locationStatus === 'denied' && (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 text-[11px] flex items-center space-x-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t('map.denied')}</span>
            </div>
          )}

          {locationStatus === 'unavailable' && (
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-300 text-[11px] flex items-center justify-between">
              <span>{t('map.unavailable')}</span>
              <button onClick={handleUseCurrentLocation} className="font-bold underline">{t('common.retryShort')}</button>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1">{t('map.category')}</label>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border border-[#EAE3D2] dark:border-[#24332D] rounded-xl text-xs outline-none bg-white dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] font-semibold focus:border-[#159B5B] dark:focus:border-[#159B5B]"
              >
                <option value="ALL">{t('map.allCategories')}</option>
                <option value="FOOD">{t('categories.food')}</option>
                <option value="SHELTER">{t('categories.shelter')}</option>
                <option value="MEDICAL">{t('categories.medical')}</option>
                <option value="CLOTHING">{t('categories.clothing')}</option>
                <option value="EMERGENCY">{t('categories.emergency')}</option>
                <option value="EDUCATION">Education</option>
                <option value="EMPLOYMENT">Employment</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1">{t('map.urgency')}</label>
              <select 
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full p-2 border border-[#EAE3D2] dark:border-[#24332D] rounded-xl text-xs outline-none bg-white dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] font-semibold focus:border-[#159B5B] dark:focus:border-[#159B5B]"
              >
                <option value="ALL">{t('map.allUrgency')}</option>
                <option value="CRITICAL">🔴 {t('urgency.critical')}</option>
                <option value="HIGH">🟠 {t('urgency.high')}</option>
                <option value="MEDIUM">🟡 {t('urgency.medium')}</option>
                <option value="LOW">🟢 {t('urgency.low')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 cursor-pointer text-[#17231E] dark:text-[#FFF9ED] font-semibold text-[11px]">
              <input 
                type="checkbox" 
                checked={showResources} 
                onChange={(e) => setShowResources(e.target.checked)}
                className="rounded accent-[#159B5B]"
              />
              <span>{t('mapPage.showResourcesToggle')} (🏛️)</span>
            </label>
            <span className="text-stone-400 text-[11px] font-medium">{filteredRequests.length} active needs</span>
          </div>

        </div>

        {/* Requests List in Sidebar */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              onClick={() => {
                setSelectedRequest(req);
                setSelectedResource(null);
                setFlyCoords([req.latitude, req.longitude]);
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedRequest?.id === req.id 
                  ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B] shadow-sm' 
                  : 'bg-white dark:bg-[#121C18] border-[#EAE3D2] dark:border-[#24332D] hover:border-[#159B5B] dark:hover:border-[#159B5B]'
              }`}
            >
              <div className="flex justify-between items-start">
                <span 
                  className="font-extrabold text-[10px] px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: getUrgencyColor(req.urgency_level) }}
                >
                  {req.urgency_level}
                </span>
                
                {/* Distance Badge if available */}
                {(req as any).distance_km !== undefined ? (
                  <span className="text-[10px] font-black text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/40">
                    📍 {(req as any).distance_km} km away
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-stone-400">
                    #{req.id}
                  </span>
                )}
              </div>

              <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#FFF9ED] mt-2">
                {req.dnn_category || req.category} Support Required
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                {req.description}
              </p>

              <div className="mt-2.5 pt-2 border-t border-[#EAE3D2]/60 dark:border-[#24332D] flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
                <span>{req.people_count} people</span>
                <span className="capitalize font-semibold text-[#159B5B] dark:text-emerald-400">{req.status.replace('_', ' ')}</span>
              </div>
              
              {/* Touch Current Location Directions Shortcut */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGetDirections(req.latitude, req.longitude);
                }}
                className="mt-2.5 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-[11px] flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>🧭 Directions (From My Current Location)</span>
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* Center Interactive Map Container with Rounded Glass Framing               */}
      {/* ========================================================================= */}
      <div className={`flex-1 h-[calc(100vh-145px)] min-h-[400px] lg:h-[calc(100vh-80px)] relative p-2 md:p-3 overflow-hidden ${mobileTab === 'map' ? 'block' : 'hidden lg:block'}`}>
        <div className="w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-[#EAE3D2] dark:border-[#24332D] shadow-lg relative bg-white">
          
          <MapContainer
            center={defaultCenter}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterer coords={flyCoords} />

            {/* Current User Location Marker with pulsing radar halo */}
            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={createUserLocationMarker(t('location.youAreHere'))}
                zIndexOffset={1000}
              >
                <Popup>
                  <div className="text-xs font-sans text-center p-1">
                    <div className="font-extrabold text-[#17231E]">📍 You Are Here</div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Active Location Detected</div>
                    <div className="text-[10px] text-stone-500 mt-1">Showing facilities within {radiusKm} km</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Help Request Markers */}
            {filteredRequests.map((req) => (
              <Marker
                key={`req-${req.id}`}
                position={[req.latitude, req.longitude]}
                icon={createMarkerIcon(getUrgencyColor(req.urgency_level), `${req.people_count}P`)}
                eventHandlers={{
                  click: () => {
                    setSelectedRequest(req);
                    setSelectedResource(null);
                    setFlyCoords([req.latitude, req.longitude]);
                  },
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 p-1">
                    <div className="font-bold text-[#17231E]">{req.dnn_category || req.category} Need #{req.id}</div>
                    <div className="text-stone-600">{req.description.slice(0, 75)}...</div>
                    <div className="font-bold text-[#F2A33A]">Urgency: {req.urgency_level}</div>
                    {(req as any).distance_km !== undefined && (
                      <div className="text-[10px] font-extrabold text-cyan-700">📍 {(req as any).distance_km} km from you</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Resource Facility Markers */}
            {showResources && resources.map((res) => (
              <Marker
                key={`res-${res.id}`}
                position={[res.latitude, res.longitude]}
                icon={createMarkerIcon('#159B5B', '', true)}
                eventHandlers={{
                  click: () => {
                    setSelectedResource(res);
                    setSelectedRequest(null);
                    setFlyCoords([res.latitude, res.longitude]);
                  },
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 p-1 font-sans">
                    <div className="font-bold text-[#17231E]">{res.name}</div>
                    <div className="text-stone-600 text-[11px]">{res.organization_type} • {res.category}</div>
                    <div className="text-[#159B5B] font-bold text-[11px]">Capacity: {res.capacity_available} available</div>
                    {res.distance_km !== undefined && (
                      <div className="text-[10px] font-extrabold text-cyan-700">📍 {res.distance_km} km from you</div>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ''}&destination=${res.latitude},${res.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 block w-full py-1.5 px-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white text-center rounded-lg font-bold text-[10px] transition-colors"
                    >
                      🧭 Navigate (Google Maps)
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Visual Route Polyline between user and selected resource */}
            {userLocation && selectedResource && (
              <Polyline
                positions={[
                  [userLocation.lat, userLocation.lng],
                  [selectedResource.latitude, selectedResource.longitude]
                ]}
                pathOptions={{
                  color: '#06B6D4',
                  weight: 3.5,
                  dashArray: '8, 8',
                  opacity: 0.85
                }}
              />
            )}

          </MapContainer>

          {/* Recenter View Button */}
          <button
            onClick={() => {
              if (userLocation) {
                setFlyCoords([userLocation.lat, userLocation.lng]);
              } else {
                setFlyCoords(defaultCenter);
              }
            }}
            className="absolute bottom-5 right-5 z-[400] px-3.5 py-2 bg-white dark:bg-[#121C18] hover:bg-[#FFF9ED] dark:hover:bg-[#1A2621] text-[#17231E] dark:text-[#FFF9ED] rounded-full shadow-lg border border-[#EAE3D2] dark:border-[#24332D] font-bold text-xs flex items-center space-x-1.5 transition-transform hover:scale-105"
            title="Recenter Map View"
          >
            <Navigation className="w-3.5 h-3.5 text-[#159B5B]" />
            <span>{userLocation ? 'My Location' : 'Coimbatore Center'}</span>
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* Right Details Slide-Over Inspector                                       */}
      {/* ========================================================================= */}
      {(selectedRequest || selectedResource) && (
        <div className="w-full lg:w-96 shrink-0 bg-white dark:bg-[#121C18] border-t lg:border-t-0 lg:border-l border-[#EAE3D2] dark:border-[#24332D] p-5 sm:p-6 overflow-y-auto z-50 shadow-2xl fixed inset-x-0 bottom-0 lg:relative lg:inset-auto max-h-[80vh] lg:max-h-none lg:h-[calc(100vh-80px)] rounded-t-3xl lg:rounded-none transition-all">
          <div className="w-12 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mb-3 lg:hidden" />
          <div className="flex justify-between items-start pb-3 border-b border-[#EAE3D2] dark:border-[#24332D]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {selectedRequest ? 'Request Details' : 'Resource Center'}
              </span>
              <h3 className="font-black text-base text-[#17231E] dark:text-[#FFF9ED]">
                {selectedRequest ? `${selectedRequest.dnn_category || selectedRequest.category} Need #${selectedRequest.id}` : selectedResource?.name}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedRequest(null);
                setSelectedResource(null);
              }}
              className="p-1 text-stone-400 hover:text-[#17231E] dark:hover:text-[#FFF9ED] rounded-full hover:bg-[#FFF9ED] dark:hover:bg-[#1A2621] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedRequest && (
            <div className="mt-4 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Urgency Priority</span>
                <span 
                  className="font-bold px-2.5 py-0.5 rounded-full text-white text-[11px]"
                  style={{ backgroundColor: getUrgencyColor(selectedRequest.urgency_level) }}
                >
                  {selectedRequest.urgency_level} ({selectedRequest.urgency_score}/100)
                </span>
              </div>

              {(selectedRequest as any).distance_km !== undefined && (
                <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 rounded-xl text-cyan-900 dark:text-cyan-300 font-bold flex items-center space-x-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Located {(selectedRequest as any).distance_km} km from your current position</span>
                </div>
              )}

              <div>
                <span className="text-stone-500 dark:text-stone-400 block font-semibold mb-1">Description</span>
                <p className="p-3 bg-[#FFF9ED] dark:bg-[#0C1410] rounded-2xl text-[#17231E] dark:text-[#FFF9ED] leading-relaxed border border-[#EAE3D2] dark:border-[#24332D]">
                  {selectedRequest.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-[#FFF9ED] dark:bg-[#0C1410] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D]">
                  <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-black block">People Affected</span>
                  <span className="font-bold text-[#17231E] dark:text-[#FFF9ED] text-sm">{selectedRequest.people_count} individuals</span>
                </div>
                <div className="p-3 bg-[#FFF9ED] dark:bg-[#0C1410] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D]">
                  <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-black block">Status</span>
                  <span className="font-bold text-[#159B5B] dark:text-emerald-400 text-sm">{selectedRequest.status.replace('_', ' ')}</span>
                </div>
              </div>

              <div>
                <span className="text-stone-500 dark:text-stone-400 block font-semibold">Location (Approximate)</span>
                <p className="text-[#17231E] dark:text-[#FFF9ED] mt-0.5 font-medium">{selectedRequest.address}</p>
              </div>

              <div className="pt-3 border-t border-[#EAE3D2] dark:border-[#24332D] space-y-2">
                <a
                  href={`/donor/dashboard`}
                  className="w-full block py-3 bg-[#159B5B] hover:bg-[#12834D] text-white font-black text-xs uppercase tracking-wider rounded-full text-center shadow-sm transition-all"
                >
                  Pledge Donation / Assistance
                </a>
                <a
                  href={`/ngo/dashboard`}
                  className="w-full block py-3 bg-[#17231E] hover:bg-stone-800 dark:bg-[#1A2621] dark:hover:bg-[#22332C] dark:border dark:border-[#24332D] text-white font-black text-xs uppercase tracking-wider rounded-full text-center transition-all"
                >
                  NGO Dispatch Center
                </a>
              </div>
            </div>
          )}

          {selectedResource && (
            <div className="mt-4 space-y-4 text-xs">
              <div className="p-2.5 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 rounded-2xl border border-[#159B5B]/20 dark:border-[#159B5B]/30 font-bold flex items-center justify-between">
                <span>{selectedResource.organization_type} • {selectedResource.category}</span>
                {selectedResource.distance_km !== undefined && (
                  <span className="text-cyan-700 dark:text-cyan-300">📍 {selectedResource.distance_km} km</span>
                )}
              </div>

              <p className="text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed font-medium">{selectedResource.description}</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-[#FFF9ED] dark:bg-[#0C1410] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D]">
                  <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-black block">Available Capacity</span>
                  <span className="font-bold text-[#159B5B] dark:text-emerald-400 text-sm">{selectedResource.capacity_available} / {selectedResource.capacity_total}</span>
                </div>
                <div className="p-3 bg-[#FFF9ED] dark:bg-[#0C1410] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D]">
                  <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-black block">Status</span>
                  <span className="font-bold text-[#17231E] dark:text-[#FFF9ED] text-sm">{selectedResource.availability_status}</span>
                </div>
              </div>

              <div>
                <span className="text-stone-500 dark:text-stone-400 block font-semibold">Address</span>
                <p className="text-[#17231E] dark:text-[#FFF9ED] mt-0.5 font-medium">{selectedResource.address}</p>
              </div>

              <div className="flex items-center text-[#17231E] dark:text-[#FFF9ED] font-semibold">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-[#159B5B] dark:text-emerald-400" />
                <a href={`tel:${selectedResource.phone}`} className="hover:underline">{selectedResource.phone}</a>
              </div>

              {/* Turn-by-Turn Navigation Action & Mobility Check */}
              <div className="pt-2 border-t border-[#EAE3D2] dark:border-[#24332D] space-y-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ''}&destination=${selectedResource.latitude},${selectedResource.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-[#159B5B] hover:bg-[#12834D] text-white font-black text-xs uppercase tracking-wider rounded-xl text-center shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Start Turn-by-Turn Navigation</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMobilityResource({
                      id: selectedResource.id,
                      name: selectedResource.name,
                      address: selectedResource.address
                    });
                    setIsMobilityModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-wider rounded-xl text-center border border-amber-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Bus className="w-4 h-4 text-amber-500" />
                  <span>I CAN'T REACH IT</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Mobility & Trust-Route Modal */}
      <MobilityLayerModal
        isOpen={isMobilityModalOpen}
        onClose={() => setIsMobilityModalOpen(false)}
        resourceId={selectedMobilityResource?.id}
        resourceName={selectedMobilityResource?.name}
        resourceAddress={selectedMobilityResource?.address}
      />

    </div>
  );
};


export default LiveMap;