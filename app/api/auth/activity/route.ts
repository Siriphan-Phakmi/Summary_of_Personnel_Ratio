import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/app/core/firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { verifyToken } from '@/app/core/utils/authUtils';

export async function POST(request: Request) {
  try {
    // ตรวจสอบ token ใน cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token found' },
        { status: 401 }
      );
    }
    
    // ตรวจสอบความถูกต้องของ token
    const tokenData = await verifyToken(authToken);
    
    if (!tokenData || !tokenData.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // รับข้อมูลจาก request
    const data = await request.json();
    const { userId } = data;
    
    // ตรวจสอบว่า userId ตรงกับ token หรือไม่
    if (userId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      );
    }
    
    // อัพเดต lastActive ใน Firestore
    await updateDoc(doc(db, 'users', userId), {
      lastActive: new Date()
    });
    
    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    console.error('Activity update error:', error);
    return NextResponse.json(
      { success: false, error: 'Error updating activity' },
      { status: 500 }
    );
  }
} 