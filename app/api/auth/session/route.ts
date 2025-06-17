import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  const userCookie = req.cookies.get('user_data')?.value;

  if (authToken && userCookie) {
    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      return NextResponse.json({ authenticated: true, user });
    } catch (err) {
      console.error('Session parse error:', err);
    }
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
} 