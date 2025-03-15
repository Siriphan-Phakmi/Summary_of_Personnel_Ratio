'use client';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getUTCDateString } from '../../../utils/dateUtils';
import { validateParams } from '../../../utils/functionHelper';
import { handleFirebaseIndexError, safeQuery } from '../../../utils/firebase-helpers';

// Create a cache for storing fetched data
const dataCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

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
        
        const wardDailyRef = collection(db, 'wardDailyRecords');
        const q = query(
            wardDailyRef,
            where('wardId', '==', targetWard),
            orderBy('date', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return null;
        }
        
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        return {
            id: doc.id,
            ...data
        };
    } catch (error) {
        console.error('Error fetching latest record:', error);
        return null;
    }
};

// Modified fetchWardData function with caching and improved error handling
export const fetchWardData = async (date, selectedWard, selectedShift) => {
    try {
        if (!date || !selectedWard || !selectedShift) {
            console.warn('fetchWardData: Missing required parameters', {
                date,
                selectedWard,
                selectedShift
            });
            return null;
        }
        
        // Create a cache key
        const cacheKey = `${date}_${selectedWard}_${selectedShift}`;
        
        // Check if data is in cache and not expired
        const cachedData = dataCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_EXPIRY)) {
            console.log('Returning cached data for:', cacheKey);
            return cachedData.data;
        }
        
        // If not in cache, fetch from Firestore
        const dateObj = new Date(date);
        const dateString = getUTCDateString(dateObj);
        
        console.log(`Fetching data for ${selectedWard} on ${dateString}, shift: ${selectedShift}`);
        
        const wardDailyRef = collection(db, 'wardDailyRecords');
        const q = query(
            wardDailyRef,
            where('wardId', '==', selectedWard),
            where('date', '==', dateString),
        );
        
        try {
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log(`No data found for ${selectedWard} on ${dateString}`);
                return null;
            }
            
            const wardData = querySnapshot.docs[0].data();
            
            if (!wardData.shifts || !wardData.shifts[selectedShift]) {
                console.log(`No shift data found for ${selectedShift}`);
                return null;
            }
            
            // Store in cache
            dataCache.set(cacheKey, {
                data: wardData.shifts[selectedShift],
                timestamp: Date.now()
            });
            
            return wardData.shifts[selectedShift];
        } catch (error) {
            // Check if this is an index error and handle it
            if (handleFirebaseIndexError(error)) {
                return null;
            }
            throw error; // Re-throw if not an index error or if handling failed
        }
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
    // ไม่มีการตรวจสอบข้อมูล 30 วันย้อนหลังแล้ว
    return { 
        canProceed: true, 
        noRecentRecords: false
    };
};

export const checkPast7DaysData = async (ward, date) => {
    try {
        const currentDate = new Date(date);
        const sevenDaysAgo = new Date(currentDate);
        sevenDaysAgo.setDate(currentDate.getDate() - 7);
        
        const formattedCurrentDate = getUTCDateString(currentDate);
        const formattedSevenDaysAgo = getUTCDateString(sevenDaysAgo);
        
        const wardDailyRef = collection(db, 'wardDailyRecords');
        const q = query(
            wardDailyRef,
            where('wardId', '==', ward),
            where('date', '>=', formattedSevenDaysAgo),
            where('date', '<=', formattedCurrentDate)
        );
        
        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                date: data.date,
                // Include other fields as needed
            };
        });
        
        return {
            success: true,
            records
        };
    } catch (error) {
        console.error('Error checking past 7 days data:', error);
        return {
            success: false,
            error: error.message
        };
    }
};