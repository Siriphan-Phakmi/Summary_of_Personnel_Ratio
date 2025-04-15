import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import Cookies from 'js-cookie';

// ค่า salt rounds สำหรับ bcrypt (ยิ่งมากยิ่งปลอดภัย แต่ใช้เวลาประมวลผลนานขึ้น)
const SALT_ROUNDS = 10;

// ค่าคงที่สำหรับการสร้าง JWT token
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'bpk9-secure-jwt-secret';
const JWT_EXPIRES_IN = '12h'; // token หมดอายุหลังจาก 12 ชั่วโมง

// ชื่อ cookie ที่ใช้เก็บ token
const TOKEN_COOKIE_NAME = 'auth_token';
// ชื่อ cookie ที่ใช้เก็บข้อมูลผู้ใช้
const USER_COOKIE_NAME = 'user_data';

/**
 * เข้ารหัสรหัสผ่านด้วย bcrypt
 * @param password รหัสผ่านที่ต้องการเข้ารหัส
 * @returns รหัสผ่านที่เข้ารหัสแล้ว
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  } catch (err) {
    console.error('Error hashing password:', err);
    throw new Error('Failed to hash password');
  }
};

/**
 * เปรียบเทียบรหัสผ่านกับที่เข้ารหัสแล้ว
 * @param inputPassword รหัสผ่านที่ผู้ใช้ป้อน
 * @param hashedPassword รหัสผ่านที่เข้ารหัสแล้ว
 * @returns true ถ้ารหัสผ่านตรงกัน, false ถ้าไม่ตรง
 */
export const comparePassword = async (inputPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    console.log('Comparing passwords (input length:', inputPassword.length, ', hashed length:', hashedPassword.length, ')');
    
    // ป้องกันกรณี input เป็นค่าว่าง
    if (!inputPassword) {
      console.warn('Input password is empty');
      return false;
    }

    // ป้องกันกรณี hashed password เป็นค่าว่าง
    if (!hashedPassword) {
      console.warn('Stored password is empty or undefined');
      return false;
    }
    
    // ตรวจสอบก่อนว่ารหัสผ่านที่เข้ารหัสมีรูปแบบที่ถูกต้อง
    if (hashedPassword.length < 10) {
      console.warn('Stored password may not be hashed properly (length:', hashedPassword.length, ')');
      
      // กรณีพิเศษ: ตรวจสอบแบบ plaintext (ไม่เข้ารหัส)
      console.warn('Trying plaintext comparison for password');
      const isMatch = inputPassword === hashedPassword;
      console.log('Plaintext comparison result:', isMatch);
      return isMatch;
    }
    
    // ตรวจสอบว่ารหัสผ่านใช้การเข้ารหัสแบบ bcrypt หรือไม่
    const isBcrypt = hashedPassword.startsWith('$2a$') || 
                    hashedPassword.startsWith('$2b$') || 
                    hashedPassword.startsWith('$2y$');
    
    if (isBcrypt) {
      // ใช้ bcrypt.compare ในการตรวจสอบ
      console.log('Using bcrypt comparison for hashed password');
      const result = await bcrypt.compare(inputPassword, hashedPassword);
      console.log('bcrypt comparison result:', result);
      return result;
    } else {
      // เปรียบเทียบตรงๆ สำหรับรหัสผ่านที่ไม่ได้เข้ารหัส (ไม่ปลอดภัย)
      console.warn('Password is not hashed with bcrypt, using direct comparison');
      const isMatch = inputPassword === hashedPassword;
      console.log('Plaintext comparison result:', isMatch);
      return isMatch;
    }
  } catch (error) {
    console.error('Error comparing passwords:', error);
    // ไม่ throw error เพื่อป้องกันการหยุดทำงานของแอพ
    console.warn('Password comparison failed, returning false');
    return false;
  }
};

/**
 * สร้าง JWT token จากข้อมูลผู้ใช้
 * @param userId ID ของผู้ใช้
 * @param username ชื่อผู้ใช้
 * @param role บทบาทของผู้ใช้
 * @returns JWT token
 */
