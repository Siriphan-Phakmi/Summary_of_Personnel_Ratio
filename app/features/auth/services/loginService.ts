import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { User } from '@/app/core/types/user';
import { logLogin, logLoginFailed } from '@/app/core/utils/logUtils';
import { 
  comparePassword, 
  generateToken, 
  setAuthCookie, 
  setUserCookie, 
  getUserCookie, 
  getAuthCookie, 
  verifyToken, 
  isTokenValid 
} from '@/app/core/utils/authUtils';
import { validateAndSanitize } from '@/app/core/utils/securityUtils';
import { createUserSession, verifyUserSession, hasActiveSession } from './sessionService';

// Rate limiting implementation
// ใช้ Map เพื่อเก็บจำนวนการพยายามล็อกอินสำหรับแต่ละ IP หรือ username
interface RateLimitEntry {
  count: number;
  lastAttempt: number;
  blocked: boolean;
  blockUntil: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5; // จำนวนครั้งสูงสุดที่อนุญาตให้ล็อกอินไม่สำเร็จ
const TIMEOUT_MS = 15 * 60 * 1000; // 15 นาที
const RATE_LIMIT_RESET_MS = 60 * 60 * 1000; // 1 ชั่วโมง

/**
 * ตรวจสอบและอัพเดท rate limit
 * @param identifier ตัวระบุผู้ใช้ (username หรือ IP)
 * @param success บอกว่าการล็อกอินสำเร็จหรือไม่
 * @returns boolean ว่าควรบล็อกการล็อกอินหรือไม่
 */
function checkRateLimit(identifier: string, success: boolean = false): boolean {
  const now = Date.now();
  
  // ดึงข้อมูลการพยายามล็อกอินของผู้ใช้
  let entry = loginAttempts.get(identifier);
  
  // ถ้าไม่มีข้อมูล ให้สร้างใหม่
  if (!entry) {
    entry = { count: 0, lastAttempt: now, blocked: false, blockUntil: 0 };
  }
  
  // ถ้าล็อกอินสำเร็จ ให้รีเซ็ตการนับ
  if (success) {
    loginAttempts.delete(identifier);
    return false;
  }
  
  // ตรวจสอบว่าถูกบล็อกอยู่หรือไม่
  if (entry.blocked) {
    // ถ้าผ่านเวลาบล็อกไปแล้ว ให้รีเซ็ต
    if (now > entry.blockUntil) {
      entry.blocked = false;
      entry.count = 1;
      entry.lastAttempt = now;
      entry.blockUntil = 0;
      loginAttempts.set(identifier, entry);
      return false;
    }
    return true; // ยังอยู่ในช่วงเวลาที่ถูกบล็อก
  }
  
  // ถ้าผ่านเวลารีเซ็ตไปแล้ว ให้เริ่มนับใหม่
  if (now - entry.lastAttempt > RATE_LIMIT_RESET_MS) {
    entry.count = 1;
    entry.lastAttempt = now;
    loginAttempts.set(identifier, entry);
    return false;
  }
  
  // เพิ่มจำนวนการพยายาม
  entry.count++;
  entry.lastAttempt = now;
  
  // ถ้าเกินจำนวนครั้งที่กำหนด ให้บล็อก
  if (entry.count > MAX_ATTEMPTS) {
    entry.blocked = true;
    entry.blockUntil = now + TIMEOUT_MS;
    loginAttempts.set(identifier, entry);
    return true;
  }
  
  loginAttempts.set(identifier, entry);
  return false;
}

/**
 * ตรวจสอบข้อมูล user ที่ cache ไว้ก่อนหน้านี้
 * @returns ข้อมูลผู้ใช้ที่ cache ไว้ หรือ null ถ้าไม่มี
 */
export const getCachedUser = (): User | null => {
  try {
    // เช็คว่าอยู่ใน browser environment หรือไม่
    if (typeof window === 'undefined') {
      return null;
    }
    
    // ดึงข้อมูลจาก cookie แทน localStorage
    const userData = getUserCookie();
    return userData ? userData as User : null;
  } catch (error) {
    console.error('Error reading cached user data:', error);
    return null;
  }
};

/**
 * ล็อกอินด้วยชื่อผู้ใช้และรหัสผ่าน
 * @param username ชื่อผู้ใช้
 * @param password รหัสผ่าน
 * @param setUserCallback callback function สำหรับกำหนดค่า user หลังจากล็อกอินสำเร็จ
 * @returns ผลลัพธ์การล็อกอิน
 */
export const loginWithCredentials = async (
  username: string, 
  password: string,
  setUserCallback?: (user: User) => void
): Promise<{
  success: boolean;
  error?: string;
  user?: User;
  userId?: string;
  sessionId?: string;
}> => {
  try {
    console.log('Login attempt for username:', username);
    
    // ตรวจสอบ rate limit ก่อนพยายามล็อกอิน
    const isRateLimited = checkRateLimit(username);
    if (isRateLimited) {
      throw new Error('ถูกจำกัดการล็อกอินเนื่องจากพยายามล็อกอินมากเกินไป กรุณาลองใหม่ในอีก 15 นาที');
    }
    
    // ตรวจสอบข้อมูลว่าง
    if (!username || !password) {
      throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    }
    
    // สร้าง query เพื่อดึงผู้ใช้
    const usersRef = collection(db, 'users');
    
    // เปลี่ยนวิธีการ query เพื่อตรวจสอบให้ถูกต้องกับโครงสร้าง Firebase
    console.log('Creating Firestore query for username:', username.toLowerCase());
    const q = query(
      usersRef, 
      where('username', '==', username.toLowerCase())
    );
    
    console.log('Executing Firestore query...');
    
    // ใช้ Promise.race เพื่อกำหนด timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.log('Database connection timeout reached');
        reject(new Error('การเชื่อมต่อกับฐานข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'));
      }, 10000);
    });
    
    // ทดลองเพิ่ม debug query
    try {
      const testQuery = query(collection(db, 'users'));
      const allUsers = await getDocs(testQuery);
      console.log(`Found ${allUsers.size} total users in database`);
      allUsers.forEach(doc => {
        console.log(`User document ID: ${doc.id}, username: ${doc.data().username}`);
      });
    } catch (e) {
      console.error('Error in test query:', e);
    }
    
    const userSnapshot = await Promise.race([
      getDocs(q),
      timeoutPromise
    ]) as QuerySnapshot<DocumentData>;
    console.log('Firestore query completed, found matches:', userSnapshot.size);
    
    // ตรวจสอบว่าพบผู้ใช้หรือไม่
    if (userSnapshot.empty) {
      console.log('User not found for username:', username);
      checkRateLimit(username, false); // บันทึกความล้มเหลว
      throw new Error('ไม่พบชื่อผู้ใช้ในระบบ');
    }
    
    // ดึงข้อมูลผู้ใช้
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data() as User & { password: string };
    const userId = userDoc.id;
    
    console.log(`User found with ID: ${userId}, checking password...`);
    
    // ตรวจสอบสถานะการใช้งาน
    if (userData.active === false) {
      console.log('Account disabled for username:', username);
      checkRateLimit(username, false); // บันทึกความล้มเหลว
      throw new Error('บัญชีผู้ใช้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }
    
    // ตรวจสอบว่ามีฟิลด์รหัสผ่านหรือไม่
    if (!userData.password) {
      console.error('User record has no password field');
      throw new Error('ไม่พบข้อมูลรหัสผ่านในระบบ กรุณาติดต่อผู้ดูแลระบบ');
    }
    
    // ตรวจสอบรหัสผ่าน - ทำแบบขนานเพื่อลดเวลา
    console.log('Verifying password');
    try {
      const passwordValid = await comparePassword(password, userData.password);
      
      if (!passwordValid) {
        console.log('Invalid password for username:', username);
        checkRateLimit(username, false); // บันทึกความล้มเหลว
        throw new Error('รหัสผ่านไม่ถูกต้อง');
      }
      
      console.log('Password verification successful');
    } catch (err) {
      console.error('Error verifying password:', err);
      throw new Error('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    }
    
    // ล็อกอินสำเร็จ - รีเซ็ต rate limit
    checkRateLimit(username, true);
    
    // สร้าง user object ที่ไม่มีรหัสผ่าน
    const user: User = {
      uid: userId,
      username: userData.username,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
      active: userData.active,
      approveWardIds: userData.approveWardIds,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };
    
    console.log('Login successful, creating session');
    
    // สร้าง session และอัพเดทข้อมูลผู้ใช้
    const sessionPromises: Promise<any>[] = [];
    
    // 1. สร้าง session - ทำแบบขนานกับการอัพเดทข้อมูลอื่น
    console.log('Creating user session...');
    const sessionPromise = createUserSession(user).catch(err => {
      console.error('Error creating session:', err);
      return null; // Return null instead of rejecting to prevent Promise.all failure
    });
    sessionPromises.push(sessionPromise);
    
    // 2. อัพเดท lastLogin ของผู้ใช้
    console.log('Updating last login time...');
    const userRef = doc(db, 'users', userId);
    const updatePromise = updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      lastActive: serverTimestamp()
    }).catch(err => {
      console.error('Error updating last login:', err);
      return null; // Return null instead of rejecting
    });
    sessionPromises.push(updatePromise);
    
    // 3. บันทึก log
    console.log('Logging login activity...');
    const logPromise = logLogin(userId, 'login_success').catch(err => {
      console.error('Error logging login:', err);
      return null; // Return null instead of rejecting
    });
    sessionPromises.push(logPromise);
    
    // รอให้ทุกการทำงานเสร็จสิ้น
    console.log('Waiting for all login processes to complete...');
    const sessionResults = await Promise.all(sessionPromises);
    console.log('All login processes completed');
    
    // Extract session ID from results (first item)
    const sessionId = sessionResults[0];
    
    console.log('Login process completed successfully for', username);
    
    // เรียก callback เพื่อตั้งค่า user (ถ้ามี)
    if (setUserCallback) {
      setUserCallback(user);
    }
    
    // คืนค่าข้อมูลการล็อกอิน
    return {
      success: true,
      user,
      userId,
      sessionId
    };
  } catch (error) {
    console.error('Error in loginWithCredentials:', error);
    
    // ตรวจสอบประเภทข้อผิดพลาดและคืนค่าที่เหมาะสม
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    };
  }
};

