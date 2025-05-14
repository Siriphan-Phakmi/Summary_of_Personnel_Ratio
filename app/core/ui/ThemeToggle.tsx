'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9"></div>; // Placeholder with the same size
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-light-card text-light-text transition-colors hover:bg-gray-200 dark:bg-dark-card dark:text-dark-text dark:hover:bg-gray-700"
    >
      {theme === 'light' && <FiSun className="h-5 w-5" />}
      {theme === 'dark' && <FiMoon className="h-5 w-5" />}
      {theme === 'system' && <FiMonitor className="h-5 w-5" />}
    </button>
  );
};

export default ThemeToggle; 