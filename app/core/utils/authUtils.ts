import bcrypt from 'bcryptjs';
import * as jose from 'jose';
// import Cookies from 'js-cookie';

// ค่า salt rounds สำหรับ bcrypt (ยิ่งมากยิ่งปลอดภัย แต่ใช้เวลาประมวลผลนานขึ้น)
const SALT_ROUNDS = 10;

// ค่าคงที่สำหรับการสร้าง JWT token
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'bpk9-secure-jwt-secret';
// const JWT_EXPIRES_IN = '3h'; // ไม่จำเป็นต้องใช้แล้ว เพราะ cookie เป็น session cookie
// const JWT_LONG_EXPIRES_IN = '30d'; // สำหรับ Remember Me (ไม่ใช้ใน flow นี้)

// ชื่อ cookie และ storage keys
const TOKEN_COOKIE_NAME = 'auth_token';
const USER_COOKIE_NAME = 'user_data';
const TOKEN_BACKUP_KEY = `${TOKEN_COOKIE_NAME}_backup`;
const USER_BACKUP_KEY = `${USER_COOKIE_NAME}_backup`;
const BACKUP_EXPIRES_KEY_SUFFIX = '_expires';
const SESSION_STORAGE_FLAG = 'is_browser_session'; // Key สำหรับ sessionStorage

// เวลาหมดอายุ (3 ชั่วโมง) สำหรับ localStorage backup
const EXPIRATION_MS = 3 * 60 * 60 * 1000;

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

    // คำนวณเวลาหมดอายุ (3 ชั่วโมง สำหรับ token เอง)
    const expiresIn = Math.floor(Date.now() / 1000) + (EXPIRATION_MS / 1000);

    // สร้าง JWT token ด้วย jose
    const token = await new jose.SignJWT({
        sub: userId,
        username,
        role
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn) // Token มีอายุ 3 ชั่วโมง
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
    // ถ้า error เป็น JWTExpired ไม่ต้อง log เป็น error ก็ได้
    if (err instanceof Error && err.name === 'JWTExpired') {
      console.log('Token verification failed: Expired');
    } else {
      console.error('Error verifying token:', err);
    }
    return null;
  }
};

/**
 * ตั้งค่า Cookie (Session) และ LocalStorage Backup (3 ชม.)
 * @param name ชื่อ Cookie/Key
 * @param value ค่าที่ต้องการเก็บ
 * @param isUserData ถ้าเป็น true จะ encodeURIComponent สำหรับ cookie
 */
const setAuthStorage = (name: string, value: string, isUserData: boolean = false): void => {
  if (typeof document === 'undefined') return;

  const expirationDate = new Date(Date.now() + EXPIRATION_MS);
  const cookieValue = isUserData ? encodeURIComponent(value) : value;

  // 1. Set Cookie (Session Cookie - ลบเมื่อปิด Browser)
  //    ไม่ตั้ง expires เพื่อให้เป็น session cookie
  const cookieOptions = [
    `${name}=${cookieValue}`,
    'path=/',
    'SameSite=Strict'
  ];
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure');
  }
  document.cookie = cookieOptions.join('; ');
  console.log(`[AUTH_UTILS] Set session cookie: ${name}`);

  // 2. Set LocalStorage Backup (พร้อมเวลาหมดอายุ 3 ชั่วโมง)
  if (typeof window !== 'undefined' && window.localStorage) {
    const backupKey = name === TOKEN_COOKIE_NAME ? TOKEN_BACKUP_KEY : USER_BACKUP_KEY;
    const expiresKey = `${backupKey}${BACKUP_EXPIRES_KEY_SUFFIX}`;
    // เก็บค่าจริง (userDataString สำหรับ user, token สำหรับ token)
    localStorage.setItem(backupKey, value);
    localStorage.setItem(expiresKey, expirationDate.toISOString());
    console.log(`[AUTH_UTILS] Set localStorage backup: ${backupKey} expires ${expirationDate.toISOString()}`);
  }

  // 3. Set SessionStorage Flag (บ่งบอกว่า Browser ยังเปิดอยู่)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SESSION_STORAGE_FLAG, 'true');
    console.log(`[AUTH_UTILS] Set sessionStorage flag: ${SESSION_STORAGE_FLAG}=true`);
  }
};

/**
 * ดึงค่า Cookie (Session) หรือ LocalStorage Backup (ถ้ายังไม่หมดอายุและ browser เดิม)
 * @param name ชื่อ Cookie/Key
 * @param isUserData ถ้าเป็น true จะ decodeURIComponent จาก cookie
 * @returns ค่าที่เก็บไว้ หรือ null
 */
