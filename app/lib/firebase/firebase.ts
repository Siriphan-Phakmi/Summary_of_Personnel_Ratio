import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableNetwork, disableNetwork } from 'firebase/firestore';

// Validate Firebase configuration
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

// For more information on initializing Firebase, refer to the official documentation:
// https://firebase.google.com/docs/web/setup#available-libraries

// --- Environment Variable Validation ---
// Ensure that all required environment variables are set.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ✅ Improved validation - check actual config values instead of process.env
const missingConfigValues = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

// --- Development-Time Checks ---
// In a development environment, provide more detailed errors if config is missing.
if (process.env.NODE_ENV === 'development') {
  if (missingConfigValues.length > 0) {
    console.warn('⚠️ Firebase config values missing:', missingConfigValues.join(', '));
    console.warn('📝 Please check .env.local file exists and contains all required variables');
    console.warn('🔄 Try: cp .env.example .env.local');
    
    // Show actual environment variable status
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
    });
  } else {
    console.log('✅ Firebase environment variables loaded successfully');
  }
}

// Initialize Firebase with error handling
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  
  // ✅ Firestore connection will be optimized on first use
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 Firebase Firestore ready for connections');
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Firebase initialized successfully');
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
  throw new Error('Failed to initialize Firebase');
}

export { app, auth, db }; 