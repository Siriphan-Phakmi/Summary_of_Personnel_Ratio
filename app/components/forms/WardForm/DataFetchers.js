'use client';

import { getUserDataFromCollection, getWardDataByDate, checkLast7DaysData } from '../../../lib/dataAccess';
import { getSubcollection, getDocumentById } from '../../../lib/firebase';
import { format } from 'date-fns';

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
    if (!date || !wardId || !shift) {
      console.error('fetchWardData: Missing parameters', { date, wardId, shift });
      return null;
    }
    
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    const data = await getWardDataByDate(formattedDate, shift, wardId);
    return data;
  } catch (error) {
    console.error('Error fetching ward data:', error);
    return null;
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
 * @returns {string} ค่า Patient Census ที่คำนวณได้
 */
export const calculatePatientCensus = (formData) => {
  try {
    // แปลงค่าเป็นตัวเลข หากไม่ใช่ตัวเลขให้ใช้ค่า 0
    const newAdmit = parseInt(formData.newAdmit || '0');
    const transferIn = parseInt(formData.transferIn || '0');
    const referIn = parseInt(formData.referIn || '0');
    const transferOut = parseInt(formData.transferOut || '0');
    const referOut = parseInt(formData.referOut || '0');
    const discharge = parseInt(formData.discharge || '0');
    const dead = parseInt(formData.dead || '0');
    
    // คำนวณตามสูตร: (New Admit + Transfer In + Refer In) - (Transfer Out + Refer Out + Discharge + Dead)
    const census = (newAdmit + transferIn + referIn) - (transferOut + referOut + discharge + dead);
    
    // ส่งค่ากลับเป็น string
    return census.toString();
  } catch (error) {
    console.error('Error calculating patient census:', error);
    return '0'; // ส่งค่าเริ่มต้นเป็น 0 หากมีข้อผิดพลาด
  }
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