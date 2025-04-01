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
import { createUserSession, verifyUserSession } from './sessionService';

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

  try {
    // 1. Find user by username in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.trim()));
    console.log('Querying Firestore for username...');
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('User not found');
      await logLoginFailed(username.trim(), 'user_not_found');
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
      await logLoginFailed(username.trim(), 'account_inactive');
      return {
        success: false,
        error: 'บัญชีผู้ใช้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
      };
    }

    // 3. Check password
    const storedPassword = userDoc.password;
    if (!storedPassword) {
      console.error('Password not found in user document!');
      await logLoginFailed(username.trim(), 'missing_password');
      return {
        success: false,
        error: 'พบข้อผิดพลาดในการตั้งค่าบัญชีผู้ใช้ (ไม่พบรหัสผ่าน) กรุณาติดต่อผู้ดูแลระบบ'
      };
    }

    // 4. Verify password
    // ตรวจสอบว่าเป็นรหัสผ่านที่ใช้ bcrypt หรือไม่
    let passwordIsValid = false;
    
    if (storedPassword.startsWith('$2')) {
      // เป็นรหัสผ่านที่ hash ด้วย bcrypt แล้ว
      passwordIsValid = await comparePassword(String(password).trim(), storedPassword);
    } else {
      // รหัสผ่านแบบเดิมที่ไม่ได้ hash (plaintext) - จะใช้เฉพาะช่วงเปลี่ยนผ่าน
      passwordIsValid = String(password).trim() === String(storedPassword).trim();
      
      // TODO: รอบหน้าจะทำการ hash รหัสผ่านและบันทึกเข้าไปในฐานข้อมูล
      // สำหรับการทดสอบในขั้นตอนนี้ เรายังคงเปรียบเทียบแบบเดิมก่อน
      
      // const hashedPassword = await hashPassword(String(password).trim());
      // await updateDoc(doc(db, 'users', userId), {
      //   password: hashedPassword
      // });
    }
    
    if (!passwordIsValid) {
      console.log('Password incorrect');
      await logLoginFailed(username.trim(), 'invalid_password');
      return {
        success: false,
        error: 'รหัสผ่านไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ'
      };
    }

    // 5. Create user object
    const userObj: User = {
      uid: userId,
      role: userDoc.role || 'user',
      location: userDoc.location || [],
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      username: userDoc.username,
      displayName: `${userDoc.firstName} ${userDoc.lastName}`,
      active: userDoc.active
    };
    
    // 6. สร้าง JWT token และบันทึกลงใน cookie
    let token;
    try {
      token = await generateToken(userId, username.trim(), userObj.role);
      setAuthCookie(token);
      setUserCookie(userObj);
      
      // ยังคงเก็บใน sessionStorage สำหรับความเข้ากันได้กับโค้ดเดิม
      // จะค่อยๆ ถอดออกทีหลัง
      sessionStorage.setItem(`session_${userId}`, JSON.stringify({ 
        sessionId: Date.now().toString(),
        timestamp: Date.now()
      }));
      sessionStorage.setItem(`user_data_${userId}`, JSON.stringify(userObj));
    } catch (cacheErr) {
      console.error('Error caching user data:', cacheErr);
    }
    
    // 7. สร้าง session ในระบบใหม่
    const sessionId = await createUserSession(userObj);
    
    if (!sessionId) {
      console.error('Failed to create user session');
      return {
        success: false,
        error: 'ไม่สามารถสร้าง session ได้ กรุณาลองใหม่อีกครั้ง'
      };
    }
    
    // 8. บันทึก sessionId ลงใน sessionStorage
    sessionStorage.setItem('currentSessionId', sessionId);
    
    // 9. อัพเดท lastLogin ใน Firestore
    try {
      await updateDoc(doc(db, 'users', userId), {
        lastLogin: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    } catch (updateErr) {
      console.error('Error updating last login time:', updateErr);
    }
    
    // 10. เรียกใช้ callback ถ้ามีการส่งมา
    if (setUserCallback) {
      setUserCallback(userObj);
    }

    return {
      success: true,
      user: userObj,
      userId: userId,
      sessionId: sessionId
    };

  } catch (err: any) {
    console.error('Login error caught:', err);
    return {
      success: false,
      error: err.message || 'Login failed due to an unexpected error.'
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
    } else {
      // ถ้าไม่พบข้อมูลผู้ใช้ใน Firestore ให้ลบ session
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`user_data_${userId}`);
      sessionStorage.removeItem('currentSessionId');
      return null;
    }
  } catch (err) {
    console.error('Error checking saved session:', err);
    return null;
  }
}; 