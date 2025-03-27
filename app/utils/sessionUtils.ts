import { 
  getDatabase, 
  ref, 
  set, 
  remove, 
  update, 
  onDisconnect, 
  get, 
  query, 
  orderByChild, 
  equalTo, 
  DatabaseReference, 
  onValue, 
  off
} from 'firebase/database';
import { 
  getAuth,
  User as FirebaseUser 
} from 'firebase/auth';
import { app as firebaseApp } from '@/app/lib/firebase';
import { isBrowser, uuid } from './commonUtils';
import Cookies from 'js-cookie';
import { logSessionCreated } from './logUtils';
import { User } from '@/app/types/user';

// Initialize Firebase RTDB
const rtdb = getDatabase(firebaseApp);

/** 
 * Session duration in minutes
 * Default is 30 minutes of inactivity
 */
export const SESSION_DURATION = 30;

/**
 * Session info stored in localStorage
 */
interface SessionInfo {
  sessionId: string;
  userId: string;
  expiresAt: number;
}

/**
 * User session as stored in Firebase RTDB
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  browser: string;
  deviceName: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  active: boolean;
}

/**
 * Safely get the browser name in SSR-compatible way
 */
export const getBrowserName = (): string => {
  if (!isBrowser()) return 'unknown';
  
  const userAgent = navigator.userAgent;
  let browserName = 'unknown';

  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = 'Chrome';
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = 'Firefox';
  } else if (userAgent.match(/safari/i)) {
    browserName = 'Safari';
  } else if (userAgent.match(/opr\//i)) {
    browserName = 'Opera';
  } else if (userAgent.match(/edg/i)) {
    browserName = 'Edge';
  } else if (userAgent.match(/android/i)) {
    browserName = 'Android';
  } else if (userAgent.match(/iphone/i)) {
    browserName = 'iPhone';
  }

  return browserName;
};

/**
 * Safely get the device name in SSR-compatible way
 */
export const getDeviceName = (): string => {
  if (!isBrowser()) return 'unknown';
  
  const userAgent = navigator.userAgent;
  let deviceName = 'Desktop';

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceName = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    deviceName = 'Mobile';
  }

  return deviceName;
};

/**
 * Generate a unique session ID
 */
export const generateSessionId = (): string => {
  return uuid();
};

/**
 * Get the current session from localStorage
 */
export const getLocalSession = (): SessionInfo | null => {
  if (!isBrowser()) return null;
  
  const sessionData = localStorage.getItem('userSession');
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData) as SessionInfo;
  } catch (error) {
    console.error('Failed to parse session data:', error);
    return null;
  }
};

/**
 * Save session info to localStorage
 */
export const saveLocalSession = (sessionInfo: SessionInfo): void => {
  if (!isBrowser()) return;
  localStorage.setItem('userSession', JSON.stringify(sessionInfo));
};

/**
 * Remove session info from localStorage
 */
export const removeLocalSession = (): void => {
  if (!isBrowser()) return;
  localStorage.removeItem('userSession');
};

/**
 * Create a new session in Firebase RTDB
 */
export const createSession = async (
  user: User | FirebaseUser,
  displayName?: string
): Promise<string> => {
  if (!isBrowser()) {
    console.warn('createSession called in non-browser environment');
    return '';
  }

  try {
    const userId = user.uid;
    const username = 'email' in user ? user.email || 'unknown' : user.email || 'unknown';
    const sessionId = generateSessionId();
    const browser = getBrowserName();
    const deviceName = getDeviceName();
    const now = Date.now();
    const expiresAt = now + SESSION_DURATION * 60 * 1000;
    
    // User session object for Firebase RTDB
    const userSession: UserSession = {
      sessionId,
      userId,
      username,
      displayName: displayName || username,
      role: 'role' in user ? user.role : 'unknown',
      browser,
      deviceName,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      active: true
    };

    // Save to Firebase RTDB
    await set(ref(rtdb, `sessions/${sessionId}`), userSession);

    // Link this session to the user for easy querying
    await set(ref(rtdb, `users/${userId}/sessions/${sessionId}`), true);

    // Setup disconnection cleanup
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    onDisconnect(sessionRef).update({ active: false });

    // Save to localStorage for persistence
    saveLocalSession({
      sessionId,
      userId,
      expiresAt
    });

    // Set session cookie for cross-tab synchronization
    Cookies.set('sessionId', sessionId, { 
      expires: new Date(expiresAt),
      sameSite: 'strict'
    });

    // Log session created
    await logSessionCreated(userId, username, {
      sessionId,
      browser,
      deviceName
    });

    return sessionId;
  } catch (error) {
    console.error('Failed to create session:', error);
    return '';
  }
};

/**
 * Create a user session with Firebase
 */
