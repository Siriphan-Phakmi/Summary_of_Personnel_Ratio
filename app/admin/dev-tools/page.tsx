'use client';

import React, { useState } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import Button from '@/app/core/ui/Button';
import Input from '@/app/core/ui/Input';
import { showErrorToast, showSuccessToast } from '@/app/core/utils/toastUtils';
import { format, addDays } from 'date-fns';
import { FormStatus, ShiftType } from '@/app/core/types/ward';

// Define type for shift selection
type TargetShift = ShiftType.MORNING | ShiftType.NIGHT | 'both';

export default function DevToolsPage() {
  const [startDate, setStartDate] = useState<string>(format(addDays(new Date(), -1), 'yyyy-MM-dd'));
  const [days, setDays] = useState<number>(1);
  const [wardIdsInput, setWardIdsInput] = useState<string>(''); // Comma or newline separated
  const [statusToGenerate, setStatusToGenerate] = useState<FormStatus>(FormStatus.FINAL);
  const [targetShift, setTargetShift] = useState<TargetShift>('both'); // Add state for target shift, default to both
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorList, setErrorList] = useState<string[]>([]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setResultMessage(null);
    setErrorList([]);

    // Parse Ward IDs
    const wardIds = wardIdsInput
      .split(/[\n,]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    const body: any = {
      startDate: startDate,
      days: days,
      statusToGenerate: statusToGenerate,
      targetShift: targetShift, // Include targetShift in the request body
    };

    if (wardIds.length > 0) {
      body.wardIds = wardIds;
    }

    try {
      const response = await fetch('/api/dev/generate-mock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccessToast('สร้างข้อมูลจำลองสำเร็จ!');
        setResultMessage(data.message || `Generated ${data.generatedCount || '?'} forms.`);
        if (data.errors && data.errors.length > 0) {
           setErrorList(data.errors);
        }
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างข้อมูลจำลอง');
      }
    } catch (error) {
      console.error("Error calling mock data API:", error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      showErrorToast(`ผิดพลาด: ${message}`);
      setResultMessage(null);
      setErrorList([message]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Restrict access to developers only
    <ProtectedPage requiredRole={['developer']}>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Developer Tools - Mock Data Generator</h1>

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <p className="text-sm text-red-500 dark:text-red-400 font-medium">คำเตือน: เครื่องมือนี้ใช้สำหรับ Development เท่านั้น!</p>

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="form-label">วันที่เริ่มต้น (Start Date)</label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
              disabled={isLoading}
            />
          </div>

          {/* Number of Days */}
          <div>
            <label htmlFor="days" className="form-label">จำนวนวัน (Days)</label>
            <Input
              id="days"
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
              min="1"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          {/* Ward IDs (Optional) */}
          <div>
            <label htmlFor="wardIds" className="form-label">ระบุ Ward IDs (Optional - คั่นด้วย comma หรือขึ้นบรรทัดใหม่)</label>
            <textarea
              id="wardIds"
              rows={3}
              value={wardIdsInput}
              onChange={(e) => setWardIdsInput(e.target.value)}
              placeholder="เช่น WARD6, WARD7, CCU\nWARD11"
              className="form-input resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">หากเว้นว่าง จะสร้างข้อมูลสำหรับทุก Ward ที่ Active</p>
          </div>

           {/* Status to Generate */}
           <div>
             <label htmlFor="statusToGenerate" className="form-label">สถานะที่จะสร้าง</label>
             <select
               id="statusToGenerate"
               value={statusToGenerate}
               onChange={(e) => setStatusToGenerate(e.target.value as FormStatus)}
               className="form-input"
               disabled={isLoading}
             >
               <option value={FormStatus.FINAL}>FINAL</option>
               {/* Add DRAFT option if needed later */}
               {/* <option value={FormStatus.DRAFT}>DRAFT</option> */}
             </select>
           </div>

          {/* Shift to Generate - New Dropdown */}
          <div>
            <label htmlFor="targetShift" className="form-label">กะที่จะสร้าง</label>
            <select
              id="targetShift"
              value={targetShift}
              onChange={(e) => setTargetShift(e.target.value as TargetShift)}
              className="form-input"
              disabled={isLoading}
            >
              <option value="both">ทั้งสองกะ (เช้าและดึก)</option>
              <option value={ShiftType.MORNING}>เฉพาะกะเช้า</option>
              <option value={ShiftType.NIGHT}>เฉพาะกะดึก</option>
            </select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            isLoading={isLoading}
            disabled={isLoading}
            loadingText="กำลังสร้างข้อมูล..."
          >
            Generate Mock Data
          </Button>

          {/* Results Area */}
          {resultMessage && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md">
              <p className="font-medium text-green-800 dark:text-green-200">สำเร็จ:</p>
              <p className="text-sm text-green-700 dark:text-green-300">{resultMessage}</p>
            </div>
          )}
          {errorList.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
              <p className="font-medium text-red-800 dark:text-red-200">พบข้อผิดพลาด:</p>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                {errorList.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
} 