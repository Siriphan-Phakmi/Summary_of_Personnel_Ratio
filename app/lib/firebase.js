import { initializeApp } from "firebase/app"; //ระบบเริ่มต้น
import { getAuth } from "firebase/auth"; //ระบบ login
import { getFirestore } from "firebase/firestore"; //ระบบ database
import { getStorage } from "firebase/storage"; //ระบบ storage
import { getAnalytics, isSupported } from "firebase/analytics"; //ระบบ analytics วิเคราะห์การใช้งาน

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9sZFJSn8cvkos5fysi47VpqJc5AsorA4", //คีย์
  authDomain: "manpower-patient-summary.firebaseapp.com", //โดเมน
  projectId: "manpower-patient-summary",
  storageBucket: "manpower-patient-summary.firebasestorage.app", //bucket
  messagingSenderId: "644057496880",  //id
  appId: "1:644057496880:web:6270efc29187b9c025dcf5", //app id
  measurementId: "G-F34T2MDCFG"
};

// Initialize Firebase
let firebaseApp; 
try {
  firebaseApp = initializeApp(firebaseConfig); //เริ่มต้น firebase
} catch (error) {
  console.error('Firebase initialization error:', error); //แสดง error    
}

// Export Firebase services
export const app = firebaseApp; //ส่ง firebaseApp ออกไปใช้งาน
export const auth = getAuth(app); //ส่ง auth ออกไปใช้งาน
export const db = getFirestore(app); //ส่ง db ออกไปใช้งาน 
export const storage = getStorage(app);//ส่ง storage ออกไปใช้งาน

// ตรวจสอบว่าเราสามารถใช้งาน Firebase Analytics วิเคราะห์การใช้งาน ได้หรือไม่ 
if (typeof window !== 'undefined') {//ถ้า window ไม่เท่ากับ undefined
  isSupported().then((supported) => { //ตรวจสอบว่าระบบ analytics สามารถใช้งานได้หรือไม่
    if (supported) { //ถ้าสามารถใช้งานได้
      getAnalytics(app); //ให้เรียกใช้งาน analytics
    }
  }).catch((error) => { //ถ้าไม่สามารถใช้งานได้
    console.error('Analytics support check error:', error); //แสดง error
  }); //จบการตรวจสอบ
}