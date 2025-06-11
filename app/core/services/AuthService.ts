import { User } from '@/app/core/types/user';
import { db } from '@/app/core/firebase/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { hashPassword, comparePassword, generateToken } from '@/app/core/utils/authUtils';
import { logLogin, logLogout } from '@/app/features/auth/services/logService';
import { Logger } from '@/app/core/utils/logger';

interface UserWithPassword extends User {
  password?: string;
}

/**
 * Service จัดการเกี่ยวกับ Authentication ในระบบ
 * ใช้รูปแบบ Singleton เพื่อให้มี instance เดียวในระบบ
 */
export class AuthService {
  private static instance: AuthService;
  private readonly LAST_ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 นาที
  private lastActivityUpdates: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * เข้าสู่ระบบด้วย username และ password
   * @param username ชื่อผู้ใช้
   * @param password รหัสผ่าน
   * @returns ผลลัพธ์การเข้าสู่ระบบ
   */
  public async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // ตรวจสอบว่ามีการส่ง username และ password
      if (!username || !password) {
        return { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
      }

      // ตรวจสอบผู้ใช้จาก Firestore
      const usersRef = doc(db, 'users', username);
      const userDoc = await getDoc(usersRef);

      if (!userDoc.exists()) {
        Logger.info(`Login failed: Username not found - ${username}`);
        return { success: false, error: 'ไม่พบชื่อผู้ใช้ในระบบ' };
      }

      const userData = userDoc.data() as UserWithPassword;
      
      // บันทึกข้อมูลที่ได้รับจาก Firestore เพื่อตรวจสอบ
      Logger.info(`User data retrieved from Firestore for ${username}: uid=${userData.uid}, role=${userData.role}`);

      // ตรวจสอบว่าบัญชีถูกปิดใช้งานหรือไม่
      if (userData.active === false) {
        Logger.info(`Login attempt to inactive account - ${username}`);
        return { success: false, error: 'บัญชีผู้ใช้นี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' };
      }

      // ตรวจสอบรหัสผ่าน
      const isValidPassword = await comparePassword(password, userData.password || '');
      if (!isValidPassword) {
        Logger.info(`Login failed: Invalid password for ${username}`);
        return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
      }

      // Remove password before logging and returning user data
      const { password: _, ...userWithoutPassword } = userData;
      
      // ตรวจสอบและกำหนดค่า uid และ username เพื่อให้แน่ใจว่ามีค่าที่ถูกต้อง
      const userWithRequiredFields: User = {
        ...userWithoutPassword,
        uid: userWithoutPassword.uid || username, // ใช้ username เป็น uid ถ้าไม่มี uid
        username: userWithoutPassword.username || username, // ใช้ username ที่ใช้ login ถ้าไม่มี username ในข้อมูล
        role: userWithoutPassword.role || 'nurse' // ตั้งค่า default role เป็น nurse ถ้าไม่มีข้อมูล role
      };
      
      // บันทึกข้อมูล user ที่จะส่งกลับเพื่อตรวจสอบ
      Logger.info(`Login successful for ${username}, returning user data: uid=${userWithRequiredFields.uid}, role=${userWithRequiredFields.role}`);

      // อัพเดตเวลาเข้าสู่ระบบ
      await updateDoc(usersRef, {
        lastLogin: new Date(),
        lastActive: new Date()
      });

      // บันทึก log การเข้าสู่ระบบ
      await logLogin(userWithRequiredFields);

      return { success: true, user: userWithRequiredFields };
    } catch (error) {
      Logger.error('Login error:', error);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
  }

