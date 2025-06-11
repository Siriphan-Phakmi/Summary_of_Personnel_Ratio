import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/app/core/services/AuthService';

/**
 * Route handler สำหรับการล็อกเอาท์
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[API] POST /api/auth/logout - Processing logout request');
  }

  try {
    // รับข้อมูลจาก request body
    const { userId, username, role } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 400 }
      );
    }

    // สร้าง response object
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // ลบ cookies ที่เกี่ยวข้องกับการล็อกอิน
    response.cookies.delete('auth_token');
    response.cookies.delete('user_data');

    // บันทึกการล็อกเอาท์ในระบบ
    try {
      const authService = AuthService.getInstance();
      // สร้าง user object ขั้นต่ำสำหรับ logout
      const user = { uid: userId, username, role };
      await authService.logout(user as any);
    } catch (error) {
      // ถ้าเกิดข้อผิดพลาดในการบันทึก log อย่างน้อยก็ยังลบ cookies ไปแล้ว
      console.error('[API] Error logging logout:', error);
    }

    return response;
  } catch (error) {
    console.error('[API] Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการออกจากระบบ' },
      { status: 500 }
    );
  }
}

/**
 * รองรับ sendBeacon จากฝั่ง client ด้วย
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 