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

// ใน exportData.js
export function formatDataForExcel(records) {
    // แบนข้อมูลให้เป็นแถวเดียว
    const flattenedData = records.flatMap(record =>
        Object.entries(record.wards).map(([ward, data]) => ({
            'วันที่': record.date,
            'เวลาที่บันทึก': record.recordedTime || '',
            'วันที่บันทึก': record.recordedDate || '',
            'กะ': record.shift,
            'วอร์ด': ward,
            'จำนวนผู้ป่วย': data.numberOfPatients,
            'ผู้จัดการ': data.manager,
            'RN': data.RN,
            'PN': data.PN,
            'NA': data.NA,
            'ธุรการ': data.admin,
            'รับใหม่': data.newAdmissions,
            'Refer In': data.referIn,
            'รับย้าย': data.transfers,
            'Refer Out': data.referOut,
            'กลับบ้าน': data.discharge,
            'เสียชีวิต': data.deaths,
            'OPD 24hr': record.summaryData?.opdTotal24hr || '',
            'คนไข้เก่า': record.summaryData?.existingPatients || '',
            'คนไข้ใหม่': record.summaryData?.newPatients || '',
            'Admit 24hr': record.summaryData?.admissions24hr || '',
            'ผู้ตรวจการ': record.summaryData?.supervisorName || '',
            'Overall Data': data.overallData,
            'ห้องว่าง': data.availableBeds,
            'Plan D/C': data.plannedDischarge,
            'unavailable': data.maintainanceRooms,
            'หมายเหตุ': data.remarks
        }))
    );
    return flattenedData;
}

// ฟังก์ชันสำหรับ Export ไปยัง Excel
export function exportToExcel(data, fileName) {
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Staff Records");

        // Save file
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
}