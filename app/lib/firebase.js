import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9sZFJSn8cvkos5fysi47VpqJc5AsorA4",
  authDomain: "manpower-patient-summary.firebaseapp.com",
  projectId: "manpower-patient-summary",
  storageBucket: "manpower-patient-summary.firebasestorage.app",
  messagingSenderId: "644057496880",
  appId: "1:644057496880:web:6270efc29187b9c025dcf5",
  measurementId: "G-F34T2MDCFG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Note: Analytics only works in production and on the client side
if (typeof window !== 'undefined') {
  const { getAnalytics } = require("firebase/analytics");
  const analytics = getAnalytics(app);
}