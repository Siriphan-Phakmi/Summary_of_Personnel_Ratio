import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';

/**
 * บันทึกการทำงานของ API
 */
export const apiLogger = {
  /**
   * บันทึกข้อมูลเมื่อเริ่มต้น request
   * @param endpoint ชื่อ endpoint
   * @param params พารามิเตอร์
   * @returns เวลาเริ่มต้น
   */
  requestStart: (endpoint: string, params: any) => {
    console.log(`[API Request] ${endpoint} - Started`, params);
    return Date.now();
  },
  
  /**
   * บันทึกข้อมูลเมื่อจบ request
   * @param endpoint ชื่อ endpoint
   * @param startTime เวลาเริ่มต้น
   * @param success สถานะความสำเร็จ
   */
  requestEnd: (endpoint: string, startTime: number, success: boolean) => {
    const duration = Date.now() - startTime;
    console.log(`[API Request] ${endpoint} - ${success ? 'Success' : 'Failed'} - Duration: ${duration}ms`);
    
    // ส่งข้อมูลไปยังระบบ analytics หรือ monitoring ได้
    if (process.env.NEXT_PUBLIC_API_LOGGING === 'true') {
      try {
        addDoc(collection(db, 'apiLogs'), {
          endpoint,
          duration,
          success,
          timestamp: Timestamp.now()
        }).catch(logError => {
          console.error('[Logger] Failed to log API request:', logError);
        });
      } catch (error) {
        console.error('[Logger] Error logging API request:', error);
      }
    }
  },
  
  /**
   * บันทึกข้อผิดพลาด
   * @param endpoint ชื่อ endpoint
   * @param error ข้อผิดพลาด
   */
  error: (endpoint: string, error: any) => {
    console.error(`[API Error] ${endpoint}:`, error);
    
    // บันทึกข้อผิดพลาดลง Firestore หรือระบบ error tracking
    if (process.env.NEXT_PUBLIC_ERROR_LOGGING === 'true') {
      try {
        addDoc(collection(db, 'errorLogs'), {
          endpoint,
          error: error.message || String(error),
          stack: error.stack || '',
          timestamp: Timestamp.now()
        }).catch(logError => {
          console.error('[Logger] Failed to log error:', logError);
        });
      } catch (logError) {
        console.error('[Logger] Error logging error:', logError);
      }
    }
  }
};

/**
 * สำหรับบันทึกข้อมูลการใช้งานระบบอื่นๆ
 */
export const appLogger = {
  /**
   * บันทึกการเข้าใช้งานหน้าต่างๆ
   * @param page ชื่อหน้า
   * @param userId รหัสผู้ใช้
   */
  pageView: (page: string, userId?: string) => {
    console.log(`[PageView] ${page}${userId ? ` - User: ${userId}` : ''}`);
    
    // บันทึกข้อมูลลง Firestore
    if (process.env.NEXT_PUBLIC_USAGE_LOGGING === 'true') {
      try {
        addDoc(collection(db, 'pageViews'), {
          page,
          userId: userId || 'anonymous',
          timestamp: Timestamp.now()
        }).catch(error => {
          console.error('[Logger] Failed to log page view:', error);
        });
      } catch (error) {
        console.error('[Logger] Error logging page view:', error);
      }
    }
  }
}; 