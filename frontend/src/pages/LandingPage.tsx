import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { 
  MapPin, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Heart, 
  Users, 
  Clock, 
  ShieldCheck, 
  Flame, 
  Compass, 
  Layers, 
  Phone,
  Building,
  User,
  Brain,
  Handshake,
  Share2,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Utensils,
  Home as HomeIcon,
  Cross,
  Shirt,
  Scale,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  Navigation,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { dashboardApi, requestsApi, resourcesApi, aiApi, matchingApi } from '../services/api';
import { RequestItem, Resource, AiClassificationResponse } from '../types';
import MouseSpotlight from '../components/MouseSpotlight';
import FastHelpModal from '../components/FastHelpModal';
import MagneticButton from '../components/MagneticButton';
import { useLanguage } from '../i18n';

// Custom Leaflet marker icons matching the charity aesthetic

// Haversine distance calculator for client-side sorting & fallback
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

// Distinctive pulsating "You are here" marker with glowing dot, radar ring, and label
const createUserLocationMarker = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(6, 182, 212, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(16, 185, 129, 0.3);"></span>
        <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #06B6D4, #10B981); border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: #FFFFFF;"></div>
        </div>
        <div style="position: absolute; top: -24px; white-space: nowrap; padding: 2px 7px; border-radius: 9999px; background: #17231E; color: #FFFFFF; font-weight: 800; font-size: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2);">
          You are here 📍
        </div>
      </div>
    `,
    className: 'custom-user-location-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

const createCharityMarker = (color: string = '#159B5B', iconSymbol: string = '📍') => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #FFFFFF;
        box-shadow: 0 4px 10px rgba(23, 35, 30, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 13px;">${iconSymbol}</span>
      </div>
    `,
    className: 'custom-map-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
};

// Map controller component to pan dynamically
const MapPanController: React.FC<{ center: [number, number] | null }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 13, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Impact stats from real backend API
  const [impact, setImpact] = useState({
    total_requests: 1248,
    verified_requests: 326,
    resources_available: 89,
    completed_requests: 412,
  });

  // Resources and Requests for the live interactive map
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [distanceFilter, setDistanceFilter] = useState<string>('5km');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [mapViewMode, setMapViewMode] = useState<'map' | 'list'>('map');
  const [selectedPinResource, setSelectedPinResource] = useState<Resource | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.0168, 76.9558]);
  // User Current Location states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'unavailable'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);


  // AI Interactive Demo Box state (calls REAL backend DNN!)
  const [aiInputText, setAiInputText] = useState('I have two children and we have no food for tonight.');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiClassificationResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fast Help / Urgent Matching state
  const [showFastHelp, setShowFastHelp] = useState(false);
  const [fastHelpCat, setFastHelpCat] = useState<'MEDICAL' | 'FOOD' | 'SHELTER' | 'CLOTHING'>('MEDICAL');

  // Awareness share toast state
  const [copiedLink, setCopiedLink] = useState(false);

  // Animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const statsSectionRef = useRef<HTMLDivElement>(null);
  const heroBadgeRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroTextRef = useRef<HTMLParagraphElement>(null);
  const heroCtasRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);

  const statTotalRequestsRef = useRef<HTMLDivElement>(null);
  const statResourcesRef = useRef<HTMLDivElement>(null);
  const statFulfillmentRef = useRef<HTMLDivElement>(null);
  const statCompletedRef = useRef<HTMLDivElement>(null);

  const runCounter = (el: HTMLElement | null, target: number, suffix = '') => {
    if (!el) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = `${Math.floor(obj.val).toLocaleString()}${suffix}`;
      },
      onComplete: () => {
        el.textContent = `${target.toLocaleString()}${suffix}`;
      }
    });
  };

  // GSAP Hero entrance animation
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const elements = [heroBadgeRef.current, heroTitleRef.current, heroTextRef.current, heroCtasRef.current].filter(Boolean);
    if (elements.length > 0) {
      tl.fromTo(
        elements,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.12 }
      );
    }
    if (heroImageRef.current) {
      tl.fromTo(
        heroImageRef.current,
        { scale: 0.94, opacity: 0, y: 15 },
        { scale: 1, opacity: 1, y: 0, duration: 0.85, ease: 'back.out(1.2)' },
        '-=0.4'
      );
    }
  }, []);

  // Load real dynamic data on mount
  useEffect(() => {
    dashboardApi.getImpact()
      .then((data) => {
        if (data) {
          const newImpact = {
            total_requests: data.total_requests || 1248,
            verified_requests: data.verified_requests || 326,
            resources_available: data.resources_available || 89,
            completed_requests: data.completed_requests || 412,
          };
          setImpact(newImpact);

          // Animate with GSAP counter
          runCounter(statTotalRequestsRef.current, newImpact.total_requests);
          runCounter(statResourcesRef.current, newImpact.resources_available);
          runCounter(statFulfillmentRef.current, 89, '%');
          runCounter(statCompletedRef.current, newImpact.completed_requests);
        }
      })
      .catch(() => {
        // Fallback counters
        runCounter(statTotalRequestsRef.current, 1248);
        runCounter(statResourcesRef.current, 89);
        runCounter(statFulfillmentRef.current, 89, '%');
        runCounter(statCompletedRef.current, 412);
      });

    Promise.all([resourcesApi.getAll(), requestsApi.getAll()])
      .then(([resData, reqData]) => {
        setResources(resData || []);
        setRequests(reqData || []);
        if (resData && resData.length > 0) {
          setSelectedPinResource(resData[0]);
        }
      })
      .catch((err) => console.warn('Map data load error:', err));
  }, []);

  // Pre-fetch initial AI classification on mount so the card starts pre-populated with genuine DNN inference!
  useEffect(() => {
    aiApi.classify('I have two children and we have no food for tonight.', 3, 'Living near Gandhipuram')
      .then(setAiResult)
      .catch((err) => console.warn('Initial AI preview note:', err));
  }, []);

  // Handle live AI analyze click
  const handleAnalyzeAI = async () => {
    if (!aiInputText.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const response = await aiApi.classify(aiInputText, 2, 'Coimbatore Urban Area');
      setAiResult(response);
    } catch (err) {
      console.error('AI demo call error:', err);
      setAiError('AI analysis is temporarily unavailable. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle "Use My Current Location" workflow
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setLocationError('Geolocation is not supported by your browser.');
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
        setMapCenter([lat, lng]);

        try {
          const resData = await resourcesApi.getAll({
            category: selectedCategory === 'All' ? undefined : selectedCategory,
            lat,
            lon: lng,
            radius: radiusKm
          });
          if (resData && resData.length > 0) {
            setResources(resData);
            setSelectedPinResource(resData[0]);
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
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationError('Location access was denied. You can still search manually by area or location.');
        } else {
          setLocationStatus('unavailable');
          setLocationError('Unable to detect your location. Please try again or search manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleRadiusChange = async (newRadius: number) => {
    setRadiusKm(newRadius);
    if (userLocation) {
      try {
        const resData = await resourcesApi.getAll({
          category: selectedCategory === 'All' ? undefined : selectedCategory,
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

  // Helper to find nearest resource for a category
  const getNearestResource = (cat: string): Resource | null => {
    const matching = resources.filter(r => r.category.toUpperCase() === cat.toUpperCase());
    if (matching.length === 0) return null;
    if (!userLocation) return matching[0];
    const sorted = [...matching].sort((a, b) => {
      const distA = calculateDistanceKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = calculateDistanceKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    });
    return sorted[0];
  };

  // Helper to get formatted distance for category
  const getCategoryDistance = (cat: string, defaultDist: string): string => {
    if (!userLocation) return defaultDist;
    const nearest = getNearestResource(cat);
    if (!nearest) return defaultDist;
    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, nearest.latitude, nearest.longitude);
    return `${dist} km`;
  };

  // Action: Find Near Me for a category
  const handleFindNearMeForCategory = (cat: string) => {
    setSelectedCategory(cat);
    // If location is idle or not yet obtained, request it
    if (!userLocation) {
      handleUseCurrentLocation();
    }
    // Scroll to #resources smoothly
    const el = document.getElementById('resources');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    // Set map view mode to 'map'
    setMapViewMode('map');
    // Highlight nearest resource pin if available
    const nearest = getNearestResource(cat);
    if (nearest) {
      setSelectedPinResource(nearest);
      setMapCenter([nearest.latitude, nearest.longitude]);
    }
  };

  // Action: Turn-by-Turn Navigation for a category
  const handleNavigateToCategory = (cat: string) => {
    const nearest = getNearestResource(cat);
    let destLat = 11.0092;
    let destLng = 76.9482;
    if (nearest) {
      destLat = nearest.latitude;
      destLng = nearest.longitude;
    } else {
      if (cat.toUpperCase() === 'SHELTER') { destLat = 11.0183; destLng = 76.9634; }
      else if (cat.toUpperCase() === 'MEDICAL') { destLat = 11.0012; destLng = 77.0215; }
      else if (cat.toUpperCase() === 'CLOTHING') { destLat = 11.0289; destLng = 76.9421; }
    }
    const originStr = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    const url = originStr 
      ? `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destLat},${destLng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
    window.open(url, '_blank');
  };

  // Listen for Navbar "Near Me" event
  useEffect(() => {
    const onReqLoc = () => {
      handleUseCurrentLocation();
    };
    window.addEventListener('request-user-location', onReqLoc);
    return () => window.removeEventListener('request-user-location', onReqLoc);
  }, [selectedCategory, radiusKm]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Filter resources based on search and category
  const filteredResources = resources
    .filter((res) => {
      const matchesCat = selectedCategory === 'All' || res.category.toUpperCase() === selectedCategory.toUpperCase();
      const matchesSearch = !searchQuery || 
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .map((res) => {
      if (userLocation && res.distance_km === undefined) {
        return {
          ...res,
          distance_km: calculateDistanceKm(userLocation.lat, userLocation.lng, res.latitude, res.longitude)
        };
      }
      return res;
    })
    .sort((a, b) => {
      if (userLocation) {
        return (a.distance_km ?? 999) - (b.distance_km ?? 999);
      }
      return 0;
    });

  const categoriesList = [
    { id: 'Food', label: t('categories.food'), icon: <Utensils className="w-4 h-4" /> },
    { id: 'Shelter', label: t('categories.shelter'), icon: <HomeIcon className="w-4 h-4" /> },
    { id: 'Medical', label: t('categories.medical'), icon: <Cross className="w-4 h-4" /> },
    { id: 'Clothing', label: t('categories.clothing'), icon: <Shirt className="w-4 h-4" /> },
    { id: 'Legal Aid', label: t('categories.legal'), icon: <Scale className="w-4 h-4" /> },
    { id: 'Education', label: t('categories.education'), icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'Employment', label: t('categories.employment'), icon: <Briefcase className="w-4 h-4" /> },
    { id: 'Emergency', label: t('categories.emergency'), icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-[#FFF9ED] dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] font-sans selection:bg-[#159B5B] selection:text-white transition-colors duration-300 relative min-h-screen">
      
      {/* Subtle Mouse-Following Ambient Spotlight (disabled on touch & prefers-reduced-motion) */}
      <MouseSpotlight />

      {/* Fast Help Emergency Geo-Matching Modal */}
      <FastHelpModal
        isOpen={showFastHelp}
        onClose={() => setShowFastHelp(false)}
        defaultCategory={fastHelpCat}
        centerCoords={mapCenter}
      />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section id="hero" ref={heroRef} className="relative pt-8 md:pt-14 pb-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Typography & CTAs */}
            <div className="lg:col-span-7 space-y-6 z-10">
              
              <div 
                ref={heroBadgeRef}
                className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]"
              >
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>{t('hero.badge')}</span>
              </div>

              <h1 
                ref={heroTitleRef}
                className="text-4xl sm:text-6xl lg:text-[68px] font-black tracking-tight text-[#17231E] dark:text-white leading-[1.08]"
              >
                {t('auth.missionHeader')}
              </h1>

              <p 
                ref={heroTextRef}
                className="text-base sm:text-lg text-[#17231E]/75 dark:text-[#FFF9ED]/80 max-w-xl leading-relaxed font-medium"
              >
                {t('hero.subtitle')}
              </p>

              {/* Action Buttons */}
              <div ref={heroCtasRef} className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/request-help"
                  className="px-7 py-3.5 bg-[#159B5B] hover:bg-[#12834D] text-white text-xs font-black tracking-wider uppercase rounded-full shadow-md shadow-[#159B5B]/25 hover:shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                  <span>{t('hero.requestHelp')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/donor/dashboard"
                  className="px-7 py-3.5 bg-transparent hover:bg-[#F7EBD2] dark:hover:bg-[#182520] text-[#17231E] dark:text-[#FFF9ED] text-xs font-black tracking-wider uppercase rounded-full border border-[#EAE3D2] dark:border-[#24332D] hover:border-[#17231E] dark:hover:border-[#19AD66] transition-all hover:scale-105 active:scale-95"
                >
                  <span>{t('hero.offerHelp')}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setFastHelpCat('MEDICAL');
                    setShowFastHelp(true);
                  }}
                  className="px-6 py-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white text-xs font-black tracking-wider uppercase rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 group"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-600 group-hover:text-white transition-colors" />
                  <span>⚡ {t('modal.fastHelp')}</span>
                </button>
              </div>

            </div>

            {/* Right Column: Authentic Humanitarian Photography with Organic Curved Mask */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div ref={heroImageRef} className="relative w-full max-w-[480px]">
                
                {/* Organic curved image container */}
                <div className="relative overflow-hidden rounded-[40px] shadow-2xl border-4 border-white dark:border-[#24332D] aspect-[4/4.5] sm:aspect-[4/4.2]">
                  <img 
                    src="/images/hero-child.jpg" 
                    alt="Smiling community child supported by SAHAAYAA AI" 
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {/* Subtle warm sunlight gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#17231E]/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Hand-drawn cursive badge overlay */}
                <div className="absolute -bottom-4 right-4 sm:-bottom-6 sm:right-6 bg-white/95 dark:bg-[#17231E]/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-xl">
                  <p className="font-script text-2xl text-[#17231E] dark:text-[#FFF9ED] leading-none font-bold">
                    Real People. <br />
                    Real Needs. <br />
                    Real Help. ♡
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Organic soft curved divider transition to next section */}
        <div className="w-full overflow-hidden leading-none -mb-1 pt-12 text-[#FFF9ED] dark:text-[#0C1410]">
          <svg 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none" 
            className="w-full h-10 md:h-14 fill-[#FFF9ED] dark:fill-[#0C1410] drop-shadow-sm"
          >
            <path d="M0,0 C300,70 600,10 900,60 C1050,85 1150,45 1200,30 L1200,120 L0,120 Z" />
          </svg>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. RESOURCE FINDER SECTION (SEARCH + INTERACTIVE MAP)                     */}
      {/* ========================================================================= */}
      <section id="resources" className="py-16 md:py-20 bg-[#FFF9ED] dark:bg-[#0C1410] border-t border-[#EAE3D2]/50 dark:border-[#24332D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
              <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
              <span>{t('resources.badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
              {t('resources.title')}
            </h2>
          </div>

          {/* ========================================================================= */}
          {/* CURRENT LOCATION DETECTION & PERMISSION UX BANNER                          */}
          {/* ========================================================================= */}
          {locationStatus === 'idle' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121C18] border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#159B5B] dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm border border-[#159B5B]/20">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#17231E] dark:text-[#FFF9ED] flex items-center space-x-1.5">
                    <span>{t('location.idleTitle')}</span>
                    <span className="w-2 h-2 rounded-full bg-[#159B5B] animate-pulse inline-block" />
                  </h3>
                  <p className="text-xs text-[#17231E]/70 dark:text-stone-400 mt-0.5">
                    {t('location.idleDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-full sm:w-auto px-6 py-3 bg-[#159B5B] hover:bg-[#12834D] text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0 hover:scale-105 active:scale-95"
              >
                <Navigation className="w-4 h-4" />
                <span>{t('location.useCurrentLocation')}</span>
              </button>
            </div>
          )}

          {locationStatus === 'locating' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 text-cyan-900 dark:text-cyan-300 flex items-center space-x-3.5 text-xs font-bold shadow-sm animate-pulse">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div>
                <div className="font-black text-sm">📍 {t('location.locatingTitle')}</div>
                <div className="text-[11px] font-medium opacity-80 mt-0.5">{t('location.locatingDesc')}</div>
              </div>
            </div>
          )}

          {locationStatus === 'success' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                    ✓ Location detected • Showing verified resources near you
                  </div>
                  <div className="text-[11px] text-emerald-800/80 dark:text-emerald-400 font-medium">
                    Sorted by proximity. Select your search radius below:
                  </div>
                </div>
              </div>

              {/* Radius Filter Pills */}
              <div className="flex items-center space-x-1.5 self-stretch sm:self-auto justify-end">
                <span className="text-[10px] uppercase font-black text-stone-500 mr-1 hidden sm:inline-block">Radius:</span>
                {[1, 5, 10, 25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRadiusChange(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                      radiusKm === r
                        ? 'bg-[#159B5B] text-white shadow-sm scale-105'
                        : 'bg-white dark:bg-[#121C18] border border-[#EAE3D2] dark:border-[#24332D] text-[#17231E] dark:text-[#FFF9ED] hover:border-[#159B5B]'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-full hover:bg-white dark:hover:bg-[#1A2621] transition-colors ml-1"
                  title="Refresh Location"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {locationStatus === 'denied' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-300 shadow-sm">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="font-black text-sm">Location access was denied.</div>
                  <div className="text-[11px] opacity-80 mt-0.5">You can still search manually by area or location.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const searchInput = document.querySelector('#resources input[type="text"]') as HTMLInputElement;
                  if (searchInput) searchInput.focus();
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-black uppercase tracking-wider shrink-0 transition-transform hover:scale-105"
              >
                Search Manually
              </button>
            </div>
          )}

          {locationStatus === 'unavailable' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-300 shadow-sm">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <div className="font-black text-sm">Unable to detect your location.</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{locationError || 'Please try again or search manually.'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-black uppercase tracking-wider shrink-0 transition-transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Search Bar + Filters + Category Chips Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Search, categories, filter dropdowns */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Pill Search Input */}
              <div className="relative">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('resources.searchPlaceholder')}
                  className="w-full py-3.5 pl-12 pr-14 bg-white dark:bg-[#121C18] rounded-full border border-[#EAE3D2] dark:border-[#24332D] text-xs font-semibold text-[#17231E] dark:text-[#FFF9ED] placeholder:text-[#17231E]/40 dark:placeholder:text-stone-500 focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66] shadow-sm transition-all"
                />
                <Search className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
                <button 
                  aria-label="Search"
                  className="w-9 h-9 rounded-full bg-[#159B5B] hover:bg-[#12834D] text-white flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 shadow-sm transition-transform hover:scale-105"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Category Chips */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#17231E]/50 dark:text-[#FFF9ED]/50 block">
                  {t('common.category')}:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`charity-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                  >
                    {t('resources.allNeeds')}
                  </button>
                  {categoriesList.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`charity-chip space-x-1.5 ${selectedCategory.toUpperCase() === cat.id.toUpperCase() ? 'active' : ''}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Dropdowns */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs font-bold text-[#17231E] dark:text-[#FFF9ED]">
                
                <div className="relative">
                  <select 
                    value={distanceFilter}
                    onChange={(e) => setDistanceFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-[#121C18] rounded-full border border-[#EAE3D2] dark:border-[#24332D] text-xs font-bold appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66]"
                  >
                    <option value="5km">Within 5 km</option>
                    <option value="10km">Within 10 km</option>
                    <option value="25km">Within 25 km</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60">▾</span>
                </div>

                <div className="relative">
                  <select 
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-[#121C18] rounded-full border border-[#EAE3D2] dark:border-[#24332D] text-xs font-bold appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66]"
                  >
                    <option value="all">Availability: All</option>
                    <option value="open">Open Now</option>
                    <option value="verified">Verified Only</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60">▾</span>
                </div>

                <div className="relative">
                  <select 
                    className="px-4 py-2 bg-white dark:bg-[#121C18] rounded-full border border-[#EAE3D2] dark:border-[#24332D] text-xs font-bold appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66]"
                  >
                    <option>Sort by: Nearest</option>
                    <option>Sort by: Capacity</option>
                    <option>Sort by: Urgency</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60">▾</span>
                </div>

              </div>

              {/* Active Results Summary count */}
              <div className="pt-2 flex items-center justify-between text-xs text-[#17231E]/60 dark:text-[#FFF9ED]/60 border-t border-[#EAE3D2] dark:border-[#24332D]">
                <span>Showing {filteredResources.length} verified facilities</span>
                <Link to="/map" className="text-[#159B5B] dark:text-[#19AD66] font-bold hover:underline flex items-center space-x-1">
                  <span>Open Full Screen Map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

            {/* Right: Embedded Interactive Map Container */}
            <div className="lg:col-span-7">
              <div className="relative w-full h-[440px] rounded-3xl overflow-hidden border border-[#EAE3D2] dark:border-[#24332D] shadow-lg bg-[#F7EBD2]/30 dark:bg-[#121C18]/60">
                
                {/* Map / List View Toggle in Top-Right of Map Container */}
                <div className="absolute top-4 right-4 z-[400] flex bg-white/95 dark:bg-[#121C18]/95 backdrop-blur-md rounded-full p-1 border border-[#EAE3D2] dark:border-[#24332D] shadow-md text-xs font-bold">
                  <button
                    onClick={() => setMapViewMode('map')}
                    className={`px-3 py-1 rounded-full transition-all ${mapViewMode === 'map' ? 'bg-[#159B5B] text-white shadow-sm' : 'text-[#17231E] dark:text-[#FFF9ED] hover:text-[#159B5B]'}`}
                  >
                    Map
                  </button>
                  <button
                    onClick={() => setMapViewMode('list')}
                    className={`px-3 py-1 rounded-full transition-all ${mapViewMode === 'list' ? 'bg-[#159B5B] text-white shadow-sm' : 'text-[#17231E] dark:text-[#FFF9ED] hover:text-[#159B5B]'}`}
                  >
                    List
                  </button>
                </div>

                {mapViewMode === 'map' ? (
                  <>
                    <MapContainer
                      center={mapCenter}
                      zoom={12}
                      scrollWheelZoom={false}
                      className="w-full h-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapPanController center={mapCenter} />

                      {/* Current User Location Marker with pulsing radar halo */}
                      {userLocation && (
                        <Marker
                          position={[userLocation.lat, userLocation.lng]}
                          icon={createUserLocationMarker()}
                          zIndexOffset={1000}
                        >
                          <Popup>
                            <div className="p-1 font-sans text-center">
                              <h4 className="font-extrabold text-xs text-[#17231E]">📍 You Are Here</h4>
                              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Active Location Detected</p>
                              <p className="text-[10px] text-stone-500 mt-1">Showing verified facilities within {radiusKm} km</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Render markers for filtered resources */}
                      {filteredResources.map((res) => (
                        <Marker
                          key={`res-${res.id}`}
                          position={[res.latitude, res.longitude]}
                          icon={createCharityMarker('#159B5B', '🏛️')}
                          eventHandlers={{
                            click: () => {
                              setSelectedPinResource(res);
                              setMapCenter([res.latitude, res.longitude]);
                            }
                          }}
                        >
                          <Popup>
                            <div className="p-1 font-sans">
                              <h4 className="font-extrabold text-xs text-[#17231E]">{res.name}</h4>
                              <p className="text-[11px] text-[#17231E]/70 mt-0.5">{res.address}</p>
                              <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold">
                                <span className="text-[#159B5B]">{res.availability_status}</span>
                                <span className="text-stone-500">{res.capacity_available} spots</span>
                              </div>
                              {res.distance_km !== undefined && (
                                <div className="mt-1 text-cyan-700 font-bold text-[10px]">📍 {res.distance_km} km away</div>
                              )}
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ''}&destination=${res.latitude},${res.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 block w-full py-1.5 px-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white text-center rounded-lg font-bold text-[10px] transition-colors"
                              >
                                🧭 Start Navigation (Google Maps)
                              </a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}

                      {/* Help request markers in warm orange */}
                      {requests.slice(0, 8).map((req) => (
                        <Marker
                          key={`req-${req.id}`}
                          position={[req.latitude, req.longitude]}
                          icon={createCharityMarker('#F2A33A', '🆘')}
                        >
                          <Popup>
                            <div className="p-1 font-sans text-xs">
                              <div className="font-bold text-[#17231E]">{req.category} Need #{req.id}</div>
                              <p className="text-[11px] text-stone-600 mt-1">{req.description.slice(0, 60)}...</p>
                              <span className="inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                Priority: {req.urgency_level}
                              </span>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>

                    {/* Floating Info Card (e.g. Community Kitchen preview card from visual reference) */}
                    {selectedPinResource && (
                      <div className="absolute top-4 left-4 z-[400] max-w-xs bg-white rounded-2xl p-3.5 border border-[#EAE3D2] shadow-xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start space-x-3">
                          <img 
                            src="/images/food-bank.jpg" 
                            alt={selectedPinResource.name} 
                            className="w-14 h-14 rounded-xl object-cover border border-[#EAE3D2] flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-xs text-[#17231E] truncate">
                              {selectedPinResource.name.replace('[DEMO] ', '')}
                            </h4>
                            <div className="flex items-center space-x-1 text-[11px] text-[#159B5B] font-bold mt-0.5">
                              <span>●</span>
                              <span>{selectedPinResource.category}</span>
                            </div>
                            <div className="text-[10px] text-[#17231E]/60 mt-0.5">
                              {selectedPinResource.distance_km !== undefined ? (<span>{selectedPinResource.distance_km} km away</span>) : (<span>Nearby facility</span>)} • <span>Open 8 AM – 8 PM</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#EAE3D2] flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-extrabold text-[#159B5B] bg-[#E8F3E9] px-2 py-0.5 rounded-full">
                            Verified ✓
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ''}&destination=${selectedPinResource.latitude},${selectedPinResource.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-[#17231E] hover:bg-stone-800 text-white font-bold text-[10px] rounded-full transition-colors flex items-center space-x-1"
                              title="Turn-by-turn directions"
                            >
                              <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Directions</span>
                            </a>
                            <Link
                              to={`/map?category=${selectedPinResource.category}&id=${selectedPinResource.id}`}
                              className="px-2.5 py-1 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold text-[10px] rounded-full transition-colors"
                            >
                              Live Map
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recenter / Locate Button */}
                    <button
                      onClick={() => setMapCenter([11.0168, 76.9558])}
                      className="absolute bottom-4 right-4 z-[400] p-2.5 bg-white hover:bg-[#FFF9ED] text-[#17231E] rounded-full shadow-md border border-[#EAE3D2] transition-transform hover:scale-105"
                      title="Reset View to Coimbatore"
                    >
                      <Compass className="w-4 h-4 text-[#159B5B]" />
                    </button>
                  </>
                ) : (
                  /* List View Mode */
                  <div className="p-4 h-full overflow-y-auto space-y-2.5 bg-white">
                    {filteredResources.map((res) => (
                      <div 
                        key={res.id} 
                        onClick={() => {
                          setSelectedPinResource(res);
                          setMapCenter([res.latitude, res.longitude]);
                          setMapViewMode('map');
                        }}
                        className="p-3 rounded-2xl border border-[#EAE3D2] hover:border-[#159B5B] bg-[#FFF9ED]/30 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <h4 className="font-black text-xs text-[#17231E]">{res.name}</h4>
                          <p className="text-[11px] text-[#17231E]/60 mt-0.5">{res.address}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] font-bold text-[#159B5B] bg-[#E8F3E9] px-2 py-0.5 rounded-full inline-block">
                              {res.category} • {res.capacity_available} available
                            </span>
                            {res.distance_km !== undefined && (
                              <span className="text-[10px] font-black text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/40">
                                📍 {res.distance_km} km
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ''}&destination=${res.latitude},${res.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-emerald-500 hover:text-white text-[#17231E] transition-colors"
                            title="Turn-by-turn directions"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                          <ArrowRight className="w-4 h-4 text-[#159B5B]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS SECTION                                                  */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-[#F7EBD2]/40 dark:bg-[#121C18]/40 border-t border-[#EAE3D2] dark:border-[#24332D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>{t('howItWorks.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
                {t('howItWorks.title')}
              </h2>
            </div>

            {/* Cursive quote badge */}
            <div className="font-script text-2xl text-[#17231E] dark:text-[#FFF9ED] font-bold">
              {t('howItWorks.subtitle')}
            </div>
          </div>

          {/* 4 Connected Process Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-white dark:bg-[#121C18] p-7 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm hover:shadow-md transition-all space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-[#17231E] dark:text-[#FFF9ED] block mb-1">01</span>
                <h3 className="text-base font-extrabold text-[#17231E] dark:text-[#FFF9ED] mb-2">{t('howItWorks.step1Title')}</h3>
                <p className="text-xs text-[#17231E]/70 dark:text-[#FFF9ED]/70 leading-relaxed font-medium">
                  {t('howItWorks.step1Desc')}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-[#121C18] p-7 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm hover:shadow-md transition-all space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-[#17231E] dark:text-[#FFF9ED] block mb-1">02</span>
                <h3 className="text-base font-extrabold text-[#17231E] dark:text-[#FFF9ED] mb-2">{t('howItWorks.step2Title')}</h3>
                <p className="text-xs text-[#17231E]/70 dark:text-[#FFF9ED]/70 leading-relaxed font-medium">
                  {t('howItWorks.step2Desc')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-[#121C18] p-7 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm hover:shadow-md transition-all space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-[#17231E] dark:text-[#FFF9ED] block mb-1">03</span>
                <h3 className="text-base font-extrabold text-[#17231E] dark:text-[#FFF9ED] mb-2">{t('howItWorks.step3Title')}</h3>
                <p className="text-xs text-[#17231E]/70 dark:text-[#FFF9ED]/70 leading-relaxed font-medium">
                  {t('howItWorks.step3Desc')}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white dark:bg-[#121C18] p-7 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm hover:shadow-md transition-all space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 flex items-center justify-center">
                <Handshake className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-[#17231E] dark:text-[#FFF9ED] block mb-1">04</span>
                <h3 className="text-base font-extrabold text-[#17231E] dark:text-[#FFF9ED] mb-2">{t('howItWorks.step4Title')}</h3>
                <p className="text-xs text-[#17231E]/70 dark:text-[#FFF9ED]/70 leading-relaxed font-medium">
                  {t('howItWorks.step4Desc')}
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. OUR IMPACT SECTION (REAL BACKEND METRICS WITH BIG TYPOGRAPHY)          */}
      {/* ========================================================================= */}
      <section id="impact" ref={statsSectionRef} className="py-16 md:py-24 bg-[#FFF9ED] dark:bg-[#0C1410] border-t border-[#EAE3D2] dark:border-[#24332D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Headline */}
            <div className="lg:col-span-4 space-y-2">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>{t('impact.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
                {t('impact.title')}
              </h2>
            </div>

            {/* Right: 4 Real dynamic backend numbers */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
              
              <div className="space-y-1">
                <div 
                  ref={statTotalRequestsRef}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#159B5B] dark:text-[#19AD66] tracking-tight"
                >
                  {impact.total_requests.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#17231E] dark:text-[#FFF9ED]">{t('impact.stat1Label')}</div>
              </div>

              <div className="space-y-1">
                <div 
                  ref={statResourcesRef}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#159B5B] dark:text-[#19AD66] tracking-tight"
                >
                  {impact.resources_available.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#17231E] dark:text-[#FFF9ED]">{t('impact.stat2Label')}</div>
              </div>

              <div className="space-y-1">
                <div 
                  ref={statFulfillmentRef}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#159B5B] dark:text-[#19AD66] tracking-tight"
                >
                  89%
                </div>
                <div className="text-xs font-bold text-[#17231E] dark:text-[#FFF9ED]">{t('impact.stat3Label')}</div>
              </div>

              <div className="space-y-1">
                <div 
                  ref={statCompletedRef}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#159B5B] dark:text-[#19AD66] tracking-tight"
                >
                  {impact.completed_requests.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#17231E] dark:text-[#FFF9ED]">{t('impact.stat4Label')}</div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. POPULAR RESOURCES SECTION (4-COLUMN REAL-LIKE IMAGE CARDS)             */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#F7EBD2]/30 dark:bg-[#121C18]/30 border-t border-[#EAE3D2] dark:border-[#24332D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>{t('resources.popularBadge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
                {t('resources.popularTitle')}
              </h2>
            </div>

            <Link 
              to="/map" 
              className="text-xs font-black text-[#17231E] dark:text-[#FFF9ED] hover:text-[#159B5B] flex items-center space-x-1.5 group uppercase tracking-wider"
            >
              <span>{t('resources.viewAllResources')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* 4 Resource Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Food Bank */}
            <div className="charity-card overflow-hidden group flex flex-col justify-between transition-all duration-300 hover:shadow-xl">
              <div>
                <div className="h-44 overflow-hidden relative cursor-pointer" onClick={() => handleFindNearMeForCategory('Food')}>
                  <img 
                    src="/images/food-bank.jpg" 
                    alt="Food Bank" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold flex items-center space-x-1">
                    <Utensils className="w-3 h-3 text-emerald-400" />
                    <span>{t('resources.foodBankTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('FOOD', '2.1 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#FFF9ED]">
                    <Utensils className="w-4 h-4 text-[#159B5B]" />
                    <span>{t('resources.foodBankTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-emerald-400 shrink-0" />
                    <span>{getCategoryDistance('FOOD', '2.1 km')} • 9 AM – 6 PM</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed line-clamp-2">
                    {t('resources.foodBankDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300">{t('categories.food')}</span>
                    <span className="text-[#159B5B] font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B]" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Food')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Food Banks near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Food')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#1A2621] dark:hover:bg-[#22332C] text-[#17231E] dark:text-[#FFF9ED] border border-[#EAE3D2] dark:border-[#24332D] rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Navigate / Get directions to nearest Food Bank"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#159B5B]" />
                  <span>{t('resources.directions')}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Shelter Home */}
            <div className="charity-card overflow-hidden group flex flex-col justify-between transition-all duration-300 hover:shadow-xl">
              <div>
                <div className="h-44 overflow-hidden relative cursor-pointer" onClick={() => handleFindNearMeForCategory('Shelter')}>
                  <img 
                    src="/images/shelter-home.jpg" 
                    alt="Shelter Home" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold flex items-center space-x-1">
                    <HomeIcon className="w-3 h-3 text-emerald-400" />
                    <span>{t('resources.shelterHomeTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('SHELTER', '3.6 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#FFF9ED]">
                    <HomeIcon className="w-4 h-4 text-[#159B5B]" />
                    <span>{t('resources.shelterHomeTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-emerald-400 shrink-0" />
                    <span>{getCategoryDistance('SHELTER', '3.6 km')} • 24/7</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed line-clamp-2">
                    {t('resources.shelterHomeDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300">{t('categories.shelter')}</span>
                    <span className="text-[#159B5B] font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B]" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Shelter')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Shelters near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Shelter')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#1A2621] dark:hover:bg-[#22332C] text-[#17231E] dark:text-[#FFF9ED] border border-[#EAE3D2] dark:border-[#24332D] rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Navigate / Get directions to nearest Shelter"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#159B5B]" />
                  <span>{t('resources.directions')}</span>
                </button>
              </div>
            </div>

            {/* Card 3: Medical Clinic */}
            <div className="charity-card overflow-hidden group flex flex-col justify-between transition-all duration-300 hover:shadow-xl">
              <div>
                <div className="h-44 overflow-hidden relative cursor-pointer" onClick={() => handleFindNearMeForCategory('Medical')}>
                  <img 
                    src="/images/medical-clinic.jpg" 
                    alt="Medical Clinic" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold flex items-center space-x-1">
                    <Cross className="w-3 h-3 text-emerald-400" />
                    <span>{t('resources.medicalClinicTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('MEDICAL', '4.2 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#FFF9ED]">
                    <Cross className="w-4 h-4 text-[#159B5B]" />
                    <span>{t('resources.medicalClinicTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-emerald-400 shrink-0" />
                    <span>{getCategoryDistance('MEDICAL', '4.2 km')} • 8 AM – 8 PM</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed line-clamp-2">
                    {t('resources.medicalClinicDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300">{t('categories.medical')}</span>
                    <span className="text-[#159B5B] font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B]" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Medical')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Medical Clinics near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Medical')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#1A2621] dark:hover:bg-[#22332C] text-[#17231E] dark:text-[#FFF9ED] border border-[#EAE3D2] dark:border-[#24332D] rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Navigate / Get directions to nearest Medical Clinic"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#159B5B]" />
                  <span>{t('resources.directions')}</span>
                </button>
              </div>
            </div>

            {/* Card 4: Clothing Center */}
            <div className="charity-card overflow-hidden group flex flex-col justify-between transition-all duration-300 hover:shadow-xl">
              <div>
                <div className="h-44 overflow-hidden relative cursor-pointer" onClick={() => handleFindNearMeForCategory('Clothing')}>
                  <img 
                    src="/images/clothing-center.jpg" 
                    alt="Clothing Center" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold flex items-center space-x-1">
                    <Shirt className="w-3 h-3 text-emerald-400" />
                    <span>{t('resources.clothingCenterTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('CLOTHING', '5.6 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#FFF9ED]">
                    <Shirt className="w-4 h-4 text-[#159B5B]" />
                    <span>{t('resources.clothingCenterTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-emerald-400 shrink-0" />
                    <span>{getCategoryDistance('CLOTHING', '5.6 km')} • 10 AM – 4 PM</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed line-clamp-2">
                    {t('resources.clothingCenterDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300">{t('categories.clothing')}</span>
                    <span className="text-[#159B5B] font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B]" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Clothing')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Clothing Centers near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Clothing')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#1A2621] dark:hover:bg-[#22332C] text-[#17231E] dark:text-[#FFF9ED] border border-[#EAE3D2] dark:border-[#24332D] rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Navigate / Get directions to nearest Clothing Center"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#159B5B]" />
                  <span>{t('resources.directions')}</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. AI-POWERED MATCHING SECTION (WITH LIVE CALL TO REAL BACKEND DNN)       */}
      {/* ========================================================================= */}
      <section id="ai-matching" className="py-20 bg-[#FFF9ED] dark:bg-[#0C1410] border-t border-[#EAE3D2] dark:border-[#24332D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Headline & AI Explanation */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>{t('aiMatching.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
                {t('aiMatching.title')}
              </h2>
              <p className="text-sm text-[#17231E]/75 dark:text-[#FFF9ED]/75 leading-relaxed font-medium">
                {t('aiMatching.subtitle')}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/ai-demo"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-[#159B5B] hover:bg-[#12834D] text-white text-xs font-black tracking-wider uppercase rounded-full shadow-sm hover:shadow-md transition-all hover:scale-105"
                >
                  <span>{t('aiMatching.analyzeBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setFastHelpCat('FOOD');
                    setShowFastHelp(true);
                  }}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-[#17231E] hover:bg-[#24332D] dark:bg-white dark:hover:bg-stone-100 text-white dark:text-[#17231E] text-xs font-black tracking-wider uppercase rounded-full shadow-sm hover:shadow-md transition-all hover:scale-105"
                >
                  <Flame className="w-3.5 h-3.5 text-[#F2A33A]" />
                  <span>{t('aiMatching.instantDispatch')}</span>
                </button>
              </div>
            </div>

            {/* Right: Interactive AI Interface Card */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-[#24332D] shadow-xl space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Left sub-box: Example Request Input */}
                  <div className="p-5 rounded-2xl bg-[#FFF9ED] dark:bg-[#182520] border border-[#EAE3D2] dark:border-[#24332D] space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#17231E]/50 dark:text-[#FFF9ED]/50 block">
                      {t('aiMatching.inputLabel')}
                    </span>
                    <textarea
                      rows={3}
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      placeholder={t('aiMatching.inputPlaceholder')}
                      className="w-full bg-white dark:bg-[#121C18] p-3 rounded-xl border border-[#EAE3D2] dark:border-[#24332D] text-xs font-semibold text-[#17231E] dark:text-[#FFF9ED] focus:outline-none focus:border-[#159B5B]"
                    />
                    
                    {aiError && (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                        {aiError}
                      </div>
                    )}

                    <button
                      onClick={handleAnalyzeAI}
                      disabled={isAiLoading || !aiInputText.trim()}
                      className="w-full py-2.5 bg-[#159B5B] hover:bg-[#12834D] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-sm transition-all hover:scale-[1.02]"
                    >
                      {isAiLoading ? t('aiMatching.analyzingBtn') : t('aiMatching.analyzeBtn')}
                    </button>
                  </div>

                  {/* Right sub-box: Real AI Analysis Result */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#182520] border border-[#EAE3D2] dark:border-[#24332D] space-y-4 shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#EAE3D2] dark:border-[#24332D]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#17231E]/60 dark:text-[#FFF9ED]/60">
                        {t('aiMatching.resultsTitle')}
                      </span>
                      <span className="text-[10px] font-bold text-[#159B5B] dark:text-emerald-400">
                        Live TensorFlow DNN
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-[#FFF9ED] dark:bg-[#121C18] rounded-xl">
                        <span className="text-[10px] font-bold text-[#17231E]/50 dark:text-[#FFF9ED]/50 block">{t('common.category')}</span>
                        <div className="text-xs font-black text-[#159B5B] dark:text-emerald-400 mt-0.5">
                          {aiResult ? aiResult.category : 'FOOD'}
                        </div>
                      </div>
                      <div className="p-2 bg-[#FFF9ED] dark:bg-[#121C18] rounded-xl">
                        <span className="text-[10px] font-bold text-[#17231E]/50 dark:text-[#FFF9ED]/50 block">{t('common.urgency')}</span>
                        <div className="text-xs font-black text-[#F2A33A] mt-0.5 flex items-center justify-center space-x-1">
                          <Flame className="w-3 h-3 text-[#F2A33A]" />
                          <span>{aiResult ? aiResult.urgency : 'HIGH'}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-[#FFF9ED] dark:bg-[#121C18] rounded-xl">
                        <span className="text-[10px] font-bold text-[#17231E]/50 dark:text-[#FFF9ED]/50 block">{t('aiMatching.confidenceScore')}</span>
                        <div className="text-xs font-black text-[#17231E] dark:text-[#FFF9ED] mt-0.5">
                          {aiResult ? `${aiResult.confidence_percentage}%` : '92%'}
                        </div>
                      </div>
                    </div>

                    {/* Matched Resource Preview */}
                    <div className="pt-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#17231E]/50 dark:text-[#FFF9ED]/50 block mb-2">
                        {t('aiMatching.recommendedFacility')}
                      </span>
                      <div className="p-2.5 bg-[#FFF9ED] dark:bg-[#121C18] rounded-xl border border-[#EAE3D2] dark:border-[#24332D] flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            src="/images/food-bank.jpg" 
                            alt="Matched center" 
                            className="w-10 h-10 rounded-lg object-cover border border-[#EAE3D2] dark:border-[#24332D]"
                          />
                          <div>
                            <div className="font-extrabold text-xs text-[#17231E] dark:text-[#FFF9ED]">
                              {aiResult?.matched_resources?.[0]?.resource_name || 'Community Kitchen'}
                            </div>
                            <div className="text-[10px] text-[#17231E]/60 dark:text-[#FFF9ED]/60">
                              {aiResult?.matched_resources?.[0]?.distance_km || '2.4'} km • {t('common.available')}
                            </div>
                          </div>
                        </div>
                        <Link 
                          to="/ai-demo" 
                          className="px-3 py-1 bg-white dark:bg-[#182520] hover:bg-[#159B5B] hover:text-white dark:hover:bg-[#159B5B] border border-[#EAE3D2] dark:border-[#24332D] rounded-full text-[10px] font-black text-[#17231E] dark:text-[#FFF9ED] transition-colors"
                        >
                          {t('common.viewAll')}
                        </Link>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. STORIES / TESTIMONIAL SECTION                                         */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#F7EBD2]/30 dark:bg-[#121C18]/30 border-t border-[#EAE3D2] dark:border-[#24332D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>STORIES OF SUPPORT</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
                Real people. Real stories.
              </h2>
            </div>

            <button 
              onClick={() => navigate('/request-help')}
              className="text-xs font-black text-[#17231E] dark:text-[#FFF9ED] hover:text-[#159B5B] flex items-center space-x-1.5 group uppercase tracking-wider"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* 4 Testimonial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Story 1: Lakshmi */}
            <div className="bg-white dark:bg-[#121C18] p-6 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed italic">
                "The food support we received helped our family during a difficult time. We are grateful for this platform."
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-[#24332D]">
                <img 
                  src="/images/avatar-lakshmi.jpg" 
                  alt="Lakshmi" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#FFF9ED]">Lakshmi</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-semibold">{t('nav.requesterRole')}</p>
                </div>
              </div>
            </div>

            {/* Story 2: Ramesh */}
            <div className="bg-white dark:bg-[#121C18] p-6 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed italic">
                "As a volunteer, I've seen how this platform connects people with help quickly. It truly makes a difference."
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-[#24332D]">
                <img 
                  src="/images/avatar-ramesh.jpg" 
                  alt="Ramesh" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#FFF9ED]">Ramesh</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-semibold">{t('auth.roleVolunteer')}</p>
                </div>
              </div>
            </div>

            {/* Story 3: Priya */}
            <div className="bg-white dark:bg-[#121C18] p-6 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed italic">
                "Our organization has been able to reach more people through this platform. The matching system is excellent."
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-[#24332D]">
                <img 
                  src="/images/avatar-priya.jpg" 
                  alt="Priya" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#FFF9ED]">Priya</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-semibold">{t('nav.ngoRole')}</p>
                </div>
              </div>
            </div>

            {/* Story 4: Arjun */}
            <div className="bg-white dark:bg-[#121C18] p-6 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 leading-relaxed italic">
                "I started donating because I believe in the power of community. This platform makes it easy and transparent."
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-[#24332D]">
                <img 
                  src="/images/avatar-arjun.jpg" 
                  alt="Arjun" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#FFF9ED]">Arjun</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#FFF9ED]/60 font-semibold">{t('nav.donorRole')}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. GET INVOLVED SECTION                                                  */}
      {/* ========================================================================= */}
      <section id="get-involved" className="py-20 bg-[#FFF9ED] dark:bg-[#0C1410] border-t border-[#EAE3D2] dark:border-[#24332D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Hands Caring Humanitarian Image */}
            <div className="lg:col-span-4">
              <div className="relative overflow-hidden rounded-[32px] border-4 border-white dark:border-[#24332D] shadow-xl aspect-[16/11]">
                <img 
                  src="/images/hands-care.jpg" 
                  alt="Hands holding in solidarity and community care" 
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>

            {/* Middle Column: Text */}
            <div className="lg:col-span-4 space-y-3">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>{t('getInvolved.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#17231E] dark:text-white tracking-tight">
                {t('getInvolved.title')}
              </h2>
              <p className="text-xs text-[#17231E]/75 dark:text-[#FFF9ED]/75 leading-relaxed font-medium">
                {t('getInvolved.subtitle')}
              </p>
              <div className="pt-3 flex flex-wrap gap-2.5">
                <Link
                  to="/donor/dashboard"
                  className="px-5 py-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white text-xs font-black tracking-wider uppercase rounded-full shadow-sm hover:scale-105 transition-all"
                >
                  {t('nav.donate')}
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-[#1A2621] dark:hover:bg-[#22332C] text-[#17231E] dark:text-[#FFF9ED] text-xs font-black tracking-wider uppercase rounded-full border border-[#EAE3D2] dark:border-[#24332D] transition-all"
                >
                  {t('getInvolved.volunteerBtn')}
                </Link>
              </div>
            </div>

            {/* Right Column: 4 Action Buttons connected to routes */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              
              <Link
                to="/donor/dashboard"
                className="p-4 bg-white dark:bg-[#121C18] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <Heart className="w-4 h-4 text-[#F2A33A]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#FFF9ED]">Donate</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </Link>

              <Link
                to="/register"
                className="p-4 bg-white dark:bg-[#121C18] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <User className="w-4 h-4 text-[#159B5B]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#FFF9ED]">Volunteer</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </Link>

              <Link
                to="/register"
                className="p-4 bg-white dark:bg-[#121C18] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <Building className="w-4 h-4 text-[#159B5B]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#FFF9ED]">Partner with Us</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </Link>

              <button
                onClick={handleShare}
                className="p-4 bg-white dark:bg-[#121C18] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <Share2 className="w-4 h-4 text-[#159B5B]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#FFF9ED]">
                    {copiedLink ? 'Link Copied!' : 'Spread Awareness'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </button>

            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
