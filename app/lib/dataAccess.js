'use client';

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  addDoc, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  startAfter,
  endBefore,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { format, subDays, parseISO } from 'date-fns';

// ฟังก์ชันบันทึกข้อมูลเวร (ฉบับร่าง)
export const saveWardDataDraft = async (data) => {
  try {
    if (!data.wardId || !data.date || !data.shift || !data.userId) {
      return {
        success: false,
        error: 'Missing required fields: wardId, date, shift, or userId'
      };
    }

    // สร้าง docId ที่ไม่ซ้ำกัน
    const docId = `${data.date}_${data.wardId}_${data.shift}_${data.userId}`;
    
    // เพิ่ม timestamp สำหรับการเรียงลำดับ
    const draftData = {
      ...data,
      timestamp: serverTimestamp(),
      lastUpdated: new Date().toISOString()
    };
    
    // บันทึกข้อมูลใน collection wardDataDrafts
    await setDoc(doc(db, 'wardDataDrafts', docId), draftData);
    
    return {
      success: true,
      message: 'Draft saved successfully',
      id: docId
    };
  } catch (error) {
    console.error('Error saving ward data draft:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันบันทึกข้อมูลเวร (ฉบับสมบูรณ์)
export const saveWardDataFinal = async (data) => {
  try {
    if (!data.wardId || !data.date || !data.shift) {
      return {
        success: false,
        error: 'Missing required fields: wardId, date, or shift'
      };
    }

    // สร้าง docId ที่ไม่ซ้ำกัน
    const docId = `${data.date}_${data.wardId}_${data.shift}`;
    
    // เพิ่มข้อมูลเพิ่มเติม
    const finalData = {
      ...data,
      isApproved: true,
      isDraft: false,
      timestamp: serverTimestamp(),
      lastUpdated: new Date().toISOString()
    };
    
    // บันทึกข้อมูลใน collection wardDataFinal
    await setDoc(doc(db, 'wardDataFinal', docId), finalData);
    
    return {
      success: true,
      message: 'Data saved as final successfully',
      id: docId
    };
  } catch (error) {
    console.error('Error saving final ward data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันดึงข้อมูลฉบับร่างของผู้ใช้
export const getUserDrafts = async (userId, wardId = null, date = null, shift = null) => {
  try {
    let q = query(
      collection(db, 'wardDataDrafts'),
      where('userId', '==', userId)
    );
    
    // เพิ่มเงื่อนไขการค้นหาตาม wardId (ถ้ามี)
    if (wardId) {
      q = query(q, where('wardId', '==', wardId));
    }
    
    // เพิ่มเงื่อนไขการค้นหาตามวันที่ (ถ้ามี)
    if (date) {
      q = query(q, where('date', '==', date));
    }
    
    // เพิ่มเงื่อนไขการค้นหาตามกะ (ถ้ามี)
    if (shift) {
      q = query(q, where('shift', '==', shift));
    }
    
    const querySnapshot = await getDocs(q);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      return null;
    }
    
    // แปลงข้อมูลที่ได้เป็น array
    const drafts = [];
    querySnapshot.forEach((doc) => {
      drafts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // เรียงลำดับตามเวลาที่บันทึกล่าสุด
    return drafts.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
      const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error getting user drafts:', error);
    return null;
  }
};

// ฟังก์ชันดึงข้อมูลฉบับร่างล่าสุด
export const getLatestDraft = async (userId, wardId, date, shift) => {
  try {
    const q = query(
      collection(db, 'wardDataDrafts'),
      where('userId', '==', userId),
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', shift),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      return null;
    }
    
    // ส่งคืนข้อมูลฉบับร่างล่าสุด
    return querySnapshot.docs[0].data();
  } catch (error) {
    console.error('Error getting latest draft:', error);
    return null;
  }
};

// ฟังก์ชันลบข้อมูลฉบับร่าง
export const deleteWardDataDraft = async (draftId) => {
  try {
    await deleteDoc(doc(db, 'wardDataDrafts', draftId));
    
    return {
      success: true,
      message: 'Draft deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting draft:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันบันทึกประวัติการแก้ไขข้อมูล
export const logWardDataHistory = async (data, action, userId) => {
  try {
    if (!data.wardId || !data.date || !data.shift) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }
    
    // ข้อมูลประวัติ
    const historyData = {
      wardId: data.wardId,
      date: data.date,
      shift: data.shift,
      action: action, // 'save_draft', 'submit_final', 'approve', 'reject'
      userId: userId,
      userDisplayName: data.userDisplayName || '',
      timestamp: serverTimestamp(),
      data: data // เก็บข้อมูลทั้งหมดในขณะนั้น
    };
    
    // บันทึกประวัติ
    const docRef = await addDoc(collection(db, 'wardDataHistory'), historyData);
    
    return {
      success: true,
      message: 'History logged successfully',
      id: docRef.id
    };
  } catch (error) {
    console.error('Error logging history:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันดึงประวัติการแก้ไข
export const getWardDataHistory = async (wardId, date, shift) => {
  try {
    const q = query(
      collection(db, 'wardDataHistory'),
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', shift),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      return [];
    }
    
    // แปลงข้อมูลที่ได้เป็น array
    const history = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // แปลง timestamp เป็น string ถ้ามี
      const timestamp = data.timestamp instanceof Timestamp 
        ? data.timestamp.toDate().toISOString()
        : data.timestamp;
      
      history.push({
        id: doc.id,
        ...data,
        timestamp: timestamp
      });
    });
    
    return history;
  } catch (error) {
    console.error('Error getting ward data history:', error);
    return [];
  }
};

/**
 * ฟังก์ชันตรวจสอบข้อมูลย้อนหลัง 7 วัน
 * @param {string} wardId รหัส ward
 * @param {Date} currentDate วันที่ปัจจุบัน (optional)
 * @returns {Promise<boolean>} true ถ้ามีข้อมูลย้อนหลัง 7 วัน, false ถ้าไม่มี
 */
export const checkLast7DaysData = async (wardId, currentDate = new Date()) => {
  try {
    if (!wardId) {
      console.error('Ward ID is required');
      return false;
    }

    // คำนวณวันที่ 7 วันย้อนหลัง
    const sevenDaysAgo = subDays(currentDate, 7);
    const startDate = format(sevenDaysAgo, 'yyyy-MM-dd');
    const endDate = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`Checking for data between ${startDate} and ${endDate} for ward ${wardId}`);
    
    // ค้นหาข้อมูลในตาราง wardDataFinal
    const q = query(
      collection(db, 'wardDataFinal'),
      where('wardId', '==', wardId),
      where('date', '>=', startDate),
      where('date', '<', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    
    // ถ้ามีข้อมูลใน wardDataFinal
    if (!querySnapshot.empty) {
      return true;
    }
    
    // ถ้าไม่มีข้อมูลใน wardDataFinal ให้ตรวจสอบใน wardDataDrafts
    const draftsQuery = query(
      collection(db, 'wardDataDrafts'),
      where('wardId', '==', wardId),
      where('date', '>=', startDate),
      where('date', '<', endDate)
    );
    
    const draftsSnapshot = await getDocs(draftsQuery);
    
    return !draftsSnapshot.empty;
  } catch (error) {
    console.error('Error checking last 7 days data:', error);
    return false;
  }
};

// ฟังก์ชันเข้าสู่ระบบ (แบบง่าย)
export const loginUser = async (username, password) => {
  try {
    console.log(`[DEBUG-LOGIN] Attempting login for user: ${username}`);
    
    // ทำความสะอาด input
    const cleanUsername = username?.trim() || '';
    const cleanPassword = password?.trim() || '';
    
    if (!cleanUsername || !cleanPassword) {
      console.error('[DEBUG-LOGIN] Username or password is empty after cleaning');
      return {
        success: false,
        error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      };
    }
    
    console.log(`[DEBUG-LOGIN] Searching for user: ${cleanUsername}`);
    
    // ค้นหาผู้ใช้จาก username
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', cleanUsername));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error('[DEBUG-LOGIN] User not found');
      return {
        success: false,
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      };
    }

    // ตรวจสอบรหัสผ่าน
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log(`[DEBUG-LOGIN] Found user: ${userData.username}, checking password...`);
    console.log(`[DEBUG-LOGIN] Password lengths - stored: ${userData.password?.length || 0}, input: ${cleanPassword.length}`);
    
    // ตรวจสอบว่ามีรหัสผ่านในฐานข้อมูลหรือไม่
    if (!userData.password) {
      console.error('[DEBUG-LOGIN] User has no password in database');
      return {
        success: false,
        error: 'พบข้อผิดพลาดเกี่ยวกับบัญชีผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ'
      };
    }
    
    // ทำความสะอาดรหัสผ่านในฐานข้อมูล
    const storedPassword = userData.password.trim();
    
    if (storedPassword !== cleanPassword) {
      // แสดงผลเพื่อการแก้ไขปัญหา - ไม่แสดงรหัสจริง
      console.error('[DEBUG-LOGIN] Password mismatch:');
      console.error(`[DEBUG-LOGIN] - Stored pass (first 2 chars): ${storedPassword.substring(0, 2)}...`);
      console.error(`[DEBUG-LOGIN] - Input pass (first 2 chars): ${cleanPassword.substring(0, 2)}...`);
      
      // เทียบอักขระหนึ่งต่อหนึ่งเพื่อหาจุดที่ต่างกัน (ไม่แสดงรหัสจริง)
      const maxLength = Math.max(storedPassword.length, cleanPassword.length);
      let mismatchInfo = [];
      
      for (let i = 0; i < maxLength; i++) {
        if (storedPassword[i] !== cleanPassword[i]) {
          mismatchInfo.push(`Position ${i}: stored char code=${storedPassword.charCodeAt(i) || 'none'}, input char code=${cleanPassword.charCodeAt(i) || 'none'}`);
          if (mismatchInfo.length >= 3) break; // เก็บไม่เกิน 3 จุดที่ต่างกัน
        }
      }
      
      console.error('[DEBUG-LOGIN] Mismatch details:', mismatchInfo);
      
      return {
        success: false,
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      };
    }
    
    console.log('[DEBUG-LOGIN] Password match successful, creating session');

    // สร้าง session token แบบง่าย
    const sessionToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const sessionId = `session_${Date.now()}`;
    
    // อัปเดตข้อมูล session ในฐานข้อมูล
    try {
      await updateDoc(doc(db, 'users', userDoc.id), {
        sessionToken,
        sessionId,
        lastLogin: new Date().toISOString()
      });
      
      console.log('[DEBUG-LOGIN] Session data updated in database');
    } catch (updateError) {
      console.error('[DEBUG-LOGIN] Failed to update session info in database:', updateError);
      // ถึงมีปัญหา ก็ให้ดำเนินการต่อ
    }

    // สร้าง user object สำหรับส่งกลับ
    const user = {
      uid: userDoc.id,
      username: userData.username,
      displayName: userData.displayName || userData.username,
      role: userData.role || 'user',
      ward: userData.ward || null,
      sessionToken,
      sessionId
    };

    console.log('[DEBUG-LOGIN] Login successful, returning user data');
    return {
      success: true,
      user: user
    };
  } catch (error) {
    console.error('[DEBUG-LOGIN] Login error:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'
    };
  }
};

/**
 * ตรวจสอบความถูกต้องของ session token
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} sessionToken - Session token ที่ต้องการตรวจสอบ
 * @param {string} sessionId - ID ของ session ที่ต้องการตรวจสอบ
 * @returns {Promise<boolean>} - ผลการตรวจสอบ (true = ถูกต้อง, false = ไม่ถูกต้อง)
 */
export const validateSession = async (userId, sessionToken, sessionId) => {
  try {
    console.log('Validating session:', { userId, sessionId });
    
    if (!userId || !sessionToken || !sessionId) {
      console.error('Missing required parameters for session validation');
      return false;
    }
    
    // ตรวจสอบข้อมูลใน collection users
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error('User not found in database');
      return false;
    }
    
    const userData = userSnap.data();
    
    // ตรวจสอบว่า sessionToken ตรงกับที่เก็บไว้หรือไม่
    if (userData.sessionToken !== sessionToken) {
      console.error('Session token mismatch');
      return false;
    }
    
    // ตรวจสอบว่า sessionId ตรงกับที่เก็บไว้หรือไม่
    if (userData.sessionId !== sessionId) {
      console.error('Session ID mismatch');
      return false;
    }
    
    // ตรวจสอบเวลาหมดอายุของ session
    if (userData.sessionExpiresAt) {
      const expiresAt = new Date(userData.sessionExpiresAt);
      const now = new Date();
      
      if (now > expiresAt) {
        console.error('Session expired at:', expiresAt.toISOString());
        return false;
      }
    }
    
    // ตรวจสอบข้อมูลใน collection userSessions
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      console.error('Session not found in database');
      return false;
    }
    
    const sessionData = sessionSnap.data();
    
    // ตรวจสอบว่า session นี้เป็นของผู้ใช้คนนี้จริงหรือไม่
    if (sessionData.userId !== userId) {
      console.error('Session belongs to different user');
      return false;
    }
    
    // ตรวจสอบว่า session token ตรงกับที่เก็บไว้หรือไม่
    if (sessionData.sessionToken !== sessionToken) {
      console.error('Session token mismatch in sessions collection');
      return false;
    }
    
    // ตรวจสอบเวลาหมดอายุของ session
    if (sessionData.expiresAt) {
      const expiresAt = new Date(sessionData.expiresAt);
      const now = new Date();
      
      if (now > expiresAt) {
        console.error('Session expired in sessions collection');
        return false;
      }
    }
    
    // อัปเดตเวลาล่าสุดที่มีการใช้งาน session
    try {
      await updateDoc(userRef, {
        lastActivity: new Date().toISOString()
      });
      
      await updateDoc(sessionRef, {
        lastActivity: new Date().toISOString()
      });
    } catch (updateError) {
      console.warn('Failed to update last activity time:', updateError);
      // ในกรณีนี้ไม่ต้องการให้เกิดข้อผิดพลาด เราจะส่งค่า true กลับไปเหมือนเดิม
    }
    
    return true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
};

// ฟังก์ชันยกเลิก session
export const invalidateSession = async (sessionToken) => {
  try {
    if (!sessionToken) {
      return { success: false, error: 'No session token provided' };
    }

    // ค้นหาผู้ใช้ที่มี session token นี้
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('sessionToken', '==', sessionToken));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Session not found' };
    }

    // ลบ session token
    const userDoc = querySnapshot.docs[0];
    await updateDoc(doc(db, 'users', userDoc.id), {
      sessionToken: null
    });

    return { success: true };
  } catch (error) {
    console.error('Session invalidation error:', error);
    return { success: false, error: 'Error invalidating session' };
  }
};