import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../i18n';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseSpeechRecognitionOptions {
  onResult?: (text: string) => void;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const { currentLanguageConfig } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Map application language to standard BCP 47 language code for Web Speech API
  const getSpeechLanguageCode = useCallback((langCode: string) => {
    switch ((langCode || '').toLowerCase()) {
      case 'ta':
        return 'ta-IN';
      case 'hi':
        return 'hi-IN';
      case 'en':
      default:
        return 'en-IN';
    }
  }, []);

  const speechLang = getSpeechLanguageCode(currentLanguageConfig.code);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('micUnavailable');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getSpeechLanguageCode(currentLanguageConfig.code);

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalStr += transcriptPiece;
          } else {
            interimStr += transcriptPiece;
          }
        }

        if (finalStr.trim()) {
          if (options.onResult) {
            options.onResult(finalStr.trim());
          }
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        console.warn('Web Speech API event error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('micDenied');
        } else if (event.error === 'no-speech') {
          // Don't treat no-speech as fatal, just inform or quiet stop
        } else if (event.error === 'audio-capture') {
          setError('micDenied');
        } else {
          setError('speechError');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to initiate speech recognition:', e);
      setError('speechError');
      setIsListening(false);
    }
  }, [currentLanguageConfig.code, getSpeechLanguageCode, options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    interimTranscript,
    error,
    isSupported,
    speechLang,
    startListening,
    stopListening,
    resetError,
  };
};

export default useSpeechRecognition;
