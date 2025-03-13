'use client';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getUTCDateString } from '../../../utils/dateUtils';
import { validateParams } from '../../../utils/functionHelper';

export const fetchDatesWithData = async (selectedWard) => {
    try {
        if (!selectedWard) {
            console.warn('fetchDatesWithData: selectedWard is undefined or null');
            return [];
        }
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', selectedWard)
        );
        
        const querySnapshot = await getDocs(q);
        const dates = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.date) {
                const dateObj = new Date(data.date);
                if (!isNaN(dateObj.getTime())) {
                    dates.push(dateObj);
                }
            }
        });
        
        return dates;
    } catch (error) {
        console.error('Error fetching dates with data:', error);
        return [];
    }
};

export const fetchPreviousShiftData = async (date, targetWard, shift = null) => {
    try {
        if (!targetWard) {
            console.warn('fetchPreviousShiftData: targetWard is undefined or null');
            return null;
        }
        
        const dateObj = new Date(date);
        const dateString = getUTCDateString(dateObj);
        
        // ถ้าไม่ระบุกะ ดึงข้อมูลทุกกะของวันนั้น
        let q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', targetWard),
            where('date', '==', dateString)
        );
        
        if (shift === 'ดึก') {
            // ถ้าเป็นกะดึก ให้ดึงข้อมูลกะเช้าของวันเดียวกัน
            q = query(
                collection(db, 'wardDailyRecords'),
                where('wardId', '==', targetWard),
                where('date', '==', dateString),
                where('shift', '==', 'เช้า')
            );
        } else if (shift === 'เช้า') {
            // ถ้าเป็นกะเช้า ให้ดึงข้อมูลกะดึกของวันก่อนหน้า
            const yesterday = new Date(dateObj);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = getUTCDateString(yesterday);
            
            q = query(
                collection(db, 'wardDailyRecords'),
                where('wardId', '==', targetWard),
                where('date', '==', yesterdayString),
                where('shift', '==', 'ดึก')
            );
        }
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return null;
        }
        
        if (shift) {
            // ถ้าระบุกะ ดึงข้อมูลเฉพาะกะที่ต้องการ
            const doc = querySnapshot.docs[0];
            if (doc) {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            }
            return null;
        }
        
        // ถ้าไม่ระบุกะ รวบรวมข้อมูลทุกกะ
        const shifts = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            shifts.push({
                id: doc.id,
                ...data
            });
        });
        
        // เรียงลำดับตามกะ (เช้า, ดึก)
        shifts.sort((a, b) => {
            const order = { 'เช้า': 1, 'ดึก': 2 };
            return order[a.shift] - order[b.shift];
        });
        
        return shifts.length > 0 ? shifts : null;
    } catch (error) {
        console.error('Error fetching previous shift data:', error);
        return null;
    }
};

export const fetchApprovalData = async (date, targetWard, shift = null) => {
    try {
        if (!targetWard) {
            console.warn('fetchApprovalData: targetWard is undefined or null');
            return null;
        }
        
        const dateString = getUTCDateString(new Date(date));
        
        let q;
        if (shift) {
            // ถ้าระบุกะ จะดึงข้อมูลเฉพาะกะนั้น
            q = query(
                collection(db, 'wardDailyRecords'),
                where('wardId', '==', targetWard),
                where('date', '==', dateString),
                where('shift', '==', shift)
            );
        } else {
            // ถ้าไม่ระบุกะ จะดึงข้อมูลทั้งหมดของวันนั้น
            q = query(
                collection(db, 'wardDailyRecords'),
                where('wardId', '==', targetWard),
                where('date', '==', dateString)
            );
        }
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return null; // ไม่พบข้อมูล
        }
        
        // ถ้ามีการระบุกะ จะดึงข้อมูลเฉพาะกะนั้น
        if (shift) {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const data = doc.data();
                
                return {
                    id: doc.id,
                    recorded: true,
                    approved: data.isApproved || false,
                    approvedBy: data.approvedBy,
                    approvedAt: data.approvedAt,
                    isDraft: data.isDraft || false
                };
            }
            return null;
        }
        
        // ถ้าไม่ระบุกะ จะรวบรวมข้อมูลทุกกะ
        const shiftData = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            shiftData[data.shift] = {
                id: doc.id,
                recorded: true,
                approved: data.isApproved || false,
                approvedBy: data.approvedBy,
                approvedAt: data.approvedAt,
                isDraft: data.isDraft || false
            };
        });
        
        return shiftData;
    } catch (error) {
        console.error('Error fetching approval data:', error);
        return null;
    }
};

