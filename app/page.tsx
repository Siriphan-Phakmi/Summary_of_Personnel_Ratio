import { redirect } from 'next/navigation';

/**
 * RootPage Component
 * 
 * หน้าหลักของแอปพลิเคชัน ทำหน้าที่ redirect ไปยังหน้า login
 * การ redirect หลักสำหรับผู้ใช้ที่ล็อกอินแล้วจะถูกจัดการโดย `middleware.ts` 
 * เพื่อประสิทธิภาพที่ดีที่สุด (server-side redirect)
 */
export default function RootPage() {
  // ทำ redirect ไปที่หน้า login โดยตรง
  // middleware จะตรวจสอบว่าผู้ใช้ล็อกอินแล้วหรือไม่ และทำการ redirect ไปยังหน้าที่เหมาะสม
  redirect('/login');
  
  // โค้ดด้านล่างนี้จะไม่ถูกทำงาน เพราะ redirect จะหยุดการทำงานของฟังก์ชัน
  return null;
} 