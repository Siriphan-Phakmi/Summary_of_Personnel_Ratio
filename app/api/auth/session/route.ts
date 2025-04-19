import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/app/core/utils/authUtils';
import { db } from '@/app/core/firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    // ดึง token จาก cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { authenticated: false, error: 'No authentication token found' },
        { status: 401 }
      );
    }
    
    // ตรวจสอบความถูกต้องของ token
    const tokenData = await verifyToken(authToken);
    
    if (!tokenData || !tokenData.userId) {
      // Token ไม่ถูกต้องหรือหมดอายุ ให้ล้าง cookies
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_data');
      
      return NextResponse.json(
        { authenticated: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // ตรวจสอบว่าผู้ใช้ยังมีอยู่และยังใช้งานได้หรือไม่
    const userDoc = await getDoc(doc(db, 'users', tokenData.userId));
    
    if (!userDoc.exists()) {
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_data');
      
      return NextResponse.json(
        { authenticated: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const userData = userDoc.data();
    
    // ตรวจสอบสถานะการใช้งาน
    if (userData.active === false) {
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_data');
      
      return NextResponse.json(
        { authenticated: false, error: 'Account is disabled' },
        { status: 403 }
      );
    }
    
    // อัพเดต lastActive
    await updateDoc(doc(db, 'users', tokenData.userId), {
      lastActive: new Date()
    });
    
    // สร้าง user data ที่ปลอดภัย (ไม่มีข้อมูลอ่อนไหว)
    const safeUserData = {
      uid: tokenData.userId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      location: userData.location || [],
      approveWardIds: userData.approveWardIds || []
    };
    
    // ส่งข้อมูลกลับ
    return NextResponse.json({
      authenticated: true,
      user: safeUserData
    });
  } catch (error) {
    console.error('Session verification error:', error);
    // In case of error, still try to clear cookies if possible, though it might fail if cookieStore wasn't assigned
    try {
      const cookieStore = await cookies(); 
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_data');
    } catch (clearError) {
      console.error("Failed to clear cookies during session error handling:", clearError);
    }
    return NextResponse.json(
      { authenticated: false, error: 'Error verifying session' },
      { status: 500 }
    );
  }
} 