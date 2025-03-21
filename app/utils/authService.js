'use client';

/**
 * ไฟล์ authService.js
 * บริการจัดการการตรวจสอบและการยืนยันตัวตนของผู้ใช้
 */

// ฟังก์ชันเพื่อออกจากระบบ
export const logout = () => {
  if (typeof window !== 'undefined') {
    // ลบข้อมูลผู้ใช้และโทเคนจาก localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('authRole');
    
    // บันทึกเวลาที่ออกจากระบบ
    localStorage.setItem('lastLogout', Date.now().toString());
  }
  
  // ถ้ามีการเปลี่ยนเส้นทางหลังจากออกจากระบบ สามารถเพิ่มโค้ดที่นี่ได้
  // ไม่ต้องเปลี่ยนเส้นทางที่นี่ เพราะควรทำที่คอมโพเนนต์ที่เรียกใช้ logout
  
  return true;
}; 