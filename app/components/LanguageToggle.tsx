'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { translations } from '@/app/utils/translations';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const text = translations[language];
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={toggleLanguage}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 relative overflow-hidden"
      aria-label={text.changeLanguage}
    >
      {/* Background highlight effect */}
      <div className={`absolute inset-0 bg-blue-50 dark:bg-blue-900/20 transform transition-transform duration-300 ${hover ? 'scale-100' : 'scale-0'} rounded-full`}></div>
      
      {/* Flag emoji with larger size for better visibility */}
      <div className="w-6 h-6 flex items-center justify-center text-lg relative z-10">
        {language === 'th' ? '🇬🇧' : '🇹🇭'}
      </div>
      
      {/* Text indicator that shows the language being switched to */}
      <span className="relative z-10 font-medium">
        {language === 'th' ? 'English' : 'ไทย'}
      </span>
    </button>
  );
} 