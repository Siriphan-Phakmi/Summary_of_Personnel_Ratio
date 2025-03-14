export const formatWardName = (ward) => {
    // ถ้า ward เป็น string ว่างหรือ null/undefined ให้คืนค่าว่าง
    if (!ward) return '';
    
    // แปลงชื่อ ward ให้อยู่ในรูปแบบที่ต้องการ
    return ward
        .split(/(?=[A-Z])/) // แยกตัวอักษรตัวใหญ่
        .join(' ') // เชื่อมด้วยช่องว่าง
        .trim(); // ตัดช่องว่างหน้า-หลัง
};
