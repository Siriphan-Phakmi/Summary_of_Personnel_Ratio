import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  limit,
  documentId,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { Ward } from '@/app/core/types/ward';
import { User, UserRole } from '@/app/core/types/user';
import { COLLECTION_WARDS } from './wardFormService';

/**
 * ดึงข้อมูลแผนกทั้งหมด
 * @returns รายการแผนกทั้งหมด
 */
export const getAllWards = async (): Promise<Ward[]> => {
  try {
    const wardQuery = query(
      collection(db, COLLECTION_WARDS),
      orderBy('wardOrder', 'asc')
    );
    
    const querySnapshot = await getDocs(wardQuery);
    const wards: Ward[] = [];
    
    querySnapshot.forEach((doc) => {
      const wardData = doc.data() as Ward;
      wards.push({
        ...wardData,
        id: doc.id
      });
    });
    
    return wards;
  } catch (error) {
    console.error('Error getting all wards:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกทั้งหมดที่เปิดใช้งาน
 * @returns รายการแผนกที่เปิดใช้งาน
 */
export const getActiveWards = async (): Promise<Ward[]> => {
  try {
    const wardQuery = query(
      collection(db, COLLECTION_WARDS),
      where('active', '==', true),
      orderBy('wardOrder', 'asc')
    );
    
    const querySnapshot = await getDocs(wardQuery);
    const wards: Ward[] = [];
    
    querySnapshot.forEach((doc) => {
      const wardData = doc.data() as Ward;
      wards.push({
        ...wardData,
        id: doc.id
      });
    });
    
    return wards;
  } catch (error) {
    console.error('Error getting active wards:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกตามสิทธิ์ของผู้ใช้
 * @param user ข้อมูลผู้ใช้
 * @returns รายการแผนกที่ผู้ใช้มีสิทธิ์เข้าถึง
 */
export const getWardsByUserPermission = async (user: User): Promise<Ward[]> => {
  try {
    // กรณีไม่มีผู้ใช้ หรือผู้ใช้ไม่มีสิทธิ์
    if (!user || !user.uid) {
      return [];
    }
    
    // ถ้าเป็นผู้ดูแลระบบ, developer หรือผู้ดูแลระบบสูงสุด สามารถเข้าถึงทุกแผนกได้
    if (
      user.role === UserRole.ADMIN || 
      user.role === UserRole.SUPER_ADMIN || 
      user.role === UserRole.DEVELOPER
    ) {
      return getAllWards();
    }
    
    // ถ้าเป็นผู้อนุมัติ ดึงเฉพาะแผนกที่มีสิทธิ์อนุมัติ
    if (user.role === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
      // หากมีจำนวนแผนกที่เข้าถึงได้มากกว่า 10 แผนก ใช้วิธีดึงข้อมูลทั้งหมดแล้วกรอง
      if (user.approveWardIds.length > 10) {
        const allWards = await getAllWards();
        return allWards.filter(ward => user.approveWardIds?.includes(ward.id));
      }
      
      // ถ้าแผนกไม่มาก ให้ใช้ 'in' query เพื่อประสิทธิภาพที่ดีกว่า
      const wardQuery = query(
        collection(db, COLLECTION_WARDS),
        where(documentId(), 'in', user.approveWardIds),
        orderBy('wardOrder', 'asc')
      );
      
      const querySnapshot = await getDocs(wardQuery);
      const wards: Ward[] = [];
      
      querySnapshot.forEach((doc) => {
        const wardData = doc.data() as Ward;
        wards.push({
          ...wardData,
          id: doc.id
        });
      });
      
      return wards;
    }
    
    // ถ้าเป็นผู้ใช้ทั่วไป ดึงเฉพาะแผนกที่ได้รับมอบหมาย
    if (user.location && user.location.length > 0) {
      // หากมีจำนวนแผนกที่เข้าถึงได้มากกว่า 10 แผนก ใช้วิธีดึงข้อมูลทั้งหมดแล้วกรอง
      if (user.location.length > 10) {
        const allWards = await getActiveWards();
        return allWards.filter(ward => user.location?.includes(ward.id));
      }
      
      // ถ้าแผนกไม่มาก ให้ใช้ 'in' query เพื่อประสิทธิภาพที่ดีกว่า
      const wardQuery = query(
        collection(db, COLLECTION_WARDS),
        where(documentId(), 'in', user.location),
        where('active', '==', true),
        orderBy('wardOrder', 'asc')
      );
      
      const querySnapshot = await getDocs(wardQuery);
      const wards: Ward[] = [];
      
      querySnapshot.forEach((doc) => {
        const wardData = doc.data() as Ward;
        wards.push({
          ...wardData,
          id: doc.id
        });
      });
      
      return wards;
    }
    
    // กรณีไม่มีแผนกที่ได้รับมอบหมายชัดเจน ให้ส่งคืนลิสต์ว่าง
    return [];
  } catch (error) {
    console.error('Error getting wards by user permission:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกพร้อมสถานะสำหรับผู้พัฒนาระบบ
 * @returns รายการแผนกพร้อมข้อมูลสถานะ
 */
export const getDeveloperWards = async (): Promise<Ward[]> => {
  try {
    const wards = await getAllWards();
    
    // เพิ่มข้อมูลสถิติเพิ่มเติมสำหรับการพัฒนา
    const enhancedWards = await Promise.all(
      wards.map(async (ward) => {
        // ตรวจสอบจำนวนแบบฟอร์มที่บันทึกในแผนกนี้
        const formsRef = collection(db, 'wardForms');
        const formsQuery = query(
          formsRef,
          where('wardId', '==', ward.id),
          limit(1000)
        );
        
        const formsSnapshot = await getDocs(formsQuery);
        
        // นับจำนวนแบบฟอร์มตามสถานะ
        let draftCount = 0;
        let finalCount = 0;
        let approvedCount = 0;
        
        formsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'draft') draftCount++;
          else if (data.status === 'final') finalCount++;
          else if (data.status === 'approved') approvedCount++;
        });
        
        return {
          ...ward,
          stats: {
            totalForms: formsSnapshot.size,
            draftCount,
            finalCount,
            approvedCount
          }
        };
      })
    );
    
    return enhancedWards;
  } catch (error) {
    console.error('Error getting developer wards:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกตาม ID
 * @param wardId รหัสแผนก
 * @returns ข้อมูลแผนก หรือ null ถ้าไม่พบ
 */
export const getWardById = async (wardId: string): Promise<Ward | null> => {
  try {
    const wardDoc = await getDoc(doc(db, COLLECTION_WARDS, wardId));
    
    if (!wardDoc.exists()) {
      return null;
    }
    
    const wardData = wardDoc.data() as Ward;
    
    return {
      ...wardData,
      id: wardDoc.id
    };
  } catch (error) {
    console.error('Error getting ward by ID:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกตามรหัสแผนก (wardId ไม่ใช่ document ID)
 * @param code รหัสแผนก
 * @returns ข้อมูลแผนก หรือ null ถ้าไม่พบ
 */
export const getWardByCode = async (code: string): Promise<Ward | null> => {
  try {
    const wardsRef = collection(db, COLLECTION_WARDS);
    const q = query(
      wardsRef,
      where('wardId', '==', code),
      where('active', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    
    return {
      ...doc.data() as Ward,
      id: doc.id
    };
  } catch (error) {
    console.error('Error getting ward by code:', error);
    throw error;
  }
};

/**
 * เพิ่มแผนกใหม่
 * @param wardData ข้อมูลแผนก
 * @param user ข้อมูลผู้ใช้ที่เพิ่ม
 * @returns ID ของแผนกที่เพิ่มแล้ว
 */
export const addWard = async (
  wardData: Omit<Ward, 'id' | 'createdAt' | 'updatedAt'>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบว่ามีแผนกที่มีรหัสแผนกนี้อยู่แล้วหรือไม่
    const existingWard = await getWardByCode(wardData.wardId);
    
    if (existingWard) {
      throw new Error('รหัสแผนกนี้มีอยู่ในระบบแล้ว');
    }
    
    // เพิ่มแผนกใหม่
    const newWardData = {
      ...wardData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.uid
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_WARDS), newWardData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding ward:', error);
    throw error;
  }
};

/**
 * อัพเดทข้อมูลแผนก
 * @param wardId ID ของแผนก
 * @param wardData ข้อมูลแผนกที่ต้องการอัพเดท
 * @param user ข้อมูลผู้ใช้ที่อัพเดท
 * @returns ID ของแผนกที่อัพเดทแล้ว
 */
export const updateWard = async (
  wardId: string,
  wardData: Partial<Omit<Ward, 'id' | 'createdAt' | 'updatedAt'>>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบว่าแผนกนี้มีอยู่จริงหรือไม่
    const wardRef = doc(db, COLLECTION_WARDS, wardId);
    const snapshot = await getDoc(wardRef);
    
    if (!snapshot.exists()) {
      throw new Error('ไม่พบข้อมูลแผนก');
    }
    
    // ถ้ามีการเปลี่ยนรหัสแผนก ต้องตรวจสอบว่าซ้ำกับที่มีอยู่แล้วหรือไม่
    if (wardData.wardId) {
      const existingWard = await getWardByCode(wardData.wardId);
      
      if (existingWard && existingWard.id !== wardId) {
        throw new Error('รหัสแผนกนี้มีอยู่ในระบบแล้ว');
      }
    }
    
    // อัพเดทข้อมูล
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
 * ปิดการใช้งานแผนก (ไม่ลบออกจากระบบ)
 * @param wardId ID ของแผนก
 * @param user ข้อมูลผู้ใช้ที่ปิดการใช้งาน
 * @returns ID ของแผนกที่ปิดการใช้งานแล้ว
 */
export const deactivateWard = async (
  wardId: string,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบว่าแผนกนี้มีอยู่จริงหรือไม่
    const wardRef = doc(db, COLLECTION_WARDS, wardId);
    const snapshot = await getDoc(wardRef);
    
    if (!snapshot.exists()) {
      throw new Error('ไม่พบข้อมูลแผนก');
    }
    
    // ปิดการใช้งาน
    await updateDoc(wardRef, {
      active: false,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    });
    
    return wardId;
  } catch (error) {
    console.error('Error deactivating ward:', error);
    throw error;
  }
};

/**
 * ปรับลำดับการแสดงผลของแผนก
 * @param wardOrders รายการ ID แผนกและลำดับใหม่ { wardId: string, order: number }[]
 * @param user ข้อมูลผู้ใช้
 * @returns จำนวนแผนกที่อัพเดทสำเร็จ
 */
export const updateWardOrders = async (
  wardOrders: { wardId: string, order: number }[],
  user: User
): Promise<number> => {
  try {
    // สร้าง batch สำหรับอัพเดทหลายรายการพร้อมกัน
    const batch = writeBatch(db);
    let updateCount = 0;
    
    // อัพเดททีละแผนก
    for (const { wardId, order } of wardOrders) {
      const wardRef = doc(db, COLLECTION_WARDS, wardId);
      
      batch.update(wardRef, {
        wardOrder: order,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
      
      updateCount++;
    }
    
    // ทำการบันทึกทั้งหมดพร้อมกัน
    await batch.commit();
    
    return updateCount;
  } catch (error) {
    console.error('Error updating ward orders:', error);
    throw error;
  }
}; 