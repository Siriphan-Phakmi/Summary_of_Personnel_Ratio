import { User } from '@/app/core/types/user';
import { db } from '@/app/core/firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { hashPassword, comparePassword, generateToken } from '@/app/core/utils/authUtils';
import { logLogin, logLogout } from '@/app/core/utils/logUtils';

interface UserWithPassword extends User {
  password?: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // ตรวจสอบผู้ใช้จาก Firestore
      const usersRef = doc(db, 'users', username);
      const userDoc = await getDoc(usersRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'ไม่พบชื่อผู้ใช้ในระบบ' };
      }

      const userData = userDoc.data() as UserWithPassword;

      // ตรวจสอบรหัสผ่าน
      const isValidPassword = await comparePassword(password, userData.password || '');
      if (!isValidPassword) {
        return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
      }

      // อัพเดตเวลาเข้าสู่ระบบ
      await updateDoc(usersRef, {
        lastLogin: new Date(),
        lastActive: new Date()
      });

      // บันทึก log การเข้าสู่ระบบ
      await logLogin(userData.uid, userData.username || '');

      // Remove password before returning user data
      const { password: _, ...userWithoutPassword } = userData;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
  }

  async logout(user: User): Promise<void> {
    try {
      if (user.uid) {
        // อัพเดตเวลาออกจากระบบ
        await updateDoc(doc(db, 'users', user.uid), {
          lastActive: new Date()
        });

        // บันทึก log การออกจากระบบ
        await logLogout(user.uid, user.username || '');
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
  }

  async checkAuth(token: string): Promise<User | null> {
    try {
      // ตรวจสอบ token และดึงข้อมูลผู้ใช้
      const userDoc = await getDoc(doc(db, 'users', token));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data() as User;
      return userData;
    } catch (error) {
      console.error('Auth check error:', error);
      return null;
    }
  }

  async updateLastActive(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        lastActive: new Date()
      });
    } catch (error) {
      console.error('Update last active error:', error);
    }
  }
} 