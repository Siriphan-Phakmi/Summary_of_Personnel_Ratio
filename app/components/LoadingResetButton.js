'use client';

import { useEffect, useState } from 'react';

/**
 * ปุ่มสำหรับปิด loading state ที่ค้างอยู่ในระบบ
 * ใช้ในกรณีฉุกเฉินเมื่อ loading ไม่หายไป
 */
export default function LoadingResetButton({ className = '', position = 'bottom-right' }) {
  const [showButton, setShowButton] = useState(false);
  
  // กำหนด style ตามตำแหน่ง
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // ตรวจสอบว่ามี loading alert ค้างอยู่หรือไม่
  useEffect(() => {
    // ตรวจสอบทันทีหลังจาก component mount
    const checkForLoadingAlerts = () => {
      // ตรวจหา loading alert โดยตรง
      const hasLoadingAlert = document.querySelectorAll('.swal2-container').length > 0;
      
      // ตรวจสอบจาก class บน body
      const hasBodyClass = document.body.classList.contains('swal2-shown');
      
      // ถ้าเจอ loading state ค้างอยู่ ให้แสดงปุ่ม reset
      setShowButton(hasLoadingAlert || hasBodyClass);
    };
    
    // เรียกตรวจสอบทันที และตั้งให้ตรวจสอบทุก 2 วินาที
    checkForLoadingAlerts();
    const interval = setInterval(checkForLoadingAlerts, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // ฟังก์ชันรีเซ็ต loading alert ทั้งหมด (ทำงานโดยตรงไม่ผ่าน API)
  const handleReset = () => {
    try {
      // 1. ลบ DOM element ทั้งหมดของ SweetAlert
      const containers = document.querySelectorAll('.swal2-container');
      containers.forEach(el => el.remove());
      
      // 2. ลบ backdrop ทั้งหมด
      const backdrops = document.querySelectorAll('.swal2-backdrop-show');
      backdrops.forEach(el => el.remove());
      
      // 3. ลบ class จาก body
      document.body.classList.remove('swal2-shown', 'swal2-height-auto');
      
      // 4. คืนค่า style ของ body
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      setShowButton(false);
      
      // 5. แจ้งเตือนให้ผู้ใช้ทราบ
      setTimeout(() => {
        alert('รีเซ็ตหน้าจอเรียบร้อยแล้ว หากฟอร์มยังไม่ปรากฏ กรุณารีเฟรชหน้าเว็บ');
      }, 100);
      
    } catch (error) {
      console.error('Error resetting loading alerts:', error);
      alert('เกิดข้อผิดพลาดในการรีเซ็ต: ' + error.message);
    }
  };
  
  // ถ้าไม่พบ loading state ค้าง ไม่ต้องแสดงปุ่ม
  if (!showButton) return null;

  return (
    <button
      onClick={handleReset}
      className={`fixed ${positionStyles[position]} z-[9999] bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md shadow-lg flex items-center space-x-2 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>
      <span>รีเซ็ตหน้าจอ (ปิดข้อความโหลด)</span>
    </button>
  );
}
