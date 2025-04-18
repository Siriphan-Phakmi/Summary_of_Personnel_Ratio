import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * คอมโพเนนต์สำหรับจัดการ Indexes ของ Firestore
 * หมายเหตุ: การสร้าง indexes ต้องทำผ่าน Firebase Console หรือ Firebase CLI
 */
const IndexManager: React.FC = () => {
  const [copySuccess, setCopySuccess] = useState('');

  // ข้อมูล Indexes ที่จำเป็นต้องสร้าง
  const requiredIndexes = [
    // เพิ่ม index สำหรับคอลเลกชัน wards เพื่อแก้ไข error
    {
      collection: 'wards',
      fields: [
        { fieldPath: 'active', order: 'ASCENDING' },
        { fieldPath: 'wardOrder', order: 'ASCENDING' },
        { fieldPath: '__name__', order: 'ASCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลใน wardForms ตามวันที่และ shift
    {
      collection: 'wardForms',
      fields: [
        { fieldPath: 'date', order: 'ASCENDING' },
        { fieldPath: 'shift', order: 'ASCENDING' },
        { fieldPath: 'wardId', order: 'ASCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลตาม dateString, shift และ wardId (ใช้ใน getWardForm)
    {
      collection: 'wardForms',
      fields: [
        { fieldPath: 'dateString', order: 'ASCENDING' },
        { fieldPath: 'shift', order: 'ASCENDING' },
        { fieldPath: 'wardId', order: 'ASCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลกะดึกของวันก่อนหน้า
    {
      collection: 'wardForms',
      fields: [
        { fieldPath: 'date', order: 'DESCENDING' },
        { fieldPath: 'shift', order: 'ASCENDING' },
        { fieldPath: 'wardId', order: 'ASCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลกะดึกของวันก่อนหน้าที่อนุมัติแล้ว (ใช้ใน getPreviousNightShiftForm)
    {
      collection: 'wardForms',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'dateString', order: 'ASCENDING' },
        { fieldPath: 'shift', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'finalizedAt', order: 'DESCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลตามสถานะและวันที่
    {
      collection: 'wardForms',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'ASCENDING' },
        { fieldPath: 'shift', order: 'ASCENDING' }
      ]
    },
    { 
      collection: 'wardForms',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' },
        { fieldPath: 'shift', order: 'ASCENDING' }
      ]
    },
    { 
      collection: 'wardForms',
      fields: [
        { fieldPath: 'createdBy', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ]
    },
    { 
      collection: 'wardForms',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' },
        { fieldPath: 'wardId', order: 'ASCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาแบบฟอร์มร่างล่าสุด (ใช้ใน getLatestDraftForm)
    { 
      collection: 'wardForms',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'createdBy', order: 'ASCENDING' },
        { fieldPath: 'isDraft', order: 'ASCENDING' },
        { fieldPath: 'updatedAt', order: 'DESCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลตามช่วงวันที่ (ใช้ใน getWardFormsByWardAndDate)
    { 
      collection: 'wardForms',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'ASCENDING' },
        { fieldPath: 'shift', order: 'ASCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลตามช่วงวันที่ย้อนหลัง (ใช้ใน getPreviousDayLastForm)
    { 
      collection: 'wardForms',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' },
        { fieldPath: 'updatedAt', order: 'DESCENDING' }
      ]
    },
    { 
      collection: 'approvals',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'approvals',
      fields: [
        { fieldPath: 'approvedBy', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาการอนุมัติตามฟอร์ม
    {
      collection: 'approvals',
      fields: [
        { fieldPath: 'formId', order: 'ASCENDING' },
        { fieldPath: 'approvedAt', order: 'DESCENDING' }
      ]
    },
    // เพิ่ม index สำหรับการค้นหาข้อมูลสรุปรายวัน
    {
      collection: 'dailySummaries',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'dailySummaries',
      fields: [
        { fieldPath: 'wardId', order: 'ASCENDING' },
        { fieldPath: 'dateString', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'dailySummaries',
      fields: [
        { fieldPath: 'allFormsApproved', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'systemLogs',
      fields: [
        { fieldPath: 'type', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'systemLogs',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    }
  ];

  // คัดลอก index ไปยัง clipboard
  const copyIndexToClipboard = (index: any) => {
    const indexString = JSON.stringify(index, null, 2);
    navigator.clipboard.writeText(indexString);
    setCopySuccess(`คัดลอก ${index.collection} index แล้ว`);
    toast.success(`คัดลอก ${index.collection} index แล้ว`);
    
    setTimeout(() => {
      setCopySuccess('');
    }, 3000);
  };

  // คัดลอก indexes ทั้งหมดไปยัง clipboard
  const copyAllIndexes = () => {
    const indexesString = JSON.stringify(requiredIndexes, null, 2);
    navigator.clipboard.writeText(indexesString);
    setCopySuccess('คัดลอก indexes ทั้งหมดแล้ว');
    toast.success('คัดลอก indexes ทั้งหมดแล้ว');
    
    setTimeout(() => {
      setCopySuccess('');
    }, 3000);
  };

  // สร้าง Firebase CLI คำสั่งสำหรับการสร้าง index
  const generateFirebaseCommand = (index: any) => {
    const fieldStrings = index.fields.map((field: any) => 
      `${field.fieldPath}:${field.order.toLowerCase()}`
    ).join(',');
    
    return `firebase firestore:indexes:create --collection=${index.collection} --fields="${fieldStrings}"`;
  };

  // คัดลอกคำสั่ง Firebase CLI ทั้งหมด
  const copyAllCommands = () => {
    const commands = requiredIndexes.map(index => generateFirebaseCommand(index)).join('\n');
    navigator.clipboard.writeText(commands);
    setCopySuccess('คัดลอกคำสั่ง Firebase CLI ทั้งหมดแล้ว');
    toast.success('คัดลอกคำสั่ง Firebase CLI ทั้งหมดแล้ว');
    
    setTimeout(() => {
      setCopySuccess('');
    }, 3000);
  };

  const handleCreateIndex = () => {
    toast('การสร้าง index ต้องทำผ่าน Firebase Console หรือ Firebase CLI โดยตรง', { duration: 4000 });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-medium mb-4">จัดการ Firestore Indexes</h2>
      
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Firestore จำเป็นต้องมี composite indexes เพื่อให้สามารถค้นหาข้อมูลที่ซับซ้อนได้อย่างมีประสิทธิภาพ
          โปรดสร้าง indexes ต่อไปนี้โดยใช้ Firebase Console หรือ Firebase CLI
            </p>
          </div>
      
      <div className="mb-4 flex space-x-2">
        <button
          onClick={copyAllIndexes}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          คัดลอก JSON ทั้งหมด
        </button>
        <button
          onClick={copyAllCommands}
          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          คัดลอกคำสั่ง Firebase CLI
        </button>
      </div>
      
      {copySuccess && (
        <div className="mb-4 p-2 text-sm text-green-700 bg-green-100 dark:bg-green-900/20 dark:text-green-300 rounded">
          {copySuccess}
        </div>
      )}
      
      <div className="space-y-6">
        {requiredIndexes.map((index, idx) => (
          <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium">
                คอลเลกชัน: <span className="text-blue-600 dark:text-blue-400">{index.collection}</span>
              </h3>
              <div className="space-x-2">
            <button
                  onClick={() => copyIndexToClipboard(index)}
                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
                  คัดลอก JSON
            </button>
            <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateFirebaseCommand(index));
                    toast.success(`คัดลอกคำสั่ง CLI แล้ว (${index.collection})`);
                  }}
                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
                  คัดลอกคำสั่ง CLI
            </button>
              </div>
        </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <h4 className="text-sm font-medium mb-2">ฟิลด์:</h4>
              <ul className="space-y-1 text-sm">
                {index.fields.map((field: any, fieldIdx: number) => (
                  <li key={fieldIdx} className="flex items-center">
                    <span className="text-gray-700 dark:text-gray-300">{field.fieldPath}</span>
                    <span className="mx-2 text-gray-400">:</span>
                    <span className={
                      field.order === 'ASCENDING' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }>
                      {field.order}
                        </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-md font-medium mb-2">วิธีการสร้าง Indexes</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>ไปที่ <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Firebase Console</a></li>
          <li>เลือกโปรเจค "{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'BPK Personnel Ratio'}"</li>
          <li>เลือกเมนู "Firestore Database" จากเมนูด้านซ้าย</li>
          <li>คลิกแท็บ "Indexes"</li>
          <li>คลิกปุ่ม "Add index"</li>
          <li>กรอกข้อมูลคอลเลกชันและฟิลด์ตามที่แสดงด้านบน</li>
          <li>คลิกปุ่ม "Create"</li>
        </ol>
      </div>
    </div>
  );
};

export default IndexManager; 