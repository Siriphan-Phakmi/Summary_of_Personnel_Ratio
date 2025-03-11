'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // เริ่มต้นด้วยธีมที่บันทึกไว้ใน localStorage หรือใช้ light theme เป็นค่าเริ่มต้น
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // โหลดธีมจาก localStorage เมื่อคอมโพเนนต์ถูกโหลด
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // หากไม่มีธีมที่บันทึกไว้ ให้ใช้ธีมของระบบปฏิบัติการ
      setTheme('dark');
    }

    // ตั้งค่า class สำหรับ Tailwind CSS dark mode
    if (savedTheme === 'dark' || 
      (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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