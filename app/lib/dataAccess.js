'use client';

import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// สถานะการใช้งานโหมดจำลองข้อมูล
let useMockData = false; // ใช้ Firebase โดยตรง

// รีเซ็ตค่าใน localStorage เพื่อให้แน่ใจว่าใช้ค่า false
if (typeof window !== 'undefined') {
  localStorage.removeItem('useMockData');
  localStorage.setItem('useMockData', 'false');
}

/**
 * ฟังก์ชันค้นหาผู้ใช้ตาม username
 */
export const findUserByUsername = async (username) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error finding user:', error.message);
    throw error;
  }
};

/**
 * ฟังก์ชันเข้าสู่ระบบ
 */
export const loginUser = async (username, password) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("User not found in database:", username);
      return { success: false, error: 'User not found' };
    }
    
    const userDoc = querySnapshot.docs[0].data();
    const userId = querySnapshot.docs[0].id;
    
    console.log("Found user:", username, "Checking password...");
    
    if (userDoc.password !== password) {
      console.log("Invalid password for user:", username);
      return { success: false, error: 'Invalid password' };
    }
    
    console.log("Login successful for user:", username);
    
    return { 
      success: true, 
      user: {
        uid: userId,
        ...userDoc
      }
    };
  } catch (error) {
    console.error('Login error:', error.message);
    return { success: false, error: 'Login failed: ' + error.message };
  }
};

/**
 * ฟังก์ชันดึงข้อมูล ward daily records
 */
export const getWardDailyRecords = async (date, wardId = null) => {
  try {
    const wardDailyRef = collection(db, 'wardDailyRecords');
    let q;
    
    if (wardId) {
      q = query(
        wardDailyRef,
        where('date', '==', date),
        where('wardId', '==', wardId)
      );
    } else {
      q = query(
        wardDailyRef,
        where('date', '==', date)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting ward records:', error.message);
    return [];
  }
};

/**
 * ฟังก์ชันดึงข้อมูล staff records
 */
export const getStaffRecords = async (date, shift = null) => {
  try {
    const recordsRef = collection(db, 'staffRecords');
    let q;
    
    if (shift) {
      q = query(
        recordsRef,
        where('date', '==', date),
        where('shift', '==', shift)
      );
    } else {
      q = query(
        recordsRef,
        where('date', '==', date)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting staff records:', error.message);
    return [];
  }
};

/**
 * ฟังก์ชันบันทึกข้อมูล staff records
 */
export const saveStaffRecord = async (recordData, recordId = null) => {
  try {
    if (recordId) {
      // Update existing record
      await updateDoc(doc(db, 'staffRecords', recordId), {
        ...recordData,
        lastModified: serverTimestamp()
      });
      return { success: true, id: recordId };
    } else {
      // Create new record
      const docRef = await addDoc(collection(db, 'staffRecords'), {
        ...recordData,
        timestamp: serverTimestamp(),
        lastModified: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('Error saving staff record:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ฟังก์ชันบันทึกข้อมูล ward daily records
 */
export const saveWardDailyRecord = async (wardData) => {
  try {
    const { wardId, date } = wardData;
    const docId = `${date}_${wardId}`;
    
    await setDoc(doc(db, 'wardDailyRecords', docId), {
      ...wardData,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    return { success: true, id: docId };
  } catch (error) {
    console.error('Error saving ward daily record:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
 */
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting users:', error.message);
    return [];
  }
};

/**
 * ฟังก์ชันเพิ่มผู้ใช้ใหม่
 */
export const addUser = async (userData) => {
  try {
    const userDataWithTimestamps = {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'users'), userDataWithTimestamps);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding user:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ฟังก์ชันอัพเดทข้อมูลผู้ใช้
 */
export const updateUser = async (userId, userData) => {
  try {
    const userDataWithTimestamp = {
      ...userData,
      updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, 'users', userId), userDataWithTimestamp);
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ฟังก์ชันลบผู้ใช้
 */
export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ฟังก์ชันอัพเดทข้อมูล firstName, lastName และ position จาก fullName และ role สำหรับผู้ใช้ทั้งหมด
 * สำหรับ Admin ใช้งาน (กรณีที่ต้องการอัพเดทข้อมูลทั้งหมดในครั้งเดียว)
 */
export const updateAllUsersNameFields = async () => {
  try {
    const users = await getAllUsers();
    const updatePromises = users.map(async (user) => {
      const updates = {};
      
      // แยก firstname และ lastname จาก fullName
      if ((!user.firstName || !user.lastName) && user.fullName) {
        const nameParts = (user.fullName || '').split(' ');
        updates.firstName = nameParts[0] || '';
        updates.lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // กำหนด position ตาม role ถ้ายังไม่มี
      if (!user.position) {
        if (user.role && user.role.toLowerCase() === 'admin') {
          updates.position = 'ผู้ดูแลระบบ';
        } else {
          updates.position = 'เจ้าหน้าที่พยาบาล'; // ค่าเริ่มต้นสำหรับ user ทั่วไป
        }
      }
      
      // อัพเดทเฉพาะถ้ามีข้อมูลที่ต้องอัพเดท
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        return updateDoc(doc(db, 'users', user.id), updates);
      }
      
      return Promise.resolve(); // ไม่ต้องอัพเดทถ้าไม่มีข้อมูลที่ต้องเปลี่ยน
    });
    
    await Promise.all(updatePromises);
    return { success: true, message: 'Updated all users successfully' };
  } catch (error) {
    console.error('Error updating users:', error.message);
    return { success: false, error: error.message };
  }
};
