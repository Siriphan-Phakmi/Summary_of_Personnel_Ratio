'use client';

/**
 * SweetAlert2 module for use in the app
 * Direct import and export - fixed circular dependency issue
 */

// Import SweetAlert2 โดยตรง
import Swal from 'sweetalert2';

// Export default แยกกันเพื่อแก้ปัญหา circular dependency
export default Swal;

// Export functions for individual use
export const fire = (...args) => Swal.fire(...args);
export const showLoading = () => Swal.showLoading();
export const close = () => Swal.close();
export const mixin = (options) => Swal.mixin(options);

// Default configuration
export const defaultOptions = {
  confirmButtonColor: '#0ab4ab',
  cancelButtonColor: '#6c757d',
  confirmButtonText: 'ตกลง',
  cancelButtonText: 'ยกเลิก',
  reverseButtons: true
};

// Pre-configured toast notification
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});