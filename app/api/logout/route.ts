import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, ref, update, get } from 'firebase/database';
import app from '@/app/lib/firebase';

// Initialize Realtime Database
const rtdb = getDatabase(app);

/**
 * Logout API endpoint
 * Handles both programmatic logout and browser close events
 * 
 * @param request NextRequest object
 * @returns NextResponse with success/failure information
 */
export async function GET(request: NextRequest) {
  // Extract userId and sessionId from query parameters
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');
  const reason = searchParams.get('reason') || 'user_initiated';

  // Validate required parameters
  if (!userId || !sessionId) {
    return NextResponse.json(
      { success: false, message: 'Missing userId or sessionId' }, 
      { status: 400 }
    );
  }

  try {
    // Check if session exists
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
    const snapshot = await get(sessionRef);
    
    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, message: 'Session not found' }, 
        { status: 404 }
      );
    }

    // Update session status in RTDB
    await update(sessionRef, {
      isActive: false,
      disconnectedAt: Date.now(),
      disconnectReason: reason
    });
    
    // Check if this is the current session and clear it if so
    const currentSessionRef = ref(rtdb, `userSessions/${userId}/currentSession`);
    const currentSessionSnapshot = await get(currentSessionRef);
    
    if (currentSessionSnapshot.exists() && currentSessionSnapshot.val().sessionId === sessionId) {
      await update(currentSessionRef, { 
        isActive: false,
        disconnectedAt: Date.now()
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling logout:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' }, 
      { status: 500 }
    );
  }
}
