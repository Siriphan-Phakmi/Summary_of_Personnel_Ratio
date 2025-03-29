import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage } from 'firebase/storage';

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

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Initialize Firebase Realtime Database
// const rtdb = getDatabase(app); // Commented out as RTDB is not used

// Connect to emulators in development mode (Keep Auth and DB emulators if used)
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  const host = 'localhost';
  // connectAuthEmulator(auth, `http://${host}:9099`); // Keep if Auth Emulator is used
  // connectDatabaseEmulator(rtdb, host, 9000); // Remove if RTDB is not used
  // You might need Firestore emulator connection if you use it:
  // import { connectFirestoreEmulator } from 'firebase/firestore';
  // connectFirestoreEmulator(db, host, 8080);
}

// Export only the necessary services
export { db, app }; // Removed auth, storage, rtdb from exports
export default db; 