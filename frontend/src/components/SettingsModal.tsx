import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Sun, 
  Moon, 
  Globe, 
  Zap, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  SlidersHorizontal,
  Eye
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { useSimpleMode } from '../context/SimpleModeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const { isSimpleMode, toggleSimpleMode, isLowBandwidth, toggleLowBandwidth } = useSimpleMode();

  const [voiceAudio, setVoiceAudio] = useState<boolean>(() => {
    return localStorage.getItem('sahaayaa_voice_audio') !== 'false';
  });

  const [approxLocation, setApproxLocation] = useState<boolean>(() => {
    return localStorage.getItem('sahaayaa_approx_location') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('sahaayaa_voice_audio', String(voiceAudio));
  }, [voiceAudio]);

  useEffect(() => {
    localStorage.setItem('sahaayaa_approx_location', String(approxLocation));
  }, [approxLocation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-modal-backdrop">
      <div 
        className="bg-[#FFFDF3] dark:bg-[#0D0D0D] w-full max-w-lg rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EAE3D2] dark:border-white/10 bg-[#F7F4E9] dark:bg-[#161616] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#075C4F] text-white flex items-center justify-center shadow-md shadow-[#075C4F]/20">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#123F38] dark:text-white tracking-tight">
                Platform Preferences & Settings
              </h2>
              <p className="text-xs text-[#4C746B] dark:text-[#12B76A] font-semibold">
                Customize appearance, accessibility & privacy
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-[#1A3329] text-stone-500 dark:text-stone-300 transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] text-sm">
          
          {/* Section 1: Appearance & Theme */}
          <div className="space-y-3">
            <label className="text-xs font-black text-[#075C4F] dark:text-[#12B76A] uppercase tracking-wider block">
              🎨 Color Theme
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { if (isDark) toggleTheme(); }}
                className={`p-3.5 rounded-2xl border-2 font-bold flex items-center justify-between transition-all cursor-pointer ${
                  !isDark 
                    ? 'border-[#075C4F] bg-[#E8F3E9] text-[#075C4F]' 
                    : 'border-[#EAE3D2] dark:border-white/10 bg-white dark:bg-[#262626] text-stone-700 dark:text-stone-300'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Warm Light</span>
                </span>
                {!isDark && <Check className="w-4 h-4 text-[#075C4F]" />}
              </button>

              <button
                type="button"
                onClick={() => { if (!isDark) toggleTheme(); }}
                className={`p-3.5 rounded-2xl border-2 font-bold flex items-center justify-between transition-all cursor-pointer ${
                  isDark 
                    ? 'border-[#12B76A] bg-[#12B76A]/15 text-[#12B76A]' 
                    : 'border-[#EAE3D2] dark:border-white/10 bg-white dark:bg-[#262626] text-stone-700 dark:text-stone-300'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dark Mode</span>
                </span>
                {isDark && <Check className="w-4 h-4 text-[#12B76A]" />}
              </button>
            </div>
          </div>

          {/* Section 2: Language Selector */}
          <div className="space-y-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
            <label className="text-xs font-black text-[#075C4F] dark:text-[#12B76A] uppercase tracking-wider block">
              🌐 Multilingual Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {supportedLanguages.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  className={`py-2.5 px-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    language === l.id 
                      ? 'border-[#075C4F] dark:border-[#12B76A] bg-[#075C4F] text-white' 
                      : 'border-[#EAE3D2] dark:border-white/10 bg-white dark:bg-[#262626] text-[#123F38] dark:text-white hover:bg-stone-100'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.nativeLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2.5: Simple Mode (Vulnerable User First UX) */}
          <div className="space-y-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-[#FF493D] dark:text-rose-400 uppercase tracking-wider block flex items-center space-x-1.5">
                  <span>🆘 Simple Mode (Emergency / Easy View)</span>
                </label>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Large touch buttons, voice guidance & simplified interface for fast intake
                </p>
              </div>

              <button
                type="button"
                onClick={toggleSimpleMode}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isSimpleMode ? 'bg-[#FF493D]' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span 
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    isSimpleMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`} 
                />
              </button>
            </div>
          </div>

          {/* Section 3: Performance & Low Bandwidth */}
          <div className="space-y-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-[#075C4F] dark:text-[#12B76A] uppercase tracking-wider block">
                  ⚡ Low-Bandwidth Mode
                </label>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Reduce animations & data consumption on slow connections
                </p>
              </div>

              <button
                type="button"
                onClick={toggleLowBandwidth}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isLowBandwidth ? 'bg-[#075C4F] dark:bg-[#12B76A]' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span 
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    isLowBandwidth ? 'translate-x-6' : 'translate-x-0.5'
                  }`} 
                />
              </button>
            </div>
          </div>

          {/* Section 4: Voice Assistant & Sound */}
          <div className="space-y-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-[#075C4F] dark:text-[#12B76A] uppercase tracking-wider block">
                  🎙️ AI Voice Feedback
                </label>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Enable audio speech readouts for aid requests & results
                </p>
              </div>

              <button
                type="button"
                onClick={() => setVoiceAudio(!voiceAudio)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  voiceAudio ? 'bg-[#075C4F] dark:bg-[#12B76A]' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span 
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    voiceAudio ? 'translate-x-6' : 'translate-x-0.5'
                  }`} 
                />
              </button>
            </div>
          </div>

          {/* Section 5: Privacy & Location Control */}
          <div className="space-y-3 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-[#075C4F] dark:text-[#12B76A] uppercase tracking-wider block">
                  🔒 Approximate Location Privacy
                </label>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Hide precise street address publicly to protect vulnerable individuals
                </p>
              </div>

              <button
                type="button"
                onClick={() => setApproxLocation(!approxLocation)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  approxLocation ? 'bg-[#075C4F] dark:bg-[#12B76A]' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span 
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    approxLocation ? 'translate-x-6' : 'translate-x-0.5'
                  }`} 
                />
              </button>
            </div>
          </div>

        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-[#EAE3D2] dark:border-white/10 bg-[#F7F4E9] dark:bg-[#161616] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#075C4F] hover:bg-[#05463C] text-white font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer"
          >
            Save & Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
