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

// ตรวจสอบว่ามี environment variables ครบถ้วนหรือไม่
const validateEnvVariables = (): boolean => {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Missing Firebase environment variables:', missingVars);
    }
    return false;
  }
  
  return true;
};

// ใช้ environment variables หรือ fallback เป็น development config
const getFirebaseConfig = (): FirebaseConfig => {
  const useEnvVars = validateEnvVariables();
  
  if (useEnvVars) {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Firebase: Using environment variables configuration');
    }
    
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!
    };
  }
  
  // ถ้าไม่มี env vars ให้ใช้ dummy config และแจ้งเตือนครั้งเดียว
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Firebase: Using fallback configuration for development');
  } else {
    console.error('🚨 Firebase: Missing environment variables in production!');
  }
  
  return {
    apiKey: "dummy-api-key",
    authDomain: "example-app.firebaseapp.com",
    projectId: "example-app",
    storageBucket: "example-app.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000",
    databaseURL: "https://example-app-default-rtdb.firebaseio.com"
  };
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let rtdb: Database;
let auth: Auth;

try {
  const firebaseConfig = getFirebaseConfig();
  
  // Initialize Firebase app
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 Firebase initialized successfully');
      console.log('Project ID:', firebaseConfig.projectId);
    }
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
    console.log('🔧 Firebase: Connected to emulators');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// Export initialized instances
export { db, rtdb, app, auth };
export default db; 