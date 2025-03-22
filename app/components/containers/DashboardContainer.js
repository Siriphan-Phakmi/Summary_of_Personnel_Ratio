'use client';

import React from 'react';
import { useTheme } from 'next-themes';

/**
 * DashboardContainer Component
 * คอมโพเนนต์สำหรับเป็นโครงสร้างหลักของหน้าแดชบอร์ด
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - เนื้อหาภายในคอมโพเนนต์
 * @param {boolean} props.fullWidth - กำหนดให้เต็มความกว้างหรือไม่
 */
const DashboardContainer = ({ children, fullWidth = false }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
            <div className={`container mx-auto px-4 py-6 ${fullWidth ? 'max-w-full' : 'max-w-7xl'}`}>
                {children}
            </div>
        </div>
    );
};

export default DashboardContainer; 