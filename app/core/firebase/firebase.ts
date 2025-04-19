import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator, Database } from 'firebase/database';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';

// Firebase configuration type
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL: string;
}

// TEMPORARY: Skip environment variable validation
// This will be removed once environment variables are properly set up
const validateEnvVariables = () => {
  console.log('Environment variable validation bypassed temporarily.');
  return true;
};

// TEMPORARY: Hardcoded Firebase configuration
// Replace this with your environment variables later
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyB9sZFJSn8cvkos5fys147VpqJc5ASorA4",
  authDomain: "manpower-patient-summary.firebaseapp.com",
  projectId: "manpower-patient-summary",
  storageBucket: "manpower-patient-summary.firebasestorage.app",
  messagingSenderId: "644057496880",
  appId: "1:644057496880:web:6270efc29187b9c025dcf5",
  databaseURL: "https://manpower-patient-summary-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let rtdb: Database;
let auth: Auth;

try {
  // Temporarily skip validation
  validateEnvVariables();

  // Initialize Firebase app
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Firestore and Realtime Database
  db = getFirestore(app);
  rtdb = getDatabase(app);
  auth = getAuth(app);

  // Connect to emulators in development if needed
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    const host = 'localhost';
    connectFirestoreEmulator(db, host, 8080);
    connectDatabaseEmulator(rtdb, host, 9000);
    connectAuthEmulator(auth, `http://${host}:9099`);
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Export initialized instances
export { db, rtdb, app, auth };
export default db;

console.log('Firebase connection initialized');
console.log('Firebase config:', {
  projectId: firebaseConfig.projectId,
  databaseURL: firebaseConfig.databaseURL
}); 