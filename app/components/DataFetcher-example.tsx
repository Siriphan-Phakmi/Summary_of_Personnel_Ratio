'use client';

import { useState, useEffect } from 'react';
import { useLoading } from '@/app/core/contexts/LoadingContext';

// สมมติว่ามีฟังก์ชัน fetchData สำหรับดึงข้อมูลจาก API
async function fetchData() {
  // จำลองการดึงข้อมูลที่ใช้เวลา 2 วินาที
  return new Promise<{ id: number; name: string }[]>((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: 'วอร์ดเด็ก' },
        { id: 2, name: 'วอร์ดผู้ใหญ่' },
        { id: 3, name: 'ไอซียู' },
      ]);
    }, 2000);
  });
}

export default function DataFetcherExample() {
  const [data, setData] = useState<any[]>([]);
  const { withLoading } = useLoading();

  useEffect(() => {
    // ใช้ withLoading เพื่อแสดง loading indicator ระหว่างโหลดข้อมูล
    const loadData = async () => {
      try {
        const result = await withLoading(fetchData());
        setData(result);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [withLoading]);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">ข้อมูลวอร์ด</h2>
      
      <div className="space-y-2">
        {data.map((item) => (
          <div 
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
          >
            {item.name}
          </div>
        ))}
        
        {data.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
        )}
      </div>
    </div>
  );
} 