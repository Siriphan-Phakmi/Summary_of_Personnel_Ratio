'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/app/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
  createUserSession, 
  monitorUserSession, 
  cleanupUserSession, 
  setupBeforeUnloadHandler
} from '@/app/utils/sessionUtils';

// User type with role
interface User {
  uid: string;
  email: string | null;
  role: 'user' | 'admin';
  wards?: string[];
  firstName?: string;
  lastName?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  error: null,
});

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          // Get user data from Firestore including role
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (!userData.active) {
              // User is deactivated
              await firebaseSignOut(auth);
              setUser(null);
              setError('Your account has been deactivated. Please contact an administrator.');
              router.push('/login');
              setIsLoading(false);
              return;
            }
            
            // Create user object
            const userObj = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: userData.role || 'user',
              wards: userData.wards || [],
              firstName: userData.firstName,
              lastName: userData.lastName,
            };
            
            setUser(userObj);
            
            // Create a new session
            const newSessionId = await createUserSession(
              firebaseUser.uid, 
              firebaseUser.email || 'anonymous'
            );
            setSessionId(newSessionId);
            
            // Update user's last login time in Firestore
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastLogin: Date.now()
            });
            
            // Log the login
            await setDoc(doc(db, 'userLogs', `${firebaseUser.uid}_${Date.now()}`), {
              type: 'login',
              userId: firebaseUser.uid,
              email: firebaseUser.email,
              timestamp: serverTimestamp(),
              sessionId: newSessionId,
            });
          } else {
            // User document doesn't exist
            await firebaseSignOut(auth);
            setUser(null);
            setError('User data not found. Please contact an administrator.');
            router.push('/login');
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Error fetching user data. Please try again.');
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, [router]);

  // Monitor current session for this user
  useEffect(() => {
    if (!user || !sessionId) return;

    // Set up session monitoring
    const cleanupMonitoring = monitorUserSession(
      user.uid,
      sessionId,
      () => {
        // Session expired callback
        firebaseSignOut(auth)
          .then(() => {
            router.push('/login?msg=session_expired');
          })
          .catch(console.error);
      }
    );
    
    // Set up beforeunload handler
    const cleanupBeforeUnload = setupBeforeUnloadHandler(user.uid, sessionId);

    // Return cleanup function
    return () => {
      cleanupMonitoring();
      cleanupBeforeUnload();
    };
  }, [user, sessionId, router]);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle different Firebase auth errors
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      if (user && sessionId) {
        // Log the logout
        await setDoc(doc(db, 'userLogs', `${user.uid}_${Date.now()}`), {
          type: 'logout',
          userId: user.uid,
          email: user.email,
          timestamp: serverTimestamp(),
          sessionId: sessionId,
        });
        
        // Clean up session
        await cleanupUserSession(user.uid, sessionId);
      }
      
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('An error occurred during logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext); 