export const createUserSession = async (userId: string, email: string): Promise<string> => {
  try {
    const sessionId = generateSessionId();
    const browser = getBrowserName();
    const deviceName = getDeviceName();
    const now = Date.now();
    const expiresAt = now + SESSION_DURATION * 60 * 1000;
    
    // User session object for Firebase RTDB
    const userSession: UserSession = {
      sessionId,
      userId,
      username: email || userId,
      displayName: email || userId,
      role: 'user', // Default role
      browser,
      deviceName,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      active: true
    };

    // Save to Firebase RTDB
    await set(ref(rtdb, `sessions/${sessionId}`), userSession);

    // Link this session to the user for easy querying
    await set(ref(rtdb, `users/${userId}/sessions/${sessionId}`), true);

    // Setup disconnection cleanup
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    onDisconnect(sessionRef).update({ active: false });

    // Save to localStorage for persistence
    saveLocalSession({
      sessionId,
      userId,
      expiresAt
    });

    return sessionId;
  } catch (error) {
    console.error('Failed to create user session:', error);
    return '';
  }
};

/**
 * Setup handler for beforeunload event
 */
export const setupBeforeUnloadHandler = (userId: string, sessionId: string): (() => void) => {
  if (!isBrowser()) return () => {};

  const handleBeforeUnload = () => {
    // Mark session as inactive
    update(ref(rtdb, `sessions/${sessionId}`), {
      active: false,
      lastActivity: Date.now()
    }).catch(console.error);
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

/**
 * Monitor user session for changes (e.g., force logout from another device)
 */
export const monitorUserSession = (
  userId: string, 
  sessionId: string, 
  onForceLogout: () => void
): (() => void) => {
  if (!isBrowser()) return () => {};

  // Monitor this specific session
  const sessionRef = ref(rtdb, `sessions/${sessionId}`);
  
  // Listen for changes to the active status
  onValue(sessionRef, (snapshot) => {
    if (!snapshot.exists()) {
      // Session was deleted
      onForceLogout();
      return;
    }
    
    const sessionData = snapshot.val();
    if (!sessionData.active) {
      // Session was deactivated from another source
      onForceLogout();
    }
  });

  return () => {
    // Clean up listener
    off(sessionRef);
  };
};

/**
 * Terminate all other sessions for this user
 */
export const terminateOtherSessions = async (userId: string, currentSessionId: string): Promise<void> => {
  try {
    // Get all sessions for this user
    const userSessionsRef = ref(rtdb, `users/${userId}/sessions`);
    const snapshot = await get(userSessionsRef);
    
    if (!snapshot.exists()) return;
    
    const sessions = snapshot.val();
    
    // Terminate all sessions except the current one
    for (const sessionId in sessions) {
      if (sessionId !== currentSessionId) {
        const sessionRef = ref(rtdb, `sessions/${sessionId}`);
        await update(sessionRef, {
          active: false,
          lastActivity: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('Failed to terminate other sessions:', error);
  }
};

/**
 * Clean up user session
 */
export const cleanupUserSession = async (userId: string, sessionId: string): Promise<void> => {
  try {
    if (!sessionId) return;
    
    // Mark session as inactive
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    await update(sessionRef, {
      active: false,
      lastActivity: Date.now()
    });
    
    // Remove from user's active sessions
    const userSessionRef = ref(rtdb, `users/${userId}/sessions/${sessionId}`);
    await remove(userSessionRef);
    
    // Remove from localStorage
    removeLocalSession();
    
    // Remove session cookie
    Cookies.remove('sessionId');
  } catch (error) {
    console.error('Failed to clean up session:', error);
  }
};

/**
 * Check for duplicate sessions for the same user
 */
export const checkForDuplicateSessions = async (userId: string): Promise<UserSession[]> => {
  try {
    const sessionQuery = query(
      ref(rtdb, 'sessions'),
      orderByChild('userId'),
      equalTo(userId)
    );

    const snapshot = await get(sessionQuery);
    const activeSessions: UserSession[] = [];

    if (snapshot.exists()) {
      const sessions = snapshot.val();
      const now = Date.now();

      // Filter for active sessions that haven't expired
      Object.values(sessions).forEach((session: any) => {
        if (session.active && session.expiresAt > now) {
          activeSessions.push(session);
        }
      });
    }

    return activeSessions;
  } catch (error) {
    console.error('Failed to check for duplicate sessions:', error);
    return [];
  }
};

/**
 * Update session activity to keep it alive
 */
export const updateSessionActivity = async (sessionId: string): Promise<void> => {
  if (!sessionId) return;
  
  try {
    const now = Date.now();
    const expiresAt = now + SESSION_DURATION * 60 * 1000;
    
    await update(ref(rtdb, `sessions/${sessionId}`), {
      lastActivity: now,
      expiresAt,
      active: true
    });

    // Update local storage
    const session = getLocalSession();
    if (session) {
      saveLocalSession({
        ...session,
        expiresAt
      });
    }

    // Refresh session cookie
    Cookies.set('sessionId', sessionId, { 
      expires: new Date(expiresAt),
      sameSite: 'strict'
    });
  } catch (error) {
    console.error('Failed to update session activity:', error);
  }
};

/**
 * End a user session
 */
export const endSession = async (sessionId: string): Promise<void> => {
  if (!sessionId) return;
  
  try {
    // Get session data for logging
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    const sessionSnap = await get(sessionRef);
    
    if (sessionSnap.exists()) {
      const sessionData = sessionSnap.val() as UserSession;
      
      // Mark session as inactive in Firebase
      await update(sessionRef, {
        active: false,
        lastActivity: Date.now()
      });

      // Remove the session from the user's active sessions
      await remove(ref(rtdb, `users/${sessionData.userId}/sessions/${sessionId}`));

      // Log the session end
      await logSessionCreated(sessionData.userId, sessionData.username, {
        sessionId,
        browser: sessionData.browser,
        deviceName: sessionData.deviceName,
        type: 'session_ended'
      });
    }

    // Clear from localStorage
    removeLocalSession();
    
    // Clear session cookie
    Cookies.remove('sessionId');
  } catch (error) {
    console.error('Failed to end session:', error);
  }
};

/**
 * Clean up session on page unload
 */
export const setupSessionCleanup = (): (() => void) => {
  if (!isBrowser()) return () => {};

  const handleUnload = async () => {
    const session = getLocalSession();
    if (session?.sessionId) {
      await endSession(session.sessionId);
    }
  };

  window.addEventListener('beforeunload', handleUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
  };
};

/**
 * Listen for session expiration events
 */
export const listenForSessionExpiration = (callback: () => void): (() => void) => {
  if (!isBrowser()) return () => {};

  const session = getLocalSession();
  if (!session?.sessionId) return () => {};

  const sessionRef = ref(rtdb, `sessions/${session.sessionId}`);
  
  // Listen for changes to the session
  onValue(sessionRef, (snapshot) => {
    if (!snapshot.exists() || !snapshot.val().active) {
      // Session has been terminated from another device/tab
      removeLocalSession();
      Cookies.remove('sessionId');
      callback();
    }
  });

  return () => {
    off(sessionRef);
  };
};

/**
 * Get user's active sessions
 */
export const getUserSessions = async (userId: string): Promise<UserSession[]> => {
  try {
    const sessionQuery = query(
      ref(rtdb, 'sessions'),
      orderByChild('userId'),
      equalTo(userId)
    );

    const snapshot = await get(sessionQuery);
    const sessions: UserSession[] = [];

    if (snapshot.exists()) {
      const sessionsData = snapshot.val();
      
      // Convert object to array and filter active sessions
      Object.values(sessionsData).forEach((session: any) => {
        sessions.push(session as UserSession);
      });

      // Sort by creation time (newest first)
      sessions.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sessions;
  } catch (error) {
    console.error('Failed to get user sessions:', error);
    return [];
  }
};

/**
 * End all active sessions for a user except the current one
 */
export const endAllOtherSessions = async (userId: string, currentSessionId: string): Promise<void> => {
  try {
    const sessions = await getUserSessions(userId);
    
    const endPromises = sessions
      .filter(session => session.sessionId !== currentSessionId && session.active)
      .map(session => endSession(session.sessionId));
    
    await Promise.all(endPromises);
  } catch (error) {
    console.error('Failed to end other sessions:', error);
  }
};

/**
 * Ping to keep session alive periodically
 */
export const startSessionPing = (sessionId: string, intervalMinutes = 5): (() => void) => {
  if (!isBrowser() || !sessionId) return () => {};
  
  const intervalId = setInterval(() => {
    updateSessionActivity(sessionId).catch(console.error);
  }, intervalMinutes * 60 * 1000);
  
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Initialize session management
 * Returns a cleanup function that should be called when component unmounts
 */
export const initializeSessionManagement = (
  user: User | FirebaseUser | null,
  onSessionExpired: () => void
): (() => void) => {
  if (!isBrowser() || !user) return () => {};
  
  const cleanupFunctions: Array<() => void> = [];
  
  // Setup cleanup on page unload
  const cleanupUnload = setupSessionCleanup();
  cleanupFunctions.push(cleanupUnload);
  
  // Start session ping
  const session = getLocalSession();
  if (session?.sessionId) {
    const cleanupPing = startSessionPing(session.sessionId);
    cleanupFunctions.push(cleanupPing);
    
    // Listen for session expiration
    const cleanupListener = listenForSessionExpiration(onSessionExpired);
    cleanupFunctions.push(cleanupListener);
  }
  
  // Return a combined cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};