import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * คอมโพเนนต์สำหรับจัดการดัชนี (Indexes) ของ Firestore
 * หมายเหตุ: คอมโพเนนต์นี้เป็นเพียงตัวแสดงผลเนื่องจากการจัดการดัชนีส่วนใหญ่ทำผ่าน Firebase Console
 */
const IndexManager: React.FC = () => {
  // สถานะสำหรับการเลือกประเภทดัชนี
  const [activeTab, setActiveTab] = useState<'single' | 'composite'>('single');

  // ข้อมูลตัวอย่างของดัชนีฟิลด์เดี่ยว
  const singleFieldIndexes = [
    { 
      collection: 'users', 
      field: 'createdAt', 
      mode: 'ASCENDING', 
      status: 'READY' 
    },
    { 
      collection: 'users', 
      field: 'role', 
      mode: 'ASCENDING', 
      status: 'READY' 
    },
    { 
      collection: 'wards', 
      field: 'wardName', 
      mode: 'ASCENDING', 
      status: 'READY' 
    },
    { 
      collection: 'forms', 
      field: 'createdAt', 
      mode: 'DESCENDING', 
      status: 'READY' 
    },
    { 
      collection: 'forms', 
      field: 'status', 
      mode: 'ASCENDING', 
      status: 'READY' 
    }
  ];

  // ข้อมูลตัวอย่างของดัชนีฟิลด์ผสม
  const compositeIndexes = [
    {
      collection: 'forms',
      fields: [
        { field: 'wardId', mode: 'ASCENDING' },
        { field: 'createdAt', mode: 'DESCENDING' }
      ],
      status: 'READY',
      queryScopes: ['COLLECTION']
    },
    {
      collection: 'users',
      fields: [
        { field: 'role', mode: 'ASCENDING' },
        { field: 'createdAt', mode: 'DESCENDING' }
      ],
      status: 'READY',
      queryScopes: ['COLLECTION']
    },
    {
      collection: 'sessions',
      fields: [
        { field: 'userId', mode: 'ASCENDING' },
        { field: 'createdAt', mode: 'DESCENDING' }
      ],
      status: 'READY',
      queryScopes: ['COLLECTION']
    }
  ];

  // จำลองการสร้าง index
  const handleCreateIndex = () => {
    toast.success('ส่งคำขอสร้างดัชนีเรียบร้อย (จำลอง)');
    toast.info('หมายเหตุ: การสร้างดัชนีจริงต้องทำผ่าน Firebase Console');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">ดัชนี Firestore</h2>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-yellow-700 dark:text-yellow-400">
              หมายเหตุ: ส่วนนี้เป็นเพียงตัวอย่าง การจัดการดัชนีจริงต้องทำผ่าน Firebase Console
            </p>
          </div>
        </div>

        {/* แท็บสำหรับเลือกประเภทดัชนี */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px px-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`py-4 px-6 font-medium border-b-2 ${
                activeTab === 'single'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              ดัชนีฟิลด์เดี่ยว
            </button>
            <button
              onClick={() => setActiveTab('composite')}
              className={`py-4 px-6 font-medium border-b-2 ${
                activeTab === 'composite'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              ดัชนีฟิลด์ผสม
            </button>
          </nav>
        </div>

        {/* แสดงรายการดัชนี */}
        {activeTab === 'single' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    คอลเลกชัน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ฟิลด์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    โหมด
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {singleFieldIndexes.map((index, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                      {index.collection}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                      {index.field}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                      {index.mode === 'ASCENDING' ? (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-xs">
                          เรียงจากน้อยไปมาก
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-md text-xs">
                          เรียงจากมากไปน้อย
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-xs">
                        พร้อมใช้งาน
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    คอลเลกชัน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ฟิลด์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ขอบเขตการค้นหา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {compositeIndexes.map((index, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                      {index.collection}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                      {index.fields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="mb-1 last:mb-0">
                          <span className="font-medium">{field.field}</span>: 
                          <span className={`ml-2 text-sm ${
                            field.mode === 'ASCENDING' 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-purple-600 dark:text-purple-400'
                          }`}>
                            {field.mode === 'ASCENDING' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-md text-xs">
                        {index.queryScopes.join(', ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-xs">
                        พร้อมใช้งาน
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ส่วนสำหรับสร้างดัชนีใหม่ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">สร้างดัชนีใหม่ (จำลอง)</h2>
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            การสร้างดัชนีจะช่วยเพิ่มประสิทธิภาพในการค้นหาข้อมูล โดยเฉพาะการค้นหาที่มีการเรียงลำดับหรือการกรองหลายเงื่อนไข
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleCreateIndex}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              สร้างดัชนีใหม่
            </button>
          </div>
        </div>
      </div>

      {/* ข้อมูลเพิ่มเติมเกี่ยวกับดัชนี */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">ทำไมต้องใช้ดัชนี?</h2>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            ดัชนีใน Firestore ช่วยเพิ่มประสิทธิภาพในการค้นหาข้อมูล โดยเฉพาะในกรณีต่อไปนี้:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400">
            <li>การค้นหาด้วยเงื่อนไขหลายข้อ</li>
            <li>การค้นหาพร้อมกับการเรียงลำดับผลลัพธ์</li>
            <li>การค้นหาในคอลเลกชันขนาดใหญ่</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            โดยทั่วไป Firestore จะสร้างดัชนีฟิลด์เดี่ยวให้โดยอัตโนมัติ แต่สำหรับการค้นหาที่ซับซ้อน คุณอาจต้องกำหนดดัชนีฟิลด์ผสมเอง
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">ตัวอย่างการใช้ดัชนีฟิลด์ผสม</h3>
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
{`// ค้นหาแบบฟอร์มในวอร์ดเฉพาะ เรียงตามวันที่สร้าง
db.collection('forms')
  .where('wardId', '==', 'ward123')
  .orderBy('createdAt', 'desc')
  .get();`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexManager; 