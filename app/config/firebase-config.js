'use client';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration and constants
export const firebaseConfig = {
  apiKey: "AIzaSyB9sZFJSn8cvkos5fysi47VpqJc5AsorA4",
  authDomain: "manpower-patient-summary.firebaseapp.com",
  projectId: "manpower-patient-summary",
  storageBucket: "manpower-patient-summary.firebasestorage.app",
  messagingSenderId: "644057496880",
  appId: "1:644057496880:web:6270efc29187b9c025dcf5",
  measurementId: "G-F34T2MDCFG"
};

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Initialize Firebase auth
export const auth = getAuth(app);

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
