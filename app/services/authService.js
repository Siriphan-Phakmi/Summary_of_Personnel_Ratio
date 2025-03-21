'use client';

import { db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

/**
 * ล็อกอินผู้ใช้
 * @param {string} username - ชื่อผู้ใช้
 * @param {string} password - รหัสผ่าน
 * @returns {Promise<object>} ข้อมูลผลลัพธ์การล็อกอิน
 */
export async function loginUser(username, password) {
  try {
    // ตรวจสอบค่าว่าง
    if (!username?.trim() || !password?.trim()) {
      return {
        success: false,
        error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      };
    }

    // ค้นหาผู้ใช้จาก Firestore โดยใช้ username
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        success: false,
        error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ'
      };
    }

    // ตรวจสอบรหัสผ่าน
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // ในสถานการณ์จริงควรใช้การเข้ารหัสที่ปลอดภัย แต่ในที่นี้ใช้เปรียบเทียบตรงๆ เพื่อความง่าย
    if (userData.password !== password) {
      return {
        success: false,
        error: 'รหัสผ่านไม่ถูกต้อง'
      };
    }

    // สร้างข้อมูลผู้ใช้ที่จะส่งกลับ
    const user = {
      uid: userDoc.id,
      username: userData.username,
      displayName: userData.displayName || userData.username,
      role: userData.role || 'user',
      department: userData.department || '',
      email: userData.email || ''
    };

    // อัปเดตเวลาล็อกอินล่าสุด
    await updateDoc(doc(db, 'users', userDoc.id), {
      lastLogin: serverTimestamp()
    });

    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    };
  }
}

/**
 * ลบ session token ของผู้ใช้เมื่อออกจากระบบ
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<object>} ผลลัพธ์การออกจากระบบ
 */
export async function logoutUser(userId) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้'
      };
    }

    // อัปเดตข้อมูลผู้ใช้
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      sessionToken: null,
      lastActivity: serverTimestamp()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการออกจากระบบ'
    };
  }
}

/**
 * ตรวจสอบสิทธิ์การเข้าถึง
 * @param {object} user - ข้อมูลผู้ใช้
 * @param {array} allowedRoles - บทบาทที่อนุญาต
 * @returns {boolean} ผลการตรวจสอบสิทธิ์
 */
export function checkPermission(user, allowedRoles = []) {
  if (!user) return false;
  if (allowedRoles.length === 0) return true;
  return allowedRoles.includes(user.role);
} 