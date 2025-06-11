import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/core/utils/authUtils';
import { getUserDirectly } from '@/app/core/utils/auth';

/**
 * Route handler สำหรับตรวจสอบ session
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[API] GET /api/auth/session - Checking session');
  }

  try {
    // รับ token จาก cookie
    const cookies = request.cookies;
    const token = cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    // ตรวจสอบความถูกต้องของ token
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    // ดึงข้อมูลผู้ใช้จาก user ID ใน token
    const userId = payload.sub as string;
    const user = await getUserDirectly(userId);

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    // ตรวจสอบว่าผู้ใช้ยังใช้งานได้อยู่หรือไม่
    if (user.active === false) {
      return NextResponse.json(
        { authenticated: false, error: 'User account is inactive' },
        { status: 200 }
      );
    }

    // ส่งข้อมูลผู้ใช้กลับไป (ไม่รวมรหัสผ่าน)
    const { password, ...userWithoutPassword } = user;
    
    return NextResponse.json(
      { authenticated: true, user: userWithoutPassword },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'An error occurred while checking session' },
      { status: 500 }
    );
  }
} 