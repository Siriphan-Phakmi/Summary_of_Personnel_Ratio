import { redirect } from 'next/navigation';

/**
 * Home Page - Server Component
 * 
 * หน้านี้ทำหน้าที่เป็น fallback สำหรับ /home path
 * โดยปกติ middleware จะจัดการ redirect ไปยังหน้าที่เหมาะสมตาม role
 * แต่หากมีการเข้าถึงหน้านี้โดยตรง เราจะ redirect ไปที่ login
 */
export default function HomePage() {
  // เนื่องจากการเข้าถึงหน้านี้โดยตรงควรถูก middleware จัดการไปแล้ว
  // เราจึงทำ redirect ไปที่ login เพื่อให้ middleware จัดการการ redirect อีกครั้ง
  redirect('/login');
  
  // โค้ดด้านล่างนี้จะไม่ถูกทำงาน เพราะ redirect จะหยุดการทำงานของฟังก์ชัน
  return null; 
} 