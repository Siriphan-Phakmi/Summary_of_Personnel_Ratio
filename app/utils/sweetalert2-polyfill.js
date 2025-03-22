'use client';

/**
 * SweetAlert2 polyfill module ที่ใช้ alertService แทน
 * เพื่อให้โค้ดเดิมที่เคยอ้างอิง SweetAlert2 ยังสามารถใช้งานได้
 */

// Import alertService แทน SweetAlert2 โดยตรง
import { SwalAlert } from './alertService';

// Export default แยกกันเพื่อแก้ปัญหา circular dependency
export default SwalAlert;

// Export functions for individual use
export const fire = (...args) => SwalAlert.fire(...args);
export const showLoading = () => SwalAlert.showLoading && SwalAlert.showLoading();
export const close = () => SwalAlert.close && SwalAlert.close();

// เพิ่มฟังก์ชัน forceCloseAll เพื่อบังคับปิดทุก alert
export const forceCloseAll = () => SwalAlert.forceCloseAll ? SwalAlert.forceCloseAll() : close();

// mixin no longer supported
export const mixin = (options) => {
  console.warn('mixin() is not fully supported in this implementation. Using basic SwalAlert instead.');
  return SwalAlert;
};

// Default configuration
export const defaultOptions = {
  confirmButtonColor: '#0ab4ab',
  cancelButtonColor: '#6c757d',
  confirmButtonText: 'ตกลง',
  cancelButtonText: 'ยกเลิก',
  reverseButtons: true
};

// เพิ่มฟังก์ชันเพื่อความเข้ากันได้กับ SweetAlert2
export const isVisible = () => SwalAlert.isVisible ? SwalAlert.isVisible() : false;
export const update = (params) => SwalAlert.update ? SwalAlert.update(params) : null;
export const getContainer = () => document.querySelector('.swal2-container');