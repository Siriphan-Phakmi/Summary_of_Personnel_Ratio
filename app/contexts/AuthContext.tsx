'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getDoc, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '@/app/lib/firebase';
import { 
  createUserSession, 
  monitorUserSession, 
  cleanupUserSession, 
  setupBeforeUnloadHandler,
  terminateOtherSessions
} from '@/app/utils/sessionUtils';
import { logLogin, logLogout, logLoginFailed } from '@/app/utils/logUtils';

// Define user type
interface User {
  uid: string;
  email: string | null;
  role: string;
  wards?: string[];
  firstName?: string;
  lastName?: string;
  username?: string;
}

// Define authentication context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// AuthProvider component to wrap around app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupFn, setCleanupFn] = useState<(() => void) | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [inactivityInterval, setInactivityInterval] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Reset inactivity timer when user interacts with the app
  const resetInactivityTimer = () => {
    setLastActivity(Date.now());
  };

  // Set up activity monitoring
  useEffect(() => {
    // Track user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, []);

  // Check for user inactivity
  useEffect(() => {
    if (user) {
      // Clear previous interval if exists
      if (inactivityInterval) {
        clearInterval(inactivityInterval);
      }

      // Set new interval
      const interval = setInterval(() => {
        const now = Date.now();
        if (now - lastActivity > SESSION_TIMEOUT) {
          // Auto logout after inactivity
          logout();
        }
      }, 60000); // Check every minute

      setInactivityInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
    return undefined;
  }, [user, lastActivity]);

  // Handle Firebase authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Create user object
            const userObj: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: userData.role || 'user',
              wards: userData.wards || [],
              firstName: userData.firstName,
              lastName: userData.lastName,
              username: userData.username
            };
            
            setUser(userObj);
            
            // Set up session monitoring
            if (userData.active !== false) {
              const sessionId = await createUserSession(firebaseUser.uid, firebaseUser.email || '');
              
              // Set up before unload handler
              const unbindBeforeUnload = setupBeforeUnloadHandler(firebaseUser.uid, sessionId);
              
              // Monitor for concurrent sessions
              const cleanupSession = monitorUserSession(
                firebaseUser.uid,
                sessionId,
                () => {
                  logout();
                  router.push('/login?reason=session_expired');
                }
              );
              
              setCleanupFn(() => {
                return () => {
                  unbindBeforeUnload();
                  cleanupSession();
                };
              });
              
              // Terminate other sessions
              await terminateOtherSessions(firebaseUser.uid, sessionId);
            } else {
              // User account is inactive
              await signOut(auth);
              setUser(null);
              setError('Your account is inactive. Please contact an administrator.');
            }
          } else {
            // User document not found
            await signOut(auth);
            setUser(null);
            setError('User account not found.');
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Error loading user profile. Please try again.');
        }
      } else {
        // No user signed in
        setUser(null);
      }
      
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [router]);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Find user by username in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Invalid username or password');
        setIsLoading(false);
        // Log failed login attempt
        await logLoginFailed(username, 'user_not_found');
        return;
      }
      
      const userDoc = querySnapshot.docs[0].data();
      const userId = querySnapshot.docs[0].id;
      
      // Check if user is active
      if (userDoc.active === false) {
        setError('Your account is inactive. Please contact an administrator.');
        setIsLoading(false);
        // Log failed login attempt
        await logLoginFailed(username, 'account_inactive');
        return;
      }
      
      // User exists, now try to sign in with Firebase Auth
      // We use the email from Firestore to authenticate
      const email = userDoc.email;
      
      if (!email) {
        setError('User account is missing email. Please contact an administrator.');
        setIsLoading(false);
        // Log failed login attempt
        await logLoginFailed(username, 'missing_email');
        return;
      }
      
      // Sign in with Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);
      
      // Log successful login
      await logLogin(
        userId, 
        username, 
        email, 
        navigator.userAgent
      );
      
      // Auth state change listener will handle the rest
      // Redirect will happen after user state is set
      
      // Redirect based on user role
      if (userDoc.role === 'admin') {
        router.push('/approval');
      } else {
        router.push('/wardform');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle specific Firebase auth errors
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid username or password');
        await logLoginFailed(username, 'invalid_credentials');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
        await logLoginFailed(username, 'too_many_attempts');
      } else {
        setError('Login failed. Please try again.');
        await logLoginFailed(username, `firebase_error: ${err.code}`);
      }
      
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Log the logout
      if (user) {
        await logLogout(
          user.uid, 
          user.username || user.email || 'unknown'
        );
      }
      
      // Clean up session if cleanup function exists
      if (cleanupFn) {
        cleanupFn();
        setCleanupFn(null);
      }
      
      // Clean up user session in Firebase
      if (user) {
        try {
          // Get current session ID from localStorage if exists
          const sessionData = localStorage.getItem(`session_${user.uid}`);
          if (sessionData) {
            const { sessionId } = JSON.parse(sessionData);
            await cleanupUserSession(user.uid, sessionId);
          }
        } catch (err) {
          console.error('Error cleaning up session:', err);
        }
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear local storage
      localStorage.removeItem('lastActive');
      if (user) {
        localStorage.removeItem(`session_${user.uid}`);
      }
      
      // Reset state
      setUser(null);
      setError(null);
      
      // Redirect to login page
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};