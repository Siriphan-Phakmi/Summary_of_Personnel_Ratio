import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/core/services/NotificationService';
import { validateCsrfToken } from '@/app/core/utils/securityUtils';
import { verifySession } from '@/app/core/utils/authUtils';

/**
 * API Endpoint สำหรับทำเครื่องหมายว่าอ่านการแจ้งเตือนแล้ว
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
    
    // ตรวจสอบรูปแบบ request
    if (data.all === true) {
      // ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
      const count = await notificationService.markAllAsRead(session.userId);
      return NextResponse.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        count
      });
    } else if (data.notificationIds && Array.isArray(data.notificationIds)) {
      // ทำเครื่องหมายว่าอ่านหลายรายการแล้ว
      const count = await notificationService.markMultipleAsRead(data.notificationIds);
      return NextResponse.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        count
      });
    } else if (data.notificationId) {
      // ทำเครื่องหมายว่าอ่านรายการเดียวแล้ว
      const success = await notificationService.markAsRead(data.notificationId);
      return NextResponse.json({
        success,
        message: success ? 'Notification marked as read' : 'Failed to mark notification as read'
      });
    } else {
      // ไม่มีข้อมูลที่จำเป็น
      return NextResponse.json(
        { error: 'Missing notificationId, notificationIds array, or all=true parameter' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
} 