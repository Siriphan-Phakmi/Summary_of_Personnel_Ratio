'use client';

import React, { useState } from 'react';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';
import LogViewer from '@/app/features/admin/LogViewer';
import { Button } from '@/app/components/ui/Button';
import { fixWard6UserAssignment, resetAllDefaultWards, checkUserWardAssignment } from '@/app/features/ward-form/services/wardService';
import { showSuccessToast, showErrorToast } from '@/app/lib/utils/toastUtils';


export default function DevToolsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<string>('');

  const handleFixWard6 = async () => {
    setIsLoading(true);
    try {
      const result = await fixWard6UserAssignment();
      if (result.success) {
        showSuccessToast(result.message);
        setCheckResult(result.message);
      } else {
        showErrorToast(result.message);
        setCheckResult(result.message);
      }
    } catch (error) {
      const errorMsg = `เกิดข้อผิดพลาด: ${error}`;
      showErrorToast(errorMsg);
      setCheckResult(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWards = async () => {
    setIsLoading(true);
    try {
      const result = await resetAllDefaultWards();
      if (result.success) {
        showSuccessToast(result.message);
        setCheckResult(result.message);
      } else {
        showErrorToast(result.message);
        setCheckResult(result.message);
      }
    } catch (error) {
      const errorMsg = `เกิดข้อผิดพลาด: ${error}`;
      showErrorToast(errorMsg);
      setCheckResult(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckUser = async (username: string) => {
    setIsLoading(true);
    try {
      const result = await checkUserWardAssignment(username);
      setCheckResult(result.message);
      if (result.hasAssignment && result.wardExists) {
        showSuccessToast(result.message);
      } else {
        showErrorToast(result.message);
      }
    } catch (error) {
      const errorMsg = `เกิดข้อผิดพลาด: ${error}`;
      showErrorToast(errorMsg);
      setCheckResult(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedPage requiredRole={UserRole.DEVELOPER}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-6">
        <div className="container mx-auto p-4 space-y-6">
          {/* Main Page Header */}
          <header>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              🛠️ Developer Tools
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Advanced debugging and testing tools for system administrators.
            </p>
          </header>

          {/* Ward Management Tools */}
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <header className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                🏥 Ward Management Tools
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                เครื่องมือแก้ไขปัญหา Ward Assignment และจัดการ Ward ต่างๆ
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Fix Ward6 Button */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">🔧 แก้ไข Ward6</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  แก้ไขปัญหา User Ward6 ที่ไม่มี ward assignment
                </p>
                <Button 
                  onClick={handleFixWard6}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? 'กำลังแก้ไข...' : 'แก้ไข Ward6'}
                </Button>
              </div>

              {/* Reset Default Wards */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">🔄 รีเซ็ต Wards</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  รีเซ็ต default wards ทั้งหมด (รวม Ward6)
                </p>
                <Button 
                  onClick={handleResetWards}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? 'กำลังรีเซ็ต...' : 'รีเซ็ต Wards'}
                </Button>
              </div>

              {/* Check User Assignment */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">🔍 ตรวจสอบ User</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  ตรวจสอบ ward assignment ของ Ward6
                </p>
                <Button 
                  onClick={() => handleCheckUser('Ward6')}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบ Ward6'}
                </Button>
              </div>
            </div>

            {/* Result Display */}
            {checkResult && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">📋 ผลลัพธ์:</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {checkResult}
                </p>
              </div>
            )}
          </div>

          {/* Log Viewer Section */}
          <div className="flex flex-col gap-4">
            <header>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                📋 บันทึกการทำงานของระบบ (System Logs)
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ตรวจสอบและจัดการบันทึกกิจกรรมต่างๆ ที่เกิดขึ้นในระบบ
              </p>
            </header>
            <LogViewer className="mt-4" />
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 