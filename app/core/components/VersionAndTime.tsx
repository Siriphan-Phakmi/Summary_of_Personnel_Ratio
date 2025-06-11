'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// หมายเหตุ: ใช้การกำหนดค่า version แบบ hardcoded หรือเรียกใช้จาก environment variable แทน
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

const VersionAndTime: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setIsMounted(true);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);
  
  if (!isMounted) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md shadow-md o-0">
        <span>v{APP_VERSION}</span>
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md shadow-md">
      <span>v{APP_VERSION}</span>
      <span className="mx-2">|</span>
      <span>{format(currentTime, 'yyyy-MM-dd HH:mm:ss')}</span>
    </div>
  );
};

export default VersionAndTime; 