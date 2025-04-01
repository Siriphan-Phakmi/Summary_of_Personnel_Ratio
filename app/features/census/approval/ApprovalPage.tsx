'use client';

import React, { useState } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function ApprovalPage() {
  const [searchDate, setSearchDate] = useState('');
  const [ward, setWard] = useState('');
  const [status, setStatus] = useState('');
  
  // Mock data สำหรับตัวอย่าง
  const mockData = [
    { id: 1, date: '2024-03-28', ward: 'หอผู้ป่วยใน 1', shift: 'เช้า', submittedBy: 'พยาบาล ก', status: 'รออนุมัติ' },
    { id: 2, date: '2024-03-28', ward: 'หอผู้ป่วยใน 2', shift: 'เช้า', submittedBy: 'พยาบาล ข', status: 'อนุมัติ' },
    { id: 3, date: '2024-03-28', ward: 'หอผู้ป่วยหนัก', shift: 'ดึก', submittedBy: 'พยาบาล ค', status: 'ปฏิเสธ' },
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'อนุมัติ') {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {status}
        </span>
      );
    } else if (status === 'ปฏิเสธ') {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        {status}
      </span>
    );
  };

  return (
    <ProtectedPage requiredRole={['admin', 'supervisor']}>
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <NavBar />
        <div className="container p-4 mx-auto">
          <h1 className="page-title text-light-text dark:text-dark-text">การอนุมัติแบบฟอร์ม</h1>
          
          {/* Search filters */}
          <div className="bg-light-card dark:bg-dark-card shadow-md rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                  วันที่
                </label>
                <input 
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                  หอผู้ป่วย
                </label>
                <select 
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="ward1">หอผู้ป่วยใน 1</option>
                  <option value="ward2">หอผู้ป่วยใน 2</option>
                  <option value="icu">หอผู้ป่วยหนัก</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                  สถานะ
                </label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="pending">รออนุมัติ</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ปฏิเสธ</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button className="bg-btn-primary hover:bg-btn-primary-hover text-white py-2 px-4 rounded transition-colors font-medium text-base">
                ค้นหา
              </button>
            </div>
          </div>
          
          {/* Results table */}
          <div className="bg-light-card dark:bg-dark-card shadow-md rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">วันที่</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">หอผู้ป่วย</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">เวร</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">โดย</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">สถานะ</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {mockData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{item.date}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{item.ward}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{item.shift}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{item.submittedBy}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">
                      {getStatusIcon(item.status)}
                    </td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
