import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/core/services/NotificationService';
import { verifyToken } from '@/app/core/utils/authUtils';
import { cookies } from 'next/headers';

/**
 * API Endpoint สำหรับทำเครื่องหมายว่าอ่านการแจ้งเตือนแล้ว
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
    const userId = tokenData.sub as string;
    // --- End Authentication Check ---

    // --- CSRF Check ---
    const csrfTokenFromHeader = req.headers.get('X-CSRF-Token');
    const csrfTokenFromCookie = cookieStore.get('csrf_token')?.value;

    if (!csrfTokenFromHeader || !csrfTokenFromCookie || csrfTokenFromHeader !== csrfTokenFromCookie) {
       console.warn('[API MarkAsRead] CSRF Token mismatch or missing.', { header: csrfTokenFromHeader, cookie: csrfTokenFromCookie });
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    // --- End CSRF Check ---

    // รับข้อมูลจาก request
    const data = await req.json();
    
    // ตรวจสอบรูปแบบ request
    if (data.all === true) {
      // ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
      const count = await notificationService.markAllAsRead(userId);
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