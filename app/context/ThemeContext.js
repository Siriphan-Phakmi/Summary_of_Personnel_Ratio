'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // เริ่มต้นด้วย light theme เสมอ
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // ตั้งค่าเริ่มต้นเป็น light theme
    setTheme('light');
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  // เปลี่ยนธีมระหว่าง light และ dark
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // อัปเดต class สำหรับ Tailwind CSS dark mode
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 