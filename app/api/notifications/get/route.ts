import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/core/services/NotificationService';
import { verifySession } from '@/app/core/utils/authUtils';

/**
 * API Endpoint สำหรับดึงการแจ้งเตือนของผู้ใช้
 */
export async function GET(req: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ผู้ใช้
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ดึงพารามิเตอร์จาก URL
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // ดึงการแจ้งเตือนตามเงื่อนไข
    let notifications;
    if (unreadOnly) {
      notifications = await notificationService.getUnreadNotifications(session.userId);
    } else {
      notifications = await notificationService.getUserNotifications(session.userId);
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