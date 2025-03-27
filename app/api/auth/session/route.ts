import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, ref, get, set, update, remove } from 'firebase/database';
import app from '@/app/lib/firebase';

// Initialize Realtime Database
const rtdb = getDatabase(app);

/**
 * Get all active sessions for a user
 * @param req NextRequest object
 * @returns NextResponse with active sessions
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    // Get all sessions for the user
    const sessionsRef = ref(rtdb, `userSessions/${userId}/sessions`);
    const snapshot = await get(sessionsRef);
    
    if (!snapshot.exists()) {
      return NextResponse.json({ success: true, sessions: [] });
    }
    
    // Extract and format active sessions
    const sessions = snapshot.val();
    const activeSessions = Object.entries(sessions)
      .filter(([_, session]: [string, any]) => session.isActive)
      .map(([id, data]: [string, any]) => ({
        sessionId: id,
        ...data
      }));
    
    return NextResponse.json({ success: true, sessions: activeSessions });
  } catch (error) {
    console.error('Error getting sessions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get sessions' },
      { status: 500 }
    );
  }
}

/**
 * Create a new session
 * @param req NextRequest object
 * @returns NextResponse with session details
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, deviceInfo } = body;
    
    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Generate session ID with timestamp for uniqueness
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create session data
    const sessionData = {
      userId,
      userEmail,
      deviceInfo: deviceInfo || req.headers.get('user-agent') || 'Unknown device',
      browser: getBrowserName(req.headers.get('user-agent') || ''),
      createdAt: Date.now(),
      lastActive: Date.now(),
      isActive: true
    };
    
    // Save to Firebase RTDB
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
    await set(sessionRef, sessionData);
    
    // Update current session reference
    const currentSessionRef = ref(rtdb, `userSessions/${userId}/currentSession`);
    await set(currentSessionRef, {
      sessionId,
      timestamp: Date.now()
    });
    
    return NextResponse.json({
      success: true,
      sessionId,
      createdAt: sessionData.createdAt
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * Update a session's status
 * @param req NextRequest object
 * @returns NextResponse with updated status
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId, isActive, reason } = body;
    
    if (!userId || !sessionId) {
      return NextResponse.json(
        { success: false, message: 'Missing userId or sessionId' },
        { status: 400 }
      );
    }
    
    // Update session data
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
    const snapshot = await get(sessionRef);
    
    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    const updates: any = { lastActive: Date.now() };
    
    if (isActive !== undefined) {
      updates.isActive = isActive;
      
      if (isActive === false) {
        updates.disconnectedAt = Date.now();
        updates.disconnectReason = reason || 'user_ended';
      }
    }
    
    await update(sessionRef, updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * Delete a session
 * @param req NextRequest object
 * @returns NextResponse with deletion status
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    
    if (!userId || !sessionId) {
      return NextResponse.json(
        { success: false, message: 'Missing userId or sessionId' },
        { status: 400 }
      );
    }
    
    // First mark as inactive
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
    await update(sessionRef, {
      isActive: false,
      disconnectedAt: Date.now(),
      disconnectReason: 'deleted'
    });
    
    // Check if this is the current session and clear it if so
    const currentSessionRef = ref(rtdb, `userSessions/${userId}/currentSession`);
    const currentSessionSnapshot = await get(currentSessionRef);
    
    if (currentSessionSnapshot.exists() && currentSessionSnapshot.val().sessionId === sessionId) {
      await remove(currentSessionRef);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

/**
 * Get browser name from user agent
 * @param userAgent User agent string
 * @returns Browser name
 */
function getBrowserName(userAgent: string): string {
  if (userAgent.match(/chrome|chromium|crios/i)) {
    return 'Chrome';
  } else if (userAgent.match(/firefox|fxios/i)) {
    return 'Firefox';
  } else if (userAgent.match(/safari/i)) {
    return 'Safari';
  } else if (userAgent.match(/opr\//i)) {
    return 'Opera';
  } else if (userAgent.match(/edg/i)) {
    return 'Edge';
  } else {
    return 'Unknown Browser';
  }
} 