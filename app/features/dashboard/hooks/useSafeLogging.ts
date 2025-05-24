/**
 * ฟังก์ชันสำหรับบันทึกข้อมูลอย่างปลอดภัย - แสดงเฉพาะใน development mode
 * @param message ข้อความที่ต้องการบันทึก
 * @param data ข้อมูลเพิ่มเติม (optional)
 */
export const logInfo = (message: string, ...data: any[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, ...data);
  }
};

/**
 * ฟังก์ชันสำหรับบันทึกข้อผิดพลาดอย่างปลอดภัย - แสดงเฉพาะใน development mode
 * หรือส่งไปยังระบบติดตามข้อผิดพลาดในโหมด production
 * @param message ข้อความที่ต้องการบันทึก
 * @param error ข้อมูลข้อผิดพลาด
 */
export const logError = (message: string, error: any): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  } else {
    // ในโหมด production อาจส่งข้อมูลไปยังระบบ error tracking เช่น Sentry
    // หรือเก็บใน analytics โดยไม่มีข้อมูลส่วนบุคคล
    // เช่น: sendToErrorTrackingService({ message, error: error.message });
  }
};

/**
 * Custom hook สำหรับการบันทึกข้อมูลอย่างปลอดภัย
 * @returns ฟังก์ชันสำหรับบันทึกข้อมูลและข้อผิดพลาด
 */
export const useSafeLogging = () => {
  return {
    logInfo,
    logError
  };
};

export default useSafeLogging; 