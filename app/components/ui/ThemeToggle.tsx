'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon } from 'react-icons/fi';

interface ThemeToggleProps {
  showLabel?: boolean;
}

export default function ThemeToggle({ 
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [ripple, setRipple] = useState(false);

  // Only show theme toggle once mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    
    // Show ripple effect
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
  };

  if (!mounted) return null;

  return (
    <>
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap">
          {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
      <button
        onClick={toggleTheme}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative flex items-center justify-center p-3 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 animate-fadeIn overflow-hidden`}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {ripple && (
          <span className="absolute w-full h-full bg-gray-200 dark:bg-gray-600 animate-ripple rounded-full opacity-30"></span>
        )}
        {theme === 'dark' ? (
          <div className="flex items-center">
            <FiSun className="h-6 w-6 text-amber-400 animate-spin-slow" />
            {showLabel && <span className="ml-2 text-base font-medium">Light Mode</span>}
          </div>
        ) : (
          <div className="flex items-center">
            <FiMoon className="h-6 w-6 text-blue-600" />
            {showLabel && <span className="ml-2 text-base font-medium">Dark Mode</span>}
          </div>
        )}
      </button>
    </>
  );
} 