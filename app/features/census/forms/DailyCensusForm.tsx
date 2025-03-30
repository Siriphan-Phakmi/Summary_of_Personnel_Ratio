'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function DailyCensusForm() {
  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">แบบฟอร์มบันทึกข้อมูลประจำวัน</h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
            {/* เนื้อหาฟอร์มตัวอย่าง - สามารถแก้ไขเพิ่มเติมในอนาคต */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    วันที่
                  </label>
                  <input 
                    type="date" 
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    เวร
                  </label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                    <option value="morning">เช้า</option>
                    <option value="evening">บ่าย</option>
                    <option value="night">ดึก</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  หอผู้ป่วย
                </label>
                <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                  <option value="">-- เลือกหอผู้ป่วย --</option>
                  <option value="ward1">หอผู้ป่วยใน 1</option>
                  <option value="ward2">หอผู้ป่วยใน 2</option>
                  <option value="icu">หอผู้ป่วยหนัก</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                บันทึกเป็นฉบับร่าง
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white">
                บันทึกและส่ง
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
