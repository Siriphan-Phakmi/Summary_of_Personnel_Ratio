import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFToken } from '@/app/core/utils/authUtils';
import { AuthService } from '@/app/core/services/AuthService';

/**
 * Route handler สำหรับการล็อกอิน
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[API] POST /api/auth/login - Processing login request');
  }

  try {
    // รับข้อมูลจาก request body
    const { username, password, csrfToken } = await request.json();

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    // ตรวจสอบ CSRF token
    if (!validateCSRFToken(csrfToken)) {
      return NextResponse.json(
        { success: false, error: 'CSRF token ไม่ถูกต้อง กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง' },
        { status: 403 }
      );
    }

    // ดำเนินการล็อกอิน
    const authService = AuthService.getInstance();
    const result = await authService.login(username, password);    if (result.success && result.user) {
      // สร้าง Response
      const response = NextResponse.json(
        { success: true, user: result.user },
        { status: 200 }
      );

      // เซ็ต cookies สำหรับ auth_token และ user_data
      response.cookies.set('auth_token', result.user.uid, {
        path: '/',
        httpOnly: false, // ต้องเป็น false เพื่อให้ client อ่านได้
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3 * 60 * 60 // 3 ชั่วโมง
      });

      // เซ็ต user data เป็น JSON string
      const userData = JSON.stringify({
        uid: result.user.uid,
        username: result.user.username,
        role: result.user.role,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        floor: result.user.floor
      });

      response.cookies.set('user_data', encodeURIComponent(userData), {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3 * 60 * 60 // 3 ชั่วโมง
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[API] Login error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
} 