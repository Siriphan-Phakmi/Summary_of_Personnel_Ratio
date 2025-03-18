'use client';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getUTCDateString } from '../../../utils/dateUtils';
import { validateParams } from '../../../utils/functionHelper';
import { handleFirebaseIndexError, safeQuery } from '../../../utils/firebase-helpers';

// Create a cache for storing fetched data
const dataCache = new Map();

// ปรับปรุงเวลาหมดอายุของแคชให้สั้นลง เพื่อให้ข้อมูลอัพเดทบ่อยขึ้น
const DATA_CACHE_EXPIRY = 1 * 60 * 1000; // 1 minute

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
            orderBy('date', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return null;
        }
        
        const latestRecord = querySnapshot.docs[0].data();
        return new Date(latestRecord.date);
    } catch (error) {
        console.error('Error fetching latest record:', error);
        return null;
    }
};

export const fetchWardData = async (date, selectedWard, selectedShift) => {
    console.log('fetchWardData called with:', { date, selectedWard, selectedShift });
    
    try {
        // ถ้าไม่มีพารามิเตอร์ที่จำเป็น ให้ return null ทันที
        if (!date || !selectedWard || !selectedShift) {
            console.warn('fetchWardData: Missing required parameters', {
                date,
                selectedWard,
                selectedShift
            });
            return null;
        }
        
        // แปลงวันที่เป็น string format
        const dateObj = new Date(date);
        const dateString = getUTCDateString(dateObj);
        
        // สร้าง cache key
        const cacheKey = `${dateString}_${selectedWard}_${selectedShift}`;
        
        // ตรวจสอบว่าข้อมูลอยู่ในแคชและยังไม่หมดอายุหรือไม่
        const cachedData = dataCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < DATA_CACHE_EXPIRY)) {
            console.log('Returning cached data for:', cacheKey);
            return cachedData.data;
        }
        
        console.log('Fetching ward data from Firestore:', {
            dateString,
            selectedWard,
            selectedShift
        });
        
        try {
            // สร้าง query
            const q = query(
                collection(db, 'wardDailyRecords'),
                where('date', '==', dateString),
                where('wardId', '==', selectedWard),
                where('shift', '==', selectedShift)
            );
            
            // ดึงข้อมูลตาม query
            const querySnapshot = await getDocs(q);
            
            // ถ้าไม่พบข้อมูล
            if (querySnapshot.empty) {
                console.log(`No data found for ${selectedWard} on ${dateString}, shift: ${selectedShift}`);
                return null;
            }
            
            // ดึงข้อมูลจาก snapshot
            const doc = querySnapshot.docs[0];
            const wardData = doc.data();
            
            // สร้างข้อมูลที่จะ return
            const returnData = {
                id: doc.id,
                patientCensus: wardData.patientCensus || '',
                overallData: wardData.overallData || '',
                newAdmit: wardData.newAdmit || '',
                transferIn: wardData.transferIn || '',
                referIn: wardData.referIn || '',
                transferOut: wardData.transferOut || '',
                referOut: wardData.referOut || '',
                discharge: wardData.discharge || '',
                dead: wardData.dead || '',
                rns: wardData.rns || '',
                pns: wardData.pns || '',
                nas: wardData.nas || '',
                aides: wardData.aides || '',
                studentNurses: wardData.studentNurses || '',
                notes: wardData.notes || '',
                date: wardData.date,
                shift: wardData.shift,
                wardId: wardData.wardId,
                isApproved: wardData.isApproved || false,
                approvedBy: wardData.approvedBy || null,
                approvalDate: wardData.approvalDate || null,
                firstName: wardData.firstName || '',
                lastName: wardData.lastName || '',
                isDraft: wardData.isDraft || false
            };
            
            // เก็บข้อมูลในแคช
            dataCache.set(cacheKey, {
                data: returnData,
                timestamp: Date.now()
            });
            
            return returnData;
        } catch (error) {
            // ตรวจสอบว่าเป็น index error หรือไม่
            if (
                error.code === 'failed-precondition' &&
                error.message && 
                error.message.includes('index')
            ) {
                // ลอง query อีกครั้งโดยไม่ใช้ index
                console.warn('Index error encountered, trying alternative query...');
                try {
                    return await safeFetchWardData(dateString, selectedWard, selectedShift);
                } catch (fallbackError) {
                    console.error('Fallback query also failed:', fallbackError);
                    return null;
                }
            }
            
            // ถ้าไม่ใช่ index error ให้โยน error ต่อ
            throw error;
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
        
        const dateObj = new Date(date);
        const dateString = getUTCDateString(dateObj);
        
        const q = query(
            collection(db, 'wardHistoryLogs'),
            where('wardId', '==', wardId),
            where('date', '==', dateString),
            where('shift', '==', shift),
            orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return [];
        }
        
        const history = [];
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

export const checkPast30DaysRecords = async (ward) => {
    // Logic implementation here
};

export const checkPast7DaysData = async (ward, date) => {
    // Logic implementation here
};

// เพิ่มฟังก์ชัน checkMorningShiftDataExists
export const checkMorningShiftDataExists = async (date, wardId) => {
    try {
        if (!date || !wardId) {
            console.error('checkMorningShiftDataExists: Missing required parameters', { date, wardId });
            return false;
        }

        const dateObj = new Date(date);
        const dateString = getUTCDateString(dateObj);
        
        // ตรวจสอบว่ามีข้อมูลกะเช้าหรือไม่
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', wardId),
            where('date', '==', dateString),
            where('shift', '==', 'เช้า')
        );
        
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error checking morning shift data:', error);
        return false;
    }
};

