import { NextRequest, NextResponse } from 'next/server';
import { getUserDirectly } from '@/app/core/utils/auth';
import notificationService from '@/app/core/services/NotificationService';

export async function GET(request: NextRequest) {
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

    // ดึงการแจ้งเตือนทั้งหมดและยังไม่อ่าน
    const [allNotifications, unreadNotifications] = await Promise.all([
      notificationService.getUserNotifications(user.uid),
      notificationService.getUnreadNotifications(user.uid)
    ]);

    return NextResponse.json({
      success: true,
      notifications: allNotifications,
      unreadCount: unreadNotifications.length
    });
    
  } catch (error) {
    console.error('[API] Error fetching notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน',
        notifications: [],
        unreadCount: 0 
      },
      { status: 500 }
    );
  }
} 