/**
 * ไฟล์นี้รวมฟังก์ชันช่วยเหลือที่เกี่ยวข้องกับ Firebase
 * แยกออกมาเพื่อป้องกันปัญหา circular dependency
 */

/**
 * เปิด URL สำหรับสร้าง index ใน Firebase Console
 * @param {string} errorMessage - ข้อความ error จาก Firebase
 * @returns {boolean} - สถานะการทำงาน
 */
export const navigateToCreateIndex = (errorMessage) => {
    try {
        // Extract URL from Firebase error message
        const urlRegex = /https:\/\/console\.firebase\.google\.com[^\s]+/;
        const match = errorMessage.match(urlRegex);
        if (match && match[0]) {
            const indexUrl = match[0];
            console.log('Opening Firebase Console to create index:', indexUrl);
            window.open(indexUrl, '_blank');
            return true;
        } else {
            console.error('Could not extract index URL from error message');
            return false;
        }
    } catch (error) {
        console.error('Error navigating to create index:', error);
        return false;
    }
};

/**
 * ตรวจสอบและจัดการ Firebase Error ที่เกี่ยวข้องกับ index
 * @param {Error} error - ข้อผิดพลาดที่เกิดขึ้น
 * @returns {boolean} - สถานะการจัดการข้อผิดพลาด
 */
export const handleFirebaseIndexError = (error) => {
    if (error && error.message && error.message.includes('The query requires an index')) {
        console.log('Detected Firebase Index Error');
        return navigateToCreateIndex(error.message);
    }
    return false;
};

/**
 * ปลอดภัยการเรียกใช้ query โดยการจัดการข้อผิดพลาดของ index
 * @param {function} queryFn - ฟังก์ชันที่ทำ query
 * @param {function} errorHandler - ฟังก์ชันที่จัดการข้อผิดพลาด (optional)
 * @returns {Promise<any>} - ผลลัพธ์ของ query
 */
export const safeQuery = async (queryFn, errorHandler) => {
    try {
        return await queryFn();
    } catch (error) {
        if (error && error.message && error.message.includes('The query requires an index')) {
            handleFirebaseIndexError(error);
            if (errorHandler) {
                errorHandler(error);
            }
        }
        throw error;
    }
}; 