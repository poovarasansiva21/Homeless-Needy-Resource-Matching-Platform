import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  X, 
  MapPin, 
  Phone, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  HeartPulse,
  Utensils,
  Home as HomeIcon,
  Shirt,
  Navigation
} from 'lucide-react';
import { matchingApi } from '../services/api';
import { useLanguage } from '../i18n';

interface FastHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'MEDICAL' | 'FOOD' | 'SHELTER' | 'CLOTHING';
  centerCoords?: [number, number];
}

export const FastHelpModal: React.FC<FastHelpModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'MEDICAL',
  centerCoords = [11.0168, 76.9558]
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [category, setCategory] = useState<'MEDICAL' | 'FOOD' | 'SHELTER' | 'CLOTHING'>(defaultCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      fetchFastMatches(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  const fetchFastMatches = async (cat: 'MEDICAL' | 'FOOD' | 'SHELTER' | 'CLOTHING') => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await matchingApi.find({
        category: cat,
        urgency_level: 'CRITICAL',
        people_count: 1,
        latitude: centerCoords[0],
        longitude: centerCoords[1],
      });
      setMatches(results || []);
    } catch (err: any) {
      console.error('Fast help fetch error:', err);
      setError(t('modal.tryAnother'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySwitch = (newCat: 'MEDICAL' | 'FOOD' | 'SHELTER' | 'CLOTHING') => {
    setCategory(newCat);
    fetchFastMatches(newCat);
  };

  if (!isOpen) return null;

  const categoryOptions = [
    { id: 'MEDICAL', label: t('modal.medical'), icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'FOOD', label: t('modal.food'), icon: <Utensils className="w-4 h-4" /> },
    { id: 'SHELTER', label: t('modal.shelter'), icon: <HomeIcon className="w-4 h-4" /> },
    { id: 'CLOTHING', label: t('modal.clothing'), icon: <Shirt className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#17231E]/75 dark:bg-black/80 backdrop-blur-md animate-modal-backdrop">
      <div className="bg-white dark:bg-[#161616] w-full max-w-2xl rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-content">
        
        {/* Header */}
        <div className="p-6 border-b border-[#EAE3D2] dark:border-white/10 flex items-start justify-between bg-[#FFF9ED] dark:bg-[#1C1917]/60">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 text-[11px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-900/60">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>⚡ {t('modal.fastHelp')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#17231E] dark:text-[#F5F5F0]">
              {t('modal.closest')}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t('modal.matching')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Switcher Tabs */}
        <div className="p-4 border-b border-[#EAE3D2]/70 dark:border-white/10 bg-[#FFF9ED]/40 dark:bg-[#161616]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categoryOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleCategorySwitch(opt.id)}
                className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 border transition-all ${
                  category === opt.id
                    ? 'bg-[#159B5B] text-white border-[#159B5B] shadow-md shadow-[#159B5B]/20'
                    : 'bg-white dark:bg-[#1C1917] text-[#17231E] dark:text-[#F5F5F0] border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B]'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-10 h-10 border-3 border-[#159B5B] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-[#17231E] dark:text-[#F5F5F0] uppercase tracking-wider">
                {t('modal.finding')}
              </p>
              <span className="text-[11px] text-stone-500">{t('modal.capacity')}</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start space-x-3 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t('modal.notice')}</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          ) : matches.length === 0 ? (
            <div className="py-12 text-center text-stone-500 dark:text-stone-400 space-y-2">
              <p className="text-sm font-bold">{t('modal.none')}</p>
              <p className="text-xs">{t('modal.tryAnother')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((res: any, idx: number) => (
                <div
                  key={res.resource_id || idx}
                  className="p-4 rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-[#FFF9ED]/30 dark:bg-[#1C1917]/50 hover:border-[#159B5B] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-[#17231E] dark:text-[#F5F5F0]">
                        {res.resource_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/25 text-[#159B5B] dark:text-emerald-300 text-[10px] font-black">
                        {t('modal.away', { distance: res.distance_km })}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#159B5B] flex-shrink-0" />
                      <span>{res.address || 'Coimbatore Central'}</span>
                    </div>

                    <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center space-x-3 pt-1">
                      <span className="font-bold text-[#159B5B]">
                        ✓ {res.available_capacity ?? res.capacity_available ?? 20} {t('modal.capacityAvailable')}
                      </span>
                      {res.contact_phone && (
                        <span className="flex items-center text-stone-600 dark:text-stone-300">
                          <Phone className="w-3 h-3 mr-1 text-stone-400" />
                          {res.contact_phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {res.contact_phone && (
                      <a
                        href={`tel:${res.contact_phone}`}
                        className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#17231E] dark:text-[#F5F5F0] text-xs font-bold flex items-center space-x-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#159B5B]" />
                        <span>{t('common.call')}</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/map');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#159B5B] hover:bg-[#12834D] text-white text-xs font-black flex items-center space-x-1.5 shadow-sm transition-all hover:scale-105"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{t('common.locate')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Emergency Helpline Callout Banner */}
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-black flex items-center space-x-1.5">
              <span>🚨 {t('modal.emergencyLines')}:</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold">
              <span>{t('modal.national')}: <strong>112</strong></span>
              <span>{t('modal.child')}: <strong>1098</strong></span>
              <span>{t('modal.ambulance')}: <strong>108</strong></span>
              <span>{t('modal.women')}: <strong>181</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EAE3D2] dark:border-white/10 bg-[#FFF9ED] dark:bg-[#1C1917]/60 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              navigate('/request-help');
            }}
            className="text-xs font-black text-[#159B5B] hover:underline flex items-center space-x-1"
          >
            <span>{t('modal.needPersonalized')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl text-xs transition-colors"
          >
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default FastHelpModal;
