import { ref, onValue, onDisconnect, update, set } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from 'firebase/database';
import app from '@/app/lib/firebase';

// Initialize Realtime Database
const rtdb = getDatabase(app);

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
    
    // Create the session object
    const sessionData = {
      createdAt: Date.now(),
      lastActive: Date.now(),
      device: window.navigator.userAgent,
      isActive: true,
      userEmail
    };
    
    // Set the current session
    await set(ref(rtdb, `userSessions/${userId}/currentSession`), {
      sessionId,
      lastActive: Date.now()
    });
    
    // Set the session data
    await set(ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`), sessionData);
    
    // Set up disconnect handler to mark session as inactive on disconnect
    const sessionRef = ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`);
    onDisconnect(sessionRef).update({ isActive: false });
    
    return sessionId;
  } catch (error) {
    console.error('Error creating user session:', error);
    throw error;
  }
};

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
  const unsubscribe = onValue(currentSessionRef, (snapshot) => {
    const currentSessionValue = snapshot.val();
    
    // If the current session doesn't match our session ID, log out
    if (currentSessionValue && currentSessionValue.sessionId !== sessionId) {
      onSessionExpired();
    }
  });
  
  // Update last active time periodically (every 5 minutes)
  const interval = setInterval(() => {
    if (userId && sessionId) {
      update(ref(rtdb, `userSessions/${userId}/currentSession`), {
        lastActive: Date.now(),
      }).catch(console.error);
      
      update(ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`), {
        lastActive: Date.now(),
      }).catch(console.error);
    }
  }, 5 * 60 * 1000);

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
    // Update session status
    await update(ref(rtdb, `userSessions/${userId}/sessions/${sessionId}`), {
      isActive: false,
      loggedOutAt: Date.now()
    });
    
    // Clear current session
    await set(ref(rtdb, `userSessions/${userId}/currentSession`), null);
  } catch (error) {
    console.error('Error cleaning up user session:', error);
    throw error;
  }
};

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
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}; 