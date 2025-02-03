'use client';
import * as XLSX from 'xlsx';

const exportData = (data, fileName = 'export.xlsx') => {
    try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, fileName);
        return true;
    } catch (error) {
        console.error('Error exporting data:', error);
        return false;
    }
};

export default exportData;
