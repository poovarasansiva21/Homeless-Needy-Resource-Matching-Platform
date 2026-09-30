import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has already dismissed prompt in this session
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed === 'true') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User choice outcome:', outcome);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-16 sm:top-20 inset-x-3 sm:inset-x-auto sm:right-6 max-w-sm z-50 bg-[#121C18]/95 dark:bg-[#1C1917]/95 text-white backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-top-4">
      <div className="flex items-start justify-between space-x-3">
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#159B5B] flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 mt-0.5">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white leading-none">Install SAHAAYAA App</h4>
            <p className="text-[11px] text-stone-300 mt-1 leading-snug">
              Add to Home Screen for fast, 1-tap community relief access.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center space-x-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 py-2 px-3 bg-[#159B5B] hover:bg-[#12834D] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Now</span>
        </button>
        <button
          onClick={handleDismiss}
          className="py-2 px-3 bg-white/10 hover:bg-white/15 text-stone-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Not Now
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
