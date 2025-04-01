import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // แสดง log เฉพาะใน development mode เท่านั้น
  if (process.env.NODE_ENV === 'development') {
    // Log the request (this will show in terminal)
    console.log(`[BPK-SERVER] Request: ${path} from ${request.ip || 'unknown IP'}`);
    
    // Get the user from the cookie if available
    const authCookie = request.cookies.get('auth_token')?.value;
    const userCookie = request.cookies.get('user_data')?.value;
    
    if (userCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie));
        console.log(`[BPK-SERVER] User ${userData.username || userData.uid} (${userData.role}) accessing: ${path}`);
      } catch (error) {
        console.log(`[BPK-SERVER] Could not parse user data from cookie`);
      }
    } else if (authCookie) {
      console.log(`[BPK-SERVER] Authenticated user (no details) accessing: ${path}`);
    } else {
      console.log(`[BPK-SERVER] Unauthenticated access to: ${path}`);
    }
  }
  
  return NextResponse.next();
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|fonts|.*\\.png$).*)',
  ],
}; 