const getAuthStorage = (name: string, isUserData: boolean = false): string | null => {
  if (typeof document === 'undefined') return null; // ทำงานฝั่ง Client เท่านั้น

  // 0. ตรวจสอบ SessionStorage Flag ก่อน
  const isSameBrowserSession = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_STORAGE_FLAG) === 'true';
  if (!isSameBrowserSession) {
    console.log(`[AUTH_UTILS] Not in the same browser session (flag=${sessionStorage.getItem(SESSION_STORAGE_FLAG)}). Clearing storage.`);
    // ถ้าไม่ใช่ session เดิม แสดงว่า Browser ปิดเปิดใหม่ -> ไม่ควรมี session ค้าง
    clearAuthStorage(); // เคลียร์ storage ที่อาจค้าง
    return null;
  }

  // 1. ลองดึงจาก Cookie (Session Cookie)
  const cookieValueRaw = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];

  if (cookieValueRaw) {
    const cookieValue = isUserData ? decodeURIComponent(cookieValueRaw) : cookieValueRaw;
    console.log(`[AUTH_UTILS] Found value in session cookie: ${name}`);
    return cookieValue;
  }
  console.log(`[AUTH_UTILS] Value not found in session cookie: ${name}`);

  // 2. ถ้าไม่มีใน Cookie ลองดึงจาก LocalStorage Backup
  if (typeof window !== 'undefined' && window.localStorage) {
    const backupKey = name === TOKEN_COOKIE_NAME ? TOKEN_BACKUP_KEY : USER_BACKUP_KEY;
    const expiresKey = `${backupKey}${BACKUP_EXPIRES_KEY_SUFFIX}`;
    const backupValue = localStorage.getItem(backupKey);
    const expirationString = localStorage.getItem(expiresKey);

    console.log(`[AUTH_UTILS] Checking localStorage backup: ${backupKey}, value=${backupValue ? 'exists' : 'null'}, expires=${expirationString}`);

    if (backupValue && expirationString) {
      const expirationDate = new Date(expirationString);
      const now = new Date();

      if (expirationDate > now) {
        // ถ้า Backup ยังไม่หมดอายุ และยังอยู่ใน Browser Session เดิม -> ใช้ได้
        console.log(`[AUTH_UTILS] Using valid localStorage backup for ${name}. Restoring session cookie.`);
        // คืนค่า และทำการ Restore Session Cookie ด้วย
        setAuthStorage(name, backupValue, isUserData); // Restore Session Cookie
        return backupValue; // คืนค่าจริง (userDataString หรือ token)
      } else {
        // ถ้าหมดอายุ -> ลบออกจาก LocalStorage
        console.log(`[AUTH_UTILS] localStorage backup for ${name} expired. Removing.`);
        localStorage.removeItem(backupKey);
        localStorage.removeItem(expiresKey);
      }
    }
  }

  // ถ้าไม่พบที่ไหนเลย
  console.log(`[AUTH_UTILS] No valid value found for ${name} in cookie or localStorage backup.`);
  return null;
};

/**
 * ล้างข้อมูล Authentication ทั้งหมด (Cookie, LocalStorage, SessionStorage)
 */
