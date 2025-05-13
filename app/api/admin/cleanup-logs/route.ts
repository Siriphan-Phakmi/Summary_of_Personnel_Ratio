import { NextRequest, NextResponse } from 'next/server';
import { 
  cleanupOldLogs, 
  SYSTEM_LOGS_COLLECTION, 
  USER_ACTIVITY_LOGS_COLLECTION 
} from '@/app/core/utils/logUtils';
import { cookies, headers } from 'next/headers';

/**
 * API Route สำหรับลบ logs เก่าอัตโนมัติ
 * ถูกเรียกใช้โดย cron job หรือสามารถเรียกใช้ด้วย API key
 * 
 * Query Parameters:
 * - days: จำนวนวันที่จะเก็บ logs (ค่าเริ่มต้น: 90 วัน)
 * - key: API key สำหรับตรวจสอบความปลอดภัย (ต้องตรงกับ env)
 * - collection: ชื่อ collection ที่ต้องการลบ logs (ค่าเริ่มต้น: ทั้ง systemLogs และ userActivityLogs)
 */
export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบการยืนยันตัวตนด้วย API key
    const apiKey = request.nextUrl.searchParams.get('key');
    const expectedApiKey = process.env.LOGS_CLEANUP_API_KEY;
    
    // ตรวจสอบว่าเรียกจาก admin ที่ล็อกอินแล้วหรือไม่
    // เราใช้คุกกี้เพื่อตรวจสอบว่าผู้ใช้เป็น admin หรือไม่ 
    // (ในระบบจริงควรมีการตรวจสอบที่ดีกว่านี้)
    const isAdmin = request.cookies.get('isAdmin')?.value === 'true' || 
                    request.cookies.get('role')?.value === 'admin' ||
                    request.headers.get('x-user-role') === 'admin';
    
    // ถ้าไม่มี API key หรือไม่ตรงกัน และไม่ใช่ admin ให้คืนค่า 401
    if (!apiKey || apiKey !== expectedApiKey) {
      if (!isAdmin) {
        console.warn('Unauthorized access attempt to cleanup-logs API');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    // ดึงพารามิเตอร์จาก query
    const daysParam = request.nextUrl.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 90;
    
    const collection = request.nextUrl.searchParams.get('collection');
    
    // ตรวจสอบว่าจำนวนวันถูกต้องหรือไม่
    if (isNaN(days) || days <= 0 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 365.' },
        { status: 400 }
      );
    }
    
    let systemLogsCount = 0;
    let userActivityLogsCount = 0;
    
    // ลบ logs ตาม collection ที่ระบุ
    if (!collection || collection === 'all' || collection === SYSTEM_LOGS_COLLECTION) {
      systemLogsCount = await cleanupOldLogs(SYSTEM_LOGS_COLLECTION, days);
    }
    
    if (!collection || collection === 'all' || collection === USER_ACTIVITY_LOGS_COLLECTION) {
      userActivityLogsCount = await cleanupOldLogs(USER_ACTIVITY_LOGS_COLLECTION, days);
    }
    
    // คืนค่าจำนวน logs ที่ถูกลบ
    return NextResponse.json({
      success: true,
      systemLogsDeleted: systemLogsCount,
      userActivityLogsDeleted: userActivityLogsCount,
      total: systemLogsCount + userActivityLogsCount,
      retentionDays: days
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    return NextResponse.json(
      { error: 'Failed to clean up logs' },
      { status: 500 }
    );
  }
} 