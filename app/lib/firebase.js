'use client';

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper functions
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

export default app;