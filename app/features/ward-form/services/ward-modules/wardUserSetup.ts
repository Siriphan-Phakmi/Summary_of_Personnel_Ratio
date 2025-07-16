'use client';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { getActiveWards } from './wardQueries';
import { Ward } from '@/app/features/ward-form/types/ward';

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
        ? `User ${username} ถูก assign ให้ ${assignedWard.name !== assignedWard.wardCode ? `${assignedWard.name} (${assignedWard.wardCode})` : assignedWard.name}`
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