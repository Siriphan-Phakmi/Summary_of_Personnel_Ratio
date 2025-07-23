import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/features/auth/services/sessionService';
import { FirestoreSessionManager } from '@/app/features/auth/services/firestoreSessionManager';
import { Logger } from '@/app/lib/utils/logger';

/**
 * 🔐 Session Validation API with Active Session Check
 * ตรวจสอบความถูกต้องของ session และ single active session control
 */
export async function GET(req: NextRequest) {
  try {
    // Get session from cookies
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No session found' 
      });
    }

    // 🔒 Validate Active Session
    const sessionManager = FirestoreSessionManager.getInstance();
    const sessionId = req.cookies.get('session_id')?.value;
    
    if (sessionId) {
      const isValidSession = await sessionManager.isSessionValid(user.uid, sessionId);
      
      if (!isValidSession) {
        Logger.warn(`[SessionAPI] Invalid session detected for user ${user.username} - session: ${sessionId}`);
        
        // Clear cookies for invalid session
        const response = NextResponse.json({ 
          authenticated: false, 
          error: 'Session no longer valid',
          forceLogout: true
        });
        
        response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        response.cookies.set('user_data', '', { maxAge: 0, path: '/' });
        response.cookies.set('session_id', '', { maxAge: 0, path: '/' });
        
        return response;
      }

      // Note: Activity is updated automatically via interval in FirestoreSessionManager
    }

    // Session is valid
    return NextResponse.json({
      authenticated: true,
      user: {
        uid: user.uid,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        floor: user.floor,
        assignedWardId: user.assignedWardId,
        approveWardIds: user.approveWardIds || [],
        isActive: user.isActive,
      }
    });

  } catch (error) {
    Logger.error('[SessionAPI] Session validation error:', error);
    
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Session validation failed' 
      },
      { status: 500 }
    );
  }
} 