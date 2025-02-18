export const formatThaiDate = (date) => {
    if (!date) return 'คุณยังไม่ได้เลือกวันที่';

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = thaiMonths[dateObj.getMonth()];
    const year = dateObj.getFullYear() + 543;

    return `${day} ${month} ${year}`;
};

export const getThaiDateNow = () => {
    return formatThaiDate(new Date());
};

// Add utility function for date string formatting
export const getUTCDateString = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// เพิ่มฟังก์ชันสำหรับตรวจสอบความถูกต้องของวันที่
export const isValidDate = (date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
};

// เพิ่มฟังก์ชันสำหรับฟอร์แมตวันที่ให้อยู่ในรูปแบบ YYYY-MM-DD
export const formatDateToISO = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (!isValidDate(d)) return '';
    return d.toISOString().split('T')[0];
};

// เพิ่มฟังก์ชันจาก Calendar.js
export const formatDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getMonths = () => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export const getYearRange = (currentYear, range = 2) => {
    return Array.from({ length: range * 2 + 1 }, (_, i) => currentYear - range + i);
};
