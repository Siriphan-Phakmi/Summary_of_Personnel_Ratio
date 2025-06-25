import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

// Validate Firebase configuration
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

// For more information on initializing Firebase, refer to the official documentation:
// https://firebase.google.com/docs/web/setup#available-libraries

// --- Environment Variable Validation ---
// Ensure that all required environment variables are set.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Development-Time Checks ---
// In a development environment, provide more detailed errors if config is missing.
if (process.env.NODE_ENV === 'development') {
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (!value) {
      console.error(
        `🔥 Firebase config is missing or invalid. Check your .env.local file. Missing key: ${key}`
      );
    }
  }
}

// Log warning if environment variables are missing
if (missingEnvVars.length > 0) {
  console.warn('Missing Firebase environment variables:', JSON.stringify(missingEnvVars));
  console.warn('Using development placeholders. The app will not connect to a real Firebase project.');
}

// Initialize Firebase with error handling
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rtdb: Database;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Firebase initialized successfully');
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
  throw new Error('Failed to initialize Firebase');
}

export { app, auth, db, rtdb }; 