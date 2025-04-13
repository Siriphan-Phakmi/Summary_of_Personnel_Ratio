import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Firebase configuration object
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase
let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Realtime Database for session management
const rtdb = getDatabase(app);

// Connect to Firestore emulator in development if needed
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  const host = 'localhost';
  // Uncomment if you need to connect to Firestore emulator
  // import { connectFirestoreEmulator } from 'firebase/firestore';
  // connectFirestoreEmulator(db, host, 8080);
  
  // Uncomment if you need to connect to Realtime Database emulator
  // import { connectDatabaseEmulator } from 'firebase/database';
  // connectDatabaseEmulator(rtdb, host, 9000);
}

// Export Firestore database, Realtime Database and Firebase app
export { db, rtdb, app };
export default db;

console.log('Firebase connection initialized');
console.log('Firebase config:', {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
}); 