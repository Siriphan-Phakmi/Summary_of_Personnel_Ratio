import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // เราไม่ทำอะไรซับซ้อน เพียงตอบกลับว่า success
  return NextResponse.json({ success: true });
} 