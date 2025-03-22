'use client';

import React from 'react';

/**
 * LoadingSpinner Component
 * คอมโพเนนต์สำหรับแสดงภาพโหลดข้อมูล
 * 
 * @param {Object} props
 * @param {string} props.size - ขนาดของสปินเนอร์ ('sm', 'md', 'lg')
 * @param {string} props.color - สีของสปินเนอร์
 * @param {string} props.message - ข้อความที่แสดงพร้อมกับสปินเนอร์
 */
const LoadingSpinner = ({ 
    size = 'md', 
    color = 'text-blue-600',
    message = 'กำลังโหลดข้อมูล...'
}) => {
    // กำหนดขนาดตามพารามิเตอร์ size
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };
    
    const spinnerSize = sizeClasses[size] || sizeClasses.md;
    
    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`${spinnerSize} ${color} animate-spin`}>
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
            </div>
            {message && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{message}</p>
            )}
        </div>
    );
};

export default LoadingSpinner; 