/**
 * ตรวจสอบ session ที่บันทึกไว้
 * @param currentUser ข้อมูลผู้ใช้ปัจจุบัน (ถ้ามี)
 * @returns ข้อมูลผู้ใช้ที่ดึงมาจาก Firestore หรือ null ถ้าไม่พบ session ที่ถูกต้อง
 */
export const checkSavedSession = async (currentUser?: User | null): Promise<User | null> => {
  try {
    // ถ้ามี currentUser อยู่แล้ว ให้ใช้ค่านั้น
    if (currentUser) {
      // ตรวจสอบเพิ่มเติมว่า session ยังถูกต้องหรือไม่
      const sessionId = sessionStorage.getItem('currentSessionId');
      if (sessionId && currentUser.uid) {
        const isValidSession = await verifyUserSession(currentUser.uid, sessionId);
        if (!isValidSession) {
          return null; // Session ถูกยกเลิกจากที่อื่น
        }
      }
      return currentUser;
    }

    // ตรวจสอบ token ใน cookie
    const isValidToken = await isTokenValid();
    if (!isValidToken) {
      return null;
    }
    
    // ดึงข้อมูลผู้ใช้จาก cookie
    const userData = getUserCookie();
    if (userData && userData.uid) {
      // ตรวจสอบ session
      const sessionId = sessionStorage.getItem('currentSessionId');
      if (sessionId) {
        const isValidSession = await verifyUserSession(userData.uid, sessionId);
        if (!isValidSession) {
          return null; // Session ถูกยกเลิกจากที่อื่น
        }
      } else {
        // ถ้าไม่มี sessionId แต่มี active session อื่นอยู่
        const hasActive = await hasActiveSession(userData.uid);
        if (hasActive) {
          // มี session อื่นที่ active อยู่แล้ว
          return null;
        }
      }
      return userData as User;
    }
    
    // ถ้ายังไม่มี cookie แต่มี sessionStorage (เพื่อความเข้ากันได้กับระบบเดิม)
    // ค่อยๆ ลบส่วนนี้ออกหลังจากที่ทุกคนใช้ระบบใหม่แล้ว
    const allKeys = Object.keys(sessionStorage);
    const sessionKey = allKeys.find(key => key.startsWith('session_'));
    
    if (!sessionKey) {
      return null;
    }

    const userId = sessionKey.replace('session_', '');
    
    // ตรวจสอบ session ในระบบใหม่
    const sessionId = sessionStorage.getItem('currentSessionId');
    if (sessionId) {
      const isValidSession = await verifyUserSession(userId, sessionId);
      if (!isValidSession) {
        return null; // Session ถูกยกเลิกจากที่อื่น
      }
    } else {
      // ถ้าไม่มี sessionId แต่มี active session อื่นอยู่
      const hasActive = await hasActiveSession(userId);
      if (hasActive) {
        // มี session อื่นที่ active อยู่แล้ว
        return null;
      }
    }
    
    // ลองดึงข้อมูล user จาก sessionStorage
    const cachedUserData = sessionStorage.getItem(`user_data_${userId}`);
    if (cachedUserData) {
      try {
        const user = JSON.parse(cachedUserData) as User;
        
        // สร้าง token และ cookie สำหรับระบบใหม่
        const token = await generateToken(user.uid, user.username || '', user.role);
        setAuthCookie(token);
        setUserCookie(user);
        
        return user;
      } catch (parseErr) {
        console.error('Error parsing user data:', parseErr);
      }
    }

    // ถ้าไม่พบข้อมูลใน sessionStorage หรือ parse ไม่สำเร็จ ให้ดึงจาก Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // ตรวจสอบว่าบัญชีผู้ใช้ยังเปิดใช้งานอยู่หรือไม่
      if (userData.active === false) {
        // ถ้าปิดใช้งาน ให้ลบข้อมูล session ออก
        sessionStorage.removeItem(sessionKey);
        sessionStorage.removeItem(`user_data_${userId}`);
        sessionStorage.removeItem('currentSessionId');
        return null;
      }
      
      // สร้างข้อมูลผู้ใช้
      const userObj: User = {
        uid: userId,
        role: userData.role || 'user',
        location: userData.location || [],
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        displayName: `${userData.firstName} ${userData.lastName}`,
        active: userData.active
      };
      
      // สร้าง token และบันทึกลงใน cookie
      const token = await generateToken(userId, userObj.username || '', userObj.role);
      setAuthCookie(token);
      setUserCookie(userObj);
      
      // อัพเดทข้อมูลใน sessionStorage เพื่อความเข้ากันได้กับระบบเดิม
      sessionStorage.setItem(`user_data_${userId}`, JSON.stringify(userObj));
      
      // ถ้าไม่พบ sessionId แต่มีข้อมูลผู้ใช้ที่ถูกต้อง ให้สร้าง session ใหม่
      if (!sessionId && userObj.uid) {
        const newSessionId = await createUserSession(userObj);
        if (newSessionId) {
          sessionStorage.setItem('currentSessionId', newSessionId);
        }
      }
      
      return userObj;
    }
    
    return null;
  } catch (error) {
    console.error('Error checking saved session:', error);
    return null;
  }
}; 