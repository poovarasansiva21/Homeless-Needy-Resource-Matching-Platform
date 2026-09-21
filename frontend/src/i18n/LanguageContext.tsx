import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, TranslationDict } from './en';
import { ta } from './ta';
import { hi } from './hi';

export type Language = 'EN' | 'TA' | 'HI';

export interface LanguageConfig {
  id: Language;
  code: string; // 'en', 'ta', 'hi'
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { id: 'EN', code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { id: 'TA', code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  { id: 'HI', code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
];

const dictionaries: Record<Language, TranslationDict> = {
  EN: en,
  TA: ta,
  HI: hi,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  supportedLanguages: LanguageConfig[];
  currentLanguageConfig: LanguageConfig;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('language') || localStorage.getItem('sahaayaa_language');
      if (saved && (saved === 'EN' || saved === 'TA' || saved === 'HI')) {
        return saved as Language;
      }
    } catch {
      // ignore
    }
    return 'EN';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('language', newLang);
      localStorage.setItem('sahaayaa_language', newLang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const config = SUPPORTED_LANGUAGES.find(l => l.id === language) || SUPPORTED_LANGUAGES[0];
    document.documentElement.lang = config.code;
    document.documentElement.setAttribute('data-language', language);
  }, [language]);

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const keys = keyPath.split('.');
    
    // 1. Try current language
    let current: any = dictionaries[language];
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        current = undefined;
        break;
      }
    }

    // 2. Fallback to English if not found
    if (typeof current !== 'string') {
      let fallback: any = dictionaries.EN;
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) {
          fallback = fallback[k];
        } else {
          fallback = undefined;
          break;
        }
      }
      if (typeof fallback === 'string') {
        current = fallback;
      } else {
        return keyPath; // return key itself if not found
      }
    }

    // 3. Interpolate parameters like {count}, {distance}, {radius}, etc.
    if (params) {
      let result = current as string;
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        result = result.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramVal));
      });
      return result;
    }

    return current as string;
  };

  const currentLanguageConfig = SUPPORTED_LANGUAGES.find(l => l.id === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
        currentLanguageConfig,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
