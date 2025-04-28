import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/core/services/NotificationService';
import { verifyToken } from '@/app/core/utils/authUtils';
import { NotificationType } from '@/app/core/services/NotificationService';
import { cookies } from 'next/headers';

/**
 * API Endpoint สำหรับสร้างการแจ้งเตือนใหม่
 */
export async function POST(req: NextRequest) {
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
    const userId = tokenData.sub as string; // Get userId from token
    // --- End Authentication Check ---


    // --- CSRF Check ---
    const csrfTokenFromHeader = req.headers.get('X-CSRF-Token');
    const csrfTokenFromCookie = cookieStore.get('csrf_token')?.value;

    if (!csrfTokenFromHeader || !csrfTokenFromCookie || csrfTokenFromHeader !== csrfTokenFromCookie) {
      console.warn('[API Create Notification] CSRF Token mismatch or missing.', { header: csrfTokenFromHeader, cookie: csrfTokenFromCookie });
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    // --- End CSRF Check ---


    // รับข้อมูลจาก request
    const data = await req.json();
    
    // ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วนหรือไม่
    if (!data.title || !data.message || !data.type || !data.recipientIds || !Array.isArray(data.recipientIds)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า type เป็นค่าที่ถูกต้องหรือไม่
    if (!Object.values(NotificationType).includes(data.type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // เพิ่ม createdBy จาก session (tokenData)
    data.createdBy = userId;

    // สร้างการแจ้งเตือนใหม่
    const notificationId = await notificationService.createNotification({
      title: data.title,
      message: data.message,
      recipientIds: data.recipientIds,
      type: data.type,
      relatedDocId: data.relatedDocId,
      createdBy: userId, // Use userId from verified token
      actionUrl: data.actionUrl
    });

    // ตอบกลับด้วย ID ของการแจ้งเตือนที่สร้าง
    return NextResponse.json(
      { success: true, notificationId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
} 