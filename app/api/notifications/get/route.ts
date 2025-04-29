import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/core/services/NotificationService';
import { verifyToken } from '@/app/core/utils/authUtils';
import { cookies } from 'next/headers';

/**
 * API Endpoint สำหรับดึงการแจ้งเตือนของผู้ใช้
 */
export async function GET(req: NextRequest) {
  console.log('[API /notifications/get] Request received.'); // <<< Log entry point
  try {
    console.log('[API /notifications/get] Entering main try block.'); // <<< Log try entry
    // --- Authentication Check ---
    const cookieStore = await cookies();
    console.log('[API /notifications/get] Got cookies.'); // <<< Log after cookies()
    const authToken = cookieStore.get('auth_token')?.value;
    if (!authToken) {
      console.log('[API /notifications/get] No auth token found.'); // <<< Log no token
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }
    console.log('[API /notifications/get] Found auth token, verifying...'); // <<< Log before verify
    const tokenData = await verifyToken(authToken);
    console.log('[API /notifications/get] verifyToken result:', tokenData ? 'Valid' : 'Invalid/Null'); // <<< Log after verify
    if (!tokenData || !tokenData.sub) {
      console.log('[API /notifications/get] Invalid token data.'); // <<< Log invalid token data
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    const userId = tokenData.sub as string;
    console.log(`[API /notifications/get] Authenticated user: ${userId}`); // <<< Log authenticated user
    // --- End Authentication Check ---

    // ดึงพารามิเตอร์จาก URL
    console.log('[API /notifications/get] Parsing URL and search params...'); // <<< Log before URL parse
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    console.log(`[API /notifications/get] unreadOnly: ${unreadOnly}`); // <<< Log params

    // ดึงการแจ้งเตือนตามเงื่อนไข
    let notifications;
    console.log('[API /notifications/get] Calling notificationService...'); // <<< Log before service call
    try {
      if (unreadOnly) {
        notifications = await notificationService.getUnreadNotifications(userId);
      } else {
        notifications = await notificationService.getUserNotifications(userId);
      }
      console.log(`[API /notifications/get] notificationService returned ${Array.isArray(notifications) ? notifications.length : typeof notifications} items.`); // <<< Log after service call (check type)
    } catch (serviceError) {
      // This catch block within the service call section was returning 503
      // We will keep it but add more logging
      console.error('[API /notifications/get] Error caught calling notification service:', serviceError);
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่สามารถเข้าถึงข้อมูลการแจ้งเตือนได้ กรุณาลองใหม่อีกครั้ง'
      }, { status: 503 });
    }

    // ตรวจสอบว่า notifications เป็น array หรือไม่
    if (!Array.isArray(notifications)) {
       console.error('[API /notifications/get] Invalid notifications data format after service call:', notifications);
       // Returning 200 with empty array as per previous logic
       return NextResponse.json({ 
         success: false, 
         error: 'รูปแบบข้อมูลการแจ้งเตือนไม่ถูกต้อง', 
         notifications: [],
         unreadCount: 0
       }, { status: 200 }); 
    }
    console.log('[API /notifications/get] Notifications data format OK.'); // <<< Log format OK

    // เรียงลำดับตามเวลาล่าสุด
    console.log('[API /notifications/get] Sorting notifications...'); // <<< Log before sort
    try {
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
          
          // Check for invalid dates which result in NaN
          if (isNaN(dateA) || isNaN(dateB)) {
            console.warn('[API /notifications/get] Invalid date found during sort:', { a: a.createdAt, b: b.createdAt });
            return 0; // Keep original order if dates are invalid
          }
          
          // เรียงจากใหม่ไปเก่า
          return dateB - dateA;
        });
    } catch (sortError) {
        console.error('[API /notifications/get] Error during sorting:', sortError);
        // Decide how to handle sort error - maybe return unsorted?
        // For now, log and continue with potentially unsorted data
    }
    console.log('[API /notifications/get] Sorting complete (or skipped on error).'); // <<< Log after sort

    // ตอบกลับด้วยข้อมูลการแจ้งเตือน
    console.log('[API /notifications/get] Returning successful response.'); // <<< Log before return
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length
    });
  } catch (error) {
    // This is the main catch block
    console.error('[API /notifications/get] CRITICAL ERROR caught in main catch block:', error);
    // Return 500 status code with error message
    return NextResponse.json(
      { 
        success: false,
        // Provide a more informative error message if possible, or keep generic
        error: `เกิดข้อผิดพลาดร้ายแรงในระบบขณะดึงข้อมูลการแจ้งเตือน: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        notifications: [], // Return empty array
        unreadCount: 0
      },
      { status: 500 } // Return 500 status code
    );
  }
} 