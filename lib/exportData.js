import * as XLSX from 'xlsx';
import { db } from '../app/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export const fetchStaffRecords = async () => {
  try {
    const staffRef = collection(db, 'staffRecords');
    const q = query(staffRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date || '',
        shift: data.shift || '',
        recordedDate: data.recordedDate || '',
        recordedTime: data.recordedTime || '',
        wards: data.wards || {},
        summaryData: data.summaryData || {},
        recorder: data.supervisorName || ''
      };
    });
  } catch (error) {
    throw new Error('ไม่สามารถดึงข้อมูลจาก Firebase ได้');
  }
};

export const formatDataForExcel = (records) => {
  const formattedData = [];

  records.forEach(record => {
    // ข้อมูลพื้นฐาน
    const baseData = {
      'วันที่': record.date,
      'กะ': record.shift,
      'วันที่บันทึก': record.recordedDate,
      'เวลาที่บันทึก': record.recordedTime,
      'ผู้บันทึก': record.recorder,
    };

    // ข้อมูล OPD และสรุป
    const summaryData = {
      'OPD 24hr': record.summaryData?.opdTotal24hr || 0,
      'คนไข้เก่า': record.summaryData?.existingPatients || 0,
      'คนไข้ใหม่': record.summaryData?.newPatients || 0,
      'Admit 24hr': record.summaryData?.admissions24hr || 0,
    };

    // ข้อมูลแต่ละ ward
    Object.entries(record.wards).forEach(([wardName, wardData]) => {
      formattedData.push({
        ...baseData,
        ...summaryData,
        'Ward': wardName,
        'จำนวนผู้ป่วย': wardData.numberOfPatients || 0,
        'RN': wardData.RN || 0,
        'PN': wardData.PN || 0,
        'NA': wardData.admin || 0,
        'Admit ใหม่': wardData.newAdmissions || 0,
        'Discharge': wardData.discharge || 0,
      });
    });
  });

  return formattedData;
};

export const exportToExcel = (data, fileName) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงาน');
  XLSX.writeFile(workbook, fileName);
};
