// File: app/export/page.js
'use client';
import { useState } from 'react';
import { fetchStaffRecords, formatDataForExcel, exportToExcel } from '../../lib/exportData';
import Navigation from '../dashboard/Navigation';

export default function ExportPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });

    const showNotification = (type, message) => {
        setNotification({ show: true, type, message });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            
            // ดึงข้อมูล
            const records = await fetchStaffRecords();
            
            // ตรวจสอบข้อมูลว่างเปล่า
            if (records.length === 0) {
                throw new Error('ไม่พบข้อมูลที่จะส่งออก');
            }

            // จัดรูปแบบและส่งออก
            const formattedData = formatDataForExcel(records);
            const fileName = `รายงานอัตรากำลัง_${new Date().toLocaleDateString('th-TH')}.xlsx`;
            exportToExcel(formattedData, fileName);

            // แจ้งเตือนสำเร็จ
            showNotification('success', 'ส่งออกไฟล์ Excel แล้ว');

        } catch (error) {
            // แจ้งเตือนข้อผิดพลาด
            showNotification('error', error.message || 'ไม่สามารถส่งออกข้อมูลได้');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Navigation />
            <div className="p-8 max-w-3xl mx-auto">
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold text-blue-600">📤 Export ข้อมูล</h1>
                    
                    <p className="text-lg text-gray-600">
                        ส่งออกข้อมูลทั้งหมดเป็นไฟล์ Excel สำหรับการทำรายงาน
                    </p>

                    {/* Notification */}
                    {notification.show && (
                        <div className={`p-4 rounded-md ${
                            notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {notification.message}
                        </div>
                    )}

                    <button 
                        className={`flex items-center justify-center w-full md:w-auto px-6 py-3 text-white font-medium rounded-md
                            ${isExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting && (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isExporting ? 'กำลังประมวลผล...' : 'ดาวน์โหลดไฟล์ Excel'}
                    </button>
                </div>
            </div>
        </>
    );
}