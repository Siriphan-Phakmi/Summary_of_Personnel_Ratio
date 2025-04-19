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
    
    // บันทึกประวัติการออกจากระบบ (ถ้ามีข้อมูลผู้ใช้)
    if (userId && username) {
      try {
        // อัพเดตข้อมูลผู้ใช้ใน Firestore
        await updateDoc(doc(db, 'users', userId), {
          lastActive: new Date()
        });
        
        // บันทึกประวัติการออกจากระบบ
        await logLogout(userId, username, role, request.headers.get('user-agent') || '');
      } catch (error) {
        console.error('Error updating user or logging logout:', error);
        // ไม่ return error เพื่อให้ยังสามารถล้าง session ได้
      }
    }
    
    // ล้าง cookies
    const cookieStore = await cookies();
    
    // ลบ auth token cookie
    await cookieStore.delete('auth_token');
    
    // ลบ user data cookie
    await cookieStore.delete('user_data');
    
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