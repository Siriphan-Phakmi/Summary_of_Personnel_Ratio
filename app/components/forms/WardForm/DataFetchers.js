'use client';

import { getUserDataFromCollection, getWardDataByDate, checkLast7DaysData } from '../../../lib/dataAccess';
import { getSubcollection, getDocumentById } from '../../../lib/firebase';
import { format } from 'date-fns';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';

/**
 * ฟังก์ชันสำหรับตรวจสอบการอนุมัติ
 * @param {string} date วันที่ตรวจสอบ
 * @param {string} shift กะงานที่ตรวจสอบ
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<Object>} สถานะการอนุมัติ
 */
export const checkApprovalStatus = async (date, shift, wardId) => {
  try {
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    // ตรวจสอบข้อมูลในฐานข้อมูล
    const wardData = await getWardDataByDate(formattedDate, shift, wardId);
    
    if (!wardData) {
      return { status: 'not_submitted', message: 'ยังไม่ได้บันทึกข้อมูล' };
    }
    
    if (wardData.approvalStatus === 'approved') {
      return { 
        status: 'approved', 
        message: 'ได้รับการอนุมัติแล้ว', 
        timestamp: wardData.approvalTimestamp,
        approvedBy: wardData.approvedBy 
      };
    }
    
    if (wardData.approvalStatus === 'rejected') {
      return { 
        status: 'rejected', 
        message: 'ถูกปฏิเสธการอนุมัติ', 
        timestamp: wardData.approvalTimestamp,
        rejectedBy: wardData.rejectedBy,
        rejectionReason: wardData.rejectionReason 
      };
    }
    
    return { status: 'pending', message: 'รอการอนุมัติ' };
  } catch (error) {
    console.error('Error checking approval status:', error);
    return { status: 'error', message: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
  }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลวอร์ด
 * @param {string} date วันที่ต้องการดึงข้อมูล
 * @param {string} wardId รหัสวอร์ด
 * @param {string} shift กะงาน
 * @returns {Promise<Object|null>} ข้อมูลวอร์ดหรือ null ถ้าไม่พบ
 */
export const fetchWardData = async (date, wardId, shift) => {
    try {
        console.log('Fetching ward data:', { date, wardId, shift });
        const formattedDate = format(new Date(date), 'yyyy-MM-dd');
        const docId = `${formattedDate}_${wardId}_${shift}`;
        
        // ลองดึงข้อมูลจาก wardDataFinal ก่อน
        const docRef = doc(db, 'wardDataFinal', docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log('Found data in wardDataFinal');
            return docSnap.data();
        }
        
        // ถ้าไม่มีข้อมูลใน wardDataFinal ให้ลองดึงข้อมูลร่าง
        const draftsRef = collection(db, 'wardDataDrafts');
        const draftsQuery = query(
            draftsRef,
            where('date', '==', formattedDate),
            where('wardId', '==', wardId),
            where('shift', '==', shift)
        );
        
        const draftsSnap = await getDocs(draftsQuery);
        
        if (!draftsSnap.empty) {
            console.log('Found data in wardDataDrafts');
            // เรียงลำดับตาม timestamp เพื่อเอาร่างล่าสุด
            const drafts = [];
            draftsSnap.forEach(doc => {
                drafts.push({ id: doc.id, ...doc.data() });
            });
            
            drafts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return drafts[0];
        }
        
        console.log('No data found for this date/shift');
        return null;
    } catch (error) {
        console.error('Error fetching ward data:', error);
        throw error;
    }
};

/**
 * ฟังก์ชันตรวจสอบว่ามีข้อมูลกะเช้าของวันที่กำหนดหรือไม่ และได้รับการอนุมัติแล้ว
 * @param {string} date วันที่ที่ต้องการตรวจสอบ
 * @param {string} wardId รหัส ward
 * @returns {Promise<boolean>} true ถ้ามีข้อมูลกะเช้าที่ถูกอนุมัติแล้ว, false ถ้าไม่มีหรือยังไม่ถูกอนุมัติ
 */
export const checkMorningShiftDataExists = async (date, wardId) => {
  try {
    const formattedDate = date instanceof Date ? format(date, 'yyyy-MM-dd') : date;
    
    // ตรวจสอบกะเช้าในรูปแบบต่างๆ
    const formats = ['เช้า', 'Morning (07:00-19:00)', '07:00-19:00'];
    
    // ตรวจสอบทุกรูปแบบ
    for (const shiftFormat of formats) {
      console.log(`ตรวจสอบข้อมูลกะเช้ารูปแบบ: ${shiftFormat}`);
      const data = await getWardDataByDate(formattedDate, shiftFormat, wardId);
      
      // ถ้าพบข้อมูลและเป็นข้อมูลฉบับสมบูรณ์ (final) ไม่ใช่ฉบับร่าง
      if (data && data.status === 'final') {
        console.log(`พบข้อมูลกะเช้ารูปแบบ: ${shiftFormat} สถานะ: ${data.status}`);
        
        // ตรวจสอบว่ามีค่า approvedBy หรือไม่
        if (data.approvedBy) {
          console.log(`ข้อมูลกะเช้ารูปแบบ: ${shiftFormat} ได้รับการอนุมัติแล้วโดย: ${data.approvedBy}`);
          return true;
        } else {
          console.log(`ข้อมูลกะเช้ารูปแบบ: ${shiftFormat} ยังไม่ได้รับการอนุมัติ`);
        }
      }
    }
    
    console.log('ไม่พบข้อมูลกะเช้าที่สมบูรณ์และได้รับการอนุมัติ');
    return false;
  } catch (error) {
    console.error('Error checking morning shift data:', error);
    return false;
  }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูล 7 วันย้อนหลัง
 * @param {string} wardId รหัส ward
 * @param {Date} currentDate วันที่ปัจจุบัน (optional)
 * @returns {Promise<Object|null>} ข้อมูลล่าสุดภายใน 7 วันย้อนหลัง หรือ null ถ้าไม่พบข้อมูล
 */
export const fetchLast7DaysData = async (currentDate, wardId) => {
  try {
    // สร้างอาร์เรย์ของวันที่ย้อนหลัง 7 วัน
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      dates.push(format(date, 'yyyy-MM-dd'));
    }

    // ดึงข้อมูลกะเช้าจากทั้ง 7 วันย้อนหลัง
    const promises = dates.map(date => getWardDataByDate(date, 'เช้า', wardId));
    const results = await Promise.all(promises);

    // กรองเฉพาะวันที่มีข้อมูล
    const validData = results.filter(data => data !== null);

    // ถ้าไม่มีข้อมูลเลย ส่งค่าว่าง
    if (validData.length === 0) {
      return null;
    }

    // เรียงลำดับข้อมูลตามวันที่ (ล่าสุดก่อน)
    validData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // ส่งข้อมูลล่าสุดกลับไป
    return validData[0];
  } catch (error) {
    console.error('Error fetching last 7 days data:', error);
    return null;
  }
};

/**
 * ฟังก์ชันสำหรับคำนวณค่า Patient Census
 * @param {Object} formData ข้อมูลฟอร์ม
 * @returns {string|number} ค่า Patient Census ที่คำนวณได้ หรือ empty string ถ้าไม่มีข้อมูล
 */
export const calculatePatientCensus = (patientData) => {
  if (!patientData) {
    console.warn('ไม่สามารถคำนวณได้: ข้อมูล patientData ไม่มี');
    return '';
  }

  // แปลงค่าเป็นตัวเลข และใช้ parseInt ด้วย radix เพื่อป้องกันการแปลงค่าที่ผิดพลาด
  const hospitalPatientcensus = parseInt(patientData.hospitalPatientcensus || '0', 10) || 0;
  const newAdmit = parseInt(patientData.newAdmit || '0', 10) || 0;
  const transferIn = parseInt(patientData.transferIn || '0', 10) || 0;
  const referIn = parseInt(patientData.referIn || '0', 10) || 0;
  const transferOut = parseInt(patientData.transferOut || '0', 10) || 0;
  const referOut = parseInt(patientData.referOut || '0', 10) || 0;
  const discharge = parseInt(patientData.discharge || '0', 10) || 0;
  const dead = parseInt(patientData.dead || '0', 10) || 0;

  // Debug: แสดงค่าที่นำมาคำนวณ
  console.log('DataFetchers - Patient Census Values:', {
    hospitalPatientcensus,
    newAdmit,
    transferIn,
    referIn,
    transferOut,
    referOut,
    discharge,
    dead
  });

  // คำนวณตามสูตร: Hospital Patient Census + New Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead
  const total = hospitalPatientcensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
  
  console.log(`DataFetchers คำนวณ Patient Census: ${hospitalPatientcensus} + ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
  
  // Display empty string if total is 0 and all input fields are empty
  const shouldShowEmpty = total === 0 && 
      !patientData.hospitalPatientcensus &&
      !patientData.newAdmit && 
      !patientData.transferIn && 
      !patientData.referIn && 
      !patientData.transferOut && 
      !patientData.referOut && 
      !patientData.discharge && 
      !patientData.dead;
  
  return shouldShowEmpty ? '' : total.toString();
};

/**
 * ฟังก์ชันสำหรับตรวจสอบสถานะการอนุมัติขั้นสุดท้าย
 * @param {Date} date วันที่ต้องการตรวจสอบ
 * @param {string} wardId รหัสวอร์ด
 * @param {string} shift กะการทำงาน
 * @returns {Promise<boolean>} true ถ้าได้รับการอนุมัติแล้ว, false ถ้ายังไม่ได้รับการอนุมัติ
 */
export const checkFinalApprovalStatus = async (date, shift, wardId, supervisorId) => {
  try {
    // ดึงข้อมูลวอร์ด
    const wardData = await getWardDataByDate(date, shift, wardId);
    if (!wardData) return { approved: false, message: 'ไม่พบข้อมูล' };

    // ตรวจสอบว่ามีการบันทึกจริงหรือไม่
    if (wardData.status !== 'final') {
      return { 
        approved: false, 
        message: 'ข้อมูลยังไม่ถูกบันทึกเป็นฉบับสมบูรณ์' 
      };
    }

    // ตรวจสอบรหัสผู้อนุมัติ
    if (wardData.approvedBy !== supervisorId) {
      // ดึงข้อมูลผู้อนุมัติจากฐานข้อมูล
      try {
        const approverData = await getUserDataFromCollection(wardData.approvedBy);
        const approverName = approverData?.name || 'ไม่ทราบชื่อ';
        return { 
          approved: false, 
          message: `อนุมัติแล้วโดย ${approverName}` 
        };
      } catch (error) {
        return { 
          approved: false, 
          message: 'อนุมัติแล้วโดยผู้ใช้ท่านอื่น' 
        };
      }
    }

    // กรณีที่อนุมัติแล้วโดยผู้ใช้คนปัจจุบัน
    return { 
      approved: true, 
      message: 'คุณได้อนุมัติข้อมูลนี้แล้ว' 
    };
  } catch (error) {
    console.error('Error checking approval status:', error);
    return { 
      approved: false, 
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' 
    };
  }
};

/**
 * ฟังก์ชันสำหรับดึงวันที่ที่มีข้อมูลอยู่แล้วในระบบ
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<Array<Object>>} อาร์เรย์ของวันที่ที่มีข้อมูล
 */
export const fetchDatesWithData = async (wardId) => {
  try {
    if (!wardId) {
      console.error('fetchDatesWithData: Missing wardId');
      return [];
    }
    
    // ดึงข้อมูลจากทั้ง collection wardDataFinal และ wardDataDrafts
    // โค้ดจำลองการดึงข้อมูล
    const dates = [
      { date: '2025-03-18', shifts: ['Morning (07:00-19:00)', 'Night (19:00-07:00)'] },
      { date: '2025-03-17', shifts: ['Morning (07:00-19:00)'] },
      { date: '2025-03-16', shifts: ['Night (19:00-07:00)'] }
    ];
    
    return dates;
  } catch (error) {
    console.error('Error fetching dates with data:', error);
    return [];
  }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลกะงานก่อนหน้า
 * @param {string} date วันที่
 * @param {string} wardId รหัสวอร์ด
 * @param {string} currentShift กะงานปัจจุบัน
 * @returns {Promise<Object|null>} ข้อมูลกะงานก่อนหน้า หรือ null ถ้าไม่พบ
 */
export const fetchPreviousShiftData = async (date, wardId, currentShift) => {
  try {
    if (!date || !wardId || !currentShift) {
      return null;
    }
    
    // กำหนดกะงานก่อนหน้า
    let previousShift;
    let previousDate = new Date(date);
    
    if (currentShift === 'Morning (07:00-19:00)') {
      // ถ้าเป็นกะเช้า ให้ดูกะดึกของวันก่อนหน้า
      previousDate.setDate(previousDate.getDate() - 1);
      previousShift = 'Night (19:00-07:00)';
    } else {
      // ถ้าเป็นกะดึก ให้ดูกะเช้าของวันเดียวกัน
      previousShift = 'Morning (07:00-19:00)';
    }
    
    const formattedPreviousDate = format(previousDate, 'yyyy-MM-dd');
    const previousData = await getWardDataByDate(formattedPreviousDate, previousShift, wardId);
    
    return previousData;
  } catch (error) {
    console.error('Error fetching previous shift data:', error);
    return null;
  }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลการอนุมัติ
 * @param {string} date วันที่
 * @param {string} wardId รหัสวอร์ด
 * @param {string} shift กะงาน
 * @returns {Promise<Object|null>} ข้อมูลการอนุมัติ หรือ null ถ้าไม่พบ
 */
export const fetchApprovalData = async (date, wardId, shift) => {
  try {
    if (!date || !wardId || !shift) {
      return null;
    }
    
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    const wardData = await getWardDataByDate(formattedDate, shift, wardId);
    
    if (!wardData) {
      return null;
    }
    
    return {
      status: wardData.approvalStatus || 'pending',
      approvedBy: wardData.approvedBy || null,
      approvalTimestamp: wardData.approvalTimestamp || null,
      rejectedBy: wardData.rejectedBy || null,
      rejectionReason: wardData.rejectionReason || null,
      comments: wardData.approvalComments || null
    };
  } catch (error) {
    console.error('Error fetching approval data:', error);
    return null;
  }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลล่าสุด
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<Object|null>} ข้อมูลล่าสุด หรือ null ถ้าไม่พบ
 */
export const fetchLatestRecord = async (wardId) => {
  try {
    if (!wardId) {
      return null;
    }
    
    // ตรวจสอบย้อนหลังจากวันปัจจุบันไปจนถึง 30 วันก่อนหน้า
    const currentDate = new Date();
    let latestData = null;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() - i);
      
      const formattedDate = format(checkDate, 'yyyy-MM-dd');
      
      // ตรวจสอบกะดึกก่อน แล้วจึงตรวจสอบกะเช้า
      const nightData = await getWardDataByDate(formattedDate, 'Night (19:00-07:00)', wardId);
      if (nightData) {
        return nightData;
      }
      
      const morningData = await getWardDataByDate(formattedDate, 'Morning (07:00-19:00)', wardId);
      if (morningData) {
        return morningData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching latest record:', error);
    return null;
  }
};

/**
 * ฟังก์ชันสำหรับตรวจสอบว่ามีข้อมูลใน 30 วันล่าสุดหรือไม่
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<boolean>} true ถ้ามีข้อมูลใน 30 วันล่าสุด, false ถ้าไม่มี
 */
export const checkPast30DaysRecords = async (wardId) => {
  try {
    if (!wardId) {
      return false;
    }
    
    const latestRecord = await fetchLatestRecord(wardId);
    return latestRecord !== null;
  } catch (error) {
    console.error('Error checking past 30 days records:', error);
    return false;
  }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลย้อนหลัง X วัน
 */
export const fetchPreviousWardData = async (department, currentDate, days = 7) => {
    try {
        console.log(`Getting previous ${days} days data for ${department} from ${currentDate}`);
        // โค้ดดึงข้อมูลย้อนหลัง...
        // (คัดลอกจาก WardForm.js ใส่ตรงนี้)
        return [];
    } catch (error) {
        console.error('Error getting previous data:', error);
        return [];
    }
};

/**
 * แปลงรูปแบบวันที่
 */
export const formatDate = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return format(d, 'yyyy-MM-dd');
};

/**
 * ฟังก์ชันสำหรับโหลดและเตรียมข้อมูลวอร์ด
 * @param {string} date วันที่
 * @param {string} wardId รหัสวอร์ด
 * @param {string} shift กะงาน
 * @returns {Promise<Object>} ข้อมูลที่โหลด พร้อมสถานะ
 */
export const fetchAndPrepareWardData = async (date, wardId, shift) => {
    try {
        console.log(`Fetching and preparing data for ${date}, ${wardId}, ${shift}`);
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!date || !wardId || !shift) {
            console.error('Missing required parameters:', { date, wardId, shift });
            return {
                data: null,
                hasData: false,
                patientCensusTotal: '',
                sourceMessage: 'ข้อมูลไม่ครบถ้วน',
                isAutoFilledFromHistory: false
            };
        }
        
        // ดึงข้อมูลของกะปัจจุบัน
        console.log('Fetching current shift data');
        const currentData = await fetchWardData(date, wardId, shift);
        
        // สร้างตัวแปรสำหรับเก็บข้อมูลที่จะส่งคืน
        let patientCensusTotal = '';
        let sourceMessage = '';
        
        // ถ้าพบข้อมูลของกะปัจจุบัน
        if (currentData) {
            console.log('Found current shift data');
            
            // คำนวณ Patient Census ถ้ามีข้อมูล
            if (currentData.patientCensus) {
                patientCensusTotal = calculatePatientCensus(currentData.patientCensus);
            } else if (currentData.overallData) {
                patientCensusTotal = currentData.overallData.toString();
            }
            
            // ส่งคืนข้อมูลปัจจุบันที่พบ
            return {
                data: currentData,
                hasData: true,
                patientCensusTotal,
                sourceMessage: 'ข้อมูลกะปัจจุบัน',
                isAutoFilledFromHistory: false
            };
        }
        
        // ถ้าไม่พบข้อมูลปัจจุบัน ลองดึงข้อมูลจากอดีต
        console.log('No current shift data found, checking previous data');
        
        // กรณีกะเช้า: ลองดึงข้อมูลจากกะเช้าของวันที่ผ่านมา
        if (shift === 'เช้า' || shift === 'Morning (07:00-19:00)') {
            console.log('Morning shift: checking data from previous day');
            
            try {
                // ดึงข้อมูลจากกะเช้าของวันที่ผ่านมา
                const previousData = await fetchPreviousWardData(date, wardId, 'เช้า');
                
                if (previousData) {
                    console.log('Found previous day morning data');
                    
                    // คำนวณ Patient Census ถ้ามีข้อมูล
                    if (previousData.patientCensus) {
                        patientCensusTotal = calculatePatientCensus(previousData.patientCensus);
                        sourceMessage = 'ข้อมูลจากกะเช้าของวันที่ผ่านมา';
                    }
                    
                    // สร้างข้อมูลใหม่โดยใช้ข้อมูลจากวันที่ผ่านมา
                    const newData = { ...previousData };
                    delete newData.id;
                    delete newData.timestamp;
                    delete newData.createdAt;
                    delete newData.updatedAt;
                    delete newData.approvalStatus;
                    delete newData.approvedBy;
                    delete newData.approvalTimestamp;
                    
                    // อัปเดตค่า Patient Census
                    if (newData.patientCensus) {
                        newData.patientCensus.total = patientCensusTotal.toString();
                    }
                    
                    return {
                        data: newData,
                        hasData: true,
                        patientCensusTotal,
                        sourceMessage,
                        isAutoFilledFromHistory: true
                    };
                }
            } catch (err) {
                console.error('Error fetching previous day data:', err);
                // ดำเนินการต่อไปแม้จะมีข้อผิดพลาด
            }
        } else if (shift === 'ดึก' || shift === 'Night (19:00-07:00)') {
            // กรณีกะดึก: ดึงข้อมูลจากกะเช้าของวันเดียวกัน
            console.log('No data found for night shift, checking morning shift from same day');
            
            try {
                const morningData = await fetchWardData(date, wardId, 'เช้า');
                
                if (morningData) {
                    console.log('Found morning shift data from same day');
                    
                    // คำนวณ Patient Census ถ้ามีข้อมูล
                    if (morningData.patientCensus) {
                        patientCensusTotal = calculatePatientCensus(morningData.patientCensus);
                        sourceMessage = 'ข้อมูลผู้ป่วยคำนวณจากข้อมูลกะเช้า';
                    }
                    
                    // สร้างข้อมูลใหม่โดยใช้ข้อมูลจากกะเช้า
                    const newData = { ...morningData };
                    delete newData.id;
                    delete newData.timestamp;
                    delete newData.createdAt;
                    delete newData.updatedAt;
                    delete newData.approvalStatus;
                    delete newData.approvedBy;
                    delete newData.approvalTimestamp;
                    
                    // อัปเดตค่า Patient Census และ Overall Data (สำหรับกะดึก)
                    if (newData.patientCensus) {
                        newData.patientCensus.total = patientCensusTotal.toString();
                    }
                    newData.overallData = patientCensusTotal.toString();
                    
                    return {
                        data: newData,
                        hasData: true,
                        patientCensusTotal,
                        sourceMessage,
                        isAutoFilledFromHistory: true
                    };
                }
            } catch (err) {
                console.error('Error fetching morning shift data:', err);
                // ดำเนินการต่อไปแม้จะมีข้อผิดพลาด
            }
        }
        
        console.log('No data found for this date/ward/shift');
        
        // ถ้าไม่พบข้อมูลที่เกี่ยวข้องจากฐานข้อมูล
        return {
            data: null,
            hasData: false,
            patientCensusTotal: '',
            sourceMessage: 'ไม่พบข้อมูลสำหรับกะนี้',
            isAutoFilledFromHistory: false
        };
    } catch (error) {
        console.error('Error in fetchAndPrepareWardData:', error);
        return {
            data: null,
            hasData: false,
            patientCensusTotal: '',
            sourceMessage: `เกิดข้อผิดพลาด: ${error.message}`,
            isAutoFilledFromHistory: false,
            error: error.message
        };
    }
};

/**
 * ฟังก์ชันสำหรับตรวจสอบข้อมูลกะดึกของวันก่อนหน้า
 * @param {Date} date วันที่ต้องการตรวจสอบ
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<Object>} ผลการตรวจสอบข้อมูลกะดึกของวันก่อนหน้า
 */
export const checkPreviousNightShiftData = async (date, wardId) => {
  try {
    if (!date || !wardId) {
      return {
        exists: false,
        message: 'ข้อมูลไม่ครบถ้วน ไม่สามารถตรวจสอบได้',
        error: 'Missing date or wardId parameter'
      };
    }

    const currentDate = new Date(date);
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    
    const formattedPreviousDate = format(previousDate, 'yyyy-MM-dd');
    
    // ตรวจสอบกะดึกของวันก่อนหน้าในทุกรูปแบบที่เป็นไปได้ ('ดึก', 'Night', 'Night (19:00-07:00)')
    const shifts = ['ดึก', 'Night', 'Night (19:00-07:00)'];
    let previousNightData = null;
    
    for (const shift of shifts) {
      const data = await getWardDataByDate(formattedPreviousDate, shift, wardId);
      if (data) {
        previousNightData = data;
        break;
      }
    }
    
    // ตรวจสอบว่ามีข้อมูลกะดึกของวันก่อนหน้าและบันทึก Final แล้วหรือไม่
    if (previousNightData && previousNightData.status === 'final') {
      return {
        exists: true,
        message: 'มีข้อมูลกะดึกของวันก่อนหน้าและบันทึก Final แล้ว',
        data: previousNightData
      };
    } else if (previousNightData) {
      return {
        exists: true,
        isFinal: false,
        message: 'มีข้อมูลกะดึกของวันก่อนหน้า แต่ยังไม่ได้บันทึก Final',
        data: previousNightData
      };
    } else {
      return {
        exists: false,
        message: 'ไม่พบข้อมูลกะดึกของวันก่อนหน้า',
        data: null
      };
    }
  } catch (error) {
    console.error('Error checking previous night shift data:', error);
    return {
      exists: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลกะดึกของวันก่อนหน้า',
      error: error.message
    };
  }
};

/**
 * ฟังก์ชันสำหรับตรวจสอบข้อมูล 7 วันย้อนหลัง
 * @param {Date} date วันที่ต้องการตรวจสอบ
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<Object>} ผลการตรวจสอบ
 */
export const checkPast7DaysData = async (date, wardId) => {
  try {
    if (!date || !wardId) {
      return {
        complete: false,
        hasData: false,
        message: 'ข้อมูลไม่ครบถ้วน ไม่สามารถตรวจสอบได้',
        missingDates: []
      };
    }

    // สร้างอาร์เรย์ของวันที่ย้อนหลัง 7 วัน
    const checkDate = new Date(date);
    const dates = [];
    const missingDates = [];
    
    for (let i = 1; i <= 7; i++) {
      const previousDate = new Date(checkDate);
      previousDate.setDate(previousDate.getDate() - i);
      const formattedDate = format(previousDate, 'yyyy-MM-dd');
      dates.push({
        date: formattedDate,
        jsDate: previousDate
      });
    }

    // ดึงข้อมูลกะเช้าจากทั้ง 7 วันย้อนหลัง
    const promises = dates.map(d => getWardDataByDate(d.date, 'เช้า', wardId));
    const results = await Promise.all(promises);

    // ตรวจสอบว่ามีวันไหนที่ไม่มีข้อมูล
    results.forEach((data, index) => {
      if (!data || data.status !== 'final') {
        missingDates.push(dates[index].date);
      }
    });

    return {
      complete: missingDates.length === 0,
      hasData: results.some(data => data !== null),
      message: missingDates.length === 0 
        ? 'ข้อมูล 7 วันย้อนหลังครบถ้วน' 
        : `พบ ${missingDates.length} วันที่ยังไม่ได้บันทึกข้อมูล`,
      missingDates: missingDates
    };
  } catch (error) {
    console.error('Error checking past 7 days data:', error);
    return {
      complete: false,
      hasData: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลย้อนหลัง: ' + error.message,
      missingDates: []
    };
  }
};