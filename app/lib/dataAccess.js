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
    
    // ตรวจสอบว่าผู้ใช้มี active session อยู่หรือไม่
    const existingSession = await checkActiveSession(userId);
    if (existingSession) {
      // ถ้ามี session อยู่แล้ว ให้ทำการยกเลิก session เก่า
      await invalidateSession(existingSession.id);
    }
    
    // สร้าง session ใหม่
    const sessionId = await createUserSession(userId, username);
    
    return { 
      success: true, 
      user: {
        uid: userId,
        sessionId: sessionId,
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

/**
 * ฟังก์ชันตรวจสอบ active session ของผู้ใช้
 */
export const checkActiveSession = async (userId) => {
  try {
    const sessionsRef = collection(db, 'userSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      where('active', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // ถ้ามี session ที่ active อยู่ ให้ return ข้อมูล session นั้น
    const sessionDoc = querySnapshot.docs[0];
    return {
      id: sessionDoc.id,
      ...sessionDoc.data()
    };
  } catch (error) {
    console.error('Error checking active session:', error.message);
    return null;
  }
};

/**
 * ฟังก์ชันยกเลิก session
 */
export const invalidateSession = async (sessionId) => {
  try {
    await updateDoc(doc(db, 'userSessions', sessionId), {
      active: false,
      logoutTime: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error invalidating session:', error.message);
    return false;
  }
};

/**
 * ฟังก์ชันสร้าง session ใหม่
 */
export const createUserSession = async (userId, username) => {
  try {
    const sessionData = {
      userId,
      username,
      loginTime: serverTimestamp(),
      active: true,
      device: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
      ip: 'Unknown' // ในสภาพแวดล้อมจริงควรใช้บริการดึง IP จากภายนอก
    };
    
    const docRef = await addDoc(collection(db, 'userSessions'), sessionData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user session:', error.message);
    throw error;
  }
};

/**
 * ฟังก์ชันตรวจสอบความถูกต้องของ session
 */
export const validateSession = async (userId, sessionId) => {
  if (!userId || !sessionId) return false;
  
  try {
    const sessionDoc = await getDoc(doc(db, 'userSessions', sessionId));
    
    if (!sessionDoc.exists()) {
      return false;
    }
    
    const sessionData = sessionDoc.data();
    return sessionData.userId === userId && sessionData.active === true;
  } catch (error) {
    console.error('Error validating session:', error.message);
    return false;
  }
};

/**
 * ฟังก์ชันตรวจสอบข้อมูลย้อนหลัง 7 วัน
 * @param {string} wardId - รหัสวอร์ด
 * @param {Date} currentDate - วันที่ปัจจุบัน
 * @returns {Promise<Object>} - ผลการตรวจสอบข้อมูล
 */
export const checkLast7DaysData = async (wardId, currentDate) => {
  try {
    // คำนวณวันที่ 7 วันย้อนหลัง
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // แปลงวันที่เป็น string format ปี-เดือน-วัน
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const currentDateString = formatDate(currentDate);
    const sevenDaysAgoString = formatDate(sevenDaysAgo);
    
    // สร้างรายการวันที่ทั้ง 7 วันที่ผ่านมา
    const dateList = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      dateList.push(formatDate(date));
    }
    
    // ตรวจสอบข้อมูลใน wardData collection
    const wardDataRef = collection(db, 'wardDataFinal');
    const q = query(
      wardDataRef,
      where('wardId', '==', wardId),
      where('date', 'in', dateList)
    );
    
    const querySnapshot = await getDocs(q);
    
    // เก็บวันที่ที่มีข้อมูล
    const datesWithData = new Set();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      datesWithData.add(data.date);
    });
    
    // ถ้าไม่มีข้อมูลย้อนหลัง 7 วันเลย
    if (datesWithData.size === 0) {
      return {
        hasData: false,
        message: 'ไม่พบข้อมูลย้อนหลัง 7 วันที่ผ่านมา กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ',
        datesChecked: dateList,
        datesWithData: Array.from(datesWithData)
      };
    }
    
    // ถ้ามีข้อมูลอย่างน้อย 1 วัน
    return {
      hasData: true,
      message: 'พบข้อมูลย้อนหลังในช่วง 7 วันที่ผ่านมา',
      datesChecked: dateList,
      datesWithData: Array.from(datesWithData)
    };
  } catch (error) {
    console.error('Error checking last 7 days data:', error.message);
    return { 
      hasData: false, 
      error: error.message,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลย้อนหลัง 7 วัน'
    };
  }
};

/**
 * ฟังก์ชันบันทึกข้อมูลฉบับร่าง (Save Draft)
 * @param {Object} draftData - ข้อมูลฉบับร่าง
 * @returns {Promise<Object>} - ผลการบันทึกข้อมูล
 */
export const saveWardDataDraft = async (draftData) => {
  try {
    const { wardId, date, shift, userId } = draftData;
    
    // สร้าง docId ที่ไม่ซ้ำกัน โดยรวม wardId, date, shift และ userId
    const docId = `${wardId}_${date}_${shift}_${userId}`;
    
    // เพิ่ม timestamp
    const dataWithTimestamp = {
      ...draftData,
      lastUpdated: serverTimestamp(),
      isDraft: true
    };
    
    // บันทึกลงใน collection wardDataDrafts
    await setDoc(doc(db, 'wardDataDrafts', docId), dataWithTimestamp, { merge: true });
    
    return { 
      success: true, 
      id: docId,
      message: 'บันทึกข้อมูลฉบับร่างเรียบร้อยแล้ว' 
    };
  } catch (error) {
    console.error('Error saving ward data draft:', error.message);
    return { 
      success: false, 
      error: error.message,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลฉบับร่าง' 
    };
  }
};

/**
 * ฟังก์ชันดึงข้อมูลฉบับร่างของผู้ใช้
 * @param {string} userId - รหัสผู้ใช้
 * @param {string} wardId - รหัสวอร์ด (optional)
 * @param {string} date - วันที่ (optional)
 * @param {string} shift - กะ (optional)
 * @returns {Promise<Array>} - รายการข้อมูลฉบับร่าง
 */
export const getUserDrafts = async (userId, wardId = null, date = null, shift = null) => {
  try {
    const draftsRef = collection(db, 'wardDataDrafts');
    let conditions = [where('userId', '==', userId)];
    
    if (wardId) {
      conditions.push(where('wardId', '==', wardId));
    }
    
    if (date) {
      conditions.push(where('date', '==', date));
    }
    
    if (shift) {
      conditions.push(where('shift', '==', shift));
    }
    
    // สร้าง query ตามเงื่อนไขที่กำหนด
    const q = query(draftsRef, ...conditions);
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return [];
    }
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user drafts:', error.message);
    return [];
  }
};

/**
 * ฟังก์ชันลบข้อมูลฉบับร่าง
 * @param {string} draftId - รหัสฉบับร่าง
 * @returns {Promise<Object>} - ผลการลบข้อมูล
 */
export const deleteWardDataDraft = async (draftId) => {
  try {
    await deleteDoc(doc(db, 'wardDataDrafts', draftId));
    return { 
      success: true,
      message: 'ลบข้อมูลฉบับร่างเรียบร้อยแล้ว' 
    };
  } catch (error) {
    console.error('Error deleting ward data draft:', error.message);
    return { 
      success: false, 
      error: error.message,
      message: 'เกิดข้อผิดพลาดในการลบข้อมูลฉบับร่าง' 
    };
  }
};

/**
 * ฟังก์ชันดึงข้อมูลฉบับร่างล่าสุดของผู้ใช้
 * @param {string} userId - รหัสผู้ใช้
 * @param {string} wardId - รหัสวอร์ด
 * @param {string} date - วันที่
 * @param {string} shift - กะ
 * @returns {Promise<Object|null>} - ข้อมูลฉบับร่างล่าสุด หรือ null ถ้าไม่มี
 */
export const getLatestDraft = async (userId, wardId, date, shift) => {
  try {
    // ค้นหาฉบับร่างล่าสุดตามเงื่อนไข
    const draftsRef = collection(db, 'wardDataDrafts');
    const q = query(
      draftsRef,
      where('userId', '==', userId),
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', shift)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // หากมีหลายฉบับร่าง ให้เลือกฉบับล่าสุดตาม timestamp
    let latestDraft = null;
    let latestTimestamp = 0;
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const timestamp = data.lastUpdated?.seconds || 0;
      
      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
        latestDraft = {
          id: doc.id,
          ...data
        };
      }
    });
    
    return latestDraft;
  } catch (error) {
    console.error('Error getting latest draft:', error.message);
    return null;
  }
};
