import { NextRequest, NextResponse } from 'next/server';
import { getUserDirectly } from '@/app/core/utils/auth';
import notificationService from '@/app/core/services/NotificationService';

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ authentication
    const cookies = request.cookies;
    const token = cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    const user = await getUserDirectly(token);
    if (!user || !user.uid) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    // ตรวจสอบ CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      return NextResponse.json(
        { success: false, error: 'ขาด CSRF Token' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { notificationId, all } = body;

    if (all) {
      // อ่านทั้งหมด
      const updatedCount = await notificationService.markAllAsRead(user.uid);
      return NextResponse.json({
        success: true,
        message: `อ่านการแจ้งเตือน ${updatedCount} รายการแล้ว`,
        updatedCount
      });
    } else if (notificationId) {
      // อ่านรายการเดียว
      const success = await notificationService.markAsRead(notificationId);
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'ทำเครื่องหมายว่าอ่านแล้วเรียบร้อย'
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('[API] Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' },
      { status: 500 }
    );
  }
} 