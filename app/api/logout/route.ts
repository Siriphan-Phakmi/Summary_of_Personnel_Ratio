import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, ref, update } from 'firebase/database';
import app from '@/app/lib/firebase';

// Initialize Realtime Database
const rtdb = getDatabase(app);

export async function GET(request: NextRequest) {
  // Handle logout beacon from beforeunload event
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');

  if (!userId || !sessionId) {
    return NextResponse.json({ success: false, message: 'Missing userId or sessionId' }, { status: 400 });
  }

  try {
    // Update session status in RTDB
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
    await update(sessionRef, {
      isActive: false,
      disconnectedAt: Date.now(),
      disconnectReason: 'beforeunload_api_call'
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling logout:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
