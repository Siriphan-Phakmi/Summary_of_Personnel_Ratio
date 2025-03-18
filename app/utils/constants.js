'use client';

/**
 * ค่าคงที่ที่ใช้ในระบบทั้งหมด
 */

// ค่าต่างระหว่างปี พ.ศ. กับ ค.ศ. (543 ปี)
export const BE_OFFSET = 543;

// Session expiry time (20 minutes in milliseconds)
export const SESSION_EXPIRY_TIME = 20 * 60 * 1000;

// Default shifts
export const SHIFTS = ['เช้า', 'บ่าย', 'ดึก'];

// Default statuses
export const DATA_STATUSES = {
  DRAFT: 'draft',
  FINAL: 'final',
  APPROVED: 'approved'
}; 