import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/core/firebase/firebase';
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
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - No auth token', 
        notifications: [],
        unreadCount: 0
      }, { status: 401 });
    }
    
    const tokenData = await verifyToken(authToken);
    
    if (!tokenData || !tokenData.sub) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Invalid token', 
        notifications: [],
        unreadCount: 0
      }, { status: 401 });
    }
    
    const userId = tokenData.sub as string;
    
    // --- End Authentication Check ---

    // ดึงพารามิเตอร์จาก URL
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // ดึงการแจ้งเตือนตามเงื่อนไข
    let notifications = [];
    try {
      if (unreadOnly) {
        notifications = await notificationService.getUnreadNotifications(userId);
      } else {
        notifications = await notificationService.getUserNotifications(userId);
      }
    } catch (serviceError) {
      console.error('[API /notifications/get] Error calling notification service:', serviceError);
      // Return a successful response with empty array instead of error status
      return NextResponse.json({ 
        success: true, 
        notifications: [],
        unreadCount: 0
      }, { status: 200 });
    }

    // ตรวจสอบว่า notifications เป็น array หรือไม่
    if (!Array.isArray(notifications)) {
      console.error('[API /notifications/get] Invalid notifications data format:', notifications);
      // Return a successful response with empty array
       return NextResponse.json({ 
        success: true, 
         notifications: [],
         unreadCount: 0
       }, { status: 200 }); 
    }

    // กรองข้อมูลที่ไม่ถูกต้องออก
    const validNotifications = notifications.filter(n => {
      // ตรวจสอบว่า notification มีค่าที่จำเป็น
      return n && typeof n === 'object' && n.id;
    });

    // เรียงลำดับตามเวลาล่าสุด
    try {
      validNotifications.sort((a, b) => {
          // แปลง Timestamp เป็น Date
        const getTimestamp = (notification: any) => {
          if (!notification.createdAt) return 0;
          
          // ถ้าเป็น Firebase Timestamp
          if (typeof notification.createdAt === 'object' && 'toDate' in notification.createdAt) {
            return notification.createdAt.toDate().getTime();
          }
          
          // ถ้าเป็น Date หรือ string หรือ number
          const date = new Date(notification.createdAt);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        
        const dateA = getTimestamp(a);
        const dateB = getTimestamp(b);
          
          // เรียงจากใหม่ไปเก่า
          return dateB - dateA;
        });
    } catch (sortError) {
        console.error('[API /notifications/get] Error during sorting:', sortError);
      // ไม่ต้องทำอะไร ใช้ข้อมูลโดยไม่เรียงลำดับ
    }

    // ตอบกลับด้วยข้อมูลการแจ้งเตือน
    return NextResponse.json({
      success: true,
      notifications: validNotifications,
      unreadCount: validNotifications.filter(n => !n.isRead).length
    });
  } catch (error) {
    console.error('[API /notifications/get] Unexpected error:', error);
    // Return a successful response with empty array instead of error status
    return NextResponse.json({ 
      success: true, 
      notifications: [],
        unreadCount: 0
    }, { status: 200 });
  }
} 