  /**
   * ออกจากระบบ
   * @param user ข้อมูลผู้ใช้
   */
  async logout(user: User): Promise<void> {
    try {
      if (!user?.uid) {
        Logger.info('Logout attempted without valid user');
        return;
      }

        // อัพเดตเวลาออกจากระบบ
        await updateDoc(doc(db, 'users', user.uid), {
          lastActive: new Date()
        });

        // บันทึก log การออกจากระบบ
        await logLogout(user);
      
      // ลบการติดตามการอัปเดตครั้งล่าสุด
      this.lastActivityUpdates.delete(user.uid);
    } catch (error) {
      Logger.error('Logout error:', error);
      throw new Error('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
  }

  /**
   * ตรวจสอบ token สำหรับ authentication
   * @param token token ที่ใช้ในการยืนยันตัวตน (ซึ่งปัจจุบันคือ uid ของผู้ใช้)
   * @returns ข้อมูลผู้ใช้หรือ null ถ้าไม่พบ
   */
  async checkAuth(token: string): Promise<User | null> {
    try {
      if (!token) {
        Logger.info('Token is empty in checkAuth');
        return null;
      }
      
      Logger.info(`Checking auth for token (uid): ${token}`);
      
      // ตรวจสอบ token และดึงข้อมูลผู้ใช้
      const userDocRef = doc(db, 'users', token);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        Logger.info(`User document not found for token: ${token}`);
        return null;
      }

      const userData = userDoc.data() as User;
      
      // บันทึกข้อมูลที่ได้รับจาก Firestore เพื่อตรวจสอบ
      Logger.info(`Auth check successful for token ${token}: username=${userData.username}, role=${userData.role}`);
      
      // ตรวจสอบว่าบัญชีถูกปิดใช้งานหรือไม่
      if (userData.active === false) {
        Logger.info(`Auth check failed: Account is inactive - ${token}`);
        return null;
      }
      
      // เพิ่มค่า default ถ้าไม่มีข้อมูลสำคัญ
      const userWithRequiredFields: User = {
        ...userData,
        uid: userData.uid || token,
        username: userData.username || token,
        role: userData.role || 'nurse' // ตั้งค่า default role เป็น nurse ถ้าไม่มีข้อมูล role
      };
      
      // อัพเดตเวลากิจกรรมล่าสุด
      await this.updateLastActive(token);
      
      return userWithRequiredFields;
    } catch (error) {
      Logger.error('Auth check error:', error);
      return null;
    }
  }

  /**
   * อัพเดตเวลากิจกรรมล่าสุดของผู้ใช้ (จะอัพเดตไม่เกินทุก 5 นาที)
   * @param userId ID ของผู้ใช้
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      if (!userId) return;
      
      const now = Date.now();
      const lastUpdate = this.lastActivityUpdates.get(userId) || 0;
      
      // ตรวจสอบว่าผ่านไป 5 นาทีแล้วหรือไม่
      if (now - lastUpdate > this.LAST_ACTIVITY_UPDATE_INTERVAL) {
        await updateDoc(doc(db, 'users', userId), {
          lastActive: new Date()
        });
        
        // บันทึกเวลาล่าสุดที่อัพเดต
        this.lastActivityUpdates.set(userId, now);
      }
    } catch (error) {
      Logger.error('Update last active error:', error);
    }
  }
  
  /**
   * เปลี่ยนรหัสผ่านของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @param currentPassword รหัสผ่านปัจจุบัน
   * @param newPassword รหัสผ่านใหม่
   * @returns ผลลัพธ์การเปลี่ยนรหัสผ่าน
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!userId || !currentPassword || !newPassword) {
        return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
      }
      
      // ตรวจสอบว่ารหัสผ่านใหม่มีความยาวเพียงพอ
      if (newPassword.length < 8) {
        return { success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร' };
      }
      
      // ดึงข้อมูลผู้ใช้
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'ไม่พบผู้ใช้' };
      }
      
      const userData = userDoc.data() as UserWithPassword;
      
      // ตรวจสอบรหัสผ่านปัจจุบัน
      const isValidPassword = await comparePassword(currentPassword, userData.password || '');
      if (!isValidPassword) {
        return { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
      }
      
      // เข้ารหัสรหัสผ่านใหม่
      const hashedPassword = await hashPassword(newPassword);
      
      // อัพเดตรหัสผ่าน
      await updateDoc(doc(db, 'users', userId), {
        password: hashedPassword,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      Logger.error('Change password error:', error);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' };
    }
  }
} 