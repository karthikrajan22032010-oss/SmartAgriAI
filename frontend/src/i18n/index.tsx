// ============================================================
// i18n INDEX — Language context and hook
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en } from './en';
import { ta } from './ta';
import { hi } from './hi';
import { Language } from '../types';

const translations = { en, ta, hi };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof en;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('sf_language') as Language;
    return stored && ['en', 'ta', 'hi'].includes(stored) ? stored : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sf_language', lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export { en, ta, hi };
