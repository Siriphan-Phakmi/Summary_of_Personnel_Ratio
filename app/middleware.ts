import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers ที่แนะนำให้ใช้
const securityHeaders = {
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // แสดง log เฉพาะใน development mode เท่านั้น
  if (process.env.NODE_ENV === 'development') {
    // ดึง IP address จาก headers
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown IP';
              
    // Log the request (this will show in terminal)
    console.log(`[BPK-SERVER] Request: ${path} from ${ip}`);
    
    // Get the user from the cookie if available
    const authCookie = request.cookies.get('auth_token')?.value;
    const userCookie = request.cookies.get('user_data')?.value;
    
    if (userCookie) {
      try {
        // ใช้ type safety มากขึ้นในการ parse user data
        type UserData = {
          username?: string;
          uid?: string;
          role?: string;
        };
        
        const userData = JSON.parse(decodeURIComponent(userCookie)) as UserData;
        const username = userData.username || userData.uid || 'unknown';
        const role = userData.role || 'unknown';
        
        console.log(`[BPK-SERVER] User ${username} (${role}) accessing: ${path}`);
      } catch (error) {
        console.log(`[BPK-SERVER] Could not parse user data from cookie: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (authCookie) {
      console.log(`[BPK-SERVER] Authenticated user (no details) accessing: ${path}`);
    } else {
      console.log(`[BPK-SERVER] Unauthenticated access to: ${path}`);
    }
  }
  
  // เพิ่ม security headers ให้กับทุก response
  const response = NextResponse.next();
  
  // เพิ่ม headers ทีละตัว
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|fonts|.*\\.png$).*)',
  ],
}; 