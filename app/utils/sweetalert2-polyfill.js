'use client';

/**
 * Polyfill สำหรับ sweetalert2 เพื่อทดแทนการใช้งาน SweetAlert2 จริง
 * ไฟล์นี้จะถูกใช้เมื่อมีการ import sweetalert2 โดยตรง
 */

// สร้าง mock สำหรับ SweetAlert2 API
const sweetalert2 = {
  fire: async (options) => {
    console.log('SweetAlert2 polyfill fire:', options);
    // คืนค่าตามรูปแบบของ SweetAlert2 จริง
    return {
      isConfirmed: true,
      isDismissed: false,
      isDenied: false,
      value: true
    };
  },
  showLoading: () => {
    console.log('SweetAlert2 polyfill showLoading');
  },
  close: () => {
    console.log('SweetAlert2 polyfill close');
  },
  // เพิ่ม method อื่นๆ ตามที่จำเป็น
  mixin: (params) => {
    return {
      fire: async (options) => {
        console.log('SweetAlert2 polyfill mixin fire:', { params, options });
        return {
          isConfirmed: true,
          isDismissed: false,
          isDenied: false,
          value: true
        };
      }
    };
  }
};

// Export default เพื่อให้เข้ากันได้กับโค้ดเดิมที่ import sweetalert2 from 'sweetalert2'
export default sweetalert2; 