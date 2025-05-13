import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers ที่แนะนำให้ใช้ ปรับปรุงให้ปลอดภัยมากขึ้น
const securityHeaders = {
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  // ปรับปรุง CSP ให้ปลอดภัยมากขึ้น ไม่ใช้ unsafe-inline
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

// รายการเส้นทางที่ต้องการการยืนยันตัวตน
const protectedRoutes = [
  '/admin',
  '/census',
  '/home',
  '/features/dashboard',
  '/features'
];

// รายการเส้นทางที่ไม่ต้องการการยืนยันตัวตน
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/csrf',
  '/api/auth/session',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts'
];

export function middleware(request: NextRequest) {
  // ดึงเส้นทางของ request
  const { pathname } = request.nextUrl;
  
  // แสดง log เฉพาะใน development mode เท่านั้น
  if (process.env.NODE_ENV === 'development') {
    // ดึง IP address จาก headers
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown IP';
              
    // Log the request (this will show in terminal)
    console.log(`[BPK-SERVER] Request: ${pathname} from ${ip}`);
    
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
        
        console.log(`[BPK-SERVER] User ${username} (${role}) accessing: ${pathname}`);
      } catch (error) {
        console.log(`[BPK-SERVER] Could not parse user data from cookie: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (authCookie) {
      console.log(`[BPK-SERVER] Authenticated user (no details) accessing: ${pathname}`);
    } else {
      console.log(`[BPK-SERVER] Unauthenticated access to: ${pathname}`);
    }
  }
  
  // ตรวจสอบการยืนยันตัวตนสำหรับเส้นทางที่ต้องการการป้องกัน
  if (isProtectedRoute(pathname) && !isPublicRoute(pathname)) {
    // ตรวจสอบว่ามี auth token หรือไม่
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      // ถ้าไม่มี token ให้ redirect ไปยังหน้า login
      const url = new URL('/login', request.url);
      // เพิ่ม returnUrl เพื่อให้สามารถกลับมายังหน้าเดิมหลังจาก login
      url.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // หมายเหตุ: เราไม่ได้ตรวจสอบความถูกต้องของ token ที่นี่
    // เพราะ middleware มีข้อจำกัดในการเรียกใช้งาน Firebase
    // การตรวจสอบความถูกต้องจะทำใน API route และ client-side
  }
  
  // เพิ่ม security headers ให้กับทุก response
  const response = NextResponse.next();
  
  // เพิ่ม headers ทีละตัว
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// ฟังก์ชันตรวจสอบว่าเส้นทางต้องการการยืนยันตัวตนหรือไม่
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

// ฟังก์ชันตรวจสอบว่าเส้นทางเป็นเส้นทางสาธารณะหรือไม่
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|fonts|.*\\.png$).*)',
    '/api/auth/:path*', // ทำงานกับ API routes ด้วย
  ],
}; 