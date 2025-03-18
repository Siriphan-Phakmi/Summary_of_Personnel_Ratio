import React from 'react';

/**
 * Card component ที่แสดงสถานะของแผนก พร้อมปุ่มเปิดฟอร์มกรอกข้อมูล
 */
const DepartmentStatusCard = ({ ward, onFormOpen }) => {
  if (!ward) return null;

  return (
    <div className="bg-white shadow-md rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <span className="text-[#0ab4ab] mr-2">🏥</span> {ward.name || 'แผนก'}
          </h2>
          <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
            {ward.type || 'ทั่วไป'}
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">รหัสแผนก:</span>
            <span className="font-medium">{ward.id || '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">จำนวนเตียง:</span>
            <span className="font-medium">{ward.beds || '0'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">สถานะการบันทึกล่าสุด:</span>
            <span className="text-green-600 font-medium">พร้อมรับข้อมูล</span>
          </div>
        </div>

        <button
          onClick={onFormOpen}
          className="w-full bg-gradient-to-r from-[#0ab4ab] to-blue-500 hover:from-[#0ab4ab]/90 hover:to-blue-600 text-white py-2.5 px-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 shadow-md"
        >
          เปิดฟอร์มกรอกข้อมูล
        </button>
      </div>
    </div>
  );
};

export default DepartmentStatusCard; 