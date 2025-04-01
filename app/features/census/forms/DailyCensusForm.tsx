'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function DailyCensusForm() {
  return (
    <ProtectedPage>
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <NavBar />
        <div className="container p-4 mx-auto">
          <h1 className="page-title text-light-text dark:text-dark-text">แบบฟอร์มบันทึกข้อมูลประจำวัน</h1>
          
          <div className="bg-light-card dark:bg-dark-card shadow-md rounded-lg p-6">
            {/* เนื้อหาฟอร์มตัวอย่าง - สามารถแก้ไขเพิ่มเติมในอนาคต */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                    วันที่
                  </label>
                  <input 
                    type="date" 
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                    dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                    dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                    เวร
                  </label>
                  <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                    dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                    dark:focus:border-blue-400 dark:focus:ring-blue-400">
                    <option value="morning">เช้า</option>
                    <option value="evening">บ่าย</option>
                    <option value="night">ดึก</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                  หอผู้ป่วย
                </label>
                <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                    dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                    dark:focus:border-blue-400 dark:focus:ring-blue-400">
                  <option value="">-- เลือกหอผู้ป่วย --</option>
                  <option value="ward1">หอผู้ป่วยใน 1</option>
                  <option value="ward2">หอผู้ป่วยใน 2</option>
                  <option value="icu">หอผู้ป่วยหนัก</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button className="bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 py-2 px-4 rounded transition-colors font-medium text-base">
                บันทึกเป็นฉบับร่าง
              </button>
              <button className="bg-btn-primary hover:bg-btn-primary-hover text-white py-2 px-4 rounded transition-colors font-medium text-base">
                บันทึกและส่ง
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
