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
    const result = await authService.login(username, password);

    if (result.success && result.user) {
      // สร้าง Response
      const response = NextResponse.json(
        { success: true, user: result.user },
        { status: 200 }
      );

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