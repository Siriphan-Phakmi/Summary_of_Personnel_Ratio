import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';

export async function fetchStaffRecords() {
    const querySnapshot = await getDocs(collection(db, 'staffRecords'));
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// ฟังก์ชันแปลงข้อมูลให้อยู่ในรูปแบบที่เหมาะสมสำหรับ Excel
export function formatDataForExcel(records) {
    return records.map(record => ({
        'วันที่': record.date,
        'กะ': record.shift,
        'วอร์ด': Object.entries(record.wards).map(([ward, data]) => ({
            'ชื่อวอร์ด': ward,
            'จำนวนผู้ป่วย': data.numberOfPatients,
            'ผู้จัดการ': data.manager,
            'RN': data.RN,
            'PN': data.PN,
            'NA': data.NA,
            'ธุรการ': data.admin,
            'รับใหม่': data.newAdmissions,
            'รับย้าย': data.transfers,
            'Refer Out': data.referOut,
            'กลับบ้าน': data.discharge,
            'เสียชีวิต': data.deaths
        }))
    }));
}

// ฟังก์ชันสำหรับ Export ไปยัง Excel
export function exportToExcel(data, fileName) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff Records");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}