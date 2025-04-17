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

// เพิ่ม cache สำหรับเก็บข้อมูล user ที่ login บ่อยๆ
const userCache = new Map<string, {
  user: User;
  timestamp: number;
}>();

// ระยะเวลาที่ cache จะหมดอายุ (5 นาที)
const CACHE_EXPIRY = 5 * 60 * 1000;

// เพิ่ม interface สำหรับ User ที่มี password
interface UserWithPassword extends User {
  password?: string;
}

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

// ฟังก์ชันสำหรับอัพเดท last login
const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    // ตรวจสอบว่า userId ถูกต้องก่อน
    if (!userId || userId.trim() === '' || userId === '0' || userId === '3') {
      console.warn('Cannot update last login: Invalid or reserved user ID:', userId);
      return;
    }

    // ตรวจสอบว่าเอกสารผู้ใช้มีอยู่จริงหรือไม่
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      // เอกสารมีอยู่จริง จึงอัพเดต
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    } else {
      // เอกสารไม่มีอยู่ ไม่สามารถอัพเดตได้
      console.warn(`Cannot update last login: User document with ID ${userId} does not exist`);
    }
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

/**
 * ตรวจสอบว่าเอกสารผู้ใช้มีอยู่จริงหรือไม่
 * @param userId รหัสผู้ใช้
 * @returns true ถ้าเอกสารมีอยู่, false ถ้าไม่มี
 */
const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    if (!userId || userId.trim() === '') return false;
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
};

/**
 * สร้างเซสชันผู้ใช้หลังจากตรวจสอบว่าผู้ใช้มีอยู่จริง
 * @param userId รหัสผู้ใช้
 * @param role บทบาทของผู้ใช้
 * @returns sessionId หรือ void
 */
