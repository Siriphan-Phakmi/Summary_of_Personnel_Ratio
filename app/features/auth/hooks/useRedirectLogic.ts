'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types/user';
import { showErrorToast } from '@/app/lib/utils/toastUtils';

interface UseRedirectLogicProps {
  user: User | null;
  authStatus: string;
  sessionExpired?: boolean;
  accountLocked?: boolean;
  forcedLogout?: boolean;
  duplicateLogin?: boolean;
}

export const useRedirectLogic = ({
  user,
  authStatus,
  sessionExpired,
  accountLocked,
  forcedLogout,
  duplicateLogin
}: UseRedirectLogicProps) => {
  const router = useRouter();
  
  // Show special message based on URL params
  useEffect(() => {
    if (sessionExpired) {
      showErrorToast("Your session has expired or was logged in from another device. Please log in again.");
    } else if (accountLocked) {
      showErrorToast("Your account has been locked. Please contact an administrator.");
    } else if (forcedLogout) {
      showErrorToast("You were logged out because someone logged in with your account on another device.");
    } else if (duplicateLogin) {
      showErrorToast("You have logged in from another device or browser. Please try again on this device.");
    }
  }, [sessionExpired, accountLocked, forcedLogout, duplicateLogin]);
  
  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    console.log("LoginPage useEffect - user state changed:", { 
      user: user ? `${user.username} (role: ${user.role})` : 'null', 
      authStatus 
    });
    
    // Redirect logged-in user based on role and username
    if (user && authStatus === 'authenticated') {
      console.log(`Redirecting logged-in user (${user.role}, ${user.username}) to appropriate page`);
      
      // แสดงข้อมูล user ที่ได้รับมาเพื่อตรวจสอบ
      console.log("User data in LoginPage:", {
        uid: user.uid,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        floor: user.floor
      });
      
      // ตรวจสอบและเปลี่ยนเส้นทางตาม username
      if (user.username === 'test') {
        console.log('Redirecting test user to /census/form');
        router.push('/census/form');
      } else if (user.username === 'admin') {
        console.log('Redirecting admin user to /census/approval');
        router.push('/census/approval');
      } else if (user.username === 'bbee') {
        console.log('Redirecting bbee user to /admin/dev-tools');
        router.push('/admin/dev-tools');
      } else {
        // กรณีเป็น username อื่นๆ ให้ใช้ role ในการเปลี่ยนเส้นทาง
        console.log(`Checking role for user ${user.username}: ${user.role}`);
        switch (user.role) {
          case 'admin':
            console.log('Redirecting admin role to /census/approval');
            router.push('/census/approval');
            break;
          case 'developer':
            console.log('Redirecting developer role to /admin/dev-tools');
            router.push('/admin/dev-tools');
            break;
          default: // user role
            console.log('Redirecting other role to /census/form');
            router.push('/census/form');
            break;
        }
      }
    }
  }, [user, authStatus, router]);
}; 