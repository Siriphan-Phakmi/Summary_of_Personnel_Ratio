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
    console.warn('Missing Firebase environment variables:', missingVars);
    return false;
  }
  
  return true;
};

// ใช้ environment variables หรือ fallback เป็น development config
const getFirebaseConfig = (): FirebaseConfig => {
  const useEnvVars = validateEnvVariables();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (useEnvVars) {
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
  
  // ในโหมดพัฒนา ใช้ค่า development config
  if (isDevelopment) {
    console.warn(
      '⚠️ Using development Firebase configuration. ' +
      'This configuration should only be used for local development. ' + 
      'For production, please set up proper environment variables in .env.local file.'
    );
    
    // Development config สำหรับใช้ในการพัฒนาเท่านั้น
    return {
      apiKey: "AIzaSyB9sZFJSn8cvkos5fys147VpqJc5ASorA4",
      authDomain: "manpower-patient-summary.firebaseapp.com",
      projectId: "manpower-patient-summary",
      storageBucket: "manpower-patient-summary.firebasestorage.app",
      messagingSenderId: "644057496880",
      appId: "1:644057496880:web:6270efc29187b9c025dcf5",
      databaseURL: "https://manpower-patient-summary-default-rtdb.asia-southeast1.firebasedatabase.app"
    };
  }
  
  // ข้อความแจ้งเตือนเมื่อไม่พบ environment variables ในโหมด production
  console.error(
    '🚨 ERROR: Firebase configuration environment variables are missing. ' +
    'Please set all required variables in .env.local file. ' +
    'The application will not function correctly without proper configuration.'
  );
  
  // ใช้ค่า dummy ที่ปลอดภัย (สำหรับ production ที่ไม่มี env vars)
  return {
    apiKey: "dummy-api-key-for-development-only",
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
  
  // ตรวจสอบว่าใช้ค่า dummy หรือไม่ และไม่ใช่ development config
  const isDummyConfig = firebaseConfig.apiKey === "dummy-api-key-for-development-only";
  const isDevConfig = process.env.NODE_ENV === 'development' && firebaseConfig.projectId === "manpower-patient-summary";
  
  if (isDummyConfig && !isDevConfig) {
    console.error(`
===================================================================
🔥 Firebase Initialization Warning 🔥
-------------------------------------------------------------------
Missing environment variables for Firebase configuration.
The application is running with dummy configuration and will not
connect to any Firebase services.

Please create a .env.local file at the project root with these variables:
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com

You can find these values in your Firebase console:
https://console.firebase.google.com/project/_/settings/general
===================================================================
`);
  }

  // Initialize Firebase app
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    
    // Log initialization details only in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase connection initialized');
      console.log('Firebase config project ID:', firebaseConfig.projectId);
      
      if (isDevConfig) {
        console.log('🔧 Running with development Firebase configuration');
      } else if (isDummyConfig) {
        console.warn('⚠️ Running with dummy Firebase configuration - functionality will be limited');
      } else {
        console.log('✅ Running with environment variables configuration');
      }
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
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Export initialized instances
export { db, rtdb, app, auth };
export default db; 