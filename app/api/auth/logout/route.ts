import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/app/features/auth/types/user';
import { logAuthEvent } from '@/app/features/auth/services/logService';

export async function POST(req: NextRequest) {
  try {
    const userDataCookie = req.cookies.get('user_data');
    if (userDataCookie) {
      const userData: User = JSON.parse(decodeURIComponent(userDataCookie.value));
      await logAuthEvent(userData, 'LOGOUT', 'SUCCESS', req);
    } else {
      console.warn('[Logout API] User data cookie not found. Logging out without user context.');
    }
  } catch (error) {
    console.error('[Logout API] Error logging logout event:', error);
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  response.cookies.set('user_data', '', {
    expires: new Date(0),
    path: '/',
  });

  return response;
} 