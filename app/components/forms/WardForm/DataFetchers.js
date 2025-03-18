'use client';

import { getUserDataFromCollection, getWardDataByDate, checkLast7DaysData } from '../../../lib/dataAccess';
import { getSubcollection, getDocumentById } from '../../../lib/firebase';
import { format } from 'date-fns';

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
 * ฟังก์ชันสำหรับคำนวณ Patient Census
 * @param {object} data ข้อมูลที่ใช้ในการคำนวณ
 * @returns {string} ผลลัพธ์การคำนวณ
 */
export const calculatePatientCensus = (data) => {
  if (!data) return '';

  // ฟังก์ชันช่วยแปลงค่าที่อาจเป็นข้อความให้เป็นตัวเลข (ถ้าแปลงไม่ได้ ให้เป็น 0)
  const safeParseInt = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // แปลงค่าก่อนคำนวณ
  const newAdmit = safeParseInt(data.newAdmit);
  const transferIn = safeParseInt(data.transferIn);
  const referIn = safeParseInt(data.referIn);
  const transferOut = safeParseInt(data.transferOut);
  const referOut = safeParseInt(data.referOut);
  const discharge = safeParseInt(data.discharge);
  const dead = safeParseInt(data.dead);

  const result = newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
  return result !== 0 ? String(result) : '';
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