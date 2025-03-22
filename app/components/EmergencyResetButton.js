'use client';

import { useState, useEffect } from 'react';

export default function EmergencyResetButton() {
  const [isVisible, setIsVisible] = useState(true);
  
  // ฟังก์ชันรีเซ็ต loading alert
  const handleReset = () => {
    try {
      if (typeof window !== 'undefined' && window.emergencyResetAlert) {
        window.emergencyResetAlert();
        setTimeout(() => {
          alert('ระบบได้รีเซ็ตการโหลดเรียบร้อยแล้ว กรุณาลองใช้งานอีกครั้ง');
        }, 100);
      } else {
        // Fallback ถ้าไม่มี emergencyResetAlert function
        const containers = document.querySelectorAll('.swal2-container');
        containers.forEach(el => el.remove());
        
        const backdrops = document.querySelectorAll('.swal2-backdrop-show');
        backdrops.forEach(el => el.remove());
        
        document.body.classList.remove('swal2-shown', 'swal2-height-auto');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        setTimeout(() => {
          alert('ระบบได้รีเซ็ตการโหลดเรียบร้อยแล้ว กรุณาลองใช้งานอีกครั้ง');
        }, 100);
      }
    } catch (error) {
      console.error('Error resetting alerts:', error);
      alert('เกิดข้อผิดพลาดในการรีเซ็ต: ' + error.message);
    }
  };
  
  // ตรวจสอบ loading alerts อัตโนมัติเมื่อ component ถูก mount
  useEffect(() => {
    try {
      // ตรวจสอบอัตโนมัติเมื่อโหลดหน้า
      const sweetAlertContainers = document.querySelectorAll('.swal2-container');
      if (sweetAlertContainers.length > 0) {
        sweetAlertContainers.forEach(container => container.remove());
      }
      
      // ลบ backdrop
      const backdrops = document.querySelectorAll('.swal2-backdrop-show');
      if (backdrops.length > 0) {
        backdrops.forEach(backdrop => backdrop.remove());
      }
      
      // รีเซ็ต body style
      document.body.classList.remove('swal2-shown', 'swal2-height-auto');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    } catch (err) {
      console.error('Error in auto emergency reset:', err);
    }
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <button
      onClick={handleReset}
      className="bg-red-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-red-700"
    >
      รีเซ็ตหน้าจอ
    </button>
  );
}
