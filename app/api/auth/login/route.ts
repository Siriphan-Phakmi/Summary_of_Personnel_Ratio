import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/app/features/auth/types/user';

// Helper: สร้าง response JSON พร้อม header ที่ถูกต้อง
const jsonResponse = (data: any, init: ResponseInit = {}) => {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
};

// Server-side logging function ที่ไม่ต้องใช้ Authentication
const logToFirebase = async (logData: any, collectionName: string = 'system_logs') => {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const logsRef = collection(db, collectionName);
    
    const logEntry = {
      ...logData,
      timestamp: serverTimestamp(),
      source: 'server',
    };
    
    await addDoc(logsRef, logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${collectionName}] Server log saved:`, {
        action: logData.action?.type || 'unknown',
        user: logData.actor?.username || 'unknown',
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error(`❌ Failed to save server log to ${collectionName}:`, error);
  }
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      // Log failed login attempt
      await logToFirebase({
        actor: { id: 'UNKNOWN', username: username || 'UNKNOWN', role: 'UNKNOWN', active: false },
        action: { type: 'AUTH.LOGIN', status: 'FAILURE' },
        details: { reason: 'Missing credentials', username: username || 'UNKNOWN' },
        clientInfo: {
          userAgent: req.headers.get('user-agent') || 'unknown',
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          deviceType: 'unknown'
        }
      });

      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    // Query user by username field instead of document ID
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // ใช้เวลาตอบสนองเท่าเดิมเพื่อป้องกันการเดา username (Timing Attack)
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      await bcrypt.hash(password, saltRounds);
      
      // Log failed login attempt
      await logToFirebase({
        actor: { id: 'UNKNOWN', username, role: 'UNKNOWN', active: false },
        action: { type: 'AUTH.LOGIN', status: 'FAILURE' },
        details: { reason: 'User not found', username },
        clientInfo: {
          userAgent: req.headers.get('user-agent') || 'unknown',
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          deviceType: 'unknown'
        }
      });

      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Get the first (and should be only) user document
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const isMatch = await bcrypt.compare(password, userData.password || '');
    
    // Construct user object early for logging
    const userForLog: User = {
        uid: userDoc.id,
        username: userData.username || userDoc.id,
        role: userData.role || UserRole.NURSE,
        isActive: userData.active === undefined ? true : userData.active,
        firstName: userData.firstName,
        lastName: userData.lastName,
    };

    const clientInfo = {
      userAgent: req.headers.get('user-agent') || 'unknown',
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceType: 'unknown'
    };

    if (!isMatch) {
      await logToFirebase({
        actor: { 
          id: userForLog.uid, 
          username: userForLog.username, 
          role: userForLog.role, 
          active: userForLog.isActive 
        },
        action: { type: 'AUTH.LOGIN', status: 'FAILURE' },
        details: { reason: 'Invalid password', username },
        clientInfo
      });
      
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if(userForLog.isActive === false) {
      await logToFirebase({
        actor: { 
          id: userForLog.uid, 
          username: userForLog.username, 
          role: userForLog.role, 
          active: userForLog.isActive 
        },
        action: { type: 'AUTH.LOGIN', status: 'FAILURE' },
        details: { reason: 'Account inactive', username },
        clientInfo
      });
      
       return NextResponse.json(
        { success: false, error: 'บัญชีนี้ถูกระงับการใช้งาน' },
        { status: 403 }
      );
    }
    
    // Successful login, log before returning response
    await logToFirebase({
      actor: { 
        id: userForLog.uid, 
        username: userForLog.username, 
        role: userForLog.role, 
        active: userForLog.isActive 
      },
      action: { type: 'AUTH.LOGIN', status: 'SUCCESS' },
      details: { 
        role: userForLog.role, 
        success: true,
        responseTime: Date.now() - startTime
      },
      clientInfo
    });

    // ตั้งค่าเวลาหมดอายุของ Cookie (configurable via environment)
    const sessionTimeoutHours = parseInt(process.env.SESSION_TIMEOUT_HOURS || '3');
    const sessionTimeoutSeconds = sessionTimeoutHours * 60 * 60;

    // สร้าง user object ที่ปลอดภัย ไม่ส่งรหัสผ่านกลับ
    const safeUser = {
      uid: userDoc.id,
      username: userData.username || userDoc.id,
      role: userData.role || 'nurse',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      floor: userData.floor || null,
      ward: userData.ward || null,
      approveWardIds: userData.approveWardIds || [],
      assignedWardId: userData.assignedWardId || null,
      isActive: userData.active === undefined ? true : userData.active,
      active: userData.active === undefined ? true : userData.active,
    };

    // ตั้ง cookie แบบ httpOnly สำหรับ auth token และ user_data
    const response = NextResponse.json({ success: true, user: safeUser });
    
    // สำหรับ demo ใช้ token ปลอม (ใน production ต้องสร้าง JWT หรือ signed token จริง)
    const authToken = 'mock_auth_token_for_demo';

    response.cookies.set('auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTimeoutSeconds,
      path: '/',
    });
    response.cookies.set('user_data', encodeURIComponent(JSON.stringify(safeUser)), {
      maxAge: sessionTimeoutSeconds,
      path: '/',
    });

    return response;
  } catch (err) {
    // Log the error using server-side logging
    await logToFirebase({
      actor: { id: 'SYSTEM', username: 'SYSTEM', role: 'SYSTEM', active: true },
      action: { type: 'SYSTEM.ERROR', status: 'FAILURE' },
      details: { 
        context: 'LOGIN_API_CATCH_BLOCK',
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined
      },
      clientInfo: {
        userAgent: req.headers.get('user-agent') || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceType: 'unknown'
      }
    });
    
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
} 