export const safeFetchWardData = async (dateString, wardId, shift) => {
    try {
        // ดึงข้อมูลทั้งหมดของ ward
        const allRecordsQuery = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', wardId)
        );
        
        const allRecordsSnapshot = await getDocs(allRecordsQuery);
        if (allRecordsSnapshot.empty) {
            return null;
        }
        
        // กรองเฉพาะข้อมูลที่ตรงกับวันที่และกะที่ต้องการ
        let matchingRecord = null;
        allRecordsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.date === dateString && data.shift === shift) {
                matchingRecord = {
                    id: doc.id,
                    ...data
                };
            }
        });
        
        if (!matchingRecord) {
            return null;
        }
        
        // สร้างข้อมูลที่จะ return
        return {
            id: matchingRecord.id,
            patientCensus: matchingRecord.patientCensus || '',
            overallData: matchingRecord.overallData || '',
            newAdmit: matchingRecord.newAdmit || '',
            transferIn: matchingRecord.transferIn || '',
            referIn: matchingRecord.referIn || '',
            transferOut: matchingRecord.transferOut || '',
            referOut: matchingRecord.referOut || '',
            discharge: matchingRecord.discharge || '',
            dead: matchingRecord.dead || '',
            rns: matchingRecord.rns || '',
            pns: matchingRecord.pns || '',
            nas: matchingRecord.nas || '',
            aides: matchingRecord.aides || '',
            studentNurses: matchingRecord.studentNurses || '',
            notes: matchingRecord.notes || '',
            date: matchingRecord.date,
            shift: matchingRecord.shift,
            wardId: matchingRecord.wardId,
            isApproved: matchingRecord.isApproved || false,
            approvedBy: matchingRecord.approvedBy || null,
            approvalDate: matchingRecord.approvalDate || null,
            firstName: matchingRecord.firstName || '',
            lastName: matchingRecord.lastName || '',
            isDraft: matchingRecord.isDraft || false
        };
    } catch (error) {
        console.error('Error in safeFetchWardData:', error);
        return null;
    }
};

// เพิ่มฟังก์ชันคำนวณค่าอัตโนมัติ
export const calculatePatientCensus = (data) => {
  if (!data) return '0';
  
  const newAdmit = parseInt(data.newAdmit || '0');
  const transferIn = parseInt(data.transferIn || '0');
  const referIn = parseInt(data.referIn || '0');
  const transferOut = parseInt(data.transferOut || '0');
  const referOut = parseInt(data.referOut || '0');
  const discharge = parseInt(data.discharge || '0');
  const dead = parseInt(data.dead || '0');
  
  return String((newAdmit + transferIn + referIn) - (transferOut + referOut + discharge + dead));
};

// เพิ่มฟังก์ชันดึงข้อมูล 7 วันล่าสุด
export const fetchLast7DaysData = async (ward) => {
  try {
    if (!ward) return null;
    
    // ดึงข้อมูลทั้งหมดของ ward นี้ โดยไม่มีการใช้ orderBy และ where date >=
    const q = query(
      collection(db, 'wardDailyRecords'),
      where('wardId', '==', ward)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    // คำนวณวันที่ย้อนหลัง 7 วันในรูปแบบ string
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoString = getUTCDateString(sevenDaysAgo);
    
    // กรองและเรียงลำดับข้อมูลด้วย JavaScript แทน
    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date >= sevenDaysAgoString) {
        results.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    // เรียงลำดับตามวันที่จากใหม่ไปเก่า
    results.sort((a, b) => b.date.localeCompare(a.date));
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error fetching last 7 days data:', error);
    return null;
  }
};