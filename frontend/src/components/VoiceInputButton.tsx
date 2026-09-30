import React from 'react';
import { Mic, MicOff, AlertCircle, Volume2, Sparkles } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useLanguage } from '../i18n';

interface VoiceInputButtonProps {
  onSpeechCaptured: (text: string) => void;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onSpeechCaptured,
  className = '',
}) => {
  const { t } = useLanguage();

  const handleResult = (capturedText: string) => {
    if (capturedText) {
      onSpeechCaptured(capturedText);
    }
  };

  const {
    isListening,
    interimTranscript,
    error,
    isSupported,
    speechLang,
    startListening,
    stopListening,
    resetError,
  } = useSpeechRecognition({
    onResult: handleResult,
  });

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? t('request.stopListening') : t('request.speakRequest')}
          className={`relative min-w-[44px] min-h-[44px] px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all duration-200 border shadow-sm ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-rose-500/30 animate-pulse ring-4 ring-rose-400/20'
              : 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 border-[#159B5B]/30 hover:bg-[#159B5B] hover:text-white dark:hover:bg-[#159B5B] dark:hover:text-white'
          } ${className}`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <MicOff className="w-4 h-4" />
              <span>{t('request.listening')} ({speechLang})</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>🎤 {t('request.speakRequest')} ({speechLang})</span>
            </>
          )}
        </button>

        {/* Live Indicator Pill */}
        {isListening && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-bold animate-in fade-in">
            <Volume2 className="w-3.5 h-3.5 animate-bounce text-rose-600" />
            <span>Speak now in {speechLang}...</span>
          </div>
        )}
      </div>

      {/* Interim Transcript Feedback Banner */}
      {isListening && interimTranscript && (
        <div className="p-3 bg-stone-100 dark:bg-[#0D0D0D] border border-[#159B5B]/30 rounded-xl text-xs text-stone-700 dark:text-stone-300 flex items-center space-x-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-[#159B5B] animate-spin flex-shrink-0" />
          <span className="italic font-medium font-mono">"{interimTranscript}"</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{t(`request.${error}`) || error}</span>
          </div>
          <button
            type="button"
            onClick={resetError}
            className="text-[10px] uppercase font-black text-rose-600 dark:text-rose-400 hover:underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unsupported Browser Notice */}
      {!isSupported && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>{t('request.micUnavailable')}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;
