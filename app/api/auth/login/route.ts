import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import bcrypt from 'bcryptjs';

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
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const userRef = doc(db, 'users', username);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // ใช้เวลาตอบสนองเท่าเดิมเพื่อป้องกันการเดา username (Timing Attack)
      await bcrypt.hash(password, 10); // Dummy hash calculation
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const userData = userSnap.data();
    const hashedPw = userData.password;

    if (!hashedPw || typeof hashedPw !== 'string') {
      logError(new Error(`Password hash for user '${username}' is missing or not a string.`), "Password Hash Check");
      return NextResponse.json(
        { success: false, error: 'บัญชีนี้มีปัญหา โปรดติดต่อผู้ดูแลระบบ' },
        { status: 500 }
      );
    }

    const isMatch = await bcrypt.compare(password, hashedPw);
    
    if (!isMatch) {
      // เพิ่ม Log เพื่อช่วยในการ Debug
      logError(new Error(`Password mismatch for user: ${username}`), "Password Comparison");
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }
    
    // ตั้งค่าเวลาหมดอายุของ Cookie (3 ชั่วโมง)
    const threeHours = 3 * 60 * 60;

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
      active: userData.active === undefined ? true : userData.active,
    };

    // ตั้ง cookie แบบ httpOnly สำหรับ auth token (stub) และ user_data (encodeURIComponent)
    const response = NextResponse.json({ success: true, user: safeUser });
    
    // สำหรับ demo ใช้ token ปลอม (ใน production ต้องสร้าง JWT หรือ signed token จริง)
    const authToken = 'mock_auth_token_for_demo'; // ควรเปลี่ยนเป็น JWT ใน Production

    response.cookies.set('auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ใช้ secure cookie ใน production
      sameSite: 'lax', // ป้องกัน CSRF
      maxAge: threeHours,
      path: '/',
    });
    response.cookies.set('user_data', encodeURIComponent(JSON.stringify(safeUser)), {
      maxAge: threeHours,
      path: '/',
    });

    return response;
  } catch (err) {
    logError(err, "General Catch Block");
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
} 