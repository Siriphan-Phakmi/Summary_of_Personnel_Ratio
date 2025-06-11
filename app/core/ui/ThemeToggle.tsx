'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ป้องกัน Hydration Error โดยรอให้ component mount ก่อนแสดง UI ที่ขึ้นกับ theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // แสดงปุ่มเปล่าๆ ก่อนในระหว่าง Server Side Rendering
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="p-2 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
      >
        <span className="opacity-0">...</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
    >
      {theme === 'dark' ? '💡 Light Mode' : '🌙 Dark Mode'}
    </button>
  );
};

export default ThemeToggle;