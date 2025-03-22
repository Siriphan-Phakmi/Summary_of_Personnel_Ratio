'use client';

import { auth, firestore } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Utility สำหรับบันทึกและจัดการประวัติการเข้าถึงและแก้ไขข้อมูล (Audit Log)
 */
class AuditLogUtil {
    /**
     * บันทึกประวัติการเข้าถึงข้อมูล
     * @param {string} action - การกระทำ (view, create, update, delete, approve, reject)
     * @param {string} resourceType - ประเภทของทรัพยากร (ward, patient, staff, etc.)
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {Object} metadata - ข้อมูลเพิ่มเติม
     * @returns {Promise<string>} - ID ของ log ที่บันทึก
     */
    static async logAccess(action, resourceType, resourceId, metadata = {}) {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.warn('Cannot log access: User not authenticated');
                return null;
            }

            const logData = {
                userId: user.uid,
                userName: user.displayName || user.email || 'Unknown User',
                action,
                resourceType,
                resourceId,
                metadata,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                ipAddress: metadata.ipAddress || 'Unknown', // อาจต้องได้จากส่วนอื่น
            };

            const docRef = await addDoc(collection(firestore, 'auditLogs'), logData);
            console.log(`Audit log created with ID: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error('Error logging access:', error);
            return null;
        }
    }

    /**
     * บันทึกการแก้ไขข้อมูล
     * @param {string} resourceType - ประเภทของทรัพยากร (ward, patient, staff, etc.)
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {Object} changes - การเปลี่ยนแปลงที่เกิดขึ้น (before/after)
     * @returns {Promise<string>} - ID ของ log ที่บันทึก
     */
    static async logDataChange(resourceType, resourceId, changes) {
        return this.logAccess('update', resourceType, resourceId, {
            changes,
            changeType: 'data_modification',
        });
    }

    /**
     * บันทึกการสร้างข้อมูลใหม่
     * @param {string} resourceType - ประเภทของทรัพยากร (ward, patient, staff, etc.)
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {Object} data - ข้อมูลที่สร้าง
     * @returns {Promise<string>} - ID ของ log ที่บันทึก
     */
    static async logDataCreation(resourceType, resourceId, data) {
        return this.logAccess('create', resourceType, resourceId, {
            data,
            changeType: 'data_creation',
        });
    }

    /**
     * บันทึกการลบข้อมูล
     * @param {string} resourceType - ประเภทของทรัพยากร (ward, patient, staff, etc.)
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {Object} metadata - ข้อมูลเพิ่มเติม
     * @returns {Promise<string>} - ID ของ log ที่บันทึก
     */
    static async logDataDeletion(resourceType, resourceId, metadata = {}) {
        return this.logAccess('delete', resourceType, resourceId, {
            ...metadata,
            changeType: 'data_deletion',
        });
    }

    /**
     * บันทึกการอนุมัติข้อมูล
     * @param {string} resourceType - ประเภทของทรัพยากร (ward, patient, staff, etc.)
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {string} approver - ชื่อผู้อนุมัติ
     * @param {string} comments - ความคิดเห็นเพิ่มเติม
     * @returns {Promise<string>} - ID ของ log ที่บันทึก
     */
    static async logApproval(resourceType, resourceId, approver, comments = '') {
        return this.logAccess('approve', resourceType, resourceId, {
            approver,
            comments,
            changeType: 'approval',
        });
    }

    /**
     * บันทึกการปฏิเสธการอนุมัติ
     * @param {string} resourceType - ประเภทของทรัพยากร (ward, patient, staff, etc.)
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {string} rejector - ชื่อผู้ปฏิเสธ
     * @param {string} reason - เหตุผลในการปฏิเสธ
     * @returns {Promise<string>} - ID ของ log ที่บันทึก
     */
    static async logRejection(resourceType, resourceId, rejector, reason) {
        return this.logAccess('reject', resourceType, resourceId, {
            rejector,
            reason,
            changeType: 'rejection',
        });
    }

    /**
     * ดึงประวัติการเข้าถึงล่าสุดของทรัพยากร
     * @param {string} resourceType - ประเภทของทรัพยากร
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {number} limitCount - จำนวนรายการที่ต้องการ
     * @returns {Promise<Array>} - รายการ logs ที่พบ
     */
    static async getLatestLogs(resourceType, resourceId, limitCount = 10) {
        try {
            const q = query(
                collection(firestore, 'auditLogs'),
                where('resourceType', '==', resourceType),
                where('resourceId', '==', resourceId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            const logs = [];
            
            querySnapshot.forEach((doc) => {
                logs.push({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date(),
                });
            });
            
            return logs;
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
    }

    /**
     * ดึงประวัติการเข้าถึงของผู้ใช้
     * @param {string} userId - ID ของผู้ใช้
     * @param {number} limitCount - จำนวนรายการที่ต้องการ
     * @returns {Promise<Array>} - รายการ logs ที่พบ
     */
    static async getUserActivityLogs(userId, limitCount = 20) {
        try {
            const q = query(
                collection(firestore, 'auditLogs'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            const logs = [];
            
            querySnapshot.forEach((doc) => {
                logs.push({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date(),
                });
            });
            
            return logs;
        } catch (error) {
            console.error('Error fetching user activity logs:', error);
            return [];
        }
    }
}

export default AuditLogUtil; 