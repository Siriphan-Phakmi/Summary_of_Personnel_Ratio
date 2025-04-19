import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { hashPassword, comparePassword, generateToken } from '@/app/core/utils/authUtils';
import { db } from '@/app/core/firebase/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { logLogin, logLoginFailed } from '@/app/core/utils/logUtils';

// Rate limiting map (ควรใช้ Redis หรือ DB ในโปรดักชัน)
const rateLimits = new Map<string, { count: number, lastAttempt: number, blocked: boolean, blockUntil: number }>();

// ตรวจสอบการ rate limit โดยใช้ IP address
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = 5; // จำนวนครั้งสูงสุดที่อนุญาต
  const windowMs = 60 * 1000; // ช่วงเวลา (1 นาที)
  const blockDuration = 10 * 60 * 1000; // ระยะเวลาบล็อค (10 นาที)

  let entry = rateLimits.get(identifier);
  
  if (!entry) {
    entry = { count: 1, lastAttempt: now, blocked: false, blockUntil: 0 };
    rateLimits.set(identifier, entry);
    return false;
  }

  // ถ้าถูกบล็อค ตรวจสอบว่าหมดเวลาบล็อคหรือยัง
  if (entry.blocked) {
    if (now < entry.blockUntil) {
      return true; // ยังถูกบล็อคอยู่
    } else {
      // พ้นโทษแล้ว
      entry.blocked = false;
      entry.count = 1;
      entry.lastAttempt = now;
      return false;
    }
  }

  // ถ้าเกินช่วงเวลา reset ตัวนับ
  if (now - entry.lastAttempt > windowMs) {
    entry.count = 1;
    entry.lastAttempt = now;
    return false;
  }

  // เพิ่มตัวนับและตรวจสอบว่าเกินลิมิตหรือไม่
  entry.count += 1;
  entry.lastAttempt = now;
  
  if (entry.count > limit) {
    // เกินลิมิต ให้บล็อค
    entry.blocked = true;
    entry.blockUntil = now + blockDuration;
    return true;
  }

  return false;
}

// API route handler
export async function POST(request: Request) {
  try {
    // รับข้อมูลจาก request
    const data = await request.json();
    const { username, password, csrfToken } = data;
    
    // ดึง IP address จาก headers (ใน production ควรใช้ middleware หรือ proxy ที่เชื่อถือได้)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    
    // ตรวจสอบ CSRF token
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get('csrf_token')?.value;
    
    // เพิ่ม Log เพื่อตรวจสอบค่า CSRF token
    console.log('[LOGIN API] CSRF Token from Body:', csrfToken);
    console.log('[LOGIN API] CSRF Token from Cookie:', csrfCookie);
    
    if (csrfCookie !== csrfToken) {
      await logLoginFailed(username, 'Invalid CSRF token', request.headers.get('user-agent') || '');
      return NextResponse.json(
        { success: false, error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    // ตรวจสอบ rate limit โดยใช้ IP
    if (checkRateLimit(ip)) {
      await logLoginFailed(username, 'Rate limit exceeded', request.headers.get('user-agent') || '');
      return NextResponse.json(
        { success: false, error: 'เกินจำนวนครั้งที่อนุญาต กรุณาลองใหม่ในอีก 10 นาที' },
        { status: 429 }
      );
    }
    
    // ตรวจสอบว่ามีข้อมูลจำเป็นครบถ้วนหรือไม่
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }
    
    // ค้นหาผู้ใช้จาก Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await logLoginFailed(username, 'User not found', request.headers.get('user-agent') || '');
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }
    
    // ดึงข้อมูลผู้ใช้
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    // ตรวจสอบสถานะการใช้งาน
    if (userData.active === false) {
      await logLoginFailed(username, 'Account disabled', request.headers.get('user-agent') || '');
      return NextResponse.json(
        { success: false, error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }
    
    // ตรวจสอบรหัสผ่าน (ลบ plaintext comparison ออก)
    const passwordMatch = await comparePassword(password, userData.password);
    
    if (!passwordMatch) {
      await logLoginFailed(username, 'Invalid password', request.headers.get('user-agent') || '');
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }
    
    // สร้าง JWT token
    const userId = userDoc.id;
    const token = await generateToken(userId, userData.username, userData.role);
    
    // อัพเดตข้อมูลการเข้าสู่ระบบ
    await updateDoc(doc(db, 'users', userId), {
      lastLogin: new Date(),
      lastActive: new Date()
    });
    
    // บันทึกประวัติการเข้าสู่ระบบ
    await logLogin(userId, username, userData.role, request.headers.get('user-agent') || '');
    
    // สร้าง session
    // Note: ควรใช้ library เช่น iron-session หรือ next-auth ในการสร้าง session
    
    // สร้าง user cookie ที่ไม่มีข้อมูลอ่อนไหว (non-httpOnly) เพื่อให้ JavaScript อ่านได้
    const safeUserData = {
      uid: userId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      location: userData.location || [],
      approveWardIds: userData.approveWardIds || []
    };
    
    // ตั้งค่า auth token cookie (httpOnly เพื่อความปลอดภัย)
    await cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 86400, // 1 วัน
      path: '/'
    });
    
    // สร้าง user cookie ที่ไม่มีข้อมูลอ่อนไหว (non-httpOnly) เพื่อให้ JavaScript อ่านได้
    await cookieStore.set('user_data', JSON.stringify(safeUserData), {
      httpOnly: false, // อนุญาตให้ JavaScript อ่านได้
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 86400, // 1 วัน
      path: '/'
    });
    
    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      user: safeUserData,
      message: 'เข้าสู่ระบบสำเร็จ'
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
} 