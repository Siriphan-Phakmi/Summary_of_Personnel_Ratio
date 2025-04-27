'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const VersionAndTime: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [shortDate, setShortDate] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false); // ตรวจสอบว่าเป็นจอเล็กหรือไม่
  const version = '0.0.1';

  // ตรวจสอบขนาดหน้าจอเมื่อ component โหลด และเมื่อมีการ resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // ถือว่าน้อยกว่า 768px เป็นจอเล็ก (ตรงกับ md: ของ Tailwind)
    };
    
    // เรียกใช้ครั้งแรก
    checkIfMobile();
    
    // สร้าง event listener สำหรับการ resize
    window.addEventListener('resize', checkIfMobile);
    
    // ล้าง event listener เมื่อ unmount
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // เวลาแบบเต็ม (สำหรับจอปกติและจอเล็ก)
      setCurrentTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      // วันที่แบบเต็ม (สำหรับจอปกติ)
      const buddhistYear = now.getFullYear() + 543;
      const formattedDate = format(now, 'EEEEที่ d MMMM', { locale: th });
      setCurrentDate(`${formattedDate} พ.ศ. ${buddhistYear}`);
      
      // วันที่แบบสั้น (สำหรับจอเล็ก) รูปแบบ dd/MM/yy
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const shortYear = (buddhistYear % 100).toString().padStart(2, '0'); // เอาเลข 2 ตัวท้าย
      setShortDate(`${day}/${month}/${shortYear}`);
    };

    updateDateTime(); // แสดงผลครั้งแรกทันที
    const intervalId = setInterval(updateDateTime, 1000); // อัปเดตทุก 1 วินาที

    return () => clearInterval(intervalId); // ล้าง interval เมื่อ component ถูก unmount
  }, []);

  // เลือกการแสดงผลตามขนาดหน้าจอ
  if (isMobile) {
    // แสดงผลแบบกระชับสำหรับจอเล็ก
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500">
        <div>{currentTime}</div>
        <div>{shortDate}</div>
        <div>V.{version}</div>
      </div>
    );
  }

  // แสดงผลแบบเต็มสำหรับจอปกติ
  return (
    <div className="text-xs text-gray-600 dark:text-gray-300 ml-3 text-left">
      {currentTime && <span>Time: {currentTime}</span>}
      <br />
      {currentDate && <span>Day: {currentDate}</span>}
      <br />
      <span>Version: {version}</span>
    </div>
  );
};

export default VersionAndTime; 