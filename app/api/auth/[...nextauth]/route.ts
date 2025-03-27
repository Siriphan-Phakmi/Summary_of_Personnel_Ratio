import { NextRequest, NextResponse } from 'next/server';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/app/lib/firebase';

/**
 * API route for user authentication with Firebase
 * Supports login, logout, and verification of user status
 */

/**
 * Handle login request
 * @param req Next request object
 * @returns NextResponse with user data or error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    // Validate inputs
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing username or password' },
        { status: 400 }
      );
    }

    // Find user by username first (since Firebase Auth uses email)
    // This lets us support username-based login
    const usersRef = doc(db, 'users', username);
    const userDoc = await getDoc(usersRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const userData = userDoc.data();
    
    // Check if user is active
    if (userData.active === false) {
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 403 }
      );
    }

    // Get email from user document
    const email = userData.email;
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'User has no associated email' },
        { status: 500 }
      );
    }

    // Attempt to sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update last login time in Firestore
    await updateDoc(doc(db, 'users', username), {
      lastLogin: serverTimestamp()
    });

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        wards: userData.wards || []
      }
    });
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password') {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' }, 
        { status: 401 }
      );
    } else if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { success: false, message: 'Too many failed login attempts. Try again later.' }, 
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle logout request
 * @param req Next request object
 * @returns NextResponse with success status
 */
export async function DELETE(req: NextRequest) {
  try {
    await signOut(auth);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Logout failed' },
      { status: 500 }
    );
  }
}

/**
 * Check current auth status
 * @param req Next request object
 * @returns NextResponse with user data if logged in
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    if (!userDoc.exists()) {
      await signOut(auth);
      return NextResponse.json(
        { success: false, message: 'User data not found' },
        { status: 404 }
      );
    }
    
    const userData = userDoc.data();
    
    return NextResponse.json({
      success: true,
      user: {
        uid: currentUser.uid,
        email: currentUser.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        wards: userData.wards || []
      }
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get auth status' },
      { status: 500 }
    );
  }
} 