const safeCreateUserSession = async (userId: string, role: string): Promise<string | void> => {
  try {
    if (!userId || userId.trim() === '' || userId === '0' || userId === '3') {
      console.warn('Cannot create session: Invalid or reserved user ID:', userId);
      return;
    }
    
    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const exists = await checkUserExists(userId);
    if (!exists) {
      console.warn(`Cannot create session: User document with ID ${userId} does not exist`);
      return;
    }
    
    // สร้างเซสชั่น
    return createUserSession(userId, role);
  } catch (error) {
    console.error('Error creating user session:', error);
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
    // ตรวจสอบ rate limit ก่อน
    const identifier = username.toLowerCase();
    if (checkRateLimit(identifier)) {
      return {
        success: false,
        error: 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่'
      };
    }

    // ตรวจสอบ cache ก่อน
    const cachedData = userCache.get(identifier);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_EXPIRY) {
      const user = cachedData.user as UserWithPassword;
      const isValidPassword = await comparePassword(password, user.password || '');
      if (isValidPassword) {
        // สร้าง session และอัพเดทข้อมูลแยกไปทำงานพื้นหลัง
        const promises = [];
        
        // ตรวจสอบว่ามี userId ก่อนสร้าง session
        if (user && user.uid && user.uid.trim() !== '' && user.uid !== '0' && user.uid !== '3') {
          promises.push(safeCreateUserSession(user.uid, user.role));
          promises.push(updateLastLogin(user.uid));
        } else {
          console.warn('Skipping session creation and login update for invalid user ID:', user?.uid);
        }
        
        // ตรวจสอบผลลัพธ์ของ promises (ถ้ามี)
        if (promises.length > 0) {
          try {
            // ใช้ then แทน await เพื่อไม่ให้ขัดขวางการทำงานหลัก
            Promise.all(promises).catch(error => {
              console.error('Error in session/login update operations:', error);
            });
          } catch (promiseError) {
            // จับ error แต่ไม่ทำให้การล็อกอินล้มเหลว
            console.warn('Error in background session operations:', promiseError);
          }
        }

        if (setUserCallback) {
          setUserCallback(user);
        }

        return {
          success: true,
          user: user,
          userId: user.uid
        };
      }
    }

    // ค้นหา user จาก Firestore โดยใช้ compound index
    const usersRef = collection(db, 'users');
    
    // ค้นหาแบบไม่เปรียบเทียบตัวพิมพ์ใหญ่-เล็ก
    // ลองทั้งตัวเล็กทั้งหมด username.toLowerCase() และตามที่ผู้ใช้กรอก
    const queries = [
      query(
        usersRef,
        where('username', '==', username.toLowerCase()),
        where('active', '==', true)
      ),
      query(
        usersRef,
        where('username', '==', username),
        where('active', '==', true)
      )
    ];
    
    // ทำการค้นหาทั้งสองแบบ
    let userSnapshot: QuerySnapshot<DocumentData>;
    let userData: UserWithPassword | null = null;
    
    // ค้นหาตัวพิมพ์เล็กก่อน
    userSnapshot = await getDocs(queries[0]);
    
    // ถ้าไม่พบให้ค้นหาตามที่ผู้ใช้กรอก
    if (userSnapshot.empty) {
      userSnapshot = await getDocs(queries[1]);
    }
    
    if (userSnapshot.empty) {
      checkRateLimit(identifier, false);
      console.warn(`User not found: ${username} (lowercase: ${username.toLowerCase()})`);
      return {
        success: false,
        error: 'ไม่พบชื่อผู้ใช้ในระบบ'
      };
    }

    const userDoc = userSnapshot.docs[0];
    userData = userDoc.data() as UserWithPassword;
    
    // เพิ่ม uid ถ้าไม่มี โดยใช้ ID ของเอกสาร
    if (!userData.uid) {
      userData.uid = userDoc.id;
      console.log('Added missing uid from document ID:', userDoc.id);
    }
    
    // Debug log
    console.log('User found:', {
      username: userData.username,
      enteredUsername: username,
      uid: userData.uid
    });

    // ตรวจสอบรหัสผ่าน
    const isValidPassword = await comparePassword(password, userData.password || '');
    if (!isValidPassword) {
      checkRateLimit(identifier, false);
      return {
        success: false,
        error: 'รหัสผ่านไม่ถูกต้อง'
      };
    }

    // เก็บข้อมูลลง cache
    userCache.set(identifier, {
      user: userData,
      timestamp: Date.now()
    });

    // สร้าง session และอัพเดทข้อมูลแยกไปทำงานพื้นหลัง
    const promises = [];
    
    // ตรวจสอบว่ามี userId ก่อนสร้าง session
    if (userData && userData.uid && userData.uid.trim() !== '' && userData.uid !== '0' && userData.uid !== '3') {
      promises.push(safeCreateUserSession(userData.uid, userData.role));
      updateLastLogin(userData.uid).catch(err => console.error('Error updating last login:', err));
    } else {
      console.warn('Skipping session creation and login update for invalid user ID:', userData?.uid);
    }
    
    // ตรวจสอบผลลัพธ์ของ promises (ถ้ามี)
    if (promises.length > 0) {
      try {
        // ใช้ then แทน await เพื่อไม่ให้ขัดขวางการทำงานหลัก
        Promise.all(promises).catch(error => {
          console.error('Error in session/login update operations:', error);
        });
      } catch (promiseError) {
        // จับ error แต่ไม่ทำให้การล็อกอินล้มเหลว
        console.warn('Error in background session operations:', promiseError);
      }
    }

    if (setUserCallback) {
      setUserCallback(userData);
    }

    checkRateLimit(identifier, true);
    return {
      success: true,
      user: userData,
      userId: userData.uid
    };

  } catch (error) {
    console.error('Error in loginWithCredentials:', error);
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
        try {
          // ตรวจสอบว่า uid ไม่ใช่ค่าว่างก่อนสร้าง session
          if (userObj.uid.trim() !== '') {
            const newSessionId = await createUserSession(userObj.uid, userObj.role);
            if (newSessionId) {
              sessionStorage.setItem('currentSessionId', newSessionId);
            }
          } else {
            console.warn('Cannot create session: Empty user ID');
          }
        } catch (sessionErr) {
          console.error('Error creating new session, but continuing login:', sessionErr);
          // ไม่ throw error เพื่อให้ยังคงล็อกอินได้แม้จะไม่มี session
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