export const checkApprovalStatus = async (date, targetWard, shift = null) => {
    try {
        const approvalData = await fetchApprovalData(date, targetWard, shift);
        
        if (!approvalData) {
            return { status: 'not_recorded', message: 'ยังไม่มีการบันทึกข้อมูล' };
        }
        
        // ถ้าระบุกะ
        if (shift) {
            if (approvalData.isDraft) {
                return { status: 'draft', message: 'อยู่ในสถานะฉบับร่าง' };
            }
            
            if (approvalData.approved) {
                return { 
                    status: 'approved', 
                    message: 'ได้รับการอนุมัติแล้ว',
                    approvedBy: approvalData.approvedBy,
                    approvedAt: approvalData.approvedAt
                };
            }
            
            return { status: 'pending_approval', message: 'รอการอนุมัติ' };
        }
        
        // ถ้าไม่ระบุกะ ตรวจสอบทุกกะ
        const allShifts = ['เช้า', 'ดึก'];
        const shiftStatuses = {};
        
        allShifts.forEach(s => {
            if (approvalData[s]) {
                if (approvalData[s].isDraft) {
                    shiftStatuses[s] = { status: 'draft', message: 'อยู่ในสถานะฉบับร่าง' };
                } else if (approvalData[s].approved) {
                    shiftStatuses[s] = { 
                        status: 'approved', 
                        message: 'ได้รับการอนุมัติแล้ว',
                        approvedBy: approvalData[s].approvedBy,
                        approvedAt: approvalData[s].approvedAt
                    };
                } else {
                    shiftStatuses[s] = { status: 'pending_approval', message: 'รอการอนุมัติ' };
                }
            } else {
                shiftStatuses[s] = { status: 'not_recorded', message: 'ยังไม่มีการบันทึกข้อมูล' };
            }
        });
        
        return shiftStatuses;
    } catch (error) {
        console.error('Error checking approval status:', error);
        return { status: 'error', message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' };
    }
};

export const fetchLatestRecord = async (targetWard) => {
    try {
        if (!targetWard) {
            console.warn('fetchLatestRecord: targetWard is undefined or null');
            return null;
        }
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', targetWard),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const latestDoc = querySnapshot.docs[0];
            const data = latestDoc.data();
            
            if (data.date) {
                return new Date(data.date);
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching latest record:', error);
        return null;
    }
};

export const fetchWardData = async (date, selectedWard, selectedShift) => {
    // ตรวจสอบอย่างเข้มงวด
    if (!date) {
        console.error('fetchWardData: date is required but got:', date);
        return null;
    }
    
    if (!selectedWard || selectedWard.trim() === '') {
        console.error('fetchWardData: selectedWard is required but got:', selectedWard);
        return null;
    }
    
    if (!selectedShift || selectedShift.trim() === '') {
        console.error('fetchWardData: selectedShift is required but got:', selectedShift);
        return null;
    }
    
    try {
        const dateString = getUTCDateString(new Date(date));
        
        console.log('Fetching ward data with query params:', {
            wardId: selectedWard,
            date: dateString,
            shift: selectedShift
        });
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', selectedWard),
            where('date', '==', dateString),
            where('shift', '==', selectedShift)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            
            return {
                id: doc.id,
                ...data
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching ward data:', error);
        return null;
    }
};

// เพิ่มฟังก์ชันดึงข้อมูลประวัติ
export const fetchWardHistory = async (wardId, date, shift) => {
    try {
        if (!wardId || !date || !shift) {
            console.error('fetchWardHistory: Missing required parameters', { wardId, date, shift });
            return [];
        }
        
        const dateString = getUTCDateString(new Date(date));
        
        // ค้นหาข้อมูลทั้งหมดที่ตรงกับ ward, วันที่, และกะที่ระบุ
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', wardId),
            where('date', '==', dateString),
            where('shift', '==', shift),
            orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const history = [];
        
        if (querySnapshot.empty) {
            return [];
        }
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            history.push({
                id: doc.id,
                ...data
            });
        });
        
        return history;
    } catch (error) {
        console.error('Error fetching ward history:', error);
        return [];
    }
};

// เพิ่มฟังก์ชันตรวจสอบข้อมูลย้อนหลัง 30 วัน
export const checkPast30DaysRecords = async (ward) => {
    try {
        if (!ward) {
            console.warn('checkPast30DaysRecords: ward is undefined or null');
            return { canProceed: true };
        }
        
        // คำนวณวันที่ 30 วันย้อนหลัง
        const today = new Date();
        const past30Days = new Date();
        past30Days.setDate(today.getDate() - 30);
        
        // แปลงเป็น string format
        const todayString = getUTCDateString(today);
        const past30DaysString = getUTCDateString(past30Days);
        
        console.log(`Checking records between ${past30DaysString} and ${todayString} for ward ${ward}`);
        
        // ตรวจสอบว่ามีการบันทึกข้อมูลในช่วง 30 วันหรือไม่
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', ward),
            where('date', '>=', past30DaysString),
            where('date', '<=', todayString)
        );
        
        const querySnapshot = await getDocs(q);
        
        // ถ้าไม่มีข้อมูลใน 30 วันย้อนหลัง สามารถเริ่มบันทึกใหม่ได้
        if (querySnapshot.empty) {
            return { 
                canProceed: true, 
                noRecentRecords: true,
                message: 'ไม่พบข้อมูลการบันทึกในช่วง 30 วันที่ผ่านมา สามารถเริ่มบันทึกใหม่ได้'
            };
        }
        
        // มีข้อมูลบางส่วน ต้องตรวจสอบความต่อเนื่อง
        const dates = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.date) {
                dates.push(data.date);
            }
        });
        
        // เรียงลำดับวันที่
        dates.sort();
        const latestRecordDate = dates[dates.length - 1];
        
        // คำนวณวันที่ล่าสุดที่ควรมีการบันทึก
        const latestDate = new Date(latestRecordDate);
        const daysSinceLastRecord = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24));
        
        // ถ้าไม่มีการบันทึกเกิน 30 วัน สามารถเริ่มบันทึกใหม่ได้
        if (daysSinceLastRecord > 30) {
            return { 
                canProceed: true, 
                noRecentRecords: true,
                message: `ไม่พบข้อมูลการบันทึกในช่วง ${daysSinceLastRecord} วันที่ผ่านมา สามารถเริ่มบันทึกใหม่ได้`
            };
        }
        
        return { 
            canProceed: true, 
            noRecentRecords: false,
            latestRecordDate: latestRecordDate
        };
    } catch (error) {
        console.error('Error checking past 30 days records:', error);
        return { 
            canProceed: true,
            error: error.message
        };
    }
}; 