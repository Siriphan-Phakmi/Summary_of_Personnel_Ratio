'use client';

/**
 * Re-export จาก app/features/ward-form/services/wardFormService.ts
 * โค้ดใหม่ควรนำเข้า (import) จาก app/features/ward-form/services/wardFormService.ts โดยตรง
 */
export { 
  getWardFormsByDateAndWardForDashboard as getWardFormsByDateAndWard,
  fetchAllWardCensus
} from '@/app/features/ward-form/services/wardFormService'; 