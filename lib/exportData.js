import axios from 'axios';
import * as XLSX from 'xlsx';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export const fetchStaffRecords = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/staff-records`);
    return response.data;
  } catch (error) {
    throw new Error('ไม่สามารถดึงข้อมูลจากเซิร์ฟเวอร์ได้');
  }
};

export const formatDataForExcel = (records) => {
  return records.map(record => ({
    'วันที่': new Date(record.date).toLocaleDateString('th-TH'),
    'จำนวนพยาบาลเวรเช้า': record.morningShift,
    'จำนวนพยาบาลเวรดึก': record.nightShift,
    'จำนวนผู้ป่วยในหอผู้ป่วย': record.patientCount,
    'อัตราส่วนผู้ป่วยต่อพยาบาล': record.ratio
  }));
};

export const exportToExcel = (data, fileName) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงาน');
  XLSX.writeFile(workbook, fileName);
};
