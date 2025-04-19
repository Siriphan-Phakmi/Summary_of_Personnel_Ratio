import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/app/core/utils/authUtils';
import { db } from '@/app/core/firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    console.log('Session API called');
    // ดึง token จาก cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    console.log('Auth token in cookie:', authToken ? `${authToken.substring(0, 10)}...` : 'not found');
    
    if (!authToken) {
      return NextResponse.json(
        { authenticated: false, error: 'No authentication token found' },
        { status: 401 }
      );
    }
    
    // ตรวจสอบความถูกต้องของ token
    const tokenData = await verifyToken(authToken);
    console.log('Token verification result:', tokenData ? 'valid' : 'invalid');
    
    if (!tokenData || !tokenData.sub) {
      // Token ไม่ถูกต้องหรือหมดอายุ ให้ล้าง cookies
      console.log('Invalid token or missing user ID');
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_data');
      
      return NextResponse.json(
        { authenticated: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // ตรวจสอบว่าผู้ใช้ยังมีอยู่และยังใช้งานได้หรือไม่
    const userId = tokenData.sub as string;
    console.log('Checking user document:', userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.log('User document not found');
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_data');
      
      return NextResponse.json(
        { authenticated: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const userData = userDoc.data();
    console.log('User found:', userData.username);
    
    // ตรวจสอบสถานะการใช้งาน
    if (userData.active === false) {
      console.log('User account is disabled');
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_data');
      
      return NextResponse.json(
        { authenticated: false, error: 'Account is disabled' },
        { status: 403 }
      );
    }
    
    // อัพเดต lastActive
    await updateDoc(doc(db, 'users', userId), {
      lastActive: new Date()
    });
    
    // สร้าง user data ที่ปลอดภัย (ไม่มีข้อมูลอ่อนไหว)
    const safeUserData = {
      uid: userId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      location: userData.location || [],
      approveWardIds: userData.approveWardIds || []
    };
    
    console.log('Session valid, returning user data');
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