export const generateToken = async (
  userId: string,
  username: string,
  role: string
): Promise<string> => {
  try {
    // แปลง string เป็น TextEncoder
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    
    // คำนวณเวลาหมดอายุ (12 ชั่วโมง)
    const expiresIn = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
    
    // สร้าง JWT token ด้วย jose
    const token = await new jose.SignJWT({ 
        sub: userId,
        username,
        role
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey);
    
    return token;
  } catch (err) {
    console.error('Error generating JWT token:', err);
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * ตรวจสอบและถอดรหัส JWT token
 * @param token JWT token ที่ต้องการตรวจสอบ
 * @returns ข้อมูลที่ถอดรหัสได้ หรือ null ถ้า token ไม่ถูกต้อง
 */
export const verifyToken = async (token: string): Promise<any | null> => {
  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload;
  } catch (err) {
    console.error('Error verifying token:', err);
    return null;
  }
};

/**
 * บันทึก token ลงใน cookie
 * @param token JWT token ที่ต้องการบันทึก
 */
export const setAuthCookie = (token: string): void => {
  // ไม่ระบุ expires ทำให้เป็น session cookie ที่จะหายไปเมื่อปิด browser
  Cookies.set(TOKEN_COOKIE_NAME, token, {
    path: '/',
    secure: process.env.NODE_ENV === 'production', // ใช้ HTTPS ในโหมด production
    sameSite: 'strict', // ป้องกัน CSRF
  });
};

/**
 * บันทึกข้อมูลผู้ใช้ลงใน cookie
 * @param userData ข้อมูลผู้ใช้ที่ต้องการบันทึก
 */
export const setUserCookie = (userData: any): void => {
  // ไม่ระบุ expires ทำให้เป็น session cookie ที่จะหายไปเมื่อปิด browser
  
  // แปลงข้อมูลเป็น JSON string
  const userDataString = JSON.stringify(userData);
  
  Cookies.set(USER_COOKIE_NAME, userDataString, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

/**
 * ดึงข้อมูล token จาก cookie
 * @returns token หรือ null ถ้าไม่มี
 */
export const getAuthCookie = (): string | null => {
  return Cookies.get(TOKEN_COOKIE_NAME) || null;
};

/**
 * ดึงข้อมูลผู้ใช้จาก cookie
 * @returns ข้อมูลผู้ใช้ หรือ null ถ้าไม่มี
 */
export const getUserCookie = (): any | null => {
  const userDataString = Cookies.get(USER_COOKIE_NAME);
  if (!userDataString) return null;
  
  try {
    return JSON.parse(userDataString);
  } catch (err) {
    console.error('Error parsing user data from cookie:', err);
    return null;
  }
};

/**
 * ล้าง cookies ทั้งหมดที่เกี่ยวข้องกับการ authentication และ cache
 */
export const clearAuthCookies = (): void => {
  // ล้าง cookies
  Cookies.remove(TOKEN_COOKIE_NAME, { path: '/' });
  Cookies.remove(USER_COOKIE_NAME, { path: '/' });
  
  // ล้าง session storage
  if (typeof window !== 'undefined') {
    // ล้าง session ID
    sessionStorage.removeItem('currentSessionId');
    
    // ล้าง CSRF token
    sessionStorage.removeItem('csrfToken');
    
    // ล้าง cache อื่นๆ ที่เกี่ยวข้อง
    const authRelatedPrefixes = ['auth_', 'user_', 'session_', 'token_'];
    
    // ล้าง session storage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && authRelatedPrefixes.some(prefix => key.startsWith(prefix))) {
        sessionStorage.removeItem(key);
      }
    }
    
    // ล้าง local storage (เฉพาะส่วนที่เกี่ยวข้องกับ auth)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && authRelatedPrefixes.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
    
    // ลบ cookie แบบ native approach เพื่อความมั่นใจ
    document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${USER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
};

/**
 * ฟังก์ชันสำหรับตรวจสอบว่า token ยังใช้งานได้หรือไม่
 * @returns ผลการตรวจสอบ
 */
export const isTokenValid = async (): Promise<boolean> => {
  try {
    const token = getAuthCookie();
    if (!token) return false;
    
    const decoded = await verifyToken(token);
    return decoded !== null;
  } catch (err) {
    console.error('Error validating token:', err);
    return false;
  }
};

/**
 * สร้าง CSRF token
 * @returns CSRF token
 */
export function generateCSRFToken(): string {
  // สร้าง token แบบสุ่ม
  const randomBytes = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    // Fallback สำหรับ server-side
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // แปลง bytes เป็น base64 string
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(randomBytes)));
  const token = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // บันทึก token ลงใน cookie
  document.cookie = `csrf_token=${token}; path=/; SameSite=Strict; max-age=3600;`;
  
  return token;
}

/**
 * ตรวจสอบ CSRF token
 * @param token CSRF token ที่ต้องการตรวจสอบ
 * @returns ผลการตรวจสอบ
 */
export function validateCSRFToken(token: string): boolean {
  // ดึง token จาก cookie
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];
  
  // ตรวจสอบว่า token ตรงกันหรือไม่
  return token === cookieValue;
} 