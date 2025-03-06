import { NextResponse } from 'next/server';

export function middleware(request) {
  // ไม่บันทึก log สำหรับ request ที่เกี่ยวกับ favicon.ico
  if (request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // บันทึก log request ทั้งหมดที่ไม่ใช่ favicon.ico
  console.log(`${request.method} ${request.nextUrl.pathname} ${new Date().toISOString()}`);
  
  return NextResponse.next();
}

// ระบุ matcher สำหรับเส้นทางที่ต้องการให้ middleware ทำงาน
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};
