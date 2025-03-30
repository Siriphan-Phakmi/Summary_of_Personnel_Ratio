'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import { FiCheckCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function ApprovalPage() {
  // ข้อมูลตัวอย่างสำหรับหน้าอนุมัติ
  const sampleApprovals = [
    { id: 1, date: '2024-03-28', ward: 'หอผู้ป่วยใน 1', shift: 'เช้า', status: 'pending', submittedBy: 'พยาบาล ก' },
    { id: 2, date: '2024-03-28', ward: 'หอผู้ป่วยใน 2', shift: 'เช้า', status: 'approved', submittedBy: 'พยาบาล ข', approvedBy: 'อาจารย์ ก' },
    { id: 3, date: '2024-03-28', ward: 'หอผู้ป่วยหนัก', shift: 'ดึก', status: 'rejected', submittedBy: 'พยาบาล ค', note: 'ข้อมูลไม่ครบถ้วน' },
  ];

  // ฟังก์ชันสำหรับแสดงไอคอนสถานะ
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <FiClock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <FiAlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  // ฟังก์ชันสำหรับแสดงข้อความสถานะ
  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'อนุมัติแล้ว';
      case 'pending':
        return 'รออนุมัติ';
      case 'rejected':
        return 'ไม่อนุมัติ';
      default:
        return '';
    }
  };

  return (
    <ProtectedPage requiredRole={['admin', 'supervisor']}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">อนุมัติข้อมูล</h1>
          
          {/* กล่องค้นหาสำหรับมือถือ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  หอผู้ป่วย
                </label>
                <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                  <option value="">ทั้งหมด</option>
                  <option value="ward1">หอผู้ป่วยใน 1</option>
                  <option value="ward2">หอผู้ป่วยใน 2</option>
                  <option value="icu">หอผู้ป่วยหนัก</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  สถานะ
                </label>
                <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                  <option value="">ทั้งหมด</option>
                  <option value="pending">รออนุมัติ</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white">
                ค้นหา
              </button>
            </div>
          </div>
          
          {/* ตารางแสดงข้อมูล */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* ตารางสำหรับหน้าจอขนาดใหญ่ */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">วันที่</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">หอผู้ป่วย</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">เวร</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ผู้บันทึก</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">สถานะ</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sampleApprovals.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{item.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{item.ward}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{item.shift}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{item.submittedBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(item.status)}
                          <span className="ml-2 text-sm text-gray-900 dark:text-gray-200">{getStatusText(item.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                          ดูรายละเอียด
                        </button>
                        {item.status === 'pending' && (
                          <>
                            <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3">
                              อนุมัติ
                            </button>
                            <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                              ไม่อนุมัติ
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* รายการสำหรับมือถือ */}
            <div className="block md:hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {sampleApprovals.map((item) => (
                  <li key={item.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.ward}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">วันที่: {item.date} • เวร: {item.shift}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ผู้บันทึก: {item.submittedBy}</div>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(item.status)}
                        <span className="ml-1 text-xs text-gray-900 dark:text-gray-200">{getStatusText(item.status)}</span>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                        ดูรายละเอียด
                      </button>
                      {item.status === 'pending' && (
                        <>
                          <button className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
                            อนุมัติ
                          </button>
                          <button className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                            ไม่อนุมัติ
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
