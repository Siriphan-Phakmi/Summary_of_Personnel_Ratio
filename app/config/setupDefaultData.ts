import { setupDefaultWards } from '@/app/features/ward-form/services/wardService';

/**
 * ฟังก์ชันตั้งค่าข้อมูลเริ่มต้นสำหรับระบบ
 * - สร้างแผนกเริ่มต้น (ถ้ายังไม่มี)
 * - สร้าง indexes ที่จำเป็น
 */
export async function setupInitialData() {
  try {
    // สร้างแผนกเริ่มต้น
    await setupDefaultWards();
    
    console.log('Initial data setup completed successfully');
    return true;
  } catch (error) {
    console.error('Error during initial data setup:', error);
    return false;
  }
}

/**
 * เรียกใช้การตั้งค่าข้อมูลเริ่มต้นเมื่อมีการโหลดแอปพลิเคชัน
 * เฉพาะในฝั่ง client เท่านั้น
 */
export function initializeClientSetup() {
  if (typeof window !== 'undefined') {
    // ตรวจสอบว่าไม่ได้อยู่ในโหมดการพัฒนาเพื่อไม่ให้ทำงานซ้ำซ้อนกับ hot reloading
    const isProduction = process.env.NODE_ENV === 'production';
    
    // ถ้าเป็นการโหลดครั้งแรกหรืออยู่ในโหมด production
    if (!window.initialDataSetupComplete || isProduction) {
      // ตั้งค่าสถานะว่าได้เริ่มการตั้งค่าแล้ว
      window.initialDataSetupComplete = true;
      
      // รอให้แอปพลิเคชันโหลดเสร็จก่อนทำการตั้งค่า
      setTimeout(() => {
        setupInitialData()
          .then(success => {
            if (success) {
              console.log('Initial data setup successful');
            }
          })
          .catch(err => {
            console.error('Initial data setup failed:', err);
          });
      }, 5000); // รอ 5 วินาทีเพื่อให้มั่นใจว่าแอปพลิเคชันโหลดเสร็จแล้ว
    }
  }
}

// เพิ่มการประกาศเพื่อขยาย Window interface
declare global {
  interface Window {
    initialDataSetupComplete?: boolean;
  }
} 