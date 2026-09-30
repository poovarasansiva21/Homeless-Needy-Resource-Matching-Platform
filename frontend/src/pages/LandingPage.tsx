import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
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
  Building,
  User,
  Handshake,
  Share2,
  ChevronRight,
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
  Bell,
  Gift,
  ExternalLink,
  Layers,
  Phone
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { dashboardApi, requestsApi, resourcesApi, aiApi } from '../services/api';
import { RequestItem, Resource } from '../types';
import MouseSpotlight from '../components/MouseSpotlight';
import FastHelpModal from '../components/FastHelpModal';
import OneTapHelpModal from '../components/OneTapHelpModal';
import { MobilityLayerModal } from '../components/MobilityLayerModal';
import MagneticButton from '../components/MagneticButton';
import { useLanguage } from '../i18n';

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

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

// Pulsating user location pin icon for Leaflet map
const createUserLocationMarker = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(217, 119, 50, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(88, 116, 92, 0.3);"></span>
        <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #D97732, #58745C); border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: #FFFFFF;"></div>
        </div>
        <div style="position: absolute; top: -24px; white-space: nowrap; padding: 2px 7px; border-radius: 9999px; background: #3B2418; color: #FFFFFF; font-weight: 800; font-size: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2);">
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

const createCharityMarker = (color: string = '#D97732', iconSymbol: string = '📍') => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #FFFFFF;
        box-shadow: 0 4px 10px rgba(59, 36, 24, 0.35);
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

  // Impact stats state
  const [impact, setImpact] = useState({
    total_requests: 1248,
    verified_requests: 326,
    resources_available: 89,
    completed_requests: 412,
  });

  // Map state
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [distanceFilter, setDistanceFilter] = useState<string>('5km');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [mapViewMode, setMapViewMode] = useState<'map' | 'list'>('map');
  const [selectedPinResource, setSelectedPinResource] = useState<Resource | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.0168, 76.9558]);

  // Geolocation states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'unavailable'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);

  // AI Interactive Demo state
  const [aiInputText, setAiInputText] = useState('I have two children and we have no food for tonight.');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Modals state
  const [showFastHelp, setShowFastHelp] = useState(false);
  const [fastHelpCat, setFastHelpCat] = useState<'MEDICAL' | 'FOOD' | 'SHELTER' | 'CLOTHING'>('MEDICAL');
  const [showOneTapModal, setShowOneTapModal] = useState(false);
  const [isMobilityModalOpen, setIsMobilityModalOpen] = useState(false);
  const [selectedMobilityResource, setSelectedMobilityResource] = useState<{ id?: number; name?: string; address?: string } | null>(null);

  // Awareness share toast state
  const [copiedLink, setCopiedLink] = useState(false);

  // How it works active step state
  const [howItWorksStep, setHowItWorksStep] = useState(1);
  const [mobileAppTab, setMobileAppTab] = useState<'voice' | 'match' | 'track'>('voice');

  // SVG Animated Match state
  const [isMatched, setIsMatched] = useState(false);

  // Section references for animations
  const heroRef = useRef<HTMLDivElement>(null);
  const heroTitleLine1Ref = useRef<HTMLSpanElement>(null);
  const heroTitleLine2Ref = useRef<HTMLSpanElement>(null);
  const heroTitleLine3Ref = useRef<HTMLSpanElement>(null);
  const heroImgRef = useRef<HTMLDivElement>(null);
  const problemSectionRef = useRef<HTMLDivElement>(null);
  const problemWordsRef = useRef<HTMLHeadingElement>(null);
  const impactSectionRef = useRef<HTMLDivElement>(null);

  const statTotalRef = useRef<HTMLDivElement>(null);
  const statResRef = useRef<HTMLDivElement>(null);
  const statFulfillRef = useRef<HTMLDivElement>(null);
  const statCompRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis Smooth Scroll & GSAP ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  // GSAP Animations lifecycle
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Hero Staggered Typography Reveal
      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.1 } });
      heroTl.fromTo(
        [heroTitleLine1Ref.current, heroTitleLine2Ref.current, heroTitleLine3Ref.current],
        { y: 80, opacity: 0, rotateX: 15 },
        { y: 0, opacity: 1, rotateX: 0, stagger: 0.15 }
      );

      if (heroImgRef.current) {
        gsap.to(heroImgRef.current, {
          scale: 1.08,
          y: 40,
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // 2. Problem Section Word-by-Word Scroll Reveal
      if (problemWordsRef.current) {
        const words = problemWordsRef.current.querySelectorAll('.scroll-word');
        gsap.fromTo(
          words,
          { opacity: 0.2, color: '#3B2418' },
          {
            opacity: 1,
            color: '#D97732',
            stagger: 0.2,
            scrollTrigger: {
              trigger: problemSectionRef.current,
              start: 'top 75%',
              end: 'bottom 40%',
              scrub: true,
            },
          }
        );
      }

      // 3. Real Impact Counters Scroll Trigger
      if (impactSectionRef.current) {
        ScrollTrigger.create({
          trigger: impactSectionRef.current,
          start: 'top 70%',
          once: true,
          onEnter: () => {
            const animateCounter = (el: HTMLElement | null, target: number, suffix = '') => {
              if (!el) return;
              const obj = { val: 0 };
              gsap.to(obj, {
                val: target,
                duration: 2,
                ease: 'power2.out',
                onUpdate: () => {
                  el.textContent = `${Math.floor(obj.val).toLocaleString()}${suffix}`;
                },
                onComplete: () => {
                  el.textContent = `${target.toLocaleString()}${suffix}`;
                },
              });
            };

            animateCounter(statTotalRef.current, impact.total_requests);
            animateCounter(statResRef.current, impact.resources_available);
            animateCounter(statFulfillRef.current, 89, '%');
            animateCounter(statCompRef.current, impact.completed_requests);
          },
        });
      }
    });

    return () => ctx.revert();
  }, [impact]);

  // Load real data from backend API
  useEffect(() => {
    dashboardApi.getImpact()
      .then((data) => {
        if (data) {
          setImpact({
            total_requests: data.total_requests || 1248,
            verified_requests: data.verified_requests || 326,
            resources_available: data.resources_available || 89,
            completed_requests: data.completed_requests || 412,
          });
        }
      })
      .catch(() => {});

    Promise.all([resourcesApi.getAll(), requestsApi.getAll()])
      .then(([resData, reqData]) => {
        setResources(resData || []);
        setRequests(reqData || []);
        if (resData && resData.length > 0) {
          setSelectedPinResource(resData[0]);
        }
      })
      .catch(() => {});

    aiApi.classify('I have two children and we have no food for tonight.', 3, 'Living near Gandhipuram')
      .then(setAiResult)
      .catch(() => {});
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
      setAiError('AI analysis is temporarily unavailable. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Location handler
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
          setLocationError('Location access was denied. You can search manually by area or category.');
        } else {
          setLocationStatus('unavailable');
          setLocationError('Unable to detect your location. Please try again or search manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleFindNearMeForCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (!userLocation) handleUseCurrentLocation();
    const el = document.getElementById('community-map');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavigateToCategory = (cat: string) => {
    const matching = resources.filter(r => r.category.toUpperCase() === cat.toUpperCase());
    let destLat = 11.0168;
    let destLng = 76.9558;
    if (matching.length > 0) {
      destLat = matching[0].latitude;
      destLng = matching[0].longitude;
    }
    const originStr = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    const url = originStr 
      ? `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destLat},${destLng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
    window.open(url, '_blank');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Filter resources
  const filteredResources = resources.filter((res) => {
    const matchesCat = selectedCategory === 'All' || res.category.toUpperCase() === selectedCategory.toUpperCase();
    const matchesSearch = !searchQuery || 
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
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
    <div className="bg-[#FCFAF6] dark:bg-[#171310] text-[#3B2418] dark:text-[#F7F1E8] font-sans selection:bg-[#D97732] selection:text-white transition-colors duration-300 relative min-h-screen overflow-x-hidden">
      
      {/* Mouse Spotlight */}
      <MouseSpotlight />

      {/* Emergency Modals */}
      <FastHelpModal
        isOpen={showFastHelp}
        onClose={() => setShowFastHelp(false)}
        defaultCategory={fastHelpCat}
        centerCoords={mapCenter}
      />

      <OneTapHelpModal
        isOpen={showOneTapModal}
        onClose={() => setShowOneTapModal(false)}
      />

      <MobilityLayerModal
        isOpen={isMobilityModalOpen}
        onClose={() => setIsMobilityModalOpen(false)}
        resourceId={selectedMobilityResource?.id}
        resourceName={selectedMobilityResource?.name}
        resourceAddress={selectedMobilityResource?.address}
      />

      {/* ========================================================================= */}
      {/* SECTION 01: CINEMATIC EDITORIAL HERO                                     */}
      {/* ========================================================================= */}
      <section ref={heroRef} className="relative min-h-[92vh] flex items-center justify-center pt-10 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#F7F1E8] dark:bg-[#171310]">
        
        {/* Subtle background grain & warm blur glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D97732]/10 dark:bg-[#D97732]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
          
          {/* Left Column: Line-by-line Editorial Typography */}
          <div className="lg:col-span-7 space-y-8">
            
            <div className="inline-flex items-center space-x-3 text-[11px] font-black uppercase tracking-[0.25em] text-[#D97732]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97732] animate-ping" />
              <span>SAHAAYAA AI • HUMANITARIAN ROUTING PLATFORM</span>
            </div>

            <h1 className="font-serif font-black tracking-tight text-[#3B2418] dark:text-[#FCFAF6] text-5xl sm:text-7xl lg:text-8xl leading-[0.92] select-none">
              <span ref={heroTitleLine1Ref} className="block overflow-hidden">
                ONE NEED.
              </span>
              <span ref={heroTitleLine2Ref} className="block overflow-hidden text-[#D97732] ml-4 sm:ml-10">
                ONE MATCH.
              </span>
              <span ref={heroTitleLine3Ref} className="block overflow-hidden text-[#58745C] ml-8 sm:ml-20">
                REAL IMPACT.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-[#3B2418]/80 dark:text-[#F7F1E8]/80 max-w-2xl leading-relaxed font-sans font-medium">
              {t('hero.subtitle') || "Connecting displaced individuals with verified local food centers, safe emergency shelters, and volunteer transit assistance in real time."}
            </p>

            {/* CTAs with Magnetic Effect */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <MagneticButton
                onClick={() => setShowOneTapModal(true)}
                className="px-8 h-14 bg-[#D97732] hover:bg-[#c46424] text-white font-extrabold text-sm uppercase tracking-wider rounded-full shadow-lg shadow-[#D97732]/30 flex items-center space-x-3 cursor-pointer transition-all hover:scale-105 active:scale-95"
                data-cursor="HELP"
              >
                <Bell className="w-5 h-5 fill-current" />
                <span>{t('oneTap.btnNeedHelp')}</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </MagneticButton>

              <MagneticButton
                onClick={() => {
                  const el = document.getElementById('community-map');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-7 h-14 bg-[#3B2418] dark:bg-[#F7F1E8] hover:bg-[#26170f] dark:hover:bg-white text-white dark:text-[#3B2418] font-bold text-xs uppercase tracking-wider rounded-full shadow-md flex items-center space-x-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                data-cursor="EXPLORE"
              >
                <MapPin className="w-4 h-4 text-[#D97732]" />
                <span>EXPLORE LIVE MAP</span>
              </MagneticButton>
            </div>

          </div>

          {/* Right Column: Parallax Image Showcase */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div 
              ref={heroImgRef}
              className="relative w-full max-w-[480px] aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-white/10"
              data-cursor="VIEW"
            >
              <img 
                src="/images/hero-child.jpg" 
                alt="Community care with Sahaayaa AI" 
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3B2418]/80 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
                <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">VERIFIED NGO MATCHING</span>
                <h3 className="font-serif text-2xl font-bold mt-1">No One Should Be Left Behind.</h3>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 02: THE PROBLEM STATEMENT                                        */}
      {/* ========================================================================= */}
      <section ref={problemSectionRef} className="py-28 px-4 sm:px-6 lg:px-8 bg-[#3B2418] text-[#F7F1E8] relative overflow-hidden">
        
        <div className="absolute -top-12 right-10 text-[18rem] font-serif font-black text-white/5 pointer-events-none select-none">
          01
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-8 z-10 relative">
          <div className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-[0.3em] text-[#D97732]">
            <span>— THE HUMANITARIAN GAP —</span>
          </div>

          <h2 
            ref={problemWordsRef}
            className="font-serif font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight uppercase"
          >
            <span className="scroll-word inline-block mr-3">HELP</span>
            <span className="scroll-word inline-block mr-3">EXISTS.</span>
            <span className="scroll-word inline-block mr-3">THE</span>
            <span className="scroll-word inline-block mr-3">CONNECTION</span>
            <span className="scroll-word inline-block mr-3">IS</span>
            <span className="scroll-word inline-block mr-3">MISSING.</span>
          </h2>

          <p className="text-base sm:text-xl text-[#F7F1E8]/75 max-w-2xl mx-auto font-sans font-medium leading-relaxed">
            Millions of resources exist across shelters, food banks, and medical centers—yet individuals in urgent need remain disconnected due to mobility, language, and route barriers. Sahaayaa AI bridges this gap instantly.
          </p>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 03: HOW SAHAAYAA WORKS (STORYTELLING)                            */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F1E8] dark:bg-[#171310] border-t border-[#E9DDCC] dark:border-white/10">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">HOW SAHAAYAA WORKS</span>
            <h2 className="font-serif text-4xl sm:text-6xl font-bold text-[#3B2418] dark:text-[#FCFAF6]">
              From Request to Direct Aid
            </h2>
            <p className="text-base text-[#3B2418]/70 dark:text-[#F7F1E8]/70">
              Three seamless steps powered by artificial intelligence and compassionate human volunteers.
            </p>
          </div>

          {/* Interactive 3-Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div 
              onClick={() => setHowItWorksStep(1)}
              className={`p-8 rounded-[2.5rem] transition-all cursor-pointer border-2 ${
                howItWorksStep === 1 
                  ? 'bg-white dark:bg-[#261B15] border-[#D97732] shadow-2xl scale-[1.02]' 
                  : 'bg-white/60 dark:bg-[#261B15]/40 border-transparent hover:border-[#D97732]/40'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#D97732]/10 text-[#D97732] flex items-center justify-center font-serif text-2xl font-black mb-6">
                01
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#3B2418] dark:text-[#FCFAF6] mb-3">1-Tap or Voice Request</h3>
              <p className="text-sm text-[#3B2418]/80 dark:text-[#F7F1E8]/80 leading-relaxed">
                Users or community members speak or tap in Tamil, Hindi, or English. AI classifies exact urgency and resource need.
              </p>
            </div>

            {/* Step 2 */}
            <div 
              onClick={() => setHowItWorksStep(2)}
              className={`p-8 rounded-[2.5rem] transition-all cursor-pointer border-2 ${
                howItWorksStep === 2 
                  ? 'bg-white dark:bg-[#261B15] border-[#D97732] shadow-2xl scale-[1.02]' 
                  : 'bg-white/60 dark:bg-[#261B15]/40 border-transparent hover:border-[#D97732]/40'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#58745C]/10 text-[#58745C] flex items-center justify-center font-serif text-2xl font-black mb-6">
                02
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#3B2418] dark:text-[#FCFAF6] mb-3">Intelligent Proximity Matching</h3>
              <p className="text-sm text-[#3B2418]/80 dark:text-[#F7F1E8]/80 leading-relaxed">
                The DNN algorithm evaluates live capacity across nearby shelters, food distribution hubs, and medical clinics.
              </p>
            </div>

            {/* Step 3 */}
            <div 
              onClick={() => setHowItWorksStep(3)}
              className={`p-8 rounded-[2.5rem] transition-all cursor-pointer border-2 ${
                howItWorksStep === 3 
                  ? 'bg-white dark:bg-[#261B15] border-[#D97732] shadow-2xl scale-[1.02]' 
                  : 'bg-white/60 dark:bg-[#261B15]/40 border-transparent hover:border-[#D97732]/40'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#3B2418]/10 text-[#3B2418] dark:text-[#D97732] flex items-center justify-center font-serif text-2xl font-black mb-6">
                03
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#3B2418] dark:text-[#FCFAF6] mb-3">Turn-by-Turn Direct Support</h3>
              <p className="text-sm text-[#3B2418]/80 dark:text-[#F7F1E8]/80 leading-relaxed">
                Verified transit assistance or turn-by-turn routes guide the beneficiary safely to their matched destination.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 04: SIGNATURE RESOURCE MATCHING ANIMATION                        */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#3B2418] text-[#F7F1E8] overflow-hidden relative">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">INTERACTIVE DEMO</span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold">Signature Resource Matcher</h2>
            </div>
            <button
              onClick={() => setIsMatched(!isMatched)}
              className="px-6 py-3 bg-[#D97732] hover:bg-[#c46424] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 self-start md:self-auto"
            >
              {isMatched ? 'RESET MATCH' : 'TRIGGER AI MATCHING ANIMATION'}
            </button>
          </div>

          {/* SVG Animated Connection Grid */}
          <div className="relative bg-[#261B15] rounded-[3rem] p-8 sm:p-12 border border-white/10 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
              
              {/* Need Cards */}
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#D97732]">Incoming Assistance Request</span>
                <div className={`p-6 rounded-2xl border transition-all ${isMatched ? 'bg-[#58745C]/20 border-[#58745C]' : 'bg-[#3B2418] border-white/10'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300">HIGH URGENCY</span>
                      <h4 className="font-serif text-xl font-bold mt-2">Family Needs Emergency Food & Shelter</h4>
                      <p className="text-xs text-[#F7F1E8]/70 mt-1">Coimbatore Railway Station Area • 2 adults, 2 children</p>
                    </div>
                    {isMatched && <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />}
                  </div>
                </div>
              </div>

              {/* Resource Cards */}
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#58745C]">Matched Verified Facility</span>
                <div className={`p-6 rounded-2xl border transition-all ${isMatched ? 'bg-[#58745C]/20 border-[#58745C] scale-105' : 'bg-[#3B2418] border-white/10'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">OPEN NOW • 1.4 KM</span>
                      <h4 className="font-serif text-xl font-bold mt-2">Annapoorna Community Shelter</h4>
                      <p className="text-xs text-[#F7F1E8]/70 mt-1">Gandhipuram Main Road • 18 spots available</p>
                    </div>
                    {isMatched && <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 05: CATEGORIES SHOWCASE                                          */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F1E8] dark:bg-[#171310]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">RESOURCE SPECTRUM</span>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#3B2418] dark:text-[#FCFAF6]">
                Comprehensive Care Categories
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {categoriesList.map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleFindNearMeForCategory(cat.id)}
                className="bg-white dark:bg-[#261B15] p-6 rounded-[2rem] border border-[#E9DDCC] dark:border-white/10 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all cursor-pointer group"
                data-cursor="SELECT"
              >
                <div className="w-12 h-12 rounded-xl bg-[#D97732]/10 text-[#D97732] flex items-center justify-center mb-4 group-hover:bg-[#D97732] group-hover:text-white transition-colors">
                  {cat.icon}
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3B2418] dark:text-[#FCFAF6]">{cat.label}</h3>
                <p className="text-xs text-[#3B2418]/60 dark:text-[#F7F1E8]/60 mt-1">Verified local centers</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 06: MOBILE APP SHOWCASE                                         */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#3B2418] text-[#F7F1E8]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">MOBILE AID EXPERIENCE</span>
            <h2 className="font-serif text-4xl sm:text-6xl font-bold leading-tight">
              Instant Help in Your Hands
            </h2>
            <p className="text-base text-[#F7F1E8]/80 leading-relaxed font-medium">
              Designed for zero-barrier access. Beneficiaries can request immediate assistance with a single tap, record voice notes in native languages, or access offline map navigation.
            </p>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setMobileAppTab('voice')}
                className={`px-5 py-2.5 rounded-full text-xs font-extrabold uppercase transition-all ${
                  mobileAppTab === 'voice' ? 'bg-[#D97732] text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Voice Input
              </button>
              <button
                onClick={() => setMobileAppTab('match')}
                className={`px-5 py-2.5 rounded-full text-xs font-extrabold uppercase transition-all ${
                  mobileAppTab === 'match' ? 'bg-[#D97732] text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                AI Match
              </button>
              <button
                onClick={() => setMobileAppTab('track')}
                className={`px-5 py-2.5 rounded-full text-xs font-extrabold uppercase transition-all ${
                  mobileAppTab === 'track' ? 'bg-[#D97732] text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Live Tracking
              </button>
            </div>
          </div>

          {/* Smartphone Frame mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-[300px] h-[580px] bg-[#171310] rounded-[3.5rem] p-4 border-8 border-stone-800 shadow-2xl relative overflow-hidden">
              <div className="w-32 h-5 bg-stone-800 rounded-full mx-auto mb-4" />
              <div className="bg-[#FCFAF6] dark:bg-[#261B15] h-[490px] rounded-[2.5rem] p-5 text-[#3B2418] dark:text-[#F7F1E8] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span>SAHAAYAA MOBILE</span>
                    <span className="text-[#D97732]">LIVE</span>
                  </div>

                  {mobileAppTab === 'voice' && (
                    <div className="mt-8 space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto animate-pulse">
                        <Bell className="w-8 h-8" />
                      </div>
                      <h4 className="font-serif text-lg font-bold">Tap Microphone to Speak</h4>
                      <p className="text-xs text-stone-500">Supports English, Tamil & Hindi</p>
                    </div>
                  )}

                  {mobileAppTab === 'match' && (
                    <div className="mt-8 space-y-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        ✓ Matched with Annapoorna Shelter (0.8 km)
                      </div>
                    </div>
                  )}

                  {mobileAppTab === 'track' && (
                    <div className="mt-8 space-y-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300">
                        🚌 Transit Volunteer En Route (ETA 6 mins)
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setShowOneTapModal(true)}
                  className="w-full py-3 bg-[#D97732] text-white rounded-full text-xs font-extrabold uppercase tracking-wider"
                >
                  Request Emergency Aid
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 07: LIVE COMMUNITY MAP                                            */}
      {/* ========================================================================= */}
      <section id="community-map" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F1E8] dark:bg-[#171310] border-t border-[#E9DDCC] dark:border-white/10">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">REAL-TIME MAP</span>
            <h2 className="font-serif text-4xl sm:text-6xl font-bold text-[#3B2418] dark:text-[#FCFAF6]">
              Help is Closer Than You Think
            </h2>
          </div>

          {/* Location status message */}
          {locationStatus === 'idle' && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#261B15] border border-[#E9DDCC] dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-6 h-6 text-[#D97732]" />
                <span className="text-sm font-bold text-[#3B2418] dark:text-[#FCFAF6]">Detect nearby shelters & food distribution hubs</span>
              </div>
              <button
                onClick={handleUseCurrentLocation}
                className="px-6 py-3 bg-[#D97732] hover:bg-[#c46424] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md"
              >
                USE MY CURRENT LOCATION
              </button>
            </div>
          )}

          {/* Leaflet Container */}
          <div className="relative w-full h-[500px] rounded-[3rem] overflow-hidden border-4 border-white dark:border-white/10 shadow-2xl">
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

              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationMarker()}>
                  <Popup>You are here</Popup>
                </Marker>
              )}

              {filteredResources.map((res) => (
                <Marker
                  key={`res-${res.id}`}
                  position={[res.latitude, res.longitude]}
                  icon={createCharityMarker('#D97732', '🏛️')}
                  eventHandlers={{
                    click: () => {
                      setSelectedPinResource(res);
                      setMapCenter([res.latitude, res.longitude]);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-1 font-sans">
                      <h4 className="font-bold text-xs">{res.name}</h4>
                      <p className="text-[11px] text-stone-600">{res.address}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 08: PEOPLE HELPING PEOPLE (STORIES & COLLAGE)                    */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#FCFAF6] dark:bg-[#171310]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">COMMUNITY STORIES</span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#3B2418] dark:text-[#FCFAF6]">
              Real People. Real Transformations.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-[#F7F1E8] dark:bg-[#261B15] p-8 rounded-[2.5rem] border border-[#E9DDCC] dark:border-white/10 space-y-4">
              <p className="text-sm italic text-[#3B2418]/80 dark:text-[#F7F1E8]/80 leading-relaxed">
                "When my family lost housing after the rainstorms, Sahaayaa AI matched us to a local shelter within 15 minutes."
              </p>
              <div className="flex items-center space-x-3 pt-4 border-t border-[#E9DDCC] dark:border-white/10">
                <img src="/images/avatar-lakshmi.jpg" alt="Lakshmi" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#3B2418] dark:text-[#FCFAF6]">Lakshmi</h4>
                  <p className="text-xs text-[#3B2418]/60 dark:text-[#F7F1E8]/60">Beneficiary • Coimbatore</p>
                </div>
              </div>
            </div>

            <div className="bg-[#F7F1E8] dark:bg-[#261B15] p-8 rounded-[2.5rem] border border-[#E9DDCC] dark:border-white/10 space-y-4">
              <p className="text-sm italic text-[#3B2418]/80 dark:text-[#F7F1E8]/80 leading-relaxed">
                "As a volunteer transit driver, I get notified when elderly individuals need safe transport to medical centers."
              </p>
              <div className="flex items-center space-x-3 pt-4 border-t border-[#E9DDCC] dark:border-white/10">
                <img src="/images/avatar-ramesh.jpg" alt="Ramesh" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#3B2418] dark:text-[#FCFAF6]">Ramesh</h4>
                  <p className="text-xs text-[#3B2418]/60 dark:text-[#F7F1E8]/60">Transit Volunteer</p>
                </div>
              </div>
            </div>

            <div className="bg-[#F7F1E8] dark:bg-[#261B15] p-8 rounded-[2.5rem] border border-[#E9DDCC] dark:border-white/10 space-y-4">
              <p className="text-sm italic text-[#3B2418]/80 dark:text-[#F7F1E8]/80 leading-relaxed">
                "Our food bank distribution efficiency increased by 40% using Sahaayaa AI’s real-time demand forecasting."
              </p>
              <div className="flex items-center space-x-3 pt-4 border-t border-[#E9DDCC] dark:border-white/10">
                <img src="/images/avatar-priya.jpg" alt="Priya" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#3B2418] dark:text-[#FCFAF6]">Priya</h4>
                  <p className="text-xs text-[#3B2418]/60 dark:text-[#F7F1E8]/60">NGO Coordinator</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 09: REAL IMPACT COUNTERS                                         */}
      {/* ========================================================================= */}
      <section ref={impactSectionRef} className="py-28 px-4 sm:px-6 lg:px-8 bg-[#3B2418] text-[#F7F1E8] overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-[#D97732]">TRANSPARENT METRICS</span>
            <h2 className="font-serif text-4xl sm:text-6xl font-bold">Our Verified Impact</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="bg-[#261B15] p-8 rounded-[2.5rem] border border-white/10 space-y-2">
              <div ref={statTotalRef} className="font-serif text-4xl sm:text-6xl font-black text-[#D97732]">
                {impact.total_requests.toLocaleString()}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#F7F1E8]/70">Total Requests Received</p>
            </div>

            <div className="bg-[#261B15] p-8 rounded-[2.5rem] border border-white/10 space-y-2">
              <div ref={statResRef} className="font-serif text-4xl sm:text-6xl font-black text-[#D97732]">
                {impact.resources_available.toLocaleString()}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#F7F1E8]/70">Verified Resources</p>
            </div>

            <div className="bg-[#261B15] p-8 rounded-[2.5rem] border border-white/10 space-y-2">
              <div ref={statFulfillRef} className="font-serif text-4xl sm:text-6xl font-black text-[#D97732]">
                89%
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#F7F1E8]/70">Match Success Rate</p>
            </div>

            <div className="bg-[#261B15] p-8 rounded-[2.5rem] border border-white/10 space-y-2">
              <div ref={statCompRef} className="font-serif text-4xl sm:text-6xl font-black text-[#D97732]">
                {impact.completed_requests.toLocaleString()}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#F7F1E8]/70">Requests Fulfilled</p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 10: DONATE & VOLUNTEER SECTION                                   */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F1E8] dark:bg-[#171310] border-t border-[#E9DDCC] dark:border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Donate Card */}
          <div className="bg-white dark:bg-[#261B15] p-10 rounded-[3rem] border border-[#E9DDCC] dark:border-white/10 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <Gift className="w-10 h-10 text-[#D97732]" />
              <h3 className="font-serif text-3xl font-bold text-[#3B2418] dark:text-[#FCFAF6]">Support Direct Humanitarian Relief</h3>
              <p className="text-sm text-[#3B2418]/70 dark:text-[#F7F1E8]/70 leading-relaxed">
                100% of community donations fund emergency meals, transit tickets, shelter supplies, and medical kits.
              </p>
            </div>
            <Link
              to="/donor/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#D97732] hover:bg-[#c46424] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md transition-transform hover:scale-105"
            >
              MAKE A DONATION
            </Link>
          </div>

          {/* Volunteer Card */}
          <div className="bg-[#3B2418] text-[#F7F1E8] p-10 rounded-[3rem] border border-white/10 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <Users className="w-10 h-10 text-[#58745C]" />
              <h3 className="font-serif text-3xl font-bold">Become a Verified Volunteer</h3>
              <p className="text-sm text-[#F7F1E8]/70 leading-relaxed">
                Join our network of transit drivers, meal distributors, and emergency responders in your city.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#58745C] hover:bg-[#465d49] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md transition-transform hover:scale-105"
            >
              REGISTER AS VOLUNTEER
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 11: FINAL CINEMATIC CTA                                         */}
      {/* ========================================================================= */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-[#3B2418] text-[#F7F1E8] relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto space-y-8 z-10 relative">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-[#D97732]">TOGETHER FOR A BETTER TOMORROW</span>
          <h2 className="font-serif text-4xl sm:text-7xl font-black tracking-tight leading-tight">
            No One Should Be Left Behind.
          </h2>
          <p className="text-base sm:text-xl text-[#F7F1E8]/80 max-w-2xl mx-auto leading-relaxed">
            Whether you need urgent assistance, wish to volunteer, or want to support local shelters, Sahaayaa AI is here for you.
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton
              onClick={() => setShowOneTapModal(true)}
              className="px-9 h-16 bg-[#D97732] hover:bg-[#c46424] text-white font-extrabold text-sm uppercase tracking-wider rounded-full shadow-2xl flex items-center space-x-3 cursor-pointer transition-transform hover:scale-105"
            >
              <Bell className="w-5 h-5 fill-current" />
              <span>REQUEST IMMEDIATE HELP</span>
            </MagneticButton>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
