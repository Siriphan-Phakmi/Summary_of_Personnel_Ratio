/**
 * @file Index file for the approval services module.
 * @description This file re-exports all the necessary functions and types from the various
 * service files within this directory, providing a single entry point for other parts
 * of the application to access approval-related logic. This simplifies imports
 * and decouples the rest of the app from the internal structure of this module.
 */

/**
 * Export all approval services ที่แยกไฟล์ย่อย
 */

// ไม่นำเข้าค่าคงที่จาก constants.ts ในไฟล์นี้เพื่อป้องกัน circular dependency
// แต่ละไฟล์ย่อย (dailySummary.ts, approvalForms.ts, ...) ให้นำเข้าค่าคงที่โดยตรงจาก constants.ts

// Export from modules
export * from './approvalForms';
export * from './rejectForms';
export * from './dailySummaryService'; // Replaces dailySummary, dailySummaryQueries, etc.
export * from './approvalQueries';
export * from './permissionedQueries'; 