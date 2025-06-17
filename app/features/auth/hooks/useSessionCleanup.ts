'use client';

import { useEffect } from 'react';

interface UseSessionCleanupProps {
  sessionExpired?: boolean;
  forcedLogout?: boolean;
  duplicateLogin?: boolean;
  rememberMe: boolean;
}

export const useSessionCleanup = ({
  sessionExpired,
  forcedLogout,
  duplicateLogin,
  rememberMe
}: UseSessionCleanupProps) => {
  
  // เพิ่ม useEffect สำหรับล้างแคชเมื่อโหลดหน้า Login
  useEffect(() => {
    // ล้างแคชเฉพาะกรณีไม่ได้มาจากการ logout (ซึ่งล้างไปแล้ว)
    if (!sessionExpired && !forcedLogout && !duplicateLogin) {
      // ล้าง cache ที่เกี่ยวข้องกับ session
      if (typeof window !== 'undefined') {
        console.log('Cleaning session cache on login page load');
        
        // ล้าง user session ID ใน session storage
        sessionStorage.removeItem('currentSessionId');
        
        // ล้าง CSRF token
        sessionStorage.removeItem('csrfToken');
        
        // ล้าง cache อื่นๆ ที่อาจเกี่ยวข้องกับ auth
        const authCookiesToClear = ['authToken', 'userData'];
        authCookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        // ล้าง cache อื่นๆ ที่อาจเกี่ยวข้องกับ auth ลองตรวจสอบและล้างเพิ่มเติม
        if (rememberMe === false) {
          localStorage.removeItem('lastLoginUser');
        }
      }
    }
  }, [sessionExpired, forcedLogout, duplicateLogin, rememberMe]);
}; 