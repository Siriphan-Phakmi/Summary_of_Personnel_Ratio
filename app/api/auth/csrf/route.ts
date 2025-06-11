import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/app/core/utils/authUtils';

/**
 * Route handler สำหรับสร้าง CSRF token
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[API] GET /api/auth/csrf - Generating CSRF token');
  }

  try {
    const csrfToken = generateCSRFToken();
    
    return NextResponse.json(
      { csrfToken },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
} 