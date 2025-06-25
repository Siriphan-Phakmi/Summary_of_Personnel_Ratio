import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/app/features/auth/types/user';

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
  '/admin/user-management': [UserRole.ADMIN, UserRole.DEVELOPER],
  '/admin/dev-tools': [UserRole.DEVELOPER],
  '/census/approval': [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.APPROVER],
  '/census/form': [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.APPROVER, UserRole.NURSE]
};

function handleAuthenticatedRedirect(request: NextRequest, userCookie: string): NextResponse | null {
  try {
    type UserData = { role?: string };
    const userData = JSON.parse(decodeURIComponent(userCookie)) as UserData;
    const userRole = userData.role;

    if (userRole) {
      const redirectPath = getLandingRedirectPathByRole(userRole);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[BPK-SERVER] Authenticated user at ${request.nextUrl.pathname}. Redirecting to: ${redirectPath}`);
      }
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[BPK-SERVER] Middleware: Could not parse user data cookie for redirect. Error: ${error}`);
    }
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // --- START: API Route Passthrough ---
  // หากเป็น API route ให้ข้ามการทำงานของ middleware ทั้งหมด
  // เพื่อป้องกันการ redirect ที่ไม่จำเป็น และปล่อยให้ API handler จัดการเอง
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  // --- END: API Route Passthrough ---

  const authToken = request.cookies.get('auth_token')?.value;
  const userCookie = request.cookies.get('user_data')?.value;

  // --- START: Redirect authenticated users ---
  if (authToken && userCookie && (pathname === '/' || pathname === '/login')) {
    const redirectResponse = handleAuthenticatedRedirect(request, userCookie);
    if (redirectResponse) return redirectResponse;
  }
  // --- END: Redirect authenticated users ---
  
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
      // Convert UserRole enums to strings for comparison
      return roles.map(role => {
        if (typeof role === 'string') {
          return role;
        } else if (role && typeof role === 'object') {
          // Handle enum case
          return String(role);
        } else {
          // Fallback for any other case
          return String(role);
        }
      });
    }
  }
  return null;
}

// ฟังก์ชันหา redirect path ตาม role สำหรับการเข้าหน้าแรก
function getLandingRedirectPathByRole(role: string): string {
  switch (role) {
    case UserRole.ADMIN:
    case UserRole.DEVELOPER:
      return '/census/approval';
    case UserRole.NURSE:
    case UserRole.APPROVER:
      return '/census/form';
    default:
      // สำหรับ role อื่นๆ หรือกรณีไม่มี role ให้ไปหน้า form เพื่อความปลอดภัย
      return '/census/form';
  }
}

// ฟังก์ชันหา redirect path ตาม role
function getRedirectPathByRole(role: string): string {
  switch (role) {
    case UserRole.ADMIN:
    case UserRole.DEVELOPER:
    case UserRole.APPROVER:
      return '/census/approval';
    case UserRole.NURSE:
      return '/census/form';
    default:
      return '/census/form';
  }
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/ (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (image files)
     * - fonts/ (font files)
     * - .png, .jpg, etc. (specific image extensions)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|images|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 