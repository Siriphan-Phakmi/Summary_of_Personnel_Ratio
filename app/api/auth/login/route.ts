import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/app/features/auth/types/user';
import { logAuthEvent, logSystemError } from '@/app/features/auth/services/logService';

// Helper: สร้าง response JSON พร้อม header ที่ถูกต้อง
const jsonResponse = (data: any, init: ResponseInit = {}) => {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
};

// เพิ่มฟังก์ชันสำหรับ logging เพื่อให้ตรวจสอบปัญหาง่ายขึ้น
const logError = (error: unknown, context: string) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Login API Error - ${context}]:`, errorMessage);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
};

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      // Log failed login attempt
      const pseudoUser: User = { uid: username, username, role: UserRole.NURSE, isActive: true };
      await logAuthEvent(pseudoUser, 'LOGIN', 'FAILURE', req);

      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const userRef = doc(db, 'users', username);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // ใช้เวลาตอบสนองเท่าเดิมเพื่อป้องกันการเดา username (Timing Attack)
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      await bcrypt.hash(password, saltRounds); // Dummy hash calculation with env-configurable rounds
      
      // Log failed login attempt
      const pseudoUser: User = { uid: username, username, role: UserRole.NURSE, isActive: true };
      await logAuthEvent(pseudoUser, 'LOGIN', 'FAILURE', req);

      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const userData = userSnap.data();
    const isMatch = await bcrypt.compare(password, userData.password || '');
    
    // Construct user object early for logging
    const userForLog: User = {
        uid: userSnap.id,
        username: userData.username || userSnap.id,
        role: userData.role || UserRole.NURSE,
        isActive: userData.active === undefined ? true : userData.active,
        firstName: userData.firstName,
        lastName: userData.lastName,
    };

    if (!isMatch) {
      await logAuthEvent(userForLog, 'LOGIN', 'FAILURE', req);
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if(userForLog.isActive === false) {
      await logAuthEvent(userForLog, 'LOGIN', 'FAILURE', req);
       return NextResponse.json(
        { success: false, error: 'บัญชีนี้ถูกระงับการใช้งาน' },
        { status: 403 }
      );
    }
    
    // Successful login, log before returning response
    await logAuthEvent(userForLog, 'LOGIN', 'SUCCESS', req);

    // ตั้งค่าเวลาหมดอายุของ Cookie (configurable via environment)
    const sessionTimeoutHours = parseInt(process.env.SESSION_TIMEOUT_HOURS || '3');
    const sessionTimeoutSeconds = sessionTimeoutHours * 60 * 60;

    // สร้าง user object ที่ปลอดภัย ไม่ส่งรหัสผ่านกลับ
    const safeUser = {
      uid: userSnap.id,
      username: userData.username || userSnap.id,
      role: userData.role || 'nurse',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      floor: userData.floor || null,
      ward: userData.ward || null,
      approveWardIds: userData.approveWardIds || [],
      assignedWardId: userData.assignedWardId || null,
      isActive: userData.active === undefined ? true : userData.active, // Use isActive to match User interface
      active: userData.active === undefined ? true : userData.active, // Keep active for backward compatibility
    };

    // ตั้ง cookie แบบ httpOnly สำหรับ auth token (stub) และ user_data (encodeURIComponent)
    const response = NextResponse.json({ success: true, user: safeUser });
    
    // สำหรับ demo ใช้ token ปลอม (ใน production ต้องสร้าง JWT หรือ signed token จริง)
    const authToken = 'mock_auth_token_for_demo'; // ควรเปลี่ยนเป็น JWT ใน Production

    response.cookies.set('auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ใช้ secure cookie ใน production
      sameSite: 'lax', // ป้องกัน CSRF
      maxAge: sessionTimeoutSeconds,
      path: '/',
    });
    response.cookies.set('user_data', encodeURIComponent(JSON.stringify(safeUser)), {
      maxAge: sessionTimeoutSeconds,
      path: '/',
    });

    return response;
  } catch (err) {
    // Log the error using the new system
    await logSystemError(err, 'LOGIN_API_CATCH_BLOCK', null, req);
    
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
} 