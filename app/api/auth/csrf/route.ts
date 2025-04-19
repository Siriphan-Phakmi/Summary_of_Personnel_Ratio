import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// สร้าง CSRF token
export async function GET() {
  // สร้าง random token
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  // กำหนด cookie สำหรับ CSRF
  const cookieStore = await cookies();
  await cookieStore.set('csrf_token', csrfToken, {
    httpOnly: true, // ป้องกันการเข้าถึงจาก JavaScript
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 3600, // 1 ชั่วโมง
    path: '/'
  });
  
  // ส่ง token กลับไปให้ client เพื่อใช้ใน form
  return NextResponse.json({ csrfToken });
} 