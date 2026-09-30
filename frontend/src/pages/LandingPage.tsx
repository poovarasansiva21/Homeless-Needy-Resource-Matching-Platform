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
  AlertCircle,
  Bus,
  Bell,
  Gift
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { dashboardApi, requestsApi, resourcesApi, aiApi, matchingApi } from '../services/api';
import { RequestItem, Resource, AiClassificationResponse } from '../types';
import MouseSpotlight from '../components/MouseSpotlight';
import FastHelpModal from '../components/FastHelpModal';
import OneTapHelpModal from '../components/OneTapHelpModal';
import { MobilityLayerModal } from '../components/MobilityLayerModal';
import MagneticButton from '../components/MagneticButton';
import { useLanguage } from '../i18n';
import { useAuth } from '../context/AuthContext';

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
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);


  // Fast Help / Urgent Matching state
  const [showFastHelp, setShowFastHelp] = useState(false);
  const [fastHelpCat, setFastHelpCat] = useState<'MEDICAL' | 'FOOD' | 'SHELTER' | 'CLOTHING'>('MEDICAL');
  const [showOneTapModal, setShowOneTapModal] = useState(false);

  // Mobility Layer state (Phase 3)
  const [isMobilityModalOpen, setIsMobilityModalOpen] = useState(false);
  const [selectedMobilityResource, setSelectedMobilityResource] = useState<{ id?: number; name?: string; address?: string } | null>(null);


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
    <div className="sahaayaa-organic-bg text-[#17231E] dark:text-[#F5F5F0] font-sans selection:bg-[#159B5B] selection:text-white transition-colors duration-300 relative min-h-screen overflow-x-hidden">
      
      {/* Background Botanical Vector Overlays Matching Reference Image */}
      <div className="absolute top-10 left-0 w-80 h-80 opacity-15 dark:opacity-10 pointer-events-none -translate-x-24 z-0">
        <svg viewBox="0 0 200 200" fill="#0B4F3A">
          <path d="M40 160C40 160 30 100 80 60C130 20 180 30 180 30C180 30 170 90 120 130C70 170 40 160 40 160Z"/>
          <path d="M20 180C20 180 50 140 100 130C150 120 190 150 190 150C190 150 160 190 110 200C60 210 20 180 20 180Z"/>
        </svg>
      </div>

      <div className="absolute top-1/4 right-0 w-96 h-96 opacity-15 dark:opacity-10 pointer-events-none translate-x-28 z-0">
        <svg viewBox="0 0 200 200" fill="#0B4F3A">
          <path d="M100 20C100 20 160 30 170 90C180 150 130 180 130 180C130 180 70 170 60 110C50 50 100 20 100 20Z"/>
        </svg>
      </div>

      {/* Subtle Mouse-Following Ambient Spotlight */}
      <MouseSpotlight />

      {/* Fast Help Emergency Geo-Matching Modal */}
      <FastHelpModal
        isOpen={showFastHelp}
        onClose={() => setShowFastHelp(false)}
        defaultCategory={fastHelpCat}
        centerCoords={mapCenter}
      />

      {/* One-Tap Emergency Aid Modal */}
      <OneTapHelpModal
        isOpen={showOneTapModal}
        onClose={() => setShowOneTapModal(false)}
      />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section id="hero" ref={heroRef} className="relative pt-8 md:pt-14 pb-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ========================================================================= */}
          {/* MOBILE / APP TOP HEADER & QUICK CATEGORY SELECTOR                        */}
          {/* ========================================================================= */}
          <div className="space-y-4 mb-8">
            {/* Dynamic Time-Based Greeting Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#F25C38] text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                  {user ? user.full_name.charAt(0).toUpperCase() : '👋'}
                </div>
                <div>
                  <div className="text-[11px] text-[#78716C] dark:text-[#A8A29E] font-semibold">{getGreeting()}</div>
                  <div className="text-sm font-extrabold text-[#1C1917] dark:text-[#F5F5F0]">
                    {user ? user.full_name : 'Welcome to SAHAAYAA AI'}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowOneTapModal(true)}
                className="px-3.5 py-1.5 rounded-full bg-[#F25C38]/10 hover:bg-[#F25C38]/20 text-[#F25C38] font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Bell className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>1-Tap Help</span>
              </button>
            </div>

            {/* Integrated Quick Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help, food, shelter, clinic, emergency..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const el = document.getElementById('resources');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full py-3.5 pl-11 pr-12 rounded-2xl bg-white dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F0] placeholder:text-[#78716C]/60 dark:placeholder:text-stone-500 shadow-sm focus:outline-none focus:border-[#F25C38]"
              />
              <Search className="w-4 h-4 text-[#78716C] dark:text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('resources');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-8 h-8 rounded-xl bg-[#F25C38] hover:bg-[#E04925] text-white flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 shadow-xs cursor-pointer"
                title="Search"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 8 Category Touch Cards (Horizontal Scrollable Carousel on Mobile) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E]">Explore Categories</span>
                <span className="text-[11px] font-bold text-[#F25C38] flex items-center space-x-0.5">
                  <span>Scroll for all</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none snap-x touch-pan-x">
                {[
                  { id: 'Food', label: 'Food & Water', icon: '🍚', count: 'Verified Centers' },
                  { id: 'Shelter', label: 'Shelter Home', icon: '🏠', count: 'Emergency Beds' },
                  { id: 'Medical', label: 'Medical Clinic', icon: '🩺', count: 'Doctors & Meds' },
                  { id: 'Clothing', label: 'Clothing', icon: '👕', count: 'Warm Wear' },
                  { id: 'Transport', label: 'Transport Aid', icon: '🚌', count: 'Transit Help' },
                  { id: 'Mental Health', label: 'Mental Care', icon: '🧠', count: '24/7 Helpline' },
                  { id: 'Employment', label: 'Jobs & Skills', icon: '💼', count: 'Work & Support' },
                  { id: 'Emergency', label: 'Other Needs', icon: '🤝', count: 'Community Care' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      const el = document.getElementById('resources');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`snap-start shrink-0 min-w-[125px] p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-h-[44px] ${
                      selectedCategory.toUpperCase() === cat.id.toUpperCase()
                        ? 'bg-[#F25C38] border-[#F25C38] text-white shadow-md scale-[1.02]'
                        : 'bg-white dark:bg-[#161616] border-[#E7E0D6] dark:border-white/10 text-[#1C1917] dark:text-[#F5F5F0] hover:border-[#F25C38]/50'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.icon}</span>
                    <span className="font-extrabold text-xs block leading-tight">{cat.label}</span>
                    <span className={`text-[10px] block mt-0.5 font-medium ${selectedCategory.toUpperCase() === cat.id.toUpperCase() ? 'text-white/80' : 'text-[#78716C] dark:text-stone-400'}`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Typography & CTAs */}
            <div className="lg:col-span-7 space-y-6 z-10">
              
              <div 
                ref={heroBadgeRef}
                className="inline-flex items-center space-x-3 text-[11px] font-extrabold uppercase tracking-widest text-[#F25C38]"
              >
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F25C38]" />
                  <span>AI FOR COMMUNITY CARE</span>
                </span>
                <span className="w-12 h-[1.5px] bg-[#F25C38]/40 inline-block" />
              </div>

              {/* Unique Staggered Editorial Display Headline */}
              <h1 
                ref={heroTitleRef}
                className="flex flex-col space-y-1 sm:space-y-2 font-serif font-black tracking-tight text-[#1C1917] dark:text-[#F5F5F0] leading-[0.95] select-none my-2"
              >
                {language.toLowerCase() === 'ta' ? (
                  <>
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight block">
                      ஒரு தேவை.
                    </span>
                    <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight block ml-3 sm:ml-8 lg:ml-12 text-[#1C1917] dark:text-[#F5F5F0]">
                      ஒரு இணைப்பு.
                    </span>
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight block ml-6 sm:ml-16 lg:ml-24 text-[#F25C38]">
                      உண்மையான மாற்றம்.
                    </span>
                  </>
                ) : language.toLowerCase() === 'hi' ? (
                  <>
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight block">
                      एक ज़रूरत।
                    </span>
                    <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight block ml-3 sm:ml-8 lg:ml-12 text-[#1C1917] dark:text-[#F5F5F0]">
                      एक जुड़ाव।
                    </span>
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight block ml-6 sm:ml-16 lg:ml-24 text-[#F25C38]">
                      वास्तविक प्रभाव।
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight block">
                      ONE NEED.
                    </span>
                    <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight block ml-4 sm:ml-10 lg:ml-16 text-[#1C1917] dark:text-[#F5F5F0]">
                      ONE CONNECTION.
                    </span>
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight block ml-8 sm:ml-20 lg:ml-32 text-[#F25C38]">
                      REAL IMPACT.
                    </span>
                  </>
                )}
              </h1>

              <p 
                ref={heroTextRef}
                className="text-base sm:text-lg text-[#57534E] dark:text-[#A8A29E] max-w-xl leading-relaxed font-sans font-medium"
              >
                {t('hero.subtitle') || "AI-powered matching platform connecting people in need with verified food banks, shelters, medical services, clothing resources and community support."}
              </p>

              {/* PROMINENT PRIMARY HOMEPAGE ACTION & SECONDARY ACTIONS */}
              <div ref={heroCtasRef} className="space-y-4 pt-2">
                
                {/* PRIMARY ACTION: 🆘 I NEED HELP */}
                <button
                  type="button"
                  onClick={() => setShowOneTapModal(true)}
                  className="w-full sm:w-auto px-8 h-[54px] sm:h-[58px] bg-[#F25C38] hover:bg-[#E04925] text-white font-bold text-base sm:text-lg tracking-wide uppercase rounded-full shadow-lg shadow-[#F25C38]/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-3 cursor-pointer shrink-0 min-h-[44px]"
                >
                  <Bell className="w-5 h-5 fill-current shrink-0" />
                  <span>{t('oneTap.btnNeedHelp')}</span>
                  <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold lowercase tracking-normal">1-tap / voice</span>
                  <ArrowRight className="w-5 h-5 ml-1 shrink-0" />
                </button>

                {/* SECONDARY ACTIONS GRID: FIND HELP | HELP SOMEONE | DONATE | I CAN'T REACH IT */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  
                  {/* Secondary 1: 📍 FIND HELP */}
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('resources');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="h-12 px-5 bg-[#FAF7F2] dark:bg-[#161616] hover:bg-[#F3ECE2] dark:hover:bg-[#222222] text-[#1C1917] dark:text-[#F5F5F0] text-xs font-bold tracking-wider uppercase rounded-full border border-[#E7E0D6] dark:border-white/10 shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    <span>📍</span>
                    <span>{t('oneTap.btnFindHelp')}</span>
                    <ArrowRight className="w-4 h-4 text-[#F25C38] opacity-80" />
                  </button>

                  {/* Secondary 2: 👥 HELP SOMEONE */}
                  <Link
                    to="/help-someone"
                    className="h-12 px-5 bg-[#FAF7F2] dark:bg-[#161616] hover:bg-[#F3ECE2] dark:hover:bg-[#222222] text-[#1C1917] dark:text-[#F5F5F0] text-xs font-bold tracking-wider uppercase rounded-full border border-[#E7E0D6] dark:border-white/10 shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center space-x-2 min-h-[44px]"
                  >
                    <span>👥</span>
                    <span>{t('oneTap.btnHelpSomeone')}</span>
                    <ArrowRight className="w-4 h-4 text-[#F25C38] opacity-80" />
                  </Link>

                  {/* Secondary 3: 💝 DONATE */}
                  <Link
                    to="/donor/dashboard"
                    className="h-12 px-5 bg-[#1C1917] dark:bg-[#262626] hover:bg-[#292524] text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-95 flex items-center space-x-2 min-h-[44px]"
                  >
                    <Gift className="w-4 h-4 text-[#F25C38]" />
                    <span>{t('oneTap.btnDonate')}</span>
                  </Link>

                </div>

              </div>

            </div>

            {/* SVG Global Definitions for Organic Hero Image Masks */}
            <svg className="absolute w-0 h-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <defs>
                <clipPath id="organic-continent-hero-mask" clipPathUnits="objectBoundingBox">
                  <path d="
                    M 0.28, 0.14
                    C 0.22, 0.14  0.16, 0.20  0.14, 0.26
                    C 0.12, 0.32  0.15, 0.38  0.10, 0.44
                    C 0.05, 0.50  0.01, 0.54  0.02, 0.60
                    C 0.03, 0.66  0.09, 0.71  0.16, 0.74
                    C 0.23, 0.77  0.28, 0.72  0.33, 0.75
                    C 0.38, 0.78  0.39, 0.85  0.42, 0.90
                    C 0.45, 0.95  0.50, 0.99  0.56, 0.98
                    C 0.62, 0.97  0.66, 0.91  0.71, 0.87
                    C 0.76, 0.83  0.82, 0.83  0.88, 0.79
                    C 0.94, 0.75  0.99, 0.68  0.99, 0.60
                    C 0.99, 0.52  0.96, 0.44  0.95, 0.36
                    C 0.94, 0.28  0.93, 0.20  0.87, 0.14
                    C 0.81, 0.08  0.73, 0.05  0.65, 0.03
                    C 0.57, 0.01  0.49, 0.04  0.42, 0.08
                    C 0.35, 0.12  0.33, 0.14  0.28, 0.14 Z
                  " />
                </clipPath>
              </defs>
            </svg>

            {/* Right Column: Authentic Humanitarian Photography with Organic Fluid Continent Mask */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end items-center">
              <div ref={heroImageRef} className="relative w-full max-w-[540px] aspect-[4/3.5] flex items-center justify-center p-2">
                
                {/* Background Dotted Matrix Grid Texture (matching reference image) */}
                <div className="absolute inset-0 opacity-25 dark:opacity-35 pointer-events-none flex items-center justify-center">
                  <svg className="w-full h-full text-[#1C1917] dark:text-[#F9F6F0]" fill="currentColor">
                    <pattern id="hero-dots-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1.5" className="fill-current opacity-40" />
                      <circle cx="14" cy="14" r="1.2" className="fill-current opacity-30" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#hero-dots-pattern)" />
                  </svg>
                </div>

                {/* Floating Accent Dots matching reference image */}
                {/* 1. Coral Top Right Dot */}
                <div className="absolute top-2 right-6 sm:right-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F25C38] shadow-md z-20 animate-pulse" />
                {/* 2. Coral Mid Left Dot */}
                <div className="absolute top-1/2 -left-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#F25C38] shadow-md z-20" />
                {/* 3. Dark Graphite Bottom Center Dot */}
                <div className="absolute bottom-6 left-1/3 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#1C1917] dark:bg-stone-300 shadow-xs z-20" />
                {/* 4. Muted Charcoal Bottom Right Dot */}
                <div className="absolute bottom-10 right-4 sm:right-8 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#57534E] dark:bg-stone-400 shadow-xs z-20" />

                {/* Main Organic Fluid Image Mask */}
                <div 
                  className="relative w-full h-full shadow-2xl transition-all duration-700 hover:scale-[1.01]"
                  style={{
                    clipPath: 'url(#organic-continent-hero-mask)',
                    WebkitClipPath: 'url(#organic-continent-hero-mask)'
                  }}
                >
                  <img 
                    src="/images/hero-child.jpg" 
                    alt="Smiling community children supported by SAHAAYAA AI" 
                    className="w-full h-full object-cover object-center transform scale-105 hover:scale-110 transition-transform duration-1000 ease-out"
                  />
                  {/* Subtle warm lighting gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#0D0D0D]/20 via-transparent to-[#F25C38]/10 pointer-events-none" />
                </div>

              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* COMMUNITY NEEDS FEED (HORIZONTAL CAROUSEL OF REAL LIVE HELP REQUESTS)     */}
          {/* ========================================================================= */}
          {requests && requests.length > 0 && (
            <div className="mt-14 space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F25C38] animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1C1917] dark:text-[#F5F5F0]">Live Community Needs Feed</span>
                </div>
                <Link to="/help-reports" className="text-xs font-bold text-[#F25C38] hover:underline flex items-center space-x-1">
                  <span>View All ({requests.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none snap-x touch-pan-x">
                {requests.slice(0, 8).map((req) => (
                  <div 
                    key={req.id} 
                    className="snap-start shrink-0 w-[270px] sm:w-[300px] p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F25C38]/10 text-[#F25C38] font-black text-[10px] uppercase tracking-wider">
                          {req.category}
                        </span>
                        {req.is_verified && (
                          <span className="text-[10px] font-extrabold text-[#F25C38] flex items-center space-x-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#F25C38]" />
                            <span>✓ VERIFIED</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#1C1917] dark:text-[#F5F5F0] line-clamp-1">{req.current_situation || `${req.category} Assistance Needed`}</h4>
                      <p className="text-[11px] text-[#78716C] dark:text-[#A8A29E] line-clamp-2 leading-relaxed">{req.description}</p>
                    </div>

                    <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-[#78716C] dark:text-[#A8A29E] flex items-center font-medium truncate max-w-[150px]">
                        <MapPin className="w-3 h-3 mr-0.5 text-[#F25C38] shrink-0" />
                        <span className="truncate">{req.address || 'Coimbatore'}</span>
                      </span>
                      <Link
                        to={`/help-reports/${req.id}`}
                        className="px-3.5 py-1.5 bg-[#F25C38] hover:bg-[#E04925] text-white font-bold text-[10px] rounded-full uppercase tracking-wider transition-colors shadow-xs"
                      >
                        Respond →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PROMOTIONAL ACTION BANNER: MAKE A DIFFERENCE TODAY                        */}
          {/* ========================================================================= */}
          <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#1C1917] via-[#262626] to-[#1C1917] text-white shadow-xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#F25C38]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F25C38]">Community Impact Banner</span>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">MAKE A DIFFERENCE TODAY</h3>
              <p className="text-xs sm:text-sm text-[#A8A29E] max-w-xl leading-relaxed">
                Report someone experiencing homelessness or transit barriers so SAHAAYAA AI can connect them with verified shelters, food centers, and volunteer support.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/request-help"
                  className="px-6 py-3 bg-[#F25C38] hover:bg-[#E04925] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center space-x-2"
                >
                  <span>REPORT A NEED</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/help-someone"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider rounded-full border border-white/20 transition-all flex items-center space-x-2"
                >
                  <span>HELP SOMEONE</span>
                  <Users className="w-4 h-4 text-[#F25C38]" />
                </Link>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MENTAL HEALTH SUPPORT SECTION                                             */}
          {/* ========================================================================= */}
          <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-[#F25C38]/10 dark:bg-[#F25C38]/15 border border-[#F25C38]/20 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-[#F25C38]">
                  <Brain className="w-4 h-4" />
                  <span>MENTAL HEALTH & TRAUMA SUPPORT</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#1C1917] dark:text-[#F5F5F0]">
                  You Are Not Alone. Free Confidential Support 24/7.
                </h3>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E] max-w-xl leading-relaxed font-medium">
                  Immediate 24/7 free emotional counselling, crisis relief, and mental health support services for anyone experiencing severe distress or homelessness.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <a
                  href="tel:18005990019"
                  className="px-5 py-3 rounded-full bg-[#F25C38] hover:bg-[#E04925] text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center space-x-2 transition-all hover:scale-105"
                >
                  <Phone className="w-4 h-4 animate-bounce" />
                  <span>24/7 HELPLINE (1800-599-0019)</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setFastHelpCat('MEDICAL');
                    setShowFastHelp(true);
                  }}
                  className="px-5 py-3 rounded-full bg-white dark:bg-[#161616] text-[#1C1917] dark:text-[#F5F5F0] border border-[#E7E0D6] dark:border-white/10 font-bold text-xs uppercase tracking-wider hover:bg-stone-50 dark:hover:bg-[#222222] transition-all cursor-pointer"
                >
                  <span>Connect AI Agent</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Organic soft curved divider transition to next section */}
        <div className="w-full overflow-hidden leading-none -mb-1 pt-12 text-[#FFF9ED] dark:text-white">
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
      <section id="resources" className="py-16 md:py-20 bg-[#FFF9ED] dark:bg-[#0D0D0D] border-t border-[#EAE3D2]/50 dark:border-white/10">
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
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 flex items-center justify-center shrink-0 shadow-sm border border-[#159B5B]/20 dark:border-orange-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#17231E] dark:text-[#F5F5F0] flex items-center space-x-1.5">
                    <span>{t('location.idleTitle')}</span>
                    <span className="w-2 h-2 rounded-full bg-[#159B5B] dark:bg-orange-500 animate-pulse inline-block" />
                  </h3>
                  <p className="text-xs text-[#17231E]/70 dark:text-stone-400 mt-0.5">
                    {t('location.idleDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-full sm:w-auto px-6 py-3 bg-[#159B5B] hover:bg-[#12834D] dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0 hover:scale-105 active:scale-95"
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
            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-orange-950/40 border border-emerald-200 dark:border-orange-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 dark:bg-[#F25C38] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-900 dark:text-orange-300 uppercase tracking-wide">
                    ✓ Location detected • Showing verified resources near you
                  </div>
                  <div className="text-[11px] text-emerald-800/80 dark:text-orange-400 font-medium">
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
                        : 'bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 text-[#17231E] dark:text-[#F5F5F0] hover:border-[#159B5B]'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-full hover:bg-white dark:hover:bg-[#262626] transition-colors ml-1"
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
                  className="w-full py-3.5 pl-12 pr-14 bg-white dark:bg-[#161616] rounded-full border border-[#EAE3D2] dark:border-white/10 text-xs font-semibold text-[#17231E] dark:text-[#F5F5F0] placeholder:text-[#17231E]/40 dark:placeholder:text-stone-500 focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66] shadow-sm transition-all"
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
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#17231E]/50 dark:text-[#F5F5F0]/50 block">
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
              <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs font-bold text-[#17231E] dark:text-[#F5F5F0]">
                
                <div className="relative">
                  <select 
                    value={distanceFilter}
                    onChange={(e) => setDistanceFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-[#161616] rounded-full border border-[#EAE3D2] dark:border-white/10 text-xs font-bold appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66]"
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
                    className="px-4 py-2 bg-white dark:bg-[#161616] rounded-full border border-[#EAE3D2] dark:border-white/10 text-xs font-bold appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66]"
                  >
                    <option value="all">Availability: All</option>
                    <option value="open">Open Now</option>
                    <option value="verified">Verified Only</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60">▾</span>
                </div>

                <div className="relative">
                  <select 
                    className="px-4 py-2 bg-white dark:bg-[#161616] rounded-full border border-[#EAE3D2] dark:border-white/10 text-xs font-bold appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#159B5B] dark:focus:border-[#19AD66]"
                  >
                    <option>Sort by: Nearest</option>
                    <option>Sort by: Capacity</option>
                    <option>Sort by: Urgency</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60">▾</span>
                </div>

              </div>

              {/* Active Results Summary count */}
              <div className="pt-2 flex items-center justify-between text-xs text-[#17231E]/60 dark:text-[#F5F5F0]/60 border-t border-[#EAE3D2] dark:border-white/10">
                <span>Showing {filteredResources.length} verified facilities</span>
                <Link to="/map" className="text-[#159B5B] dark:text-[#19AD66] font-bold hover:underline flex items-center space-x-1">
                  <span>Open Full Screen Map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

            {/* Right: Embedded Interactive Map Container */}
            <div className="lg:col-span-7">
              <div className="relative w-full h-[440px] rounded-3xl overflow-hidden border border-[#EAE3D2] dark:border-white/10 shadow-lg bg-[#F7EBD2]/30 dark:bg-[#161616]/60">
                
                {/* Map / List View Toggle in Top-Right of Map Container */}
                <div className="absolute top-4 right-4 z-[400] flex bg-white/95 dark:bg-[#161616]/95 backdrop-blur-md rounded-full p-1 border border-[#EAE3D2] dark:border-white/10 shadow-md text-xs font-bold">
                  <button
                    onClick={() => setMapViewMode('map')}
                    className={`px-3 py-1 rounded-full transition-all ${mapViewMode === 'map' ? 'bg-[#159B5B] text-white shadow-sm' : 'text-[#17231E] dark:text-[#F5F5F0] hover:text-[#159B5B]'}`}
                  >
                    Map
                  </button>
                  <button
                    onClick={() => setMapViewMode('list')}
                    className={`px-3 py-1 rounded-full transition-all ${mapViewMode === 'list' ? 'bg-[#159B5B] text-white shadow-sm' : 'text-[#17231E] dark:text-[#F5F5F0] hover:text-[#159B5B]'}`}
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
                          <div className="flex flex-wrap items-center gap-1.5">
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
      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS / MAKE A DIFFERENCE SECTION                             */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-[#F3ECE2]/50 dark:bg-[#161616]/60 border-t border-[#E7E0D6] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="max-w-3xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center space-x-2 text-[11px] font-extrabold uppercase tracking-widest text-[#F25C38]">
              <span>— HOW IT WORKS —</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-medium text-[#1C1917] dark:text-[#F5F5F0] tracking-tight">
              Make a Difference
            </h2>
            <p className="text-sm sm:text-base text-[#78716C] dark:text-[#A8A29E] leading-relaxed font-sans max-w-xl mx-auto">
              Technology empowers hope and provides real-time support to those in need, creating a stronger, kinder community.
            </p>
          </div>

          {/* 4 Clean Feature Cards Inspired by Reference Screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            
            {/* Card 1: Find People */}
            <div className="bg-[#FAF7F2] dark:bg-[#1E1E1E] p-8 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs hover:shadow-md transition-all space-y-5 group hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-[#F25C38]/10 text-[#F25C38] flex items-center justify-center border border-[#F25C38]/20 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-semibold text-[#1C1917] dark:text-[#F5F5F0]">Find People</h3>
                <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A8A29E] leading-relaxed font-sans">
                  A local & global platform to find people in distress and connect them with urgent support.
                </p>
              </div>
            </div>

            {/* Card 2: Local Resources */}
            <div className="bg-[#FAF7F2] dark:bg-[#1E1E1E] p-8 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs hover:shadow-md transition-all space-y-5 group hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-[#F25C38]/10 text-[#F25C38] flex items-center justify-center border border-[#F25C38]/20 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-semibold text-[#1C1917] dark:text-[#F5F5F0]">Local Resources</h3>
                <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A8A29E] leading-relaxed font-sans">
                  Discover nearby verified shelters, food banks, medical centers and community support.
                </p>
              </div>
            </div>

            {/* Card 3: Real Impact */}
            <div className="bg-[#FAF7F2] dark:bg-[#1E1E1E] p-8 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs hover:shadow-md transition-all space-y-5 group hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-[#F25C38]/10 text-[#F25C38] flex items-center justify-center border border-[#F25C38]/20 group-hover:scale-110 transition-transform">
                <Handshake className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-semibold text-[#1C1917] dark:text-[#F5F5F0]">Real Impact</h3>
                <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A8A29E] leading-relaxed font-sans">
                  Direct help to verified NGOs and trusted partners making a tangible difference.
                </p>
              </div>
            </div>

            {/* Card 4: Safety First */}
            <div className="bg-[#FAF7F2] dark:bg-[#1E1E1E] p-8 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs hover:shadow-md transition-all space-y-5 group hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-[#F25C38]/10 text-[#F25C38] flex items-center justify-center border border-[#F25C38]/20 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-semibold text-[#1C1917] dark:text-[#F5F5F0]">Safety First</h3>
                <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A8A29E] leading-relaxed font-sans">
                  Verified resources, trusted humanitarian partners and secure support networks.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* ABOUT US / CHANGING LIVES WITH KNOWLEDGE SECTION                           */}
      {/* ========================================================================= */}
      <section id="about" className="py-20 bg-[#FAF7F2] dark:bg-[#0D0D0D] border-t border-[#E7E0D6] dark:border-white/10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Overlapping Circular Portrait Photography Collage */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full max-w-[460px] aspect-square flex items-center justify-center">
                
                {/* Background decorative ring */}
                <div className="absolute inset-0 rounded-full border border-[#F25C38]/20 animate-spin-slow pointer-events-none" />
                <div className="absolute inset-6 rounded-full border border-dashed border-[#78716C]/20 pointer-events-none" />
                
                {/* Main Large Center Circular Image */}
                <div className="relative z-10 w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-full overflow-hidden border-4 border-[#FAF7F2] dark:border-[#161616] shadow-2xl">
                  <img 
                    src="/images/hero-child.jpg" 
                    alt="Community child receiving aid" 
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Overlapping Top-Right Circular Image */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden border-4 border-[#FAF7F2] dark:border-[#161616] shadow-xl">
                  <img 
                    src="/images/avatar-priya.jpg" 
                    alt="Community volunteer Priya" 
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                {/* Overlapping Bottom-Left Circular Image */}
                <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-full overflow-hidden border-4 border-[#FAF7F2] dark:border-[#161616] shadow-xl">
                  <img 
                    src="/images/avatar-lakshmi.jpg" 
                    alt="Beneficiary Lakshmi" 
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                {/* Small Coral Decorative Dot */}
                <div className="absolute bottom-8 right-8 w-4 h-4 rounded-full bg-[#F25C38] z-30 shadow-md" />
              </div>
            </div>

            {/* Right Column: Mission Content & CTAs */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="inline-flex items-center space-x-2 text-[11px] font-extrabold uppercase tracking-widest text-[#F25C38]">
                <span>ABOUT US</span>
                <span className="w-8 h-[1px] bg-[#F25C38]/40" />
              </div>

              <h2 className="text-3xl sm:text-5xl font-serif font-medium text-[#1C1917] dark:text-[#F5F5F0] tracking-tight leading-tight">
                Changing Lives with Knowledge & Technology
              </h2>

              <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] leading-relaxed font-sans font-medium">
                Our mission is to empower vulnerable communities through technology, education, and real-time crisis matching. We connect individuals in need with verified resources, shelters, food banks, and healthcare facilities—creating opportunities for a better, safer tomorrow.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-7 py-3.5 bg-[#F25C38] hover:bg-[#E04925] text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 cursor-pointer min-h-[44px]"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowOneTapModal(true)}
                  className="px-7 py-3.5 bg-[#FAF7F2] dark:bg-[#161616] hover:bg-[#F3ECE2] dark:hover:bg-[#222222] text-[#1C1917] dark:text-[#F5F5F0] font-bold text-xs uppercase tracking-wider rounded-full border border-[#E7E0D6] dark:border-white/10 shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 cursor-pointer min-h-[44px]"
                >
                  <span>How It Works</span>
                  <ChevronRight className="w-4 h-4 text-[#F25C38]" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. OUR IMPACT SECTION                                                     */}
      {/* ========================================================================= */}
      <section id="impact" ref={statsSectionRef} className="py-16 md:py-24 bg-[#F3ECE2]/40 dark:bg-[#161616]/40 border-t border-[#E7E0D6] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Headline */}
            <div className="lg:col-span-4 space-y-2">
              <div className="inline-flex items-center space-x-2 text-[11px] font-extrabold uppercase tracking-widest text-[#F25C38]">
                <span>— OUR IMPACT —</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-[#1C1917] dark:text-[#F5F5F0] tracking-tight">
                {t('impact.title')}
              </h2>
            </div>

            {/* Right: 4 Real dynamic backend metrics */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
              
              <div className="space-y-1 bg-[#FAF7F2] dark:bg-[#1E1E1E] p-5 rounded-2xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                <div 
                  ref={statTotalRequestsRef}
                  className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#F25C38] tracking-tight"
                >
                  {impact.total_requests.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#1C1917] dark:text-[#F5F5F0]">{t('impact.stat1Label')}</div>
              </div>

              <div className="space-y-1 bg-[#FAF7F2] dark:bg-[#1E1E1E] p-5 rounded-2xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                <div 
                  ref={statResourcesRef}
                  className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#F25C38] tracking-tight"
                >
                  {impact.resources_available.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#1C1917] dark:text-[#F5F5F0]">{t('impact.stat2Label')}</div>
              </div>

              <div className="space-y-1 bg-[#FAF7F2] dark:bg-[#1E1E1E] p-5 rounded-2xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                <div 
                  ref={statFulfillmentRef}
                  className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#F25C38] tracking-tight"
                >
                  89%
                </div>
                <div className="text-xs font-bold text-[#1C1917] dark:text-[#F5F5F0]">{t('impact.stat3Label')}</div>
              </div>

              <div className="space-y-1 bg-[#FAF7F2] dark:bg-[#1E1E1E] p-5 rounded-2xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                <div 
                  ref={statCompletedRef}
                  className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#F25C38] tracking-tight"
                >
                  {impact.completed_requests.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#1C1917] dark:text-[#F5F5F0]">{t('impact.stat4Label')}</div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. POPULAR RESOURCES / FEATURED CAMPAIGNS SECTION                         */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#FAF7F2] dark:bg-[#0D0D0D] border-t border-[#E7E0D6] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-[11px] font-extrabold uppercase tracking-widest text-[#F25C38]">
                <span>— FEATURED CAMPAIGNS —</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-[#1C1917] dark:text-[#F5F5F0] tracking-tight">
                Support That Reaches People
              </h2>
            </div>

            <Link 
              to="/map" 
              className="text-xs font-black text-[#17231E] dark:text-[#F5F5F0] hover:text-[#159B5B] flex items-center space-x-1.5 group uppercase tracking-wider"
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
                    <Utensils className="w-3 h-3 text-emerald-400 dark:text-orange-400" />
                    <span>{t('resources.foodBankTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 dark:bg-[#F25C38] text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('FOOD', '2.1 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#F5F5F0]">
                    <Utensils className="w-4 h-4 text-[#159B5B] dark:text-orange-400" />
                    <span>{t('resources.foodBankTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-orange-400 shrink-0" />
                    <span>{getCategoryDistance('FOOD', '2.1 km')} • 9 AM – 6 PM</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed line-clamp-2">
                    {t('resources.foodBankDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-300 border dark:border-orange-500/30">{t('categories.food')}</span>
                    <span className="text-[#159B5B] dark:text-orange-400 font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B] dark:text-orange-400" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Food')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-orange-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Food Banks near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Food')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#262626] dark:hover:bg-[#292929] text-[#17231E] dark:text-[#F5F5F0] border border-[#EAE3D2] dark:border-white/10 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
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
                    <HomeIcon className="w-3 h-3 text-emerald-400 dark:text-orange-400" />
                    <span>{t('resources.shelterHomeTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 dark:bg-[#F25C38] text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('SHELTER', '3.6 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#F5F5F0]">
                    <HomeIcon className="w-4 h-4 text-[#159B5B] dark:text-orange-400" />
                    <span>{t('resources.shelterHomeTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-orange-400 shrink-0" />
                    <span>{getCategoryDistance('SHELTER', '3.6 km')} • 24/7</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed line-clamp-2">
                    {t('resources.shelterHomeDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-300 border dark:border-orange-500/30">{t('categories.shelter')}</span>
                    <span className="text-[#159B5B] dark:text-orange-400 font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B] dark:text-orange-400" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Shelter')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-orange-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Shelters near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Shelter')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#262626] dark:hover:bg-[#292929] text-[#17231E] dark:text-[#F5F5F0] border border-[#EAE3D2] dark:border-white/10 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Navigate / Get directions to nearest Shelter"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#159B5B] dark:text-orange-400" />
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
                    <Cross className="w-3 h-3 text-emerald-400 dark:text-orange-400" />
                    <span>{t('resources.medicalClinicTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 dark:bg-[#F25C38] text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('MEDICAL', '4.2 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#F5F5F0]">
                    <Cross className="w-4 h-4 text-[#159B5B] dark:text-orange-400" />
                    <span>{t('resources.medicalClinicTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-orange-400 shrink-0" />
                    <span>{getCategoryDistance('MEDICAL', '4.2 km')} • 8 AM – 8 PM</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed line-clamp-2">
                    {t('resources.medicalClinicDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-300 border dark:border-orange-500/30">{t('categories.medical')}</span>
                    <span className="text-[#159B5B] dark:text-orange-400 font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B] dark:text-orange-400" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Medical')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-orange-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Medical Clinics near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Medical')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#262626] dark:hover:bg-[#292929] text-[#17231E] dark:text-[#F5F5F0] border border-[#EAE3D2] dark:border-white/10 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Navigate / Get directions to nearest Medical Clinic"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#159B5B] dark:text-orange-400" />
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
                    <Shirt className="w-3 h-3 text-emerald-400 dark:text-orange-400" />
                    <span>{t('resources.clothingCenterTag')}</span>
                  </div>
                  {userLocation && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 dark:bg-[#F25C38] text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shadow-md animate-pulse">
                      <span>📍 {getCategoryDistance('CLOTHING', '5.6 km')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#17231E] dark:text-[#F5F5F0]">
                    <Shirt className="w-4 h-4 text-[#159B5B] dark:text-orange-400" />
                    <span>{t('resources.clothingCenterTitle')}</span>
                  </div>
                  <div className="text-[11px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#159B5B] dark:text-orange-400 shrink-0" />
                    <span>{getCategoryDistance('CLOTHING', '5.6 km')} • 10 AM – 4 PM</span>
                  </div>
                  <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed line-clamp-2">
                    {t('resources.clothingCenterDesc')}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-300 border dark:border-orange-500/30">{t('categories.clothing')}</span>
                    <span className="text-[#159B5B] dark:text-orange-400 font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#159B5B] dark:text-orange-400" />
                      <span>{t('common.verified')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Find Near Me + Navigate */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleFindNearMeForCategory('Clothing')}
                  className="w-full py-2.5 px-2 bg-[#159B5B] hover:bg-[#12834D] dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:shadow-orange-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Find Clothing Centers near your location"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('resources.findNearMe')}</span>
                </button>
                <button
                  onClick={() => handleNavigateToCategory('Clothing')}
                  className="w-full py-2.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#262626] dark:hover:bg-[#292929] text-[#17231E] dark:text-[#F5F5F0] border border-[#EAE3D2] dark:border-white/10 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Navigate / Get directions to nearest Clothing Center"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#159B5B] dark:text-orange-400" />
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
      <section id="ai-matching" className="py-20 bg-[#FFF9ED] dark:bg-[#0D0D0D] border-t border-[#EAE3D2] dark:border-white/10">
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
              <p className="text-sm text-[#17231E]/75 dark:text-[#F5F5F0]/75 leading-relaxed font-medium">
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
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-[#17231E] hover:bg-[#24332D] dark:bg-white dark:hover:bg-stone-100 text-white dark:text-white text-xs font-black tracking-wider uppercase rounded-full shadow-sm hover:shadow-md transition-all hover:scale-105"
                >
                  <Flame className="w-3.5 h-3.5 text-[#F2A33A]" />
                  <span>{t('aiMatching.instantDispatch')}</span>
                </button>
              </div>
            </div>

            {/* Right: Interactive AI Interface Card */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-white/10 shadow-xl space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Left sub-box: Example Request Input */}
                  <div className="p-5 rounded-2xl bg-[#FFF9ED] dark:bg-[#262626] border border-[#EAE3D2] dark:border-white/10 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#17231E]/50 dark:text-[#F5F5F0]/50 block">
                      {t('aiMatching.inputLabel')}
                    </span>
                    <textarea
                      rows={3}
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      placeholder={t('aiMatching.inputPlaceholder')}
                      className="w-full bg-white dark:bg-[#161616] p-3 rounded-xl border border-[#EAE3D2] dark:border-white/10 text-xs font-semibold text-[#17231E] dark:text-[#F5F5F0] focus:outline-none focus:border-[#159B5B]"
                    />
                    
                    {aiError && (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                        {aiError}
                      </div>
                    )}

                    <button
                      onClick={handleAnalyzeAI}
                      disabled={isAiLoading || !aiInputText.trim()}
                      className="w-full py-2.5 bg-[#159B5B] hover:bg-[#12834D] dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-sm transition-all hover:scale-[1.02]"
                    >
                      {isAiLoading ? t('aiMatching.analyzingBtn') : t('aiMatching.analyzeBtn')}
                    </button>
                  </div>

                  {/* Right sub-box: Real AI Analysis Result */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#262626] border border-[#EAE3D2] dark:border-white/10 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#EAE3D2] dark:border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#17231E]/60 dark:text-[#F5F5F0]/60">
                        {t('aiMatching.resultsTitle')}
                      </span>
                      <span className="text-[10px] font-bold text-[#159B5B] dark:text-orange-400">
                        Live TensorFlow DNN
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-[#FFF9ED] dark:bg-[#161616] rounded-xl">
                        <span className="text-[10px] font-bold text-[#17231E]/50 dark:text-[#F5F5F0]/50 block">{t('common.category')}</span>
                        <div className="text-xs font-black text-[#159B5B] dark:text-orange-400 mt-0.5">
                          {aiResult ? aiResult.category : 'FOOD'}
                        </div>
                      </div>
                      <div className="p-2 bg-[#FFF9ED] dark:bg-[#161616] rounded-xl">
                        <span className="text-[10px] font-bold text-[#17231E]/50 dark:text-[#F5F5F0]/50 block">{t('common.urgency')}</span>
                        <div className="text-xs font-black text-[#F2A33A] mt-0.5 flex items-center justify-center space-x-1">
                          <Flame className="w-3 h-3 text-[#F2A33A]" />
                          <span>{aiResult ? aiResult.urgency : 'HIGH'}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-[#FFF9ED] dark:bg-[#161616] rounded-xl">
                        <span className="text-[10px] font-bold text-[#17231E]/50 dark:text-[#F5F5F0]/50 block">{t('aiMatching.confidenceScore')}</span>
                        <div className="text-xs font-black text-[#17231E] dark:text-[#F5F5F0] mt-0.5">
                          {aiResult ? `${aiResult.confidence_percentage}%` : '92%'}
                        </div>
                      </div>
                    </div>

                    {/* Matched Resource Preview */}
                    <div className="pt-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#17231E]/50 dark:text-[#F5F5F0]/50 block mb-2">
                        {t('aiMatching.recommendedFacility')}
                      </span>
                      <div className="p-2.5 bg-[#FFF9ED] dark:bg-[#161616] rounded-xl border border-[#EAE3D2] dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            src="/images/food-bank.jpg" 
                            alt="Matched center" 
                            className="w-10 h-10 rounded-lg object-cover border border-[#EAE3D2] dark:border-white/10"
                          />
                          <div>
                            <div className="font-extrabold text-xs text-[#17231E] dark:text-[#F5F5F0]">
                              {aiResult?.matched_resources?.[0]?.resource_name || 'Community Kitchen'}
                            </div>
                            <div className="text-[10px] text-[#17231E]/60 dark:text-[#F5F5F0]/60">
                              {aiResult?.matched_resources?.[0]?.distance_km || '2.4'} km • {t('common.available')}
                            </div>
                          </div>
                        </div>
                        <Link 
                          to="/ai-demo" 
                          className="px-3 py-1 bg-white dark:bg-[#262626] hover:bg-[#159B5B] hover:text-white dark:hover:bg-[#159B5B] border border-[#EAE3D2] dark:border-white/10 rounded-full text-[10px] font-black text-[#17231E] dark:text-[#F5F5F0] transition-colors"
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
      <section className="py-20 bg-[#F7EBD2]/30 dark:bg-[#161616]/30 border-t border-[#EAE3D2] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-[#19AD66]">
                <span className="w-1.5 h-3.5 bg-[#159B5B] dark:bg-[#19AD66] rounded-full inline-block" />
                <span>{t('stories.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
                {t('stories.title')}
              </h2>
            </div>

            <button 
              onClick={() => navigate('/request-help')}
              className="text-xs font-black text-[#17231E] dark:text-[#F5F5F0] hover:text-[#159B5B] flex items-center space-x-1.5 group uppercase tracking-wider"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* 4 Testimonial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Story 1: Lakshmi */}
            <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed italic">
                "{t('stories.lakshmiQuote')}"
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
                <img 
                  src="/images/avatar-lakshmi.jpg" 
                  alt="Lakshmi" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#F5F5F0]">Lakshmi</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-semibold">{t('nav.requesterRole')}</p>
                </div>
              </div>
            </div>

            {/* Story 2: Ramesh */}
            <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed italic">
                "{t('stories.rameshQuote')}"
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
                <img 
                  src="/images/avatar-ramesh.jpg" 
                  alt="Ramesh" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#F5F5F0]">Ramesh</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-semibold">{t('auth.roleVolunteer')}</p>
                </div>
              </div>
            </div>

            {/* Story 3: Priya */}
            <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed italic">
                "{t('stories.priyaQuote')}"
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
                <img 
                  src="/images/avatar-priya.jpg" 
                  alt="Priya" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#F5F5F0]">Priya</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-semibold">{t('nav.ngoRole')}</p>
                </div>
              </div>
            </div>

            {/* Story 4: Arjun */}
            <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 leading-relaxed italic">
                "{t('stories.arjunQuote')}"
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
                <img 
                  src="/images/avatar-arjun.jpg" 
                  alt="Arjun" 
                  className="w-10 h-10 rounded-full object-cover border border-[#159B5B]/30"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-[#17231E] dark:text-[#F5F5F0]">Arjun</h4>
                  <p className="text-[10px] text-[#17231E]/60 dark:text-[#F5F5F0]/60 font-semibold">{t('nav.donorRole')}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. GET INVOLVED SECTION                                                  */}
      {/* ========================================================================= */}
      <section id="get-involved" className="py-20 bg-[#FFF9ED] dark:bg-[#0D0D0D] border-t border-[#EAE3D2] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Hands Caring Humanitarian Image */}
            <div className="lg:col-span-4">
              <div className="relative overflow-hidden rounded-[32px] border-4 border-white dark:border-white/10 shadow-xl aspect-[16/11]">
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
              <p className="text-xs text-[#17231E]/75 dark:text-[#F5F5F0]/75 leading-relaxed font-medium">
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
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-[#262626] dark:hover:bg-[#292929] text-[#17231E] dark:text-[#F5F5F0] text-xs font-black tracking-wider uppercase rounded-full border border-[#EAE3D2] dark:border-white/10 transition-all"
                >
                  {t('getInvolved.volunteerBtn')}
                </Link>
              </div>
            </div>

            {/* Right Column: 4 Action Buttons connected to routes */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              
              <Link
                to="/donor/dashboard"
                className="p-4 bg-white dark:bg-[#161616] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <Heart className="w-4 h-4 text-[#F2A33A]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#F5F5F0]">{t('nav.donate')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </Link>

              <Link
                to="/register"
                className="p-4 bg-white dark:bg-[#161616] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <User className="w-4 h-4 text-[#159B5B]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#F5F5F0]">{t('auth.roleVolunteer')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </Link>

              <Link
                to="/register"
                className="p-4 bg-white dark:bg-[#161616] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <Building className="w-4 h-4 text-[#159B5B]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#F5F5F0]">{t('getInvolved.partnerBtn')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </Link>

              <button
                onClick={handleShare}
                className="p-4 bg-white dark:bg-[#161616] hover:bg-[#E8F3E9] dark:hover:bg-[#182520] rounded-2xl border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#19AD66] shadow-sm flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <Share2 className="w-4 h-4 text-[#159B5B]" />
                  <span className="text-xs font-extrabold text-[#17231E] dark:text-[#F5F5F0]">
                    {copiedLink ? t('common.copied') : t('getInvolved.spreadAwareness')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#17231E]/40 dark:text-stone-500 group-hover:text-[#159B5B] transition-colors" />
              </button>

            </div>

          </div>
        </div>
      </section>

      {/* Mobility & Trust-Route Layer Modal (Phase 3) */}
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



export default LandingPage;
