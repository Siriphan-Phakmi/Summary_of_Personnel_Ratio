'use client';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration and constants
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if config is valid
let app;
let db;
let auth;

if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export { db, auth };

// Maximum number of records to fetch at once
export const FETCH_LIMIT = 100;

// Minimum time between fetches (in milliseconds)
export const FETCH_COOLDOWN = 5000;

// Collection names
export const COLLECTIONS = {
  STAFF_RECORDS: 'staffRecords',
  SHIFT_REPORTS: 'shiftReports',
};

// Access levels
export const ACCESS_LEVELS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
};

// Function to check if user has required access level
export const checkUserAccess = async (user, requiredLevel) => {
  if (!user) return false;
  
  // Get user claims from Firebase Auth
  const token = await user.getIdTokenResult();
  const userClaims = token.claims;
  
  // Check if user has required access level
  return userClaims.accessLevel >= requiredLevel;
};

// Function to handle unauthorized access
export const handleUnauthorized = () => {
  throw new Error('Unauthorized access. Please check your permissions.');
};
