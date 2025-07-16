'use client';

import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { setupDefaultWards } from './wardMutations';
import { getActiveWards } from './wardQueries';
import { Ward } from '@/app/features/ward-form/types/ward';

/**
 * แก้ไขปัญหา user Ward6 ที่ไม่มี ward assignment
 * 1. ตรวจสอบว่ามี Ward6 ในระบบแล้วหรือไม่
 * 2. ถ้าไม่มี จะสร้าง Ward6 ใหม่
 * 3. อัพเดท user Ward6 ให้มี assignedWardId = 'WARD6'
 */
export const fixWard6UserAssignment = async (): Promise<{
  success: boolean;
  message: string;
  ward?: Ward;
}> => {
  try {
    console.log('[WardUserSetup] Starting Ward6 user assignment fix...');

    // 1. ตรวจสอบว่ามี Ward6 ในระบบแล้วหรือไม่
    const existingWards = await getActiveWards();
    let ward6 = existingWards.find(w => 
      w.id === 'WARD6' || 
      w.wardCode.toLowerCase() === 'ward6' ||
      w.name.includes('6')
    );

    // 2. ถ้าไม่มี Ward6 ให้สร้างใหม่
    if (!ward6) {
      console.log('[WardUserSetup] Ward6 not found, creating new ward...');
      
      const newWard6Data = {
        id: 'WARD6',
        name: 'หอผู้ป่วยห้อง 6',
        wardCode: 'Ward6',
        wardLevel: 1,
        wardOrder: 6,
        isActive: true,
        totalBeds: 25,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system',
        updatedBy: 'system'
      };

      const ward6Ref = doc(db, 'wards', 'WARD6');
      await setDoc(ward6Ref, newWard6Data);
      
      ward6 = {
        id: 'WARD6',
        name: 'หอผู้ป่วยห้อง 6',
        wardCode: 'Ward6',
        wardLevel: 1,
        wardOrder: 6,
        isActive: true,
        totalBeds: 25
      };
      
      console.log('[WardUserSetup] Ward6 created successfully');
    } else {
      console.log('[WardUserSetup] Ward6 already exists:', ward6);
    }

    // 3. อัพเดท user Ward6 ให้มี assignedWardId
    const userRef = doc(db, 'users', 'Ward6');
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // ตรวจสอบว่า user มี assignedWardId แล้วหรือไม่
      if (!userData.assignedWardId) {
        await updateDoc(userRef, {
          assignedWardId: 'WARD6',
          updatedAt: serverTimestamp(),
          updatedBy: 'system'
        });
        
        console.log('[WardUserSetup] User Ward6 assignedWardId updated to WARD6');
        return {
          success: true,
          message: 'แก้ไขปัญหา Ward6 user assignment สำเร็จ - สร้าง Ward6 และกำหนด assignedWardId',
          ward: ward6
        };
      } else {
        console.log('[WardUserSetup] User Ward6 already has assignedWardId:', userData.assignedWardId);
        return {
          success: true,
          message: `User Ward6 มี assignedWardId แล้ว: ${userData.assignedWardId}`,
          ward: ward6
        };
      }
    } else {
      // สร้าง user Ward6 ใหม่ถ้าไม่มี
      const newUserData = {
        uid: 'Ward6',
        username: 'Ward6',
        role: 'nurse',
        firstName: 'Ward',
        lastName: '6',
        assignedWardId: 'WARD6',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system',
        updatedBy: 'system'
      };
      
      await setDoc(userRef, newUserData);
      
      console.log('[WardUserSetup] User Ward6 created with assignedWardId: WARD6');
      return {
        success: true,
        message: 'สร้าง User Ward6 ใหม่และกำหนด assignedWardId สำเร็จ',
        ward: ward6
      };
    }

  } catch (error) {
    console.error('[WardUserSetup] Error fixing Ward6 user assignment:', error);
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการแก้ไข Ward6 assignment: ${error}`
    };
  }
};

/**
 * รีเซ็ต default wards ทั้งหมด (รวม Ward6)
 */
export const resetAllDefaultWards = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('[WardUserSetup] Resetting all default wards...');
    
    await setupDefaultWards();
    
    console.log('[WardUserSetup] Default wards reset completed');
    return {
      success: true,
      message: 'รีเซ็ต default wards ทั้งหมดสำเร็จ (รวม Ward6)'
    };
  } catch (error) {
    console.error('[WardUserSetup] Error resetting default wards:', error);
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการรีเซ็ต wards: ${error}`
    };
  }
};

/**
 * ตรวจสอบสถานะ ward assignment ของ user
 */
export const checkUserWardAssignment = async (username: string): Promise<{
  hasAssignment: boolean;
  assignedWardId?: string;
  wardExists?: boolean;
  wardData?: Ward | null;
  message: string;
}> => {
  try {
    // ตรวจสอบ user data
    const userRef = doc(db, 'users', username);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return {
        hasAssignment: false,
        message: `User ${username} ไม่พบในระบบ`
      };
    }
    
    const userData = userDoc.data();
    const assignedWardId = userData.assignedWardId;
    
    if (!assignedWardId) {
      return {
        hasAssignment: false,
        message: `User ${username} ไม่มี assignedWardId`
      };
    }
    
    // ตรวจสอบว่า ward ที่ assign ไว้มีอยู่จริงหรือไม่
    const allWards = await getActiveWards();
    const assignedWard = allWards.find(w => w.id === assignedWardId);
    
    return {
      hasAssignment: true,
      assignedWardId,
      wardExists: !!assignedWard,
      wardData: assignedWard || null,
      message: assignedWard 
        ? `User ${username} ถูก assign ให้ ${assignedWard.name} (${assignedWard.wardCode})`
        : `User ${username} ถูก assign ให้ Ward ID: ${assignedWardId} แต่ ward นี้ไม่พบในระบบ`
    };
    
  } catch (error) {
    console.error('[WardUserSetup] Error checking user ward assignment:', error);
    return {
      hasAssignment: false,
      message: `เกิดข้อผิดพลาดในการตรวจสอบ: ${error}`
    };
  }
};