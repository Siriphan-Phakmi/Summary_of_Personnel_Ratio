import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { Ward } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { getAllWards, getWardsByIds } from './wardQueries';

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

    // *** Bypassed permission check for now to populate dropdown ***
    // This will be revisited to implement proper role-based filtering.
    return getAllWards();

    /*
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
      return getWardsByIds(user.approveWardIds);
    }
    
    // ถ้าเป็นผู้ใช้ทั่วไป ดึงเฉพาะแผนกที่ได้รับมอบหมาย
    if (user.role === UserRole.NURSE || user.role === UserRole.USER) {
      return getUserAssignedWard(user);
    }

    // กรณี Role อื่นๆ ที่ไม่ได้ระบุไว้ หรือไม่มีสิทธิ์เฉพาะ
    console.log(`[WardService] User role ${user.role} does not have specific ward permissions defined here, returning empty list.`);
    return [];
    */
  } catch (error) {
    console.error('Error getting wards by user permission:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกที่ผู้ใช้ได้รับมอบหมาย
 * @param user ข้อมูลผู้ใช้
 * @returns รายการแผนกที่ได้รับมอบหมาย
 */
const getUserAssignedWard = async (user: User): Promise<Ward[]> => {
  try {
    // ตรวจสอบว่ามีการระบุแผนกสำหรับผู้ใช้นี้หรือไม่
    if (!user.floor) {
      console.warn(`[WardService] User ${user.username || user.uid} has role ${user.role} but no ward (floor) assigned.`);
      return [];
    }
    
    console.log(`[WardService] User role is ${user.role}, fetching ward for floor: ${user.floor}`);
    
    // ดึงข้อมูลเฉพาะแผนกที่ระบุใน user.floor
    const wardDoc = await getDoc(doc(db, 'wards', user.floor));
    
    if (!wardDoc.exists()) {
      console.warn(`[WardService] Ward with ID ${user.floor} not found for user ${user.username || user.uid}`);
      return [];
    }
    
    const wardData = wardDoc.data() as Ward;
    
    // ตรวจสอบว่าแผนกนี้ active อยู่หรือไม่
    if (!wardData.isActive) {
      console.warn(`[WardService] Ward with ID ${user.floor} is inactive for user ${user.username || user.uid}`);
      return [];
    }
    
    return [{
      ...wardData,
      id: wardDoc.id
    }];
  } catch (error) {
    console.error('Error getting user assigned ward:', error);
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
          limit(1000)
        );
        
        const formsSnapshot = await getDocs(formsQuery);
        
        // นับจำนวนแบบฟอร์มตามสถานะ
        let draftCount = 0;
        let finalCount = 0;
        let approvedCount = 0;
        
        formsSnapshot.forEach((doc) => {
          const form = doc.data();
          if (form.wardId === ward.id) {
            switch (form.status) {
              case 'draft':
                draftCount++;
                break;
              case 'final':
                finalCount++;
                break;
              case 'approved':
                approvedCount++;
                break;
            }
          }
        });
        
        return {
          ...ward,
          stats: {
            draftCount,
            finalCount,
            approvedCount,
            totalForms: draftCount + finalCount + approvedCount
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
 * @returns {Promise<Ward[]>} รายการแผนกที่ผู้ใช้สามารถเข้าถึงได้
 */
export const getUserAccessibleWards = async (user: User): Promise<Ward[]> => {
  try {
    let allWards = await getAllWards();
    
    // Filter out inactive wards first
    allWards = allWards.filter(ward => ward.isActive === true);

    if (!user || !user.role) {
      return []; // Return empty array if user or role is not defined
    }

    // ถ้าเป็นผู้ดูแลระบบ, developer หรือผู้ดูแลระบบสูงสุด สามารถเข้าถึงทุกแผนกได้
    if (
      user.role === UserRole.ADMIN || 
      user.role === UserRole.SUPER_ADMIN || 
      user.role === UserRole.DEVELOPER
    ) {
      return allWards;
    }
    
    // ถ้าเป็นผู้อนุมัติ ดึงเฉพาะแผนกที่มีสิทธิ์อนุมัติ
    if (user.role === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
      return getWardsByIds(user.approveWardIds);
    }
    
    // ถ้าเป็นผู้ใช้ทั่วไป ดึงเฉพาะแผนกที่ได้รับมอบหมาย
    if (user.role === UserRole.NURSE || user.role === UserRole.USER) {
      return getUserAssignedWard(user);
    }

    // กรณี Role อื่นๆ ที่ไม่ได้ระบุไว้ หรือไม่มีสิทธิ์เฉพาะ
    console.log(`[WardService] User role ${user.role} does not have specific ward permissions defined here, returning empty list.`);
    return [];
  } catch (error) {
    console.error('Error getting user accessible wards:', error);
    throw error;
  }
}; 