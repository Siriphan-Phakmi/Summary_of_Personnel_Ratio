import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

// Firebase config ใช้ตัวเดียวกับฝั่ง client ผ่าน ENV ที่กำหนดใน .env
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ป้องกันการ init ซ้ำใน dev mode
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Helper: สร้าง response JSON พร้อม header ที่ถูกต้อง
const jsonResponse = (data: any, init: ResponseInit = {}) => {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
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

    // สมมติว่า document id = username
    const userRef = doc(db, 'users', username);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const userData = userSnap.data() as Record<string, any>;

    const hashedPw: string | undefined = userData.password;

    if (!hashedPw) {
      return NextResponse.json(
        { success: false, error: 'บัญชีนี้ไม่มีรหัสผ่าน โปรดติดต่อผู้ดูแลระบบ' },
        { status: 500 }
      );
    }

    const isMatch = await bcrypt.compare(password, hashedPw);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // สร้าง user object ที่ปลอดภัย ไม่ส่งรหัสผ่านกลับ
    const safeUser = {
      uid: userSnap.id,
      username: userData.username || userSnap.id,
      role: userData.role || 'user',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
    };

    // ตั้ง cookie แบบ httpOnly สำหรับ auth token (stub) และ user_data (encodeURIComponent)
    const response = NextResponse.json({ success: true, user: safeUser });
    // สำหรับ demo ใช้ token ปลอม (ใน production ต้องสร้าง JWT หรือ signed token จริง)
    const threeHours = 60 * 60 * 3;
    response.cookies.set('auth_token', 'valid', {
      httpOnly: true,
      maxAge: threeHours,
      path: '/',
    });
    response.cookies.set('user_data', encodeURIComponent(JSON.stringify(safeUser)), {
      maxAge: threeHours,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
} 