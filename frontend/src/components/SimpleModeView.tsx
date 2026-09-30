import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartHandshake, 
  MapPin, 
  Mic, 
  WifiOff, 
  Phone, 
  CheckCircle2, 
  Globe, 
  Navigation,
  Utensils,
  Home as HomeIcon,
  Cross,
  Shirt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { useSimpleMode } from '../context/SimpleModeContext';
import VoiceInputButton from './VoiceInputButton';
import OneTapHelpModal from './OneTapHelpModal';

export const SimpleModeView: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const { isSimpleMode, toggleSimpleMode, isLowBandwidth, toggleLowBandwidth } = useSimpleMode();

  const [showNeedHelpModal, setShowNeedHelpModal] = useState<boolean>(false);
  const [selectedInitialCat, setSelectedInitialCat] = useState<string>('FOOD');
  const [spokenText, setSpokenText] = useState<string>('');
  const [quickSearchCat, setQuickSearchCat] = useState<string | null>(null);

  const handleOpenNeedHelp = (category: string = 'FOOD') => {
    setSelectedInitialCat(category);
    setShowNeedHelpModal(true);
  };

  return (
    <div className="w-full bg-[#FFFDF3] dark:bg-[#0D0D0D] p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Simple Mode Header Banner */}
      <div className="bg-[#0B4F3A] dark:bg-[#12B76A] text-white p-5 sm:p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 text-white font-black text-xs uppercase tracking-wider">
              <span>⚡ SIMPLE MODE ACTIVE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight">
              Easy 1-Tap Humanitarian Aid
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium">
              Large buttons • Voice typing • No password required for emergency intake
            </p>
          </div>

          {/* Quick Language & Low-Bandwidth Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Switcher Pills */}
            <div className="flex items-center space-x-1 bg-white/15 p-1 rounded-2xl border border-white/20">
              {supportedLanguages.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    language === l.id
                      ? 'bg-white text-[#0B4F3A] shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span className="ml-1">{l.nativeLabel}</span>
                </button>
              ))}
            </div>

            {/* Low-Bandwidth Toggle */}
            <button
              onClick={toggleLowBandwidth}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer border ${
                isLowBandwidth
                  ? 'bg-amber-400 text-stone-900 border-amber-300 shadow'
                  : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
              }`}
            >
              <WifiOff className="w-4 h-4" />
              <span>{isLowBandwidth ? '📶 LOW DATA ON' : '📶 LOW DATA'}</span>
            </button>

            {/* Exit Simple Mode Button */}
            <button
              onClick={toggleSimpleMode}
              className="px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer border border-white/30 shadow-sm"
              title="Exit Simple Mode"
            >
              <X className="w-4 h-4" />
              <span>EXIT SIMPLE MODE</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY ACTIONS GRID - Extra Large Touch Targets (Minimum 64px height) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Action 1: 🆘 I NEED HELP */}
        <button
          onClick={() => handleOpenNeedHelp('FOOD')}
          className="p-6 rounded-3xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-xl shadow-rose-600/25 flex items-center justify-between transition-transform active:scale-95 cursor-pointer min-h-[96px] group"
        >
          <div className="flex items-center space-x-4 text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">
              🆘
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-none">
                I NEED HELP
              </div>
              <p className="text-xs text-rose-100 font-bold mt-1">
                Get immediate food, shelter, or medical aid
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white shrink-0 hidden sm:block" />
        </button>

        {/* Action 2: 🆘 HELP SOMEONE */}
        <button
          onClick={() => navigate('/help-someone')}
          className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/25 flex items-center justify-between transition-transform active:scale-95 cursor-pointer min-h-[96px] group"
        >
          <div className="flex items-center space-x-4 text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">
              🤝
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-none">
                HELP SOMEONE
              </div>
              <p className="text-xs text-amber-100 font-bold mt-1">
                Report a vulnerable person needing assistance
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white shrink-0 hidden sm:block" />
        </button>

        {/* Action 3: 📍 FIND HELP */}
        <button
          onClick={() => navigate('/map')}
          className="p-6 rounded-3xl bg-gradient-to-r from-[#0B4F3A] to-[#159B5B] hover:from-[#094130] hover:to-[#12834D] text-white shadow-xl shadow-[#0B4F3A]/25 flex items-center justify-between transition-transform active:scale-95 cursor-pointer min-h-[96px] group"
        >
          <div className="flex items-center space-x-4 text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">
              📍
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-none">
                FIND HELP
              </div>
              <p className="text-xs text-emerald-100 font-bold mt-1">
                Locate verified food banks, shelters & clinics
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white shrink-0 hidden sm:block" />
        </button>

        {/* Action 4: 🎙️ SPEAK */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/25 flex items-center justify-between min-h-[96px]">
          <div className="flex items-center space-x-4 text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shrink-0">
              🎙️
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-none">
                SPEAK REQUEST
              </div>
              <p className="text-xs text-indigo-100 font-bold mt-1">
                Talk in Tamil, Hindi or English
              </p>
            </div>
          </div>
          
          <VoiceInputButton
            onSpeechCaptured={(spoken) => {
              setSpokenText(spoken);
              handleOpenNeedHelp('FOOD');
            }}
          />
        </div>

      </div>

      {/* 1-Tap Category Shortcut Cards */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Or Select Assistance Category Directly:
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => handleOpenNeedHelp('FOOD')}
            className="p-4 rounded-3xl bg-white dark:bg-[#161616] border-2 border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] text-center space-y-2 transition-all cursor-pointer group"
          >
            <div className="text-4xl group-hover:scale-110 transition-transform">🍱</div>
            <div className="font-black text-sm text-[#18352D] dark:text-white">FOOD</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Verified Food Banks</div>
          </button>

          <button
            onClick={() => handleOpenNeedHelp('SHELTER')}
            className="p-4 rounded-3xl bg-white dark:bg-[#161616] border-2 border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] text-center space-y-2 transition-all cursor-pointer group"
          >
            <div className="text-4xl group-hover:scale-110 transition-transform">⛺</div>
            <div className="font-black text-sm text-[#18352D] dark:text-white">SHELTER</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Verified Night Lodging</div>
          </button>

          <button
            onClick={() => handleOpenNeedHelp('MEDICAL')}
            className="p-4 rounded-3xl bg-white dark:bg-[#161616] border-2 border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] text-center space-y-2 transition-all cursor-pointer group"
          >
            <div className="text-4xl group-hover:scale-110 transition-transform">🚑</div>
            <div className="font-black text-sm text-[#18352D] dark:text-white">MEDICAL</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Free Dispensaries</div>
          </button>

          <button
            onClick={() => handleOpenNeedHelp('CLOTHING')}
            className="p-4 rounded-3xl bg-white dark:bg-[#161616] border-2 border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] text-center space-y-2 transition-all cursor-pointer group"
          >
            <div className="text-4xl group-hover:scale-110 transition-transform">👕</div>
            <div className="font-black text-sm text-[#18352D] dark:text-white">CLOTHES</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Warm Blankets</div>
          </button>
        </div>
      </div>

      {/* Emergency Assistance Modal Triggered by 1-Tap Actions */}
      <OneTapHelpModal
        isOpen={showNeedHelpModal}
        onClose={() => setShowNeedHelpModal(false)}
        initialCategory={selectedInitialCat}
      />

    </div>
  );
};

export default SimpleModeView;
