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
  '/features',
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

// เส้นทางที่ต้องการ role เฉพาะ
const roleBasedRoutes = {
  '/admin/dev-tools': ['developer', 'super_admin'],
  '/census/approval': ['admin', 'super_admin', 'developer', 'approver'],
  '/census/form': ['admin', 'super_admin', 'developer', 'nurse', 'approver', 'ward_clerk']
};

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
  }
  
  // ตรวจสอบการยืนยันตัวตนสำหรับเส้นทางที่ต้องการการป้องกัน
  if (isProtectedRoute(pathname) && !isPublicRoute(pathname)) {
    // ตรวจสอบว่ามี auth token หรือไม่
    const authToken = request.cookies.get('auth_token')?.value;
    const userCookie = request.cookies.get('user_data')?.value;
    
    if (!authToken) {
      // ถ้าไม่มี token ให้ redirect ไปยังหน้า login
      const url = new URL('/login', request.url);
      // เพิ่ม returnUrl เพื่อให้สามารถกลับมายังหน้าเดิมหลังจาก login
      url.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // ตรวจสอบ role-based access
    if (userCookie) {
      try {
        type UserData = {
          username?: string;
          uid?: string;
          role?: string;
        };
        
        const userData = JSON.parse(decodeURIComponent(userCookie)) as UserData;
        const userRole = userData.role;
        
        // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึง path นี้หรือไม่
        const requiredRoles = getRoleRequirement(pathname);
        if (requiredRoles && userRole && !requiredRoles.includes(userRole)) {
          // ไม่มีสิทธิ์ - redirect ตาม role
          const redirectPath = getRedirectPathByRole(userRole);
          const url = new URL(redirectPath, request.url);
          return NextResponse.redirect(url);
        }
        
        if (process.env.NODE_ENV === 'development') {
          const username = userData.username || userData.uid || 'unknown';
          console.log(`[BPK-SERVER] User ${username} (${userRole}) accessing: ${pathname}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[BPK-SERVER] Could not parse user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
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

// ฟังก์ชันตรวจสอบว่าเส้นทางต้องการการยืนยันตัวตนหรือไม่
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

// ฟังก์ชันตรวจสอบว่าเส้นทางเป็นเส้นทางสาธารณะหรือไม่
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

// ฟังก์ชันตรวจสอบ role requirement
function getRoleRequirement(pathname: string): string[] | null {
  for (const [route, roles] of Object.entries(roleBasedRoutes)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return roles;
    }
  }
  return null;
}

// ฟังก์ชันหา redirect path ตาม role
function getRedirectPathByRole(role: string): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
    case 'developer':
    case 'approver':
      return '/census/approval';
    case 'nurse':
    case 'ward_clerk':
      return '/census/form';
    default:
      return '/census/form';
  }
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|fonts|.*\\.png$).*)',
    '/api/auth/:path*', // ทำงานกับ API routes ด้วย
  ],
}; 