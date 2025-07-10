import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API route to generate and provide CSRF token
 * GET /api/auth/csrf
 */
export async function GET(request: NextRequest) {
  try {
    // Generate a new CSRF token
    const csrfToken = randomBytes(32).toString('hex');
    
    // Set CSRF token in HTTP-only cookie for security
    const cookieStore = await cookies();
    cookieStore.set('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Return CSRF token to client
    return NextResponse.json(
      { 
        csrfToken,
        message: 'CSRF token generated successfully' 
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('[CSRF] Error generating CSRF token:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate CSRF token',
        csrfToken: null 
      },
      { status: 500 }
    );
  }
}