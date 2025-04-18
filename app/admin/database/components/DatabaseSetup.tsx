'use client';

import React, { useState } from 'react';
import { 
  setupDatabaseSchema, 
  createUsersCollection,
  createSessionsCollection,
  createCurrentSessionsCollection,
  createWardFormsCollection,
  createApprovalsCollection,
  createDailySummariesCollection,
  createWardsCollection,
  createSystemLogsCollection,
  checkRequiredIndexes,
  fixFormStatus
} from '../services/setupDatabaseSchema';
import { showSuccessToast, showErrorToast } from '@/app/core/utils/toastUtils';

/**
 * คอมโพเนนต์สำหรับตั้งค่าฐานข้อมูล Firebase
 */
const DatabaseSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<string>('');
  
  /**
   * สร้างโครงสร้างฐานข้อมูลทั้งหมด
   */
  const handleSetupAllCollections = async () => {
    setIsLoading(true);
    setCurrentTask('กำลังสร้างโครงสร้างฐานข้อมูลทั้งหมด...');
    
    try {
      const success = await setupDatabaseSchema();
      if (success) {
        showSuccessToast('สร้างโครงสร้างฐานข้อมูลทั้งหมดสำเร็จ');
      } else {
        showErrorToast('เกิดข้อผิดพลาดบางส่วนในการสร้างฐานข้อมูล');
      }
    } catch (error) {
      console.error('Error setting up database:', error);
      showErrorToast('เกิดข้อผิดพลาดในการสร้างฐานข้อมูล');
    } finally {
      setIsLoading(false);
      setCurrentTask('');
    }
  };
  
  /**
   * สร้างคอลเลกชันเฉพาะ
   */
  const handleCreateCollection = async (
    collectionName: string, 
    createFunction: () => Promise<void>
  ) => {
    setIsLoading(true);
    setCurrentTask(`กำลังสร้างคอลเลกชัน ${collectionName}...`);
    
    try {
      await createFunction();
      showSuccessToast(`สร้างคอลเลกชัน ${collectionName} สำเร็จ`);
    } catch (error) {
      console.error(`Error creating ${collectionName} collection:`, error);
      showErrorToast(`เกิดข้อผิดพลาดในการสร้างคอลเลกชัน ${collectionName}`);
    } finally {
      setIsLoading(false);
      setCurrentTask('');
    }
  };
  
  /**
   * ตรวจสอบ indexes ที่จำเป็น
   */
  const handleCheckIndexes = () => {
    checkRequiredIndexes();
  };
  
  /**
   * แก้ไขสถานะแบบฟอร์ม
   */
  const handleFixFormStatus = async () => {
    setIsLoading(true);
    setCurrentTask('กำลังแก้ไขสถานะแบบฟอร์ม...');
    
    try {
      await fixFormStatus();
      showSuccessToast('แก้ไขสถานะแบบฟอร์มสำเร็จ');
    } catch (error) {
      console.error('Error fixing form status:', error);
      showErrorToast('เกิดข้อผิดพลาดในการแก้ไขสถานะแบบฟอร์ม');
    } finally {
      setIsLoading(false);
      setCurrentTask('');
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-medium mb-4">ตั้งค่าโครงสร้างฐานข้อมูล Firebase</h2>
      
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          ใช้เครื่องมือนี้เพื่อสร้างโครงสร้างฐานข้อมูล Firebase ตามที่ออกแบบไว้ 
          การดำเนินการนี้จะสร้างคอลเลกชันและเอกสารตัวอย่างใน Firebase ของคุณ
        </p>
      </div>
      
      {isLoading && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-yellow-700 dark:text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-yellow-700 dark:text-yellow-500">
              {currentTask || 'กำลังดำเนินการ...'}
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleSetupAllCollections}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
          สร้างโครงสร้างฐานข้อมูลทั้งหมด
        </button>
        
        <button
          onClick={handleCheckIndexes}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
          ตรวจสอบ Indexes ที่จำเป็น
        </button>
      </div>
      
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
        <h4 className="text-sm font-medium mb-2 text-yellow-800 dark:text-yellow-300">
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            คำเตือนเกี่ยวกับ Indexes
          </span>
        </h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
          Firebase จำเป็นต้องมี composite indexes เพื่อให้ query ที่ซับซ้อนทำงานได้ ถ้าไม่มี index ที่ถูกต้อง คุณจะเจอข้อผิดพลาดดังนี้:
        </p>
        <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded text-xs text-red-700 dark:text-red-300 font-mono mb-3">
          Error: The query requires an index. You can create it here: https://console.firebase.google.com/...
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          คลิกปุ่ม "ตรวจสอบ Indexes ที่จำเป็น" เพื่อดูรายการ indexes ที่ควรสร้างใน Firebase Console
          หรือใช้คอมโพเนนต์ "จัดการ Firestore Indexes" ด้านล่าง
        </p>
      </div>
      
      <h3 className="text-md font-medium mb-2">สร้างคอลเลกชันแต่ละชนิด</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          onClick={() => handleCreateCollection('Users', createUsersCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          Users
        </button>
        
        <button
          onClick={() => handleCreateCollection('Sessions', createSessionsCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          Sessions
        </button>
        
        <button
          onClick={() => handleCreateCollection('Current Sessions', createCurrentSessionsCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          Current Sessions
        </button>
        
        <button
          onClick={() => handleCreateCollection('Ward Forms', createWardFormsCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          Ward Forms
        </button>
        
        <button
          onClick={() => handleCreateCollection('Approvals', createApprovalsCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          Approvals
        </button>
        
        <button
          onClick={() => handleCreateCollection('Daily Summaries', createDailySummariesCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          Daily Summaries
        </button>
        
        <button
          onClick={() => handleCreateCollection('Wards', createWardsCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          Wards
        </button>
        
        <button
          onClick={() => handleCreateCollection('System Logs', createSystemLogsCollection)}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          System Logs
        </button>
        
        <button
          onClick={handleFixFormStatus}
          disabled={isLoading}
          className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
          แก้ไขสถานะแบบฟอร์ม
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
        <h4 className="text-sm font-medium mb-2">หมายเหตุการตั้งค่าฐานข้อมูล</h4>
        <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
          <li>การสร้างโครงสร้างฐานข้อมูลนี้จะสร้างคอลเลกชันพร้อมเอกสารตัวอย่าง</li>
          <li>คอลเลกชันที่มีอยู่แล้วจะไม่ถูกสร้างใหม่หรือแทนที่</li>
          <li>การสร้าง Indexes ต้องทำผ่าน Firebase Console หรือ Firebase CLI</li>
          <li>หลังจากสร้างโครงสร้างฐานข้อมูลแล้ว ตรวจสอบใน Firebase Console ว่าคอลเลกชันถูกสร้างอย่างถูกต้อง</li>
        </ul>
      </div>
      
      <div className="mb-8 bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">
        <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-2">คำแนะนำในการจัดการฐานข้อมูล</h2>
        <ul className="list-disc pl-5 space-y-1 text-blue-700 dark:text-blue-300">
          <li>หน้านี้ใช้สำหรับจัดการคอลเลกชันและเอกสารใน Firebase Firestore โดยตรง</li>
          <li>การแก้ไขข้อมูลจะมีผลทันทีกับระบบที่ใช้งานจริง ควรใช้ความระมัดระวัง</li>
          <li>การสร้าง Indexes ต้องทำผ่าน Firebase Console หรือ Firebase CLI</li>
          <li>หลังจากสร้างคอลเลกชันแล้ว ตรวจสอบใน Firebase Console ว่าคอลเลกชันถูกสร้างอย่างถูกต้อง</li>
          <li className="font-medium text-blue-800 dark:text-blue-200">คอลเลกชันที่แสดงในหน้านี้เป็นเฉพาะคอลเลกชันที่มีอยู่จริงใน Firebase เท่านั้น</li>
          <li className="font-medium text-blue-800 dark:text-blue-200">เมื่อลบคอลเลกชัน ระบบจะตรวจสอบและไม่แสดงคอลเลกชันที่ไม่มีอยู่จริงโดยอัตโนมัติ</li>
          <li className="font-medium text-blue-800 dark:text-blue-200">หากต้องการคอลเลกชันที่ไม่มีอยู่ในรายการ ให้สร้างคอลเลกชันใหม่ตามต้องการ</li>
        </ul>
      </div>
    </div>
  );
};

export default DatabaseSetup; 