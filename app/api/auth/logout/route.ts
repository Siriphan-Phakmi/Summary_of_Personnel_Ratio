import { NextRequest, NextResponse } from 'next/server';

// Server-side logging function
const logToFirebase = async (logData: any, collectionName: string = 'system_logs') => {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('@/app/lib/firebase/firebase');
    const logsRef = collection(db, collectionName);
    
    const logEntry = {
      ...logData,
      timestamp: serverTimestamp(),
      source: 'server',
    };
    
    await addDoc(logsRef, logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${collectionName}] Server logout log saved:`, {
        action: logData.action?.type || 'unknown',
        user: logData.actor?.username || 'unknown',
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error(`❌ Failed to save logout log to ${collectionName}:`, error);
  }
};

export async function POST(req: NextRequest) {
  try {
    const userCookie = req.cookies.get('user_data')?.value;
    
    if (userCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie));
        
        // Server-side logging
        await logToFirebase({
          actor: { 
            id: userData.uid || 'UNKNOWN', 
            username: userData.username || 'UNKNOWN', 
            role: userData.role || 'UNKNOWN', 
            active: userData.isActive !== undefined ? userData.isActive : true 
          },
          action: { type: 'AUTH.LOGOUT', status: 'SUCCESS' },
          details: { role: userData.role || 'UNKNOWN' },
          clientInfo: {
            userAgent: req.headers.get('user-agent') || 'unknown',
            ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
            deviceType: 'unknown'
          }
        });
      } catch (parseError) {
        console.error('❌ Failed to parse user data for logout logging:', parseError);
      }
    }

    // Clear cookies
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('user_data', '', { maxAge: 0, path: '/' });
    
    return response;
  } catch (error) {
    console.error('❌ Logout API error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการออกจากระบบ' },
      { status: 500 }
    );
  }
} 