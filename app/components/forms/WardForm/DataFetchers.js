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
 * ฟังก์ชันสำหรับตรวจสอบว่ามีข้อมูลกะเช้าหรือไม่
 * @param {Date} date วันที่ต้องการตรวจสอบ
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<boolean>} true ถ้ามีข้อมูลกะเช้า, false ถ้าไม่มี
 */
export const checkMorningShiftDataExists = async (date, wardId) => {
  try {
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    const morningData = await getWardDataByDate(formattedDate, 'เช้า', wardId);
    return morningData ? true : false;
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
 * ฟังก์ชันสำหรับดึงข้อมูลและจัดการการโหลดข้อมูลอัตโนมัติตามกะ
 * @param {string} date วันที่
 * @param {string} wardId รหัสวอร์ด
 * @param {string} shift กะงาน
 * @returns {Promise<Object>} ข้อมูลที่โหลด พร้อมสถานะ
 */
export const fetchAndPrepareWardData = async (date, wardId, shift) => {
    try {
        console.log(`Fetching and preparing data for ${date}, ${wardId}, ${shift}`);
        
        // ดึงข้อมูลของกะปัจจุบัน
        const wardData = await fetchWardData(date, wardId, shift);
        let patientCensusTotal = 0;
        let sourceMessage = '';
        
        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (wardData) {
            console.log('Found existing data for this shift');
            
            // คำนวณ Patient Census ถ้ามีข้อมูล
            if (wardData.patientCensus) {
                patientCensusTotal = calculatePatientCensus(wardData.patientCensus);
                sourceMessage = 'ข้อมูลผู้ป่วยคำนวณจากข้อมูลในระบบ';
            }
            
            return {
                data: wardData,
                hasData: true,
                patientCensusTotal,
                sourceMessage
            };
        }
        
        // ถ้าไม่มีข้อมูล จะดึงข้อมูลตามกฎที่กำหนด
        if (shift === 'Morning (07:00-19:00)') {
            // กรณีกะเช้า: ดึงข้อมูลย้อนหลัง 7 วัน
            const previousDate = new Date(date);
            previousDate.setDate(previousDate.getDate() - 7);
            const formattedPreviousDate = format(previousDate, 'yyyy-MM-dd');
            
            console.log('No data found for morning shift, checking data from 7 days ago:', formattedPreviousDate);
            const previousData = await fetchWardData(formattedPreviousDate, wardId, shift);
            
            if (previousData) {
                console.log('Found previous data from 7 days ago');
                
                // คำนวณ Patient Census ถ้ามีข้อมูล
                if (previousData.patientCensus) {
                    patientCensusTotal = calculatePatientCensus(previousData.patientCensus);
                    sourceMessage = 'ข้อมูลผู้ป่วยคำนวณจากข้อมูล 7 วันก่อน';
                }
                
                // สร้างข้อมูลใหม่โดยใช้ข้อมูลเดิมแต่ไม่เอา ID และข้อมูลเฉพาะอื่นๆ
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
        } else if (shift === 'Night (19:00-07:00)') {
            // กรณีกะดึก: ดึงข้อมูลจากกะเช้าของวันเดียวกัน
            console.log('No data found for night shift, checking morning shift from same day');
            const morningData = await fetchWardData(date, wardId, 'Morning (07:00-19:00)');
            
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
        }
        
        // ถ้าไม่มีข้อมูลใดๆ ให้สร้างข้อมูลเปล่า
        return {
            data: null,
            hasData: false,
            patientCensusTotal: 0,
            sourceMessage: 'ไม่พบข้อมูลก่อนหน้า'
        };
    } catch (error) {
        console.error('Error fetching and preparing ward data:', error);
        return {
            data: null,
            hasData: false,
            patientCensusTotal: 0,
            sourceMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            error: error.message
        };
    }
};