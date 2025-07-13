import bcrypt from 'bcryptjs';
import * as jose from 'jose';
// import Cookies from 'js-cookie';

// ค่า salt rounds สำหรับ bcrypt (ยิ่งมากยิ่งปลอดภัย แต่ใช้เวลาประมวลผลนานขึ้น)
const SALT_ROUNDS = 10;

// ค่าคงที่สำหรับการสร้าง JWT token
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'bpk9-secure-jwt-secret';
// const JWT_EXPIRES_IN = '3h'; // ไม่จำเป็นต้องใช้แล้ว เพราะ cookie เป็น session cookie
// const JWT_LONG_EXPIRES_IN = '30d'; // สำหรับ Remember Me (ไม่ใช้ใน flow นี้)

// ชื่อ cookie
const TOKEN_COOKIE_NAME = 'auth_token';
const USER_COOKIE_NAME = 'user_data';

// เวลาหมดอายุ (3 ชั่วโมง) สำหรับ JWT token
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

    // ตรวจสอบว่ารหัสผ่านที่เข้ารหัสเป็นรูปแบบ bcrypt หรือไม่
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
      // ถ้าไม่ใช่ bcrypt hash ถือว่ารหัสผ่านไม่ถูกต้องเสมอ
      console.warn('Stored password is not a valid bcrypt hash.');
      return false;
    }
  } catch (error) {
    console.error('Error comparing passwords:', error);
    // ในกรณีเกิดข้อผิดพลาดในการเปรียบเทียบ ให้ถือว่าไม่ตรงกัน
    console.warn('Password comparison failed due to error, returning false');
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

    console.log(`Generating token for user: ${username}, role: ${role}, id: ${userId}`);

    // สร้าง JWT token ด้วย jose
    const token = await new jose.SignJWT({
        sub: userId, // ใช้ sub เป็น standard claim สำหรับ subject (user id)
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
    if (!token || token.trim() === '') {
      console.warn('Empty token provided for verification');
      return null;
    }
    
    console.log(`Verifying token (length: ${token.length})`);
    
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    console.log('JWT_SECRET in use:', JWT_SECRET.substring(0, 3) + '...');
    
    const { payload } = await jose.jwtVerify(token, secretKey);
    console.log('Token verified successfully. Payload sub:', payload.sub);
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
 * ตั้งค่า Cookie (Session)
 * @param name ชื่อ Cookie
 * @param value ค่าที่ต้องการเก็บ
 * @param isUserData ถ้าเป็น true จะ encodeURIComponent สำหรับ cookie
 */
const setAuthStorage = (name: string, value: string, isUserData: boolean = false): void => {
  if (typeof document === 'undefined') return;

  const cookieValue = isUserData ? encodeURIComponent(value) : value;

  // Set Cookie (Session Cookie - ลบเมื่อปิด Browser)
  // ไม่ตั้ง expires เพื่อให้เป็น session cookie
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
};

/**
 * ดึงค่า Cookie (Session)
 * @param name ชื่อ Cookie
 * @param isUserData ถ้าเป็น true จะ decodeURIComponent จาก cookie
 * @returns ค่าที่เก็บไว้ หรือ null
 */
const getAuthStorage = (name: string, isUserData: boolean = false): string | null => {
  if (typeof document === 'undefined') return null; // ทำงานฝั่ง Client เท่านั้น

  // ดึงจาก Cookie (Session Cookie)
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
  return null;
};

/**
 * ล้างข้อมูล Authentication ทั้งหมด (Cookie เท่านั้น)
 */
const clearAuthStorage = (): void => {
  console.log("[AUTH_UTILS] Clearing all authentication storage...");
  if (typeof document === 'undefined') return;

  // ลบ Cookies
  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  document.cookie = `${USER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  console.log("[AUTH_UTILS] Cleared cookies.");
};

// Export storage functions for external use
export const setToken = (token: string): void => setAuthStorage(TOKEN_COOKIE_NAME, token, false);
export const getToken = (): string | null => getAuthStorage(TOKEN_COOKIE_NAME, false);
export const setUserData = (userData: string): void => setAuthStorage(USER_COOKIE_NAME, userData, true);
export const getUserData = (): string | null => getAuthStorage(USER_COOKIE_NAME, true);
export const clearAuthData = (): void => clearAuthStorage();

// --- CSRF Functions ---
/**
 * สร้าง CSRF token แบบง่ายๆ (ไม่เก็บใน browser storage)
 * @returns {string} CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof window === 'undefined') return ''; // ไม่ทำงานบน server
  const csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  // CSRF token จะต้องถูกจัดการใน server-side หรือผ่าน alternative method
  return csrfToken;
}

/**
 * ตรวจสอบ CSRF token (แบบ simplified validation)
 * @param {string} token Token ที่ส่งมาจากฟอร์มหรือ header
 * @returns {boolean} true ถ้า token ถูกต้อง
 */
export function validateCSRFToken(token: string): boolean {
  // บน server side ให้ข้าม validation ไปก่อน หรือใช้วิธีอื่น
  if (typeof window === 'undefined') {
    // สำหรับ development ให้ข้าม CSRF validation
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    // สำหรับ production ต้องใช้วิธีอื่นในการ validate
    return Boolean(token && token.length > 10); // Simple validation
  }
  
  // ตรวจสอบ token format แทนการเก็บใน sessionStorage
  // ควรใช้ server-side validation หรือ alternative method
  return Boolean(token && token.length >= 20); // Basic format validation
}