const clearAuthStorage = (): void => {
  console.log("[AUTH_UTILS] Clearing all authentication storage...");
  if (typeof document === 'undefined') return;

  // ลบ Cookies
  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  document.cookie = `${USER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  console.log("[AUTH_UTILS] Cleared cookies.");

  // ลบ LocalStorage Backups
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TOKEN_BACKUP_KEY);
    localStorage.removeItem(`${TOKEN_BACKUP_KEY}${BACKUP_EXPIRES_KEY_SUFFIX}`);
    localStorage.removeItem(USER_BACKUP_KEY);
    localStorage.removeItem(`${USER_BACKUP_KEY}${BACKUP_EXPIRES_KEY_SUFFIX}`);
    console.log("[AUTH_UTILS] Cleared localStorage backups.");
  }

  // ลบ SessionStorage Flag
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SESSION_STORAGE_FLAG);
    console.log("[AUTH_UTILS] Cleared sessionStorage flag.");
  }
};

/**
 * บันทึก token (Session Cookie + LocalStorage Backup 3 ชม.)
 * @param token JWT token ที่ต้องการบันทึก
 */
export const setAuthCookie = (token: string): void => {
  setAuthStorage(TOKEN_COOKIE_NAME, token, false);
};

/**
 * บันทึกข้อมูลผู้ใช้ (Session Cookie + LocalStorage Backup 3 ชม.)
 * @param userData ข้อมูลผู้ใช้ที่ต้องการบันทึก
 */
export const setUserCookie = (userData: any): void => {
  try {
    const userDataString = JSON.stringify(userData);
    // ส่งค่าที่ stringify แล้วไปให้ setAuthStorage, isUserData=true เพื่อ encode cookie
    setAuthStorage(USER_COOKIE_NAME, userDataString, true);
  } catch (err) {
    console.error('Error stringifying user data for cookie:', err);
  }
};

/**
 * ดึงข้อมูล token จาก Cookie หรือ LocalStorage Backup (ถ้ายัง valid)
 * @returns token หรือ null ถ้าไม่มี
 */
export const getAuthCookie = (): string | null => {
  console.log("[AUTH_UTILS] Attempting to get auth token...");
  return getAuthStorage(TOKEN_COOKIE_NAME, false);
};

/**
 * ดึงข้อมูลผู้ใช้จาก Cookie หรือ LocalStorage Backup (ถ้ายัง valid)
 * @returns ข้อมูลผู้ใช้ หรือ null ถ้าไม่มี
 */
export const getUserCookie = (): any | null => {
  console.log("[AUTH_UTILS] Attempting to get user data...");
  // getAuthStorage(..., true) จะ decode cookie ให้ แต่คืนค่า string ที่ยังไม่ได้ parse
  const userDataString = getAuthStorage(USER_COOKIE_NAME, true);
  if (!userDataString) {
      console.log("[AUTH_UTILS] User data string not found.");
      return null;
  }
  try {
    const userData = JSON.parse(userDataString);
    console.log("[AUTH_UTILS] Successfully parsed user data.");
    return userData;
  } catch (err) {
    console.error('[AUTH_UTILS] Error parsing user data from storage:', err);
    clearAuthStorage(); // เคลียร์ถ้าข้อมูลเสียหาย
    return null;
  }
};

/**
 * ล้าง cookies และ storage ทั้งหมดที่เกี่ยวข้องกับการ authentication
 * ชื่อใหม่ที่สื่อความหมายมากขึ้น
 */
export const clearAuthCookiesAndStorage = (): void => {
  clearAuthStorage();
};

/**
 * ฟังก์ชันเดิม แต่เปลี่ยนให้เรียกตัวใหม่ (เพื่อ backward compatibility ถ้ามี)
 */
export const clearAuthCookies = (): void => {
  console.warn("[AUTH_UTILS] Deprecated: clearAuthCookies called. Use clearAuthCookiesAndStorage instead.");
  clearAuthStorage();
};

/**
 * ตรวจสอบว่า token ที่ให้มายังใช้งานได้หรือไม่ (ตรวจสอบกับ server หรือ local)
 * @returns Promise<boolean>
 */
export const isTokenValid = async (): Promise<boolean> => {
  const token = getAuthCookie();
  if (!token) {
    return false;
  }
  // ตรวจสอบ token ด้วย jose
  const payload = await verifyToken(token);
  return payload !== null;
};

// --- CSRF Functions ---
/**
 * สร้าง CSRF token แบบง่ายๆ
 * @returns {string} CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof window === 'undefined') return ''; // ไม่ทำงานบน server
  const csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  // เก็บ token ใน sessionStorage
  sessionStorage.setItem('csrfToken', csrfToken);
  return csrfToken;
}

/**
 * ตรวจสอบ CSRF token ที่ส่งมากับที่เก็บใน sessionStorage
 * @param {string} token Token ที่ส่งมาจากฟอร์มหรือ header
 * @returns {boolean} true ถ้า token ถูกต้อง
 */
export function validateCSRFToken(token: string): boolean {
  if (typeof window === 'undefined') return false; // ไม่ทำงานบน server
  const storedToken = sessionStorage.getItem('csrfToken');
  if (!storedToken || !token) {
    return false;
  }
  return storedToken === token;
}

// --- Long-Lived Token Functions (สำหรับ Remember Me - ไม่ใช้ใน flow ปัจจุบัน) ---
// เก็บไว้เผื่ออนาคต แต่ไม่เรียกใช้ใน flow นี้

// export const generateLongLivedToken = async (...) => { ... }
// export const setLongLivedAuthCookie = (token: string): void => { ... }
// export const setLongLivedUserCookie = (userData: any): void => { ... } 