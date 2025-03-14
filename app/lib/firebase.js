'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// แสดงค่า environment variables ออกมาเพื่อตรวจสอบ (ลบออกหลังจากแก้ปัญหาแล้ว)
console.log('Firebase Config Environment Variables:');
console.log('API Key available:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log('Auth Domain available:', !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log('Project ID available:', !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB9sZFJSn8cvkos5fysi47VpqJc5AsorA4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'manpower-patient-summary.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'manpower-patient-summary',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'manpower-patient-summary.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '644057496880',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:644057496880:web:6270efc29187b9c025dcf5'
};

console.log('Using Firebase config:', {...firebaseConfig, apiKey: 'HIDDEN'});

// ประกาศตัวแปรนอก try-catch เพื่อให้สามารถ export ได้
let app = null;
let db = null;
let auth = null;

try {
  // Check if Firebase app is already initialized
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

  // Initialize Firebase services
  db = getFirestore(app);
  auth = getAuth(app);

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // ตัวแปร app, db และ auth จะยังคงเป็น null ถ้าเกิด error
}

// Export นอก try-catch block
export { db, auth };
export default app;
