import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/app/core/services/AuthService';

/**
 * Route handler สำหรับอัพเดทเวลากิจกรรมล่าสุด
 */
export async function POST(request: NextRequest) {
  try {
    // รับ userId จาก request body
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // อัพเดทเวลากิจกรรมล่าสุด
    const authService = AuthService.getInstance();
    await authService.updateLastActive(userId);

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Activity update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update activity time' },
      { status: 500 }
    );
  }
} 