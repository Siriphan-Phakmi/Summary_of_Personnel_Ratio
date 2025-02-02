// Firebase configuration and security settings
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Maximum number of records to fetch at once
export const FETCH_LIMIT = 100;

// Minimum time between fetches (in milliseconds)
export const FETCH_COOLDOWN = 5000;

// Collection names
export const COLLECTIONS = {
  STAFF_RECORDS: 'staffRecords',
};

// Access levels
export const ACCESS_LEVELS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
};

// Initialize Firebase auth
export const auth = getAuth();

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
