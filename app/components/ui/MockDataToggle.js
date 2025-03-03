'use client';
import { useState, useEffect } from 'react';
import { setUseMockData } from '../../lib/dataAccess';

export default function MockDataToggle() {
  const [useMock, setUseMock] = useState(false);
  
  // โหลดค่าจาก localStorage เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedValue = localStorage.getItem('useMockData');
      if (savedValue) {
        setUseMock(savedValue === 'true');
      }
    }
  }, []);

  // จัดการเมื่อมีการเปลี่ยนแปลงสถานะ toggle
  const handleToggle = () => {
    const newValue = !useMock;
    setUseMock(newValue);
    setUseMockData(newValue);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            ข้อมูลจริง
          </span>
          
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:ring-offset-2 ${
              useMock ? 'bg-[#0ab4ab]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useMock ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          
          <span className="text-sm font-medium text-gray-700">
            ข้อมูลจำลอง
          </span>
        </div>
        
        <div className="mt-1 text-xs text-gray-500 text-center">
          {useMock 
            ? 'กำลังใช้ข้อมูลจำลอง (ไม่เชื่อมต่อ Firebase)' 
            : 'กำลังใช้ข้อมูลจริง (เชื่อมต่อ Firebase)'}
        </div>
      </div>
    </div>
  );
}
