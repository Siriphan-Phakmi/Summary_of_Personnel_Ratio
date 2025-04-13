import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc
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
 * เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน
 * @param username ชื่อผู้ใช้
 * @param password รหัสผ่าน
 * @param setUserCallback ฟังก์ชันที่จะเรียกเมื่อพบผู้ใช้ที่ถูกต้อง
 * @returns ผลลัพธ์การเข้าสู่ระบบ
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
  console.log(`Attempting login for username: ${username}`);

  // ตรวจสอบและทำความสะอาด input
  const validatedUsername = validateAndSanitize(username);
  if (!validatedUsername.isValid) {
    console.log(`Login attempt with potentially dangerous input: ${username}`);
    await logLoginFailed(username.trim(), 'invalid_input');
    return {
      success: false,
      error: 'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง'
    };
  }

  const cleanUsername = validatedUsername.sanitized.trim();
  
  // ตรวจสอบ rate limit
  const isBlocked = checkRateLimit(cleanUsername);
  if (isBlocked) {
    console.log(`Login blocked due to too many attempts for: ${cleanUsername}`);
    await logLoginFailed(cleanUsername, 'rate_limited');
    return {
      success: false,
      error: 'คุณพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในอีก 15 นาที'
    };
  }

  try {
    // ค้นหาผู้ใช้จาก Firebase โดยตรง
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', cleanUsername));
    console.log('Querying Firestore for username...');
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('User not found');
      await logLoginFailed(cleanUsername, 'user_not_found');
      return {
        success: false,
        error: 'ไม่พบผู้ใช้นี้ในระบบ'
      };
    }

    const userDocSnapshot = querySnapshot.docs[0];
    const userDoc = userDocSnapshot.data();
    const userId = userDocSnapshot.id;
    console.log(`Firestore found user doc ID: ${userId}`);

    // 2. Check if user is active
    if (userDoc.active === false) {
      console.log('User account is inactive.');
      await logLoginFailed(cleanUsername, 'account_inactive');
      return {
        success: false,
        error: 'บัญชีผู้ใช้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
      };
    }

    // 3. Check password
    const storedPassword = userDoc.password;
    console.log('Comparing passwords:', { inputLength: password.length, storedLength: storedPassword?.length });
    const passwordMatch = await comparePassword(password, storedPassword);
    
    if (!passwordMatch) {
      console.log('Password does not match. Input password length:', password.length);
      await logLoginFailed(cleanUsername, 'invalid_password');
      return {
        success: false,
        error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง'
      };
    }

    // รีเซ็ต rate limit เมื่อล็อกอินสำเร็จ
    checkRateLimit(cleanUsername, true);

    // 4. Build user object
    const userObj: User = {
      uid: userId,
      role: userDoc.role || 'user',
      location: userDoc.location || [],
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      username: userDoc.username,
      displayName: `${userDoc.firstName} ${userDoc.lastName}`,
      active: userDoc.active,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt
    };
    
    // 5. Call the callback if provided
    if (setUserCallback) {
      setUserCallback(userObj);
    }
    
    // 6. Generate token and set cookies
    const token = await generateToken(userId, cleanUsername, userObj.role);
    setAuthCookie(token);
    setUserCookie(userObj);
    
    // 7. Update timestamps in Firestore
    try {
      await updateDoc(doc(db, 'users', userId), {
        lastLogin: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    } catch (updateError) {
      console.warn('Failed to update lastLogin timestamp:', updateError);
      // Non-critical error, continue login process
    }
    
    // 8. Create a new session
    const sessionId = await createUserSession(userObj);
    
    // Save session ID to sessionStorage
    if (sessionId) {
      sessionStorage.setItem('currentSessionId', sessionId);
    }
    
    return {
      success: true,
      user: userObj,
      userId,
      sessionId
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed due to an unexpected error'
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