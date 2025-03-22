'use client';

import { firestore } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import AuditLogUtil from './AuditLogUtil';

/**
 * Utility สำหรับจัดการเวอร์ชันของข้อมูลและระบบกู้คืนข้อมูล
 */
class DataVersionUtil {
    /**
     * บันทึกเวอร์ชันของข้อมูล
     * @param {string} resourceType - ประเภทของทรัพยากร (ward, patient, staff, etc.)
     * @param {string} resourceId - ID ของทรัพยากร
     * @param {Object} data - ข้อมูลที่ต้องการบันทึก
     * @param {string} reason - เหตุผลในการแก้ไข
     * @param {string} userId - ID ของผู้แก้ไข
     * @returns {Promise<string>} - ID ของเวอร์ชันที่บันทึก
     */
    static async saveVersion(resourceType, resourceId, data, reason, userId) {
        try {
            const versionData = {
                resourceType,
                resourceId,
                data,
                reason,
                userId,
                timestamp: serverTimestamp(),
                versionNumber: await this.getNextVersionNumber(resourceType, resourceId),
            };

            const docRef = await addDoc(collection(firestore, 'dataVersions'), versionData);
            console.log(`Data version created with ID: ${docRef.id}`);
            
            // บันทึก audit log
            await AuditLogUtil.logDataChange(resourceType, resourceId, {
                reason,
                versionId: docRef.id,
                versionNumber: versionData.versionNumber,
            });
            
            return docRef.id;
        } catch (error) {
            console.error('Error saving data version:', error);
            return null;
        }
    }

    /**
     * หาเลขเวอร์ชันถัดไปสำหรับทรัพยากร
     * @param {string} resourceType - ประเภทของทรัพยากร
     * @param {string} resourceId - ID ของทรัพยากร
     * @returns {Promise<number>} - เลขเวอร์ชันถัดไป
     */
    static async getNextVersionNumber(resourceType, resourceId) {
        try {
            const q = query(
                collection(firestore, 'dataVersions'),
                where('resourceType', '==', resourceType),
                where('resourceId', '==', resourceId),
                orderBy('versionNumber', 'desc')
            );

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                return 1; // เริ่มต้นที่เวอร์ชัน 1
            }

            const latestVersion = querySnapshot.docs[0].data().versionNumber;
            return latestVersion + 1;
        } catch (error) {
            console.error('Error getting next version number:', error);
            return 1; // กรณีเกิดข้อผิดพลาด เริ่มต้นที่เวอร์ชัน 1
        }
    }

    /**
     * ดึงประวัติเวอร์ชันทั้งหมดของทรัพยากร
     * @param {string} resourceType - ประเภทของทรัพยากร
     * @param {string} resourceId - ID ของทรัพยากร
     * @returns {Promise<Array>} - รายการเวอร์ชันทั้งหมด
     */
    static async getVersionHistory(resourceType, resourceId) {
        try {
            const q = query(
                collection(firestore, 'dataVersions'),
                where('resourceType', '==', resourceType),
                where('resourceId', '==', resourceId),
                orderBy('versionNumber', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const versions = [];
            
            querySnapshot.forEach((doc) => {
                versions.push({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date(),
                });
            });
            
            return versions;
        } catch (error) {
            console.error('Error fetching version history:', error);
            return [];
        }
    }

    /**
     * ดึงข้อมูลเวอร์ชันเฉพาะ
     * @param {string} versionId - ID ของเวอร์ชัน
     * @returns {Promise<Object|null>} - ข้อมูลเวอร์ชัน
     */
    static async getSpecificVersion(versionId) {
        try {
            const docRef = doc(firestore, 'dataVersions', versionId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                console.log(`Version with ID ${versionId} not found`);
                return null;
            }

            return {
                id: docSnap.id,
                ...docSnap.data(),
                timestamp: docSnap.data().timestamp?.toDate() || new Date(),
            };
        } catch (error) {
            console.error('Error fetching specific version:', error);
            return null;
        }
    }

    /**
     * เปรียบเทียบความแตกต่างระหว่างเวอร์ชัน
     * @param {Object} version1 - เวอร์ชันแรก
     * @param {Object} version2 - เวอร์ชันที่สอง
     * @returns {Object} - ความแตกต่างระหว่างสองเวอร์ชัน
     */
    static compareVersions(version1, version2) {
        const differences = {};

        // ถ้าไม่มีข้อมูลเวอร์ชัน
        if (!version1 || !version2) {
            return { error: 'One or both versions are missing' };
        }

        const data1 = version1.data;
        const data2 = version2.data;

        // ตรวจสอบความแตกต่างในแต่ละฟิลด์
        const allKeys = [...new Set([...Object.keys(data1), ...Object.keys(data2)])];
        
        allKeys.forEach(key => {
            // ถ้าค่าไม่เท่ากัน
            if (JSON.stringify(data1[key]) !== JSON.stringify(data2[key])) {
                differences[key] = {
                    oldValue: data1[key],
                    newValue: data2[key],
                };
            }
        });

        return {
            versionInfo: {
                from: {
                    versionNumber: version1.versionNumber,
                    timestamp: version1.timestamp,
                    userId: version1.userId,
                    reason: version1.reason,
                },
                to: {
                    versionNumber: version2.versionNumber,
                    timestamp: version2.timestamp,
                    userId: version2.userId,
                    reason: version2.reason,
                },
            },
            differences
        };
    }

    /**
     * กู้คืนข้อมูลจากเวอร์ชันเก่า
     * @param {string} versionId - ID ของเวอร์ชันที่ต้องการกู้คืน
     * @param {string} reason - เหตุผลในการกู้คืน
     * @param {string} userId - ID ของผู้กู้คืน
     * @returns {Promise<Object>} - ข้อมูลการกู้คืน
     */
    static async restoreVersion(versionId, reason, userId) {
        try {
            // ดึงข้อมูลเวอร์ชันที่ต้องการกู้คืน
            const versionToRestore = await this.getSpecificVersion(versionId);
            
            if (!versionToRestore) {
                return {
                    success: false,
                    error: 'Version not found',
                };
            }

            // บันทึกเวอร์ชันเป็นเวอร์ชันใหม่
            const { resourceType, resourceId, data } = versionToRestore;
            const fullReason = `Restored from version ${versionToRestore.versionNumber}: ${reason}`;
            
            const newVersionId = await this.saveVersion(
                resourceType,
                resourceId,
                data,
                fullReason,
                userId
            );

            // บันทึก audit log
            await AuditLogUtil.logAccess('restore', resourceType, resourceId, {
                restoredFromVersion: versionToRestore.versionNumber,
                versionId: newVersionId,
                reason,
                changeType: 'data_restoration',
            });

            return {
                success: true,
                originalVersion: versionToRestore,
                newVersionId,
            };
        } catch (error) {
            console.error('Error restoring data version:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

export default DataVersionUtil; 