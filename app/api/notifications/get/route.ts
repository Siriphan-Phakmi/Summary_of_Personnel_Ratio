import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/core/services/NotificationService';
import { verifyToken } from '@/app/core/utils/authUtils';
import { cookies } from 'next/headers';

/**
 * API Endpoint สำหรับดึงการแจ้งเตือนของผู้ใช้
 */
export async function GET(req: NextRequest) {
  try {
    // --- Authentication Check ---
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }
    const tokenData = await verifyToken(authToken);
    if (!tokenData || !tokenData.sub) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    const userId = tokenData.sub as string;
    // --- End Authentication Check ---

    // ดึงพารามิเตอร์จาก URL
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // ดึงการแจ้งเตือนตามเงื่อนไข
    let notifications;
    if (unreadOnly) {
      notifications = await notificationService.getUnreadNotifications(userId);
    } else {
      notifications = await notificationService.getUserNotifications(userId);
    }

    // เรียงลำดับตามเวลาล่าสุด
    notifications.sort((a, b) => {
      // แปลง Timestamp เป็น Date
      const dateA = a.createdAt ? 
        (typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? 
          a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime()) 
        : 0;
      
      const dateB = b.createdAt ? 
        (typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? 
          b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime()) 
        : 0;
      
      // เรียงจากใหม่ไปเก่า
      return dateB - dateA;
    });

    // ตอบกลับด้วยข้อมูลการแจ้งเตือน
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
} 