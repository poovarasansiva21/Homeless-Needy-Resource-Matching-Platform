import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Navigation,
  Send,
  Camera,
  Globe,
  WifiOff,
  RefreshCw,
  Users,
  Utensils,
  Home as HomeIcon,
  Cross,
  Shirt,
  AlertTriangle,
  ArrowRight,
  Bus
} from 'lucide-react';
import { requestsApi } from '../services/api';
import { useLanguage, Language } from '../i18n';
import VoiceInputButton from './VoiceInputButton';
import { MobilityLayerModal } from './MobilityLayerModal';


interface OneTapHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

export const OneTapHelpModal: React.FC<OneTapHelpModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'FOOD'
}) => {
  const navigate = useNavigate();
  const { t, language, setLanguage, supportedLanguages } = useLanguage();

  // Form State
  const [description, setDescription] = useState('');
  const [peopleCount, setPeopleCount] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Location State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'unavailable'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [useApproximate, setUseApproximate] = useState(true);

  // Low Bandwidth State
  const [lowBandwidth, setLowBandwidth] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === '3g') {
        return true;
      }
    }
    return false;
  });

  // Processing & Results State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mobility Layer State (Phase 3)
  const [isMobilityModalOpen, setIsMobilityModalOpen] = useState(false);
  const [selectedMobilityResource, setSelectedMobilityResource] = useState<{ id?: number; name?: string; address?: string } | null>(null);


  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Photo Picker
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Handle Geolocation Request ("📍 USE MY CURRENT LOCATION")
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setLocationError(t('location.unavailableTitle'));
      return;
    }

    setLocationStatus('locating');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocationStatus('success');
      },
      (err) => {
        console.warn('Location permission error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationError(t('location.deniedTitle'));
        } else {
          setLocationStatus('unavailable');
          setLocationError(t('location.unavailableTitle'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Preset Click Handler
  const handleApplyPreset = (text: string, category: string) => {
    setDescription(text);
    setSelectedCategory(category);
  };

  // Submit & Trigger AI Analysis Engine
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !photo) {
      setError('Please describe what help is needed or speak your request.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const lat = userLocation ? userLocation.lat : 11.0168;
      const lng = userLocation ? userLocation.lng : 76.9558;

      const payload = {
        description: description.trim() || 'Urgent assistance requested via One-Tap emergency flow',
        category: selectedCategory,
        people_count: peopleCount,
        latitude: lat,
        longitude: lng,
        address: userLocation ? `Near Lat ${lat.toFixed(4)}, Lon ${lng.toFixed(4)}` : 'Coimbatore Central',
        is_approximate: useApproximate,
        has_permission: true,
      };

      const response = await requestsApi.create(payload);
      setResult(response);
    } catch (err: any) {
      console.error('One-Tap Request Error:', err);
      setError(err.response?.data?.error || 'Failed to submit request. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    const c = (cat || '').toUpperCase();
    if (c.includes('FOOD')) return '🍱';
    if (c.includes('SHELTER')) return '⛺';
    if (c.includes('MEDICAL') || c.includes('HEALTH')) return '🚑';
    if (c.includes('CLOTHING')) return '👕';
    return '🚨';
  };

  const getUrgencyIcon = (urg: string) => {
    const u = (urg || '').toUpperCase();
    if (u === 'CRITICAL') return '🚨';
    if (u === 'HIGH') return '🚨';
    if (u === 'MEDIUM') return '⚠️';
    return '🟢';
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-[#0D0D0D]/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className={`bg-[#FAF7F2] dark:bg-[#161616] w-full max-w-2xl rounded-[32px] border border-[#E7E0D6] dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${lowBandwidth ? '' : 'transition-all duration-300'}`}>
        
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-[#E7E0D6] dark:border-white/10 bg-[#F3ECE2]/60 dark:bg-[#1E1E1E] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-semibold text-[#1C1917] dark:text-[#F5F5F0] tracking-tight">
              {t('oneTap.btnNeedHelp')}
            </h2>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E] font-medium">
              {t('oneTap.subtitle')}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Low Bandwidth Mode Toggle */}
            <button
              type="button"
              onClick={() => setLowBandwidth(!lowBandwidth)}
              className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 border ${
                lowBandwidth 
                  ? 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30'
                  : 'bg-[#FAF7F2] dark:bg-[#161616] text-[#78716C] dark:text-[#A8A29E] border-[#E7E0D6] dark:border-white/10'
              }`}
              title="Toggle Low Bandwidth Mode"
            >
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">{t('oneTap.lowBandwidthToggle')}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE2] dark:bg-[#262626] dark:hover:bg-[#333333] text-[#1C1917] dark:text-[#F5F5F0] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[#FAF7F2] dark:bg-[#161616]">
          
          {/* SUCCESS / AI SUMMARY CARDS DISPLAY */}
          {result ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#159B5B] dark:text-emerald-400 flex items-center justify-center mx-auto border border-[#159B5B]/30 shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-[#17231E] dark:text-white">
                  {t('oneTap.aiSummaryTitle')}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-semibold">
                  Request #{result.request.id} • Registered & Dispatched to Field Network
                </p>
              </div>

              {/* REQ SPEC SUMMARY CARDS (🍱 FOOD | 🚨 HIGH PRIORITY | 👨‍👩‍👧 3 PEOPLE | 📍 NEARBY HELP FOUND) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                
                {/* Card 1: CATEGORY */}
                <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border-2 border-[#159B5B]/30 shadow-sm flex items-center space-x-3">
                  <div className="text-3xl shrink-0">
                    {getCategoryIcon(result.ai_analysis.dnn_category)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
                      {t('oneTap.categoryLabel')}
                    </span>
                    <span className="text-base font-black text-[#159B5B] dark:text-emerald-400 uppercase">
                      {result.ai_analysis.dnn_category}
                    </span>
                  </div>
                </div>

                {/* Card 2: URGENCY */}
                <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border-2 border-[#F2A33A]/40 shadow-sm flex items-center space-x-3">
                  <div className="text-3xl shrink-0">
                    {getUrgencyIcon(result.ai_analysis.urgency_level)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
                      {t('oneTap.urgencyLabel')}
                    </span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400 uppercase">
                      {result.ai_analysis.urgency_level} PRIORITY
                    </span>
                  </div>
                </div>

                {/* Card 3: PEOPLE AFFECTED */}
                <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border-2 border-indigo-500/30 shadow-sm flex items-center space-x-3">
                  <div className="text-3xl shrink-0">👨‍👩‍👧</div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
                      {t('oneTap.peopleCountLabel')}
                    </span>
                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      {result.request.people_count} PEOPLE
                    </span>
                  </div>
                </div>

              </div>

              {/* Card 4: NEARBY HELP FOUND LIST */}
              <div className="bg-white dark:bg-[#161616] rounded-2xl p-4 sm:p-5 border-2 border-[#159B5B]/30 shadow-md space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EAE3D2] dark:border-white/10">
                  <div className="flex items-center space-x-2 text-xs sm:text-sm font-black text-[#17231E] dark:text-white uppercase tracking-wider">
                    <span className="text-lg">📍</span>
                    <span>{t('oneTap.nearbyHelpFound')} ({result.matched_resources?.length || 0})</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#159B5B] dark:text-orange-300 bg-emerald-50 dark:bg-orange-950/60 px-2.5 py-1 rounded-full border border-[#159B5B]/20 dark:border-orange-500/40">
                    AI Matched & Verified
                  </span>
                </div>

                <div className="space-y-2.5">
                  {result.matched_resources?.map((res: any, idx: number) => (
                    <div 
                      key={res.resource_id || idx}
                      className="p-3.5 rounded-xl border border-[#EAE3D2] dark:border-white/10 bg-[#FFF9ED]/50 dark:bg-[#1C1917]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-extrabold text-[#17231E] dark:text-white text-sm flex items-center space-x-2">
                          <span>{res.resource_name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-orange-950/60 text-[#159B5B] dark:text-orange-300 text-[10px] font-black border dark:border-orange-500/30">
                            {res.match_score}% Match
                          </span>
                        </div>
                        <div className="text-stone-500 dark:text-stone-400 flex items-center space-x-2 text-[11px]">
                          <span>{res.organization_type}</span>
                          <span>•</span>
                          <span>📍 {res.distance_km} km away</span>
                        </div>
                        <div className="text-stone-600 dark:text-stone-300 text-[11px] font-medium">
                          {res.address}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {res.phone && (
                          <a
                            href={`tel:${res.phone}`}
                            className="px-3 py-2 bg-emerald-600 dark:bg-[#F25C38] hover:bg-emerald-700 dark:hover:bg-[#d94e2b] text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${res.address || 'Coimbatore'}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-stone-100 dark:bg-[#262626] hover:bg-stone-200 dark:hover:bg-[#333333] text-[#17231E] dark:text-white font-bold text-xs rounded-xl flex items-center space-x-1 border border-stone-300 dark:border-stone-700"
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#159B5B] dark:text-orange-400" />
                          <span>Map</span>
                        </a>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/map');
                  }}
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md flex items-center justify-center space-x-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Track Live Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setDescription('');
                  }}
                  className="w-full sm:w-auto px-7 py-3.5 bg-stone-200 dark:bg-[#262626] hover:bg-stone-300 dark:hover:bg-[#333333] text-[#17231E] dark:text-white font-bold text-xs uppercase tracking-wider rounded-full"
                >
                  New Request
                </button>
              </div>

            </div>
          ) : (
            /* FORM INPUT STAGE */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 rounded-2xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Language Selection Bar (1-Tap for Needy users) */}
              <div className="p-3 bg-white dark:bg-[#161616] rounded-2xl border border-[#EAE3D2] dark:border-white/10 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center space-x-1">
                  <Globe className="w-4 h-4 text-[#159B5B]" />
                  <span>{t('oneTap.speechLangLabel')}</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  {supportedLanguages.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLanguage(l.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        language === l.id
                          ? 'bg-[#159B5B] text-white shadow-sm'
                          : 'bg-stone-100 dark:bg-[#262626] text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span className="ml-1">{l.nativeLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Preset Pills for 1-Tap entry */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">
                  {t('oneTap.presetsTitle')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('I need food and water for tonight', 'FOOD')}
                    className="p-3 rounded-2xl bg-white dark:bg-[#161616] hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-[#EAE3D2] dark:border-white/10 text-left text-xs font-extrabold text-[#17231E] dark:text-white flex items-center space-x-2 transition-all"
                  >
                    <span className="text-xl">🍱</span>
                    <span className="line-clamp-1">{t('oneTap.presetFood')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Need a safe shelter to stay tonight', 'SHELTER')}
                    className="p-3 rounded-2xl bg-white dark:bg-[#161616] hover:bg-emerald-50 dark:hover:bg-orange-950/40 border border-[#EAE3D2] dark:border-white/10 text-left text-xs font-extrabold text-[#17231E] dark:text-white flex items-center space-x-2 transition-all"
                  >
                    <span className="text-xl">⛺</span>
                    <span className="line-clamp-1">{t('oneTap.presetShelter')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Need urgent medical clinic & medicine', 'MEDICAL')}
                    className="p-3 rounded-2xl bg-white dark:bg-[#161616] hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-[#EAE3D2] dark:border-white/10 text-left text-xs font-extrabold text-[#17231E] dark:text-white flex items-center space-x-2 transition-all"
                  >
                    <span className="text-xl">🚑</span>
                    <span className="line-clamp-1">{t('oneTap.presetMedical')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Need warm clothing and blankets', 'CLOTHING')}
                    className="p-3 rounded-2xl bg-white dark:bg-[#161616] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-[#EAE3D2] dark:border-white/10 text-left text-xs font-extrabold text-[#17231E] dark:text-white flex items-center space-x-2 transition-all"
                  >
                    <span className="text-xl">👕</span>
                    <span className="line-clamp-1">{t('oneTap.presetClothing')}</span>
                  </button>
                </div>
              </div>

              {/* Voice & Text Input Box */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[#17231E] dark:text-white">
                  {t('oneTap.inputPrompt')}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tap microphone below to speak, or type here..."
                  className="w-full rounded-2xl border-2 border-[#EAE3D2] dark:border-white/10 bg-white dark:bg-[#0D0D0D] p-4 text-[#17231E] dark:text-white placeholder-stone-400 text-sm outline-none focus:border-[#159B5B] dark:focus:border-[#F25C38]"
                />

                {/* REAL Voice Recognition Integration */}
                <div className="flex items-center justify-between pt-1">
                  <VoiceInputButton
                    onSpeechCaptured={(spoken) => {
                      setDescription((prev) => (prev ? `${prev} ${spoken}` : spoken));
                    }}
                  />
                  
                  {/* Optional Image Picker */}
                  <label className="cursor-pointer px-3.5 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-[#262626] dark:hover:bg-[#292929] text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center space-x-1.5 border border-stone-300 dark:border-stone-700">
                    <Camera className="w-4 h-4 text-[#159B5B] dark:text-orange-400" />
                    <span>{photo ? t('oneTap.photoSelected') : t('oneTap.optionalPhoto')}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>

                {photoPreview && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[#159B5B] dark:border-[#F25C38] mt-2">
                    <img src={photoPreview} alt="Attached" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* People Affected Pill Selector (1-Tap Large Touch Targets) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#17231E] dark:text-white mb-2">
                  {t('oneTap.peopleAffected')}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setPeopleCount(count)}
                      className={`h-12 rounded-2xl font-black text-sm flex items-center justify-center space-x-1 transition-all cursor-pointer border ${
                        peopleCount === count
                          ? 'bg-[#159B5B] dark:bg-[#F25C38] text-white border-[#159B5B] dark:border-[#F25C38] shadow-md scale-105'
                          : 'bg-white dark:bg-[#161616] text-[#17231E] dark:text-white border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#F25C38]'
                      }`}
                    >
                      <span>{count === 5 ? '👨‍👩‍👧‍👦 5+' : count === 1 ? '👤 1' : count === 2 ? '👫 2' : count === 3 ? '👨‍👩‍👧 3' : '👨‍👩‍👧‍👦 4'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* LOCATION SECTION — "📍 USE MY CURRENT LOCATION" */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border-2 border-[#EAE3D2] dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-[#17231E] dark:text-white block">
                      Location Assistance
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      {locationStatus === 'success' 
                        ? '✓ Exact location attached' 
                        : 'Tap below to automatically detect your coordinates'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    disabled={locationStatus === 'locating'}
                    className={`h-12 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shrink-0 ${
                      locationStatus === 'success'
                        ? 'bg-emerald-600 dark:bg-[#F25C38] text-white shadow-emerald-600/30 dark:shadow-orange-950/30'
                        : 'bg-gradient-to-r from-[#159B5B] to-[#12834D] dark:from-[#F25C38] dark:to-[#d94e2b] hover:from-[#12834D] hover:to-[#0F6C3F] dark:hover:from-[#d94e2b] dark:hover:to-[#c43e1c] text-white shadow-[#159B5B]/30 dark:shadow-orange-950/30 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {locationStatus === 'locating' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Locating...</span>
                      </>
                    ) : locationStatus === 'success' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Location Detected ✓</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 animate-pulse" />
                        <span>{t('oneTap.useCurrentLocation')}</span>
                      </>
                    )}
                  </button>
                </div>

                {locationError && (
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    ⚠️ {locationError}
                  </p>
                )}

                {/* Approximate Location Checkbox for Privacy */}
                <label className="flex items-center space-x-2 pt-1 text-xs text-stone-600 dark:text-stone-400 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useApproximate}
                    onChange={(e) => setUseApproximate(e.target.checked)}
                    className="w-4 h-4 text-[#159B5B] rounded border-stone-300 focus:ring-[#159B5B]"
                  />
                  <span>{t('oneTap.approxLocation')}</span>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-[#F04438] to-[#FF5A5F] hover:from-[#d9382c] hover:to-[#e0484d] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-rose-600/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[52px]"
              >
                <Send className="w-5 h-5" />
                <span>{isSubmitting ? t('oneTap.analyzingBtn') : t('oneTap.analyzeBtn')}</span>
              </button>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};


export default OneTapHelpModal;
