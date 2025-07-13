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
  
  // ✅ Session cleanup โดยไม่ใช้ browser storage
  useEffect(() => {
    // ล้างแคชเฉพาะกรณีไม่ได้มาจากการ logout (ซึ่งล้างไปแล้ว)
    if (!sessionExpired && !forcedLogout && !duplicateLogin) {
      // ล้าง cache ที่เกี่ยวข้องกับ session
      if (typeof window !== 'undefined') {
        console.log('Cleaning session cache on login page load');
        
        // ✅ ล้างเฉพาะ auth cookies (ไม่ใช้ browser storage)
        const authCookiesToClear = ['authToken', 'userData', 'auth_token', 'user_data'];
        authCookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        // ใช้ Firebase session management แทน browser storage
      }
    }
  }, [sessionExpired, forcedLogout, duplicateLogin, rememberMe]);
}; 