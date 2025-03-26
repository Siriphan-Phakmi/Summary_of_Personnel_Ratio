'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('th');

  useEffect(() => {
    // Load saved language preference from localStorage
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage === 'en' || savedLanguage === 'th') {
      setLanguage(savedLanguage as Language);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'th' ? 'en' : 'th';
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 