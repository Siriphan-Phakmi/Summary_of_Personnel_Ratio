'use client';

/**
 * SweetAlert2 polyfill module ที่ใช้ alertService แทน
 * เพื่อให้โค้ดเดิมที่เคยอ้างอิง SweetAlert2 ยังสามารถใช้งานได้
 */

// Import alertService แทน SweetAlert2 โดยตรง
import { Swal } from './alertService';

// Export default แยกกันเพื่อแก้ปัญหา circular dependency
export default Swal;

// Export functions for individual use
export const fire = (...args) => Swal.fire(...args);
export const showLoading = () => Swal.showLoading && Swal.showLoading();
export const close = () => Swal.close && Swal.close();
export const mixin = (options) => Swal.mixin ? Swal.mixin(options) : Swal;

// Default configuration
export const defaultOptions = {
  confirmButtonColor: '#0ab4ab',
  cancelButtonColor: '#6c757d',
  confirmButtonText: 'ตกลง',
  cancelButtonText: 'ยกเลิก',
  reverseButtons: true
};

// Pre-configured toast notification
export const Toast = Swal.mixin ? Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    // การดักจับอีเวนต์จะใช้ DOM Element ที่ถูกส่งมาจาก toast
    if (toast && typeof toast.addEventListener === 'function') {
      toast.addEventListener('mouseenter', () => Swal.stopTimer && Swal.stopTimer());
      toast.addEventListener('mouseleave', () => Swal.resumeTimer && Swal.resumeTimer());
    }
  }
}) : Swal;