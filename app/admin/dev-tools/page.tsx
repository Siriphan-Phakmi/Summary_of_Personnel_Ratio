'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import Button from '@/app/core/ui/Button';
import Input from '@/app/core/ui/Input';
import { showErrorToast, showSuccessToast, showInfoToast } from '@/app/core/utils/toastUtils';
import { format, addDays } from 'date-fns';
import { FormStatus, ShiftType, Ward } from '@/app/core/types/ward';
import { getActiveWards } from '@/app/features/census/forms/services/wardService';

// Define type for shift selection
type TargetShift = ShiftType.MORNING | ShiftType.NIGHT | 'both';

export default function DevToolsPage() {
  const [startDate, setStartDate] = useState<string>(format(addDays(new Date(), -1), 'yyyy-MM-dd'));
  const [days, setDays] = useState<number>(1);
  const [availableWards, setAvailableWards] = useState<Ward[]>([]);
  const [selectedWardIds, setSelectedWardIds] = useState<string[]>([]);
  const [statusToGenerate, setStatusToGenerate] = useState<FormStatus>(FormStatus.FINAL);
  const [targetShift, setTargetShift] = useState<TargetShift>('both');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorList, setErrorList] = useState<string[]>([]);

  useEffect(() => {
    const fetchWards = async () => {
      setIsLoading(true);
      try {
        const wards = await getActiveWards();
        setAvailableWards(wards);
      } catch (error) {
        console.error("Error fetching active wards:", error);
        showErrorToast('เกิดข้อผิดพลาดในการดึงข้อมูล Ward');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWards();
  }, []);

  const handleWardSelectionChange = (event: ChangeEvent<HTMLInputElement>) => {
    const wardId = event.target.value;
    const isChecked = event.target.checked;

    setSelectedWardIds(prevSelected => {
      if (isChecked) {
        return [...prevSelected, wardId];
      } else {
        return prevSelected.filter(id => id !== wardId);
      }
    });
  };

  const handleGenerate = async () => {
    if (selectedWardIds.length === 0) {
        showInfoToast('กรุณาเลือก Ward อย่างน้อย 1 รายการ');
        return;
    }

    setIsLoading(true);
    setResultMessage(null);
    setErrorList([]);

    const body: any = {
      startDate: startDate,
      days: days,
      statusToGenerate: statusToGenerate,
      targetShift: targetShift,
      wardIds: selectedWardIds
    };

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
        setResultMessage(data.message || `Generated ${data.generatedCount || '?'} forms for wards: ${selectedWardIds.join(', ')}.`);
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
      setErrorList(prev => [...prev, message]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedPage requiredRole={['developer']}>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Developer Tools - Mock Data Generator</h1>

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <p className="text-sm text-red-500 dark:text-red-400 font-medium">คำเตือน: เครื่องมือนี้ใช้สำหรับ Development เท่านั้น!</p>

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

          <div>
            <label className="form-label mb-2 block">เลือก Ward ที่ต้องการสร้างข้อมูล</label>
            {isLoading && availableWards.length === 0 && <p className="text-gray-500 dark:text-gray-400">กำลังโหลดรายชื่อ Ward...</p>}
            {!isLoading && availableWards.length === 0 && <p className="text-red-500 dark:text-red-400">ไม่พบข้อมูล Ward หรือเกิดข้อผิดพลาดในการโหลด</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 p-3 rounded-md">
              {availableWards.map((ward) => (
                <div key={ward.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`ward-${ward.id}`}
                    value={ward.id}
                    checked={selectedWardIds.includes(ward.id)}
                    onChange={handleWardSelectionChange}
              disabled={isLoading}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-indigo-500"
                  />
                  <label htmlFor={`ward-${ward.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    {ward.wardName} ({ward.id})
                  </label>
                </div>
              ))}
            </div>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">หากไม่เลือก จะไม่สามารถกด Generate ได้</p>
          </div>

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
              <option value={FormStatus.DRAFT}>DRAFT</option>
             </select>
           </div>

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

          <Button
            onClick={handleGenerate}
            isLoading={isLoading}
            disabled={isLoading || selectedWardIds.length === 0}
            loadingText="กำลังทำงาน..."
          >
            Generate Mock Data
          </Button>

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