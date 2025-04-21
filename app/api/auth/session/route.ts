import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/app/core/utils/authUtils';
import { db } from '@/app/core/firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * แสดง log เฉพาะในโหมด development ฝั่ง server
 */
function serverDevLog(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[SESSION API ${timestamp}] ${message}`);
  }
}

export async function GET(request: Request) {
  try {
    serverDevLog('Session API called');
    // ดึง token จาก cookie
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll(); // Get all cookies for logging
    serverDevLog(`All received cookies: ${JSON.stringify(allCookies)}`);
    
    const authToken = cookieStore.get('auth_token')?.value;
    
    serverDevLog(`Auth token from cookie: ${authToken ? `${authToken.substring(0, 10)}...` : 'not found'}`);
    
    if (!authToken) {
      serverDevLog('Auth token not found in cookies.');
      return NextResponse.json(
        { authenticated: false, error: 'No authentication token found' },
        { status: 401 }
      );
    }
    
    // ตรวจสอบความถูกต้องของ token
    serverDevLog('Verifying token...');
    const tokenData = await verifyToken(authToken);
    serverDevLog(`Token verification result: ${tokenData ? 'valid' : 'invalid or expired'}`);
    
    if (!tokenData || !tokenData.sub) {
      // Token ไม่ถูกต้องหรือหมดอายุ ให้ล้าง cookies
      serverDevLog('Invalid or expired token, or missing user ID (sub). Clearing cookies.');
      const response = NextResponse.json(
        { authenticated: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
      // Attempt to clear cookies in the response
      response.cookies.delete('auth_token');
      response.cookies.delete('user_data');
      return response;
    }
    
    // ตรวจสอบว่าผู้ใช้ยังมีอยู่และยังใช้งานได้หรือไม่
    const userId = tokenData.sub as string;
    serverDevLog(`Token valid for user ID: ${userId}. Checking user document...`);
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      serverDevLog('User document not found. Clearing cookies.');
      const response = NextResponse.json(
        { authenticated: false, error: 'User not found' },
        { status: 401 }
      );
      response.cookies.delete('auth_token');
      response.cookies.delete('user_data');
      return response;
    }
    
    const userData = userDoc.data();
    serverDevLog(`User document found: ${userData.username}`);
    
    // ตรวจสอบสถานะการใช้งาน
    if (userData.active === false) {
      serverDevLog('User account is disabled. Clearing cookies.');
      const response = NextResponse.json(
        { authenticated: false, error: 'Account is disabled' },
        { status: 403 }
      );
      response.cookies.delete('auth_token');
      response.cookies.delete('user_data');
      return response;
    }
    
    // อัพเดต lastActive
    serverDevLog(`Updating lastActive for user ${userId}`);
    await updateDoc(userDocRef, {
      lastActive: new Date()
    });
    
    // สร้าง user data ที่ปลอดภัย (ไม่มีข้อมูลอ่อนไหว)
    const safeUserData = {
      uid: userId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      floor: userData.floor || null,
      location: userData.location || [],
      approveWardIds: userData.approveWardIds || []
    };
    
    serverDevLog('Session valid. Returning authenticated status and user data.');
    // ส่งข้อมูลกลับ
    return NextResponse.json({
      authenticated: true,
      user: safeUserData
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    serverDevLog(`Session verification error: ${errorMessage}`);
    // In case of error, still try to clear cookies if possible
    const response = NextResponse.json(
      { authenticated: false, error: 'Error verifying session' },
      { status: 500 }
    );
    try {
      response.cookies.delete('auth_token');
      response.cookies.delete('user_data');
      serverDevLog('Attempted to clear cookies during error handling.');
    } catch (clearError) {
      serverDevLog("Failed to clear cookies during session error handling.");
    }
    return response;
  }
} 