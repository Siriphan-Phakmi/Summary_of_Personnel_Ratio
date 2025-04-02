import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

/**
 * คอมโพเนนต์สำหรับจัดการกฎรักษาความปลอดภัยของ Firestore
 * หมายเหตุ: คอมโพเนนต์นี้เป็นเพียงตัวแสดงผลเนื่องจากการจัดการกฎรักษาความปลอดภัยส่วนใหญ่ทำผ่าน Firebase Console
 */
const SecurityRulesManager: React.FC = () => {
  // ตัวอย่างกฎความปลอดภัยพื้นฐาน
  const basicSecurityRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // แต่ละวอร์ดสามารถเข้าถึงได้เฉพาะผู้ที่อยู่ในวอร์ดนั้น
    match /wards/{wardId} {
      allow read: if request.auth != null && 
        (request.auth.token.ward == wardId || request.auth.token.role == 'admin');
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // เอกสารผู้ใช้สามารถอ่านได้โดยผู้ใช้คนนั้นหรือผู้ดูแลระบบ
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || request.auth.token.role == 'admin');
      allow write: if request.auth != null && 
        (request.auth.uid == userId || request.auth.token.role == 'admin');
    }
    
    // กฎอื่นๆ ที่ให้สิทธิ์เข้าถึงสำหรับผู้ดูแลระบบ
    match /{document=**} {
      allow read: if request.auth != null && request.auth.token.role == 'admin';
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}`;

  const advancedSecurityRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้เป็นผู้ดูแลระบบหรือไม่
    function isAdmin() {
      return request.auth != null && request.auth.token.role == 'admin';
    }
    
    // ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้อยู่ในวอร์ดเดียวกันกับข้อมูลหรือไม่
    function isSameWard(wardId) {
      return request.auth != null && request.auth.token.ward == wardId;
    }
    
    // ฟังก์ชันสำหรับตรวจสอบว่าเป็นเจ้าของข้อมูลหรือไม่
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // กฎสำหรับคอลเลกชัน wards
    match /wards/{wardId} {
      allow read: if isAdmin() || isSameWard(wardId);
      allow write: if isAdmin();
      
      // กฎสำหรับเอกสารย่อยภายในวอร์ด
      match /forms/{formId} {
        allow read: if isAdmin() || isSameWard(wardId);
        allow create, update: if isAdmin() || isSameWard(wardId);
        allow delete: if isAdmin();
      }
    }
    
    // กฎสำหรับคอลเลกชัน users
    match /users/{userId} {
      allow read: if isAdmin() || isOwner(userId);
      allow create: if isAdmin();
      allow update: if isAdmin() || isOwner(userId);
      allow delete: if isAdmin();
    }
    
    // กฎสำหรับคอลเลกชัน sessions
    match /sessions/{sessionId} {
      allow read: if isAdmin();
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update: if isAdmin() || (request.auth != null && resource.data.userId == request.auth.uid);
      allow delete: if isAdmin();
    }
    
    // กฎสำหรับคอลเลกชันอื่นๆ
    match /{document=**} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
  }
}`;

  const [selectedRule, setSelectedRule] = useState<'basic' | 'advanced'>('basic');
  const [rules, setRules] = useState(basicSecurityRules);

  // เปลี่ยนกฎตามที่เลือก
  useEffect(() => {
    setRules(selectedRule === 'basic' ? basicSecurityRules : advancedSecurityRules);
  }, [selectedRule]);

  // แจ้งเตือนว่าเป็นเพียงตัวอย่างเท่านั้น
  const handleSaveRules = () => {
    toast.success('บันทึกกฎความปลอดภัยเรียบร้อย (จำลอง)');
    toast.info('หมายเหตุ: การเปลี่ยนกฎจริงต้องทำผ่าน Firebase Console');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">กฎรักษาความปลอดภัย Firebase</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700 dark:text-yellow-400">
            หมายเหตุ: ส่วนนี้เป็นเพียงตัวอย่าง การแก้ไขกฎความปลอดภัยจริงต้องทำผ่าน Firebase Console
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            เลือกประเภทกฎความปลอดภัย
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={selectedRule === 'basic'}
                onChange={() => setSelectedRule('basic')}
                className="mr-2"
              />
              <span>กฎพื้นฐาน</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={selectedRule === 'advanced'}
                onChange={() => setSelectedRule('advanced')}
                className="mr-2"
              />
              <span>กฎขั้นสูง</span>
            </label>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            กฎรักษาความปลอดภัย
          </label>
          <div className="relative">
            <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-600 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap h-96 overflow-auto">
              {rules}
            </pre>
            <div className="absolute top-2 right-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(rules);
                  toast.success('คัดลอกกฎความปลอดภัยแล้ว');
                }}
                className="p-1 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                title="คัดลอกไปยังคลิปบอร์ด"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveRules}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            บันทึกกฎความปลอดภัย (จำลอง)
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">คำแนะนำในการกำหนดกฎความปลอดภัย</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              1. กำหนดสิทธิ์ตามบทบาท (Role-Based Access)
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              กำหนดสิทธิ์การเข้าถึงตามบทบาทของผู้ใช้ เช่น admin, user, moderator โดยตรวจสอบจาก custom claims ในโทเค็นการตรวจสอบตัวตน
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              2. ตรวจสอบความเป็นเจ้าของข้อมูล (Ownership)
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              อนุญาตให้ผู้ใช้แก้ไขข้อมูลของตนเองเท่านั้น โดยตรวจสอบจาก UID ที่บันทึกในข้อมูลกับ UID ของผู้ที่กำลังเข้าถึง
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              3. ตรวจสอบความถูกต้องของข้อมูล (Data Validation)
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              กำหนดกฎเพื่อตรวจสอบรูปแบบและข้อมูลที่จะบันทึก เช่น ต้องมีฟิลด์บังคับ, ตรวจสอบประเภทข้อมูล, ขนาดข้อมูล
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              4. แยกการอนุญาตตามการดำเนินการ (Operation)
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              ระบุการอนุญาตเฉพาะสำหรับแต่ละการดำเนินการ (read, create, update, delete) แทนที่จะอนุญาตทั้งหมดในครั้งเดียว
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              5. ทดสอบกฎการรักษาความปลอดภัย
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              ใช้เครื่องมือจำลองกฎใน Firebase Console เพื่อทดสอบกฎความปลอดภัยก่อนนำไปใช้งานจริง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityRulesManager; 