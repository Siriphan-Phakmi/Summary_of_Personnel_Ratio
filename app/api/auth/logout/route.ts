import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/app/core/firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { logLogout } from '@/app/core/utils/logUtils';

export async function POST(request: Request) {
  try {
    // รับข้อมูลจาก request
    const data = await request.json();
    const { userId, username, role } = data;
    
    // ดึง User Agent จาก Header
    const userAgentString = request.headers.get('user-agent') || '';

    // --- Parse User Agent ตรงนี้ (Logic แบบเดียวกับ getDeviceInfo) ---
    const uaLower = userAgentString.toLowerCase();
    let clientBrowserName = 'Unknown';
    if (userAgentString.includes('Edg/')) clientBrowserName = 'Edge';
    else if (userAgentString.includes('OPR/') || userAgentString.includes('Opera')) clientBrowserName = 'Opera';
    else if (userAgentString.includes('Chrome/') && !userAgentString.includes('Edg/')) clientBrowserName = 'Chrome';
    else if (userAgentString.includes('Safari/') && !userAgentString.includes('Chrome/') && !userAgentString.includes('Edg/')) clientBrowserName = 'Safari';
    else if (userAgentString.includes('Firefox/')) clientBrowserName = 'Firefox';
    else if (uaLower.includes('msie') || userAgentString.includes('Trident/')) clientBrowserName = 'Internet Explorer';

    let clientDeviceType = 'Desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(uaLower)) clientDeviceType = 'Tablet';
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(uaLower)) clientDeviceType = 'Mobile';

    // ถ้า userAgentString ว่างเปล่า (อาจจะเกิดจาก request แปลกๆ)
    if (!userAgentString) {
        clientBrowserName = 'Unknown';
        clientDeviceType = 'Unknown';
    }
    // -------------------------------------------------------------

    // บันทึกประวัติการออกจากระบบ (ถ้ามีข้อมูลผู้ใช้)
    if (userId && username) {
      try {
        // อัพเดตข้อมูลผู้ใช้ใน Firestore
        await updateDoc(doc(db, 'users', userId), {
          lastActive: new Date()
        });
        
        // บันทึกประวัติการออกจากระบบ - ส่งค่าที่ parse แล้วไปด้วย
        await logLogout(
            userId,
            username,
            role,
            userAgentString,       // User Agent ดิบ
            clientBrowserName,     // Browser ที่ parse ได้
            clientDeviceType       // Device ที่ parse ได้
            );
      } catch (error) {
        console.error('Error updating user or logging logout:', error);
        // ไม่ return error เพื่อให้ยังสามารถล้าง session ได้
      }
    }
    
    // ล้าง cookies
    const cookieStore = await cookies();
    
    // ลบ auth token cookie
    cookieStore.delete('auth_token');
    
    // ลบ user data cookie
    cookieStore.delete('user_data');
    
    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการออกจากระบบ' },
      { status: 500 }
    );
  }
} 