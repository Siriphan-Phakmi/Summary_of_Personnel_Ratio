'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase-config';

// เพิ่ม console.log เพื่อตรวจสอบค่า firebaseConfig
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'Available' : 'Missing',
  authDomain: firebaseConfig.authDomain ? 'Available' : 'Missing',
  projectId: firebaseConfig.projectId ? 'Available' : 'Missing',
  storageBucket: firebaseConfig.storageBucket ? 'Available' : 'Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'Available' : 'Missing',
  appId: firebaseConfig.appId ? 'Available' : 'Missing'
});

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
console.log('Firebase initialized:', app.name);

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;