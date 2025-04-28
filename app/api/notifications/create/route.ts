import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/core/services/NotificationService';
import { validateCsrfToken } from '@/app/core/utils/securityUtils';
import { verifySession } from '@/app/core/utils/authUtils';
import { NotificationType } from '@/app/core/services/NotificationService';

/**
 * API Endpoint สำหรับสร้างการแจ้งเตือนใหม่
 */
export async function POST(req: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ผู้ใช้
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ตรวจสอบ CSRF token
    const csrfTokenValid = await validateCsrfToken(req);
    if (!csrfTokenValid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

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

    // เพิ่ม createdBy จาก session
    data.createdBy = session.userId;

    // สร้างการแจ้งเตือนใหม่
    const notificationId = await notificationService.createNotification({
      title: data.title,
      message: data.message,
      recipientIds: data.recipientIds,
      type: data.type,
      relatedDocId: data.relatedDocId,
      createdBy: session.userId,
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