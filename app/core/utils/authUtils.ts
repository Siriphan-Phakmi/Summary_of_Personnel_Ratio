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
 * ตรวจสอบรหัสผ่านว่าตรงกับรหัสที่เข้ารหัสไว้หรือไม่
 * @param password รหัสผ่านที่ผู้ใช้ป้อน
 * @param hashedPassword รหัสผ่านที่เข้ารหัสไว้
 * @returns ผลการตรวจสอบ
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return bcrypt.compare(password, hashedPassword);
  } catch (err) {
    console.error('Error comparing passwords:', err);
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
  // ตั้งค่า cookie หมดอายุใน 12 ชั่วโมง เหมือนกับ token
  const expires = new Date(new Date().getTime() + 12 * 60 * 60 * 1000);
  
  Cookies.set(TOKEN_COOKIE_NAME, token, {
    expires,
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
  // ตั้งค่า cookie หมดอายุใน 12 ชั่วโมง เหมือนกับ token
  const expires = new Date(new Date().getTime() + 12 * 60 * 60 * 1000);
  
  // แปลงข้อมูลเป็น JSON string
  const userDataString = JSON.stringify(userData);
  
  Cookies.set(USER_COOKIE_NAME, userDataString, {
    expires,
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
 * ลบ cookies ทั้งหมดที่เกี่ยวข้องกับการ authentication
 */
export const clearAuthCookies = (): void => {
  Cookies.remove(TOKEN_COOKIE_NAME, { path: '/' });
  Cookies.remove(USER_COOKIE_NAME, { path: '/' });
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