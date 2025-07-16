import { 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { Ward } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { COLLECTION_WARDS } from '../constants';
import { Logger } from '@/app/lib/utils/logger';

/**
 * เพิ่มแผนกใหม่
 * @param wardData ข้อมูลแผนก
 * @param user ผู้ใช้ที่ทำการเพิ่ม
 * @returns ID ของแผนกที่ถูกเพิ่ม
 */
export const addWard = async (
  wardData: Omit<Ward, 'id' | 'createdAt' | 'updatedAt'>,
  user: User
): Promise<string> => {
  try {
    const newWardData = {
      ...wardData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.uid,
      updatedBy: user.uid
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_WARDS), newWardData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding ward:', error);
    throw error;
  }
};

/**
 * อัปเดตข้อมูลแผนก
 * @param wardId ID ของแผนก
 * @param wardData ข้อมูลแผนกที่ต้องการอัปเดต
 * @param user ผู้ใช้ที่ทำการอัปเดต
 * @returns ID ของแผนกที่ถูกอัปเดต
 */
export const updateWard = async (
  wardId: string,
  wardData: Partial<Omit<Ward, 'id' | 'createdAt' | 'updatedAt'>>,
  user: User
): Promise<string> => {
  try {
    const wardRef = doc(db, COLLECTION_WARDS, wardId);
    
    const updateData = {
      ...wardData,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    };
    
    await updateDoc(wardRef, updateData);
    return wardId;
  } catch (error) {
    console.error('Error updating ward:', error);
    throw error;
  }
};

/**
 * ปิดการใช้งานแผนก (soft delete)
 * @param wardId ID ของแผนก
 * @param user ผู้ใช้ที่ทำการปิดการใช้งาน
 * @returns ID ของแผนกที่ถูกปิดการใช้งาน
 */
export const deactivateWard = async (
  wardId: string,
  user: User
): Promise<string> => {
  try {
    const wardRef = doc(db, COLLECTION_WARDS, wardId);
    
    await updateDoc(wardRef, {
      active: false,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
      deactivatedAt: serverTimestamp(),
      deactivatedBy: user.uid
    });
    
    return wardId;
  } catch (error) {
    console.error('Error deactivating ward:', error);
    throw error;
  }
};

/**
 * อัปเดตลำดับของแผนก
 * @param wardOrders รายการข้อมูลลำดับแผนก
 * @param user ผู้ใช้ที่ทำการอัปเดต
 * @returns จำนวนแผนกที่ถูกอัปเดต
 */
export const updateWardOrders = async (
  wardOrders: { wardId: string, order: number }[],
  user: User
): Promise<number> => {
  try {
    const batch = writeBatch(db);
    
    wardOrders.forEach(({ wardId, order }) => {
      const wardRef = doc(db, COLLECTION_WARDS, wardId);
      batch.update(wardRef, {
        wardOrder: order,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
    });
    
    await batch.commit();
    return wardOrders.length;
  } catch (error) {
    console.error('Error updating ward orders:', error);
    throw error;
  }
};

/**
 * ลบแผนก (hard delete) - ใช้เฉพาะในการพัฒนา
 * @param wardId ID ของแผนก
 * @param user ผู้ใช้ที่ทำการลบ
 * @returns ID ของแผนกที่ถูกลบ
 */
export const deleteWard = async (
  wardId: string,
  user: User
): Promise<string> => {
  try {
    const wardRef = doc(db, COLLECTION_WARDS, wardId);
    await deleteDoc(wardRef);
    
    console.log(`Ward ${wardId} deleted by ${user.uid}`);
    return wardId;
  } catch (error) {
    console.error('Error deleting ward:', error);
    throw error;
  }
};

/**
 * ตั้งค่าแผนกเริ่มต้น
 * @returns void
 */
export const setupDefaultWards = async (): Promise<void> => {
  try {
    const defaultWards = [
      {
        id: 'ICU',
        wardCode: 'ICU',
        wardName: 'หอผู้ป่วยวิกฤติ',
        wardOrder: 1,
        active: true,
        bedCapacity: 10
      },
      {
        id: 'NICU',
        wardCode: 'NICU',
        wardName: 'หอผู้ป่วยทารกแรกเกิดวิกฤติ',
        wardOrder: 2,
        active: true,
        bedCapacity: 8
      },
      {
        id: 'WARD_A',
        wardCode: 'WARD_A',
        wardName: 'หอผู้ป่วยชาย',
        wardOrder: 3,
        active: true,
        bedCapacity: 30
      },
      {
        id: 'WARD_B',
        wardCode: 'WARD_B',
        wardName: 'หอผู้ป่วยหญิง',
        wardOrder: 4,
        active: true,
        bedCapacity: 30
      },
      {
        id: 'WARD6',
        wardCode: 'Ward6',
        wardName: 'หอผู้ป่วยห้อง 6',
        wardOrder: 5,
        active: true,
        bedCapacity: 25
      }
    ];
    
    const batch = writeBatch(db);
    
    defaultWards.forEach((ward) => {
      const wardRef = doc(db, COLLECTION_WARDS, ward.id);
      batch.set(wardRef, {
        ...ward,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system',
        updatedBy: 'system'
      });
    });
    
    await batch.commit();
    console.log('Default wards setup completed');
  } catch (error) {
    console.error('Error setting up default wards:', error);
    throw error;
  }
}; 