/**
 * Feature Flags สำหรับควบคุมการเปิดใช้งานฟีเจอร์ต่างๆ
 */
export const API_FEATURES = {
  // ใช้ API Layer ในหน้า Dashboard แทนการดึงข้อมูลตรงจาก Firestore
  USE_API_DASHBOARD: process.env.NEXT_PUBLIC_USE_API_DASHBOARD === 'true' || false,
  
  // ใช้ API Layer ในฟอร์มการอนุมัติ
  USE_API_APPROVAL: process.env.NEXT_PUBLIC_USE_API_APPROVAL === 'true' || false,
  
  // เก็บ cache ข้อมูลในเครื่องลูกข่าย
  USE_CLIENT_CACHE: process.env.NEXT_PUBLIC_USE_CLIENT_CACHE === 'true' || false
};

/**
 * ฟังก์ชันสำหรับตรวจสอบว่าฟีเจอร์เปิดใช้งานหรือไม่
 * @param featureName ชื่อฟีเจอร์
 * @returns true หากเปิดใช้งาน, false หากปิดใช้งาน
 */
export const isFeatureEnabled = (featureName: keyof typeof API_FEATURES): boolean => {
  return API_FEATURES[featureName];
}; 