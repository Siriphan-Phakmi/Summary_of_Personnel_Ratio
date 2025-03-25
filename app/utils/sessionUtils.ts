import { ref, onValue, onDisconnect, update, set, serverTimestamp } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from 'firebase/database';
import app from '@/app/lib/firebase';

// Initialize Realtime Database
const rtdb = getDatabase(app);

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Create a new session for the user
 * @param userId The user's ID
 * @param userEmail The user's email
 * @returns The session ID
 */
export const createUserSession = async (userId: string, userEmail: string): Promise<string> => {
  try {
    // Generate a new session ID
    const sessionId = uuidv4();
    
    // Create the session object with enhanced information
    const sessionData = {
      createdAt: Date.now(),
      lastActive: Date.now(),
      device: window.navigator.userAgent,
      isActive: true,
      userEmail,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserName: getBrowserName(),
      expiresAt: Date.now() + SESSION_TIMEOUT
    };
    
    // Set the current session
    await set(ref(rtdb, `userSessions/${userId}/currentSession`), {
      sessionId,
      lastActive: Date.now(),
      expiresAt: Date.now() + SESSION_TIMEOUT
    });
    
    // Set the session data
    await set(ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`), sessionData);
    
    // Set up disconnect handler to mark session as inactive on disconnect
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
    onDisconnect(sessionRef).update({ 
      isActive: false, 
      disconnectedAt: serverTimestamp()
    });
    
    return sessionId;
  } catch (error) {
    console.error('Error creating user session:', error);
    throw error;
  }
};

/**
 * Get browser name from user agent
 */
function getBrowserName(): string {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";
  
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "Chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "Firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "Safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "Opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "Edge";
  } else if (userAgent.match(/msie|trident/i)) {
    browserName = "Internet Explorer";
  }
  
  return browserName;
}

/**
 * Set up session monitoring to detect and handle simultaneous logins
 * @param userId The user's ID
 * @param sessionId The current session ID
 * @param onSessionExpired Callback function to call when the session is expired
 * @returns A cleanup function to remove the listener
 */
export const monitorUserSession = (
  userId: string, 
  sessionId: string,
  onSessionExpired: () => void
): () => void => {
  // Listen for changes to the current session
  const currentSessionRef = ref(rtdb, `userSessions/${userId}/currentSession`);
  
  // Enhanced monitoring with additional checks
  const unsubscribe = onValue(currentSessionRef, (snapshot) => {
    const currentSessionValue = snapshot.val();
    
    if (!currentSessionValue) {
      // If current session is null or undefined, session might have been manually terminated
      onSessionExpired();
      return;
    }
    
    // Check if the current session is different from our session ID
    if (currentSessionValue.sessionId !== sessionId) {
      console.log('Session changed - another login detected');
      onSessionExpired();
      return;
    }
    
    // Check if session has expired based on timestamp
    if (currentSessionValue.expiresAt && currentSessionValue.expiresAt < Date.now()) {
      console.log('Session expired based on timeout');
      onSessionExpired();
      return;
    }
  });
  
  // Set up a timer to periodically update the lastActive and expiresAt timestamps
  const interval = setInterval(() => {
    if (userId && sessionId) {
      const now = Date.now();
      
      // Update current session timestamp
      update(ref(rtdb, `userSessions/${userId}/currentSession`), {
        lastActive: now,
        expiresAt: now + SESSION_TIMEOUT,
      }).catch(console.error);
      
      // Update session information
      update(ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`), {
        lastActive: now,
        expiresAt: now + SESSION_TIMEOUT,
      }).catch(console.error);
    }
  }, 5 * 60 * 1000); // Update every 5 minutes

  // Return a cleanup function
  return () => {
    unsubscribe();
    clearInterval(interval);
  };
};

/**
 * Clean up session on logout
 * @param userId The user's ID
 * @param sessionId The session ID to clean up
 */
export const cleanupUserSession = async (userId: string, sessionId: string): Promise<void> => {
  try {
    // Update session status with enhanced information
    await update(ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`), {
      isActive: false,
      loggedOutAt: Date.now(),
      logoutMethod: 'explicit',
      sessionDuration: Date.now() - (await getSessionStartTime(userId, sessionId))
    });
    
    // Clear current session
    await set(ref(rtdb, `userSessions/${userId}/currentSession`), null);
  } catch (error) {
    console.error('Error cleaning up user session:', error);
    throw error;
  }
};

/**
 * Get session start time
 * @param userId The user's ID
 * @param sessionId The session ID
 * @returns The session start time in milliseconds
 */
async function getSessionStartTime(userId: string, sessionId: string): Promise<number> {
  return new Promise((resolve) => {
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}/createdAt`);
    
    onValue(sessionRef, (snapshot) => {
      const createdAt = snapshot.val() || Date.now();
      resolve(createdAt);
    }, { onlyOnce: true });
  });
}

/**
 * Set up beforeunload handler for the window
 * @param userId The user's ID
 * @param sessionId The session ID
 * @returns A cleanup function to remove the event listener
 */
export const setupBeforeUnloadHandler = (userId: string, sessionId: string): () => void => {
  const handleBeforeUnload = () => {
    if (userId && sessionId) {
      // Try to perform a synchronous logout notification
      navigator.sendBeacon(
        `/api/logout?userId=${userId}&sessionId=${sessionId}`
      );
      
      // Update session info directly as a fallback
      try {
        const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
        update(sessionRef, {
          isActive: false,
          disconnectedAt: Date.now(),
          disconnectReason: 'browser_closed'
        });
      } catch {
        // Cannot do much in beforeunload event, silent error
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

// Additional session utility functions

/**
 * Terminate all other sessions for a user except the current one
 * @param userId The user's ID
 * @param currentSessionId The current session ID
 */
export const terminateOtherSessions = async (userId: string, currentSessionId: string): Promise<void> => {
  try {
    const sessionsRef = ref(rtdb, `userSessions/${userId}/sessions`);
    
    const cleanup = onValue(sessionsRef, async (snapshot) => {
      const sessions = snapshot.val();
      if (!sessions) return;
      
      // Find all other active sessions
      Object.entries(sessions).forEach(([id, data]: [string, any]) => {
        if (id !== currentSessionId && data.isActive) {
          // Terminate the session
          update(ref(rtdb, `userSessions/${userId}/sessions/${id}`), {
            isActive: false,
            terminatedAt: Date.now(),
            terminatedBy: currentSessionId,
            terminationReason: 'user_requested'
          }).catch(console.error);
        }
      });
      
      cleanup();
    }, { onlyOnce: true });
  } catch (error) {
    console.error('Error terminating other sessions:', error);
    throw error;
  }
};

/**
 * Get all active sessions for a user
 * @param userId The user's ID
 * @returns Array of active session data
 */
export const getActiveSessions = async (userId: string): Promise<any[]> => {
  return new Promise((resolve) => {
    const sessionsRef = ref(rtdb, `userSessions/${userId}/sessions`);
    
    onValue(sessionsRef, (snapshot) => {
      const sessions = snapshot.val();
      if (!sessions) {
        resolve([]);
        return;
      }
      
      // Filter active sessions and format them
      const activeSessions = Object.entries(sessions)
        .filter(([_, data]: [string, any]) => data.isActive)
        .map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
      
      resolve(activeSessions);
    }, { onlyOnce: true });
  });
};