import { doc, getDoc, collection, getDocs, query, limit, where, getFirestore, documentId, orderBy } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { Ward } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { getAllWards, getWardsByIds, findWardBySimilarCode } from './wardQueries';

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
      user.role === UserRole.DEVELOPER
    ) {
      return getAllWards();
    }
    
    // ถ้าเป็นผู้อนุมัติ ดึงเฉพาะแผนกที่มีสิทธิ์อนุมัติ
    if (user.role === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
      return getWardsByIds(user.approveWardIds);
    }
    
    // ถ้าเป็นผู้ใช้ทั่วไป ดึงเฉพาะแผนกที่ได้รับมอบหมาย
    if (user.role === UserRole.NURSE) {
      return getUserAssignedWard(user);
    }

    // กรณี Role อื่นๆ ที่ไม่ได้ระบุไว้ หรือไม่มีสิทธิ์เฉพาะ
    console.log(`[WardService] User role ${user.role} does not have specific ward permissions defined here, returning empty list.`);
    return [];
  } catch (error) {
    console.error('Error getting wards by user permission:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกที่ผู้ใช้ได้รับมอบหมาย (ปรับปรุงใหม่)
 * ค้นหาแผนกจาก assignedWardId หรือ ward/floor โดยใช้การจับคู่แบบยืดหยุ่น
 * @param user ข้อมูลผู้ใช้
 * @returns รายการแผนกที่ได้รับมอบหมาย (ปกติจะมีแค่ 1)
 */
const getUserAssignedWard = async (user: User): Promise<Ward[]> => {
  try {
    const { assignedWardId, ward: userWard, username } = user;

    // 1. Prioritize assignedWardId (which can be an array or a string)
    if (assignedWardId) {
      if (Array.isArray(assignedWardId) && assignedWardId.length > 0) {
        console.log(`[WardPermissions] User '${username}' has an array of assignedWardIds. Fetching wards by IDs:`, assignedWardId);
        // If it's an array of IDs, use the dedicated function to fetch them.
        return await getWardsByIds(assignedWardId);
      }
      
      if (typeof assignedWardId === 'string' && assignedWardId.trim()) {
        console.log(`[WardPermissions] User '${username}' has a string assignedWardId. Finding by similar code: "${assignedWardId}"`);
        // If it's a string, find the single ward.
        const foundWard = await findWardBySimilarCode(assignedWardId);
        return foundWard ? [foundWard] : [];
      }
    }

    // 2. Fallback to the 'ward' field if assignedWardId is not present or is in an invalid format
    if (typeof userWard === 'string' && userWard.trim()) {
      console.log(`[WardPermissions] Falling back to 'ward' field for user '${username}'. Finding by similar code: "${userWard}"`);
      const foundWard = await findWardBySimilarCode(userWard);
      return foundWard ? [foundWard] : [];
    }
    
    // 3. If no valid assignment is found in either field
    console.warn(`[WardPermissions] Could not determine a valid ward for user '${username}' from 'assignedWardId' or 'ward' fields. Returning empty array.`);
    return [];

  } catch (error) {
    console.error(`[WardPermissions] Error getting assigned ward for user ${user.username}:`, error);
    // In case of any error, return an empty array to prevent the app from crashing.
    return [];
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
      user.role === UserRole.DEVELOPER
    ) {
      return allWards;
    }
    
    // ถ้าเป็นผู้อนุมัติ ดึงเฉพาะแผนกที่มีสิทธิ์อนุมัติ
    if (user.role === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
      return getWardsByIds(user.approveWardIds);
    }
    
    // ถ้าเป็นผู้ใช้ทั่วไป ดึงเฉพาะแผนกที่ได้รับมอบหมาย
    if (user.role === UserRole.NURSE) {
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