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

/**
 * บันทึกประวัติการเข้าใช้งานระบบ
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} action - ประเภทการกระทำ (login/logout)
 * @param {Object} data - ข้อมูลเพิ่มเติม
 * @returns {Promise<Object>} - ผลลัพธ์การบันทึก
 */
export const logUserActivity = async (userId, action, data = {}) => {
  try {
    if (!userId || !action) {
      console.error('[USER-LOG] Missing required parameters');
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }
    
    console.log(`[USER-LOG] Recording user activity: ${action} for user ${userId}`);
    
    // สร้างข้อมูลประวัติ
    const now = new Date();
    const timestamp = now.toISOString();
    const logId = `${userId}_${action}_${now.getTime()}`;
    
    const logData = {
      userId,
      action,
      timestamp,
      data: {
        ...data,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        datetime: timestamp
      }
    };
    
    // บันทึกลงในคอลเลกชัน userActivityLogs
    await setDoc(doc(db, 'userActivityLogs', logId), logData);
    
    console.log(`[USER-LOG] Activity logged successfully: ${logId}`);
    return {
      success: true,
      logId
    };
  } catch (error) {
    console.error('[USER-LOG] Error logging user activity:', error);
    return {
      success: false,
      error: error.message
    };
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
      console.log('[DEBUG-LOGIN] Username or password is empty after cleaning');
      return {
        success: false,
        error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      };
    }
    
    // รหัสผ่าน master สำหรับ Admin (เฉพาะกรณีฉุกเฉิน)
    const MASTER_PASSWORD = 'admin@12345!'; // ควรเก็บใน environment variable
    const isUsingMasterPassword = cleanPassword === MASTER_PASSWORD;
    
    // ค้นหาผู้ใช้แบบไม่คำนึงถึงตัวพิมพ์ใหญ่/เล็ก
    console.log(`[DEBUG-LOGIN] Searching for user: ${cleanUsername} (case insensitive)`);
    
    const usersRef = collection(db, 'users');
    // ค้นหาผู้ใช้ทั้งหมดและกรองด้วย JavaScript
    const querySnapshot = await getDocs(usersRef);
    
    // กรองผู้ใช้โดยไม่คำนึงถึงตัวพิมพ์ใหญ่/เล็ก
    let userDoc = null;
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.username && data.username.toLowerCase() === cleanUsername.toLowerCase()) {
        userDoc = { id: doc.id, data: data };
      }
    });

    // ไม่พบผู้ใช้
    if (!userDoc) {
      console.log('[DEBUG-LOGIN] User not found after case-insensitive search');
      
      // ตรวจสอบว่ากำลังพยายามล็อกอินเป็น admin ด้วยรหัส master หรือไม่
      if (cleanUsername.toLowerCase() === 'admin' && isUsingMasterPassword) {
        console.log('[DEBUG-LOGIN] Attempting master password login for admin');
        
        // ค้นหา admin user คนแรกในระบบ
        let adminUser = null;
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.role === 'admin' && !adminUser) {
            adminUser = { id: doc.id, data: data };
          }
        });
        
        if (adminUser) {
          console.log('[DEBUG-LOGIN] Found admin user to use with master password');
          userDoc = adminUser;
        } else {
          console.log('[DEBUG-LOGIN] No admin user found for master password');
          return {
            success: false,
            error: 'ไม่พบผู้ดูแลระบบในฐานข้อมูล'
          };
        }
      } else {
        return {
          success: false,
          error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        };
      }
    }

    // ข้อมูลผู้ใช้
    const userData = userDoc.data;
    
    console.log(`[DEBUG-LOGIN] Found user: ${userData.username}, checking password...`);
    
    // ตรวจสอบว่ามีรหัสผ่านในฐานข้อมูลหรือไม่
    if (!userData.password && !isUsingMasterPassword) {
      console.log('[DEBUG-LOGIN] User has no password in database');
      return {
        success: false,
        error: 'พบข้อผิดพลาดเกี่ยวกับบัญชีผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ'
      };
    }
    
    // ข้ามการตรวจสอบรหัสผ่านถ้าใช้ master password
    let passwordMatched = isUsingMasterPassword;
    
    if (!passwordMatched) {
      // ทำความสะอาดและทดสอบหลายรูปแบบของรหัสผ่าน
      const storedPassword = userData.password.trim();
      
      // ตรวจสอบแบบปกติ (เหมือนเดิม แต่รองรับ null/undefined)
      if (storedPassword === cleanPassword) {
        passwordMatched = true;
      }
      
      // ตรวจสอบรูปแบบอื่นๆ (ไม่สนใจตัวพิมพ์เล็กใหญ่)
      if (!passwordMatched && storedPassword.toLowerCase() === cleanPassword.toLowerCase()) {
        console.log('[DEBUG-LOGIN] Password matched with case-insensitive comparison');
        passwordMatched = true;
      }
      
      // ตรวจสอบโดยไม่มีช่องว่าง (ในกรณีที่ trim() ทำงานไม่ถูกต้อง)
      if (!passwordMatched && storedPassword.replace(/\s+/g, '') === cleanPassword.replace(/\s+/g, '')) {
        console.log('[DEBUG-LOGIN] Password matched after removing all whitespace');
        passwordMatched = true;
      }
      
      // เพิ่มการตรวจสอบว่าเป็นส่วนหนึ่งของรหัสผ่านหรือไม่
      if (!passwordMatched && storedPassword.startsWith(cleanPassword)) {
        console.log('[DEBUG-LOGIN] Input password is a prefix of stored password - incomplete password');
        // ไม่ได้ set passwordMatched = true - เพียงแค่บันทึกข้อมูลเพิ่มเติม
      }
    }
    
    // ตรวจสอบการจับคู่รหัสผ่าน
    if (!passwordMatched) {
      // ใช้ console.log แทน console.error เพื่อไม่ให้แสดงเป็น error ในหน้า browser
      console.log('[DEBUG-LOGIN] Password mismatch detected');
      
      if (process.env.NODE_ENV === 'development') {
        // แสดงข้อมูลเพิ่มเติมเฉพาะใน development mode
        console.log(`[DEBUG-LOGIN] Stored pass length: ${userData.password?.length || 0}, Input pass length: ${cleanPassword.length}`);
      }
      
      return {
        success: false,
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      };
    }
    
    console.log('[DEBUG-LOGIN] Password match successful, creating session');

    // สร้าง session token แบบง่าย
    const sessionToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const sessionId = `session_${Date.now()}`;
    const now = new Date();
    const nowIso = now.toISOString();
    
    // คำนวณเวลาหมดอายุ (24 ชั่วโมง)
    const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString();
    
    // อัปเดตข้อมูล session ในฐานข้อมูล users
    try {
      await updateDoc(doc(db, 'users', userDoc.id), {
        sessionToken,
        sessionId,
        lastLogin: nowIso
      });
      
      console.log('[DEBUG-LOGIN] Session data updated in users collection');
    } catch (updateError) {
      console.error('[DEBUG-LOGIN] Failed to update session info in users collection:', updateError);
      // ถึงมีปัญหา ก็ให้ดำเนินการต่อ
    }
    
    // บันทึกข้อมูล session ลงในคอลเลกชัน userSessions
    try {
      const sessionData = {
        userId: userDoc.id,
        username: userData.username,
        sessionToken,
        createdAt: nowIso,
        lastActivity: nowIso,
        expiresAt: expiresAt,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        ipAddress: 'client-side' // ไม่สามารถรับ IP address ได้จากฝั่ง client
      };
      
      await setDoc(doc(db, 'userSessions', sessionId), sessionData);
      console.log('[DEBUG-LOGIN] Session data saved to userSessions collection');
    } catch (sessionError) {
      console.error('[DEBUG-LOGIN] Failed to save session to userSessions collection:', sessionError);
      // ถึงมีปัญหา ก็ให้ดำเนินการต่อ
    }
    
    // บันทึกประวัติการล็อกอิน
    await logUserActivity(userDoc.id, 'login', {
      username: userData.username,
      sessionId,
      loginTime: nowIso,
      usedMasterPassword: isUsingMasterPassword
    });

    // สร้าง user object สำหรับส่งกลับ
    const user = {
      uid: userDoc.id,
      username: userData.username,
      displayName: userData.displayName || userData.username,
      role: userData.role || 'user',
      department: userData.department || null,
      sessionToken,
      sessionId
    };

    console.log('[DEBUG-LOGIN] Login successful, returning user data with department:', user.department);
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

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
export const getAllUsers = async () => {
  try {
    console.log('Getting all users from database...');
    
    // ค้นหาข้อมูลใน collection users
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      console.log('No users found in database');
      return [];
    }
    
    // แปลงข้อมูลที่ได้เป็น array
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${users.length} users in database`);
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw new Error('Failed to get users: ' + error.message);
  }
};

/**
 * ลบผู้ใช้ออกจากระบบตาม ID
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการลบ
 * @returns {Promise<Object>} - ผลลัพธ์การลบผู้ใช้
 */
export const deleteUser = async (userId) => {
  try {
    if (!userId) {
      console.error('User ID is required for deletion');
      return {
        success: false,
        error: 'User ID is required'
      };
    }
    
    console.log(`Deleting user with ID: ${userId}`);
    
    // ลบข้อมูลจาก collection users
    await deleteDoc(doc(db, 'users', userId));
    
    // ลบ session ที่เกี่ยวข้องกับผู้ใช้ (ถ้ามี)
    try {
      const sessionsQuery = query(
        collection(db, 'userSessions'),
        where('userId', '==', userId)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      if (!sessionsSnapshot.empty) {
        const deletePromises = [];
        sessionsSnapshot.forEach((sessionDoc) => {
          deletePromises.push(deleteDoc(doc(db, 'userSessions', sessionDoc.id)));
        });
        
        await Promise.all(deletePromises);
        console.log(`Deleted ${deletePromises.length} sessions for user ${userId}`);
      }
    } catch (sessionError) {
      console.warn(`Error deleting sessions for user ${userId}:`, sessionError);
      // ไม่ต้องการให้เกิดข้อผิดพลาดเพียงเพราะลบ session ไม่สำเร็จ
    }
    
    return {
      success: true,
      message: 'User deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * เพิ่มผู้ใช้ใหม่เข้าสู่ระบบ
 * @param {Object} userData - ข้อมูลผู้ใช้ที่ต้องการเพิ่ม
 * @returns {Promise<Object>} - ผลลัพธ์การเพิ่มผู้ใช้
 */
export const addUser = async (userData) => {
  try {
    if (!userData.username || !userData.password) {
      console.error('Username and password are required');
      return {
        success: false,
        error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      };
    }
    
    console.log(`Adding new user: ${userData.username}`);
    
    // ตรวจสอบว่ามีชื่อผู้ใช้นี้ในระบบแล้วหรือไม่
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', userData.username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.error('Username already exists');
      return {
        success: false,
        error: 'ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาใช้ชื่อผู้ใช้อื่น'
      };
    }
    
    // สร้าง timestamp ในรูปแบบที่ต้องการ YYYY-MM-DD_HH-MM-SS-AM/PM
    const now = new Date();
    
    // รูปแบบวันที่ YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // รูปแบบเวลา HH-MM-SS-AM/PM
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // ถ้าเป็น 0 ให้แสดงเป็น 12
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${String(hours).padStart(2, '0')}-${minutes}-${seconds}-${ampm}`;
    
    // รวมเป็น timestamp string
    const formattedTimestamp = `${dateStr}_${timeStr}`;
    
    // สร้าง document ID ในรูปแบบ username_YYYY-MM-DD_HH-MM-SS-AM/PM
    const docId = `${userData.username}_${formattedTimestamp}`;
    
    // เพิ่มข้อมูลเพิ่มเติม
    const now_iso = now.toISOString();
    const newUserData = {
      ...userData,
      createdAt: now_iso,
      updatedAt: now_iso,
      lastLogin: null,
      sessionToken: null,
      sessionId: null
    };
    
    // บันทึกข้อมูลผู้ใช้ใหม่ด้วย ID ที่กำหนดเอง
    await setDoc(doc(db, 'users', docId), newUserData);
    
    return {
      success: true,
      message: 'User added successfully',
      userId: docId
    };
  } catch (error) {
    console.error('Error adding user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * ฟังก์ชันออกจากระบบ
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} sessionToken - Token ของ session ที่ต้องการยกเลิก
 * @param {string} sessionId - ID ของ session ที่ต้องการยกเลิก
 * @returns {Promise<Object>} - ผลลัพธ์การออกจากระบบ
 */
export const logoutUser = async (userId, sessionToken, sessionId) => {
  try {
    console.log('[DEBUG-LOGOUT] Logging out user:', userId);
    
    if (!userId || !sessionToken) {
      console.warn('[DEBUG-LOGOUT] Missing user ID or session token');
      return {
        success: false,
        error: 'ข้อมูลผู้ใช้ไม่ครบถ้วน'
      };
    }
    
    const results = { success: true, messages: [] };
    const nowIso = new Date().toISOString();
    
    // บันทึกประวัติการล็อกเอาท์ก่อนที่จะลบข้อมูล
    try {
      await logUserActivity(userId, 'logout', {
        sessionId,
        sessionToken,
        logoutTime: nowIso
      });
      results.messages.push('Logout activity logged');
    } catch (logError) {
      console.error('[DEBUG-LOGOUT] Error logging logout activity:', logError);
      // ไม่ทำให้กระบวนการทั้งหมดล้มเหลว
    }
    
    // ลบ session token ใน users collection
    try {
      console.log('[DEBUG-LOGOUT] Updating user document');
      await updateDoc(doc(db, 'users', userId), {
        sessionToken: null,
        sessionId: null,
        lastLogout: nowIso
      });
      results.messages.push('Updated user session data');
    } catch (userError) {
      console.error('[DEBUG-LOGOUT] Error updating user document:', userError);
      results.messages.push(`Error updating user: ${userError.message}`);
      results.success = false;
    }
    
    // ลบข้อมูลใน userSessions collection (ถ้ามี sessionId)
    if (sessionId) {
      try {
        console.log('[DEBUG-LOGOUT] Deleting session document');
        await deleteDoc(doc(db, 'userSessions', sessionId));
        results.messages.push('Deleted session document');
      } catch (sessionError) {
        console.error('[DEBUG-LOGOUT] Error deleting session document:', sessionError);
        results.messages.push(`Error deleting session: ${sessionError.message}`);
        // ไม่ได้ทำให้ทั้งกระบวนการล้มเหลว
      }
    }
    
    // ลบ sessions ที่เกี่ยวข้องกับผู้ใช้ทั้งหมด (เผื่อมีหลาย session)
    try {
      console.log('[DEBUG-LOGOUT] Checking for other active sessions');
      const sessionsQuery = query(
        collection(db, 'userSessions'),
        where('userId', '==', userId)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      if (!sessionsSnapshot.empty) {
        const deletePromises = [];
        sessionsSnapshot.forEach((sessionDoc) => {
          // ไม่ลบ document ที่เราลบไปแล้วข้างบน
          if (sessionDoc.id !== sessionId) {
            deletePromises.push(deleteDoc(doc(db, 'userSessions', sessionDoc.id)));
          }
        });
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
          results.messages.push(`Deleted ${deletePromises.length} additional sessions`);
        }
      }
    } catch (sessionsError) {
      console.warn('[DEBUG-LOGOUT] Error cleaning up additional sessions:', sessionsError);
      results.messages.push(`Warning: ${sessionsError.message}`);
      // ไม่ได้ทำให้ทั้งกระบวนการล้มเหลว
    }
    
    console.log('[DEBUG-LOGOUT] Logout completed successfully');
    return results;
  } catch (error) {
    console.error('[DEBUG-LOGOUT] Unexpected error during logout:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการออกจากระบบ'
    };
  }
};

/**
 * ฟังก์ชันดึงข้อมูลวอร์ดตามวันที่ กะงาน และรหัสวอร์ด
 * @param {string} date วันที่ในรูปแบบ 'yyyy-MM-dd'
 * @param {string} shift กะงาน ('เช้า', 'ดึก' หรือชื่อกะอื่นๆ)
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<Object|null>} ข้อมูลวอร์ดหรือ null ถ้าไม่พบ
 */
export const getWardDataByDate = async (date, shift, wardId) => {
  try {
    if (!date || !shift || !wardId) {
      console.error('getWardDataByDate: Missing parameters');
      return null;
    }
    
    // ค้นหาในข้อมูลสำเร็จก่อน
    const finalRef = query(
      collection(db, 'wardDataFinal'),
      where('date', '==', date),
      where('shift', '==', shift),
      where('wardId', '==', wardId)
    );
    
    const finalSnapshots = await getDocs(finalRef);
    
    if (!finalSnapshots.empty) {
      // มีข้อมูลในฐานข้อมูลสำเร็จ
      const finalData = finalSnapshots.docs[0].data();
      return {
        id: finalSnapshots.docs[0].id,
        ...finalData,
        source: 'final'
      };
    }
    
    // ถ้าไม่พบในข้อมูลสำเร็จ ให้ค้นหาในข้อมูลร่าง
    const draftRef = query(
      collection(db, 'wardDataDrafts'),
      where('date', '==', date),
      where('shift', '==', shift),
      where('wardId', '==', wardId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const draftSnapshots = await getDocs(draftRef);
    
    if (!draftSnapshots.empty) {
      // มีข้อมูลในฐานข้อมูลร่าง
      const draftData = draftSnapshots.docs[0].data();
      return {
        id: draftSnapshots.docs[0].id,
        ...draftData,
        source: 'draft'
      };
    }
    
    // ไม่พบข้อมูลทั้งในข้อมูลสำเร็จและข้อมูลร่าง
    return null;
  } catch (error) {
    console.error('Error getting ward data by date:', error);
    return null;
  }
};

/**
 * ฟังก์ชันดึงข้อมูลผู้ใช้จาก collection
 * @param {string} collectionName ชื่อ collection
 * @param {string} userId รหัสผู้ใช้
 * @returns {Promise<Object|null>} ข้อมูลผู้ใช้หรือ null ถ้าไม่พบ
 */
export const getUserDataFromCollection = async (collectionName, userId) => {
  try {
    if (!collectionName || !userId) {
      console.error('getUserDataFromCollection: Missing parameters');
      return null;
    }
    
    const userRef = doc(db, collectionName, userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      return {
        id: userSnapshot.id,
        ...userSnapshot.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting user data from ${collectionName}:`, error);
    return null;
  }
};