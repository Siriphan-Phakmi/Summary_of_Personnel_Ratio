'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { DailySummary } from '@/app/core/types/approval';
import { useAuth } from '@/app/features/auth';
import { getSummaryById } from '@/app/features/census/forms/services/approvalServices/dailySummary';
import { Timestamp } from 'firebase/firestore';

interface SummaryDetailPageProps {
  summaryId: string;
}

export default function SummaryDetailPage({ summaryId }: SummaryDetailPageProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      if (!summaryId || !user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getSummaryById(summaryId);
        setSummary(data);
      } catch (err) {
        console.error('Error loading summary details:', err);
        setError('ไม่สามารถโหลดข้อมูลรายละเอียดได้');
      } finally {
        setLoading(false);
      }
    };
    
    loadSummary();
  }, [summaryId, user]);

  // ฟังก์ชันฟอร์แมตวันที่เป็นภาษาไทย
  const formatThaiDate = (dateValue: Timestamp | Date | string): string => {
    if (!dateValue) return '';
    try {
      let date: Date;
      
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (dateValue && typeof dateValue.toDate === 'function') {
        // สำหรับ Timestamp จาก Firebase
        date = dateValue.toDate();
      } else if (dateValue && 'seconds' in dateValue) {
        // กรณีเป็น Timestamp แบบ object ที่มี seconds
        date = new Date((dateValue.seconds as number) * 1000);
      } else {
        return String(dateValue);
      }
      
      return format(date, 'd MMMM yyyy', { locale: th });
    } catch (err) {
      return String(dateValue);
    }
  };

  if (loading) {
    return (
      <ProtectedPage>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <NavBar />
          <div className="container mx-auto px-4 py-8">
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  if (error || !summary) {
    return (
      <ProtectedPage>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <NavBar />
          <div className="container mx-auto px-4 py-8">
            <div className="p-8 text-center">
              <p className="text-red-500">{error || 'ไม่พบข้อมูลรายละเอียด'}</p>
              <button 
                onClick={() => window.history.back()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                กลับไปหน้าก่อนหน้า
              </button>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">รายละเอียดสรุปประจำวัน</h1>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              กลับไปหน้าก่อนหน้า
            </button>
          </div>
          
          {/* ส่วนข้อมูลหลัก */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">ข้อมูลทั่วไป</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">วันที่</h3>
                  <p className="text-base text-gray-900 dark:text-gray-200">
                    {formatThaiDate(summary.date)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">แผนก</h3>
                  <p className="text-base text-gray-900 dark:text-gray-200">
                    {summary.wardName}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ผู้บันทึก</h3>
                  <p className="text-base text-gray-900 dark:text-gray-200">
                    {summary.lastUpdaterFirstName || ''} {summary.lastUpdaterLastName || ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* ส่วนข้อมูลสรุป 24 ชั่วโมง */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">สรุปข้อมูล 24 ชั่วโมง</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ยอดผู้ป่วยรวม</h3>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-200">
                    {summary.nightCalculatedCensus !== undefined ? summary.nightCalculatedCensus : summary.dailyPatientCensus || 0}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">จำนวนพยาบาลรวม</h3>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-200">
                    {summary.dailyNurseTotal || 0}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">อัตราส่วนพยาบาลต่อผู้ป่วย</h3>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-200">
                    {summary.dailyNurseRatio ? summary.dailyNurseRatio.toFixed(2) : '-'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ยอด OPD 24 ชั่วโมง</h3>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-200">
                    {summary.opd24hr || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* ส่วนข้อมูลการรับ-จำหน่ายผู้ป่วย */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">ข้อมูลการรับผู้ป่วย</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ผู้ป่วยเก่า</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.oldPatient || 0}</p>
                  </div>
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ผู้ป่วยใหม่</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.newPatient || 0}</p>
                  </div>
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">รับใหม่เวรเช้า</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.morningNewAdmit || 0}</p>
                  </div>
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">รับใหม่เวรดึก</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.nightNewAdmit || 0}</p>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3 font-semibold">
                    <h3 className="text-base text-gray-800 dark:text-gray-200">ยอดรับใหม่ 24 ชั่วโมง</h3>
                    <p className="text-base text-gray-800 dark:text-gray-200">{summary.dailyAdmitTotal || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">ข้อมูลการจำหน่ายผู้ป่วย</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำหน่ายปกติเวรเช้า</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.morningDischargeTotal || 0}</p>
                  </div>
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำหน่ายปกติเวรดึก</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.nightDischargeTotal || 0}</p>
                  </div>
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำหน่ายเนื่องจากเสียชีวิต</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.dailyDeadTotal || 0}</p>
                  </div>
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ส่งต่อ</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.dailyReferOutTotal || 0}</p>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3 font-semibold">
                    <h3 className="text-base text-gray-800 dark:text-gray-200">จำหน่ายรวม 24 ชั่วโมง</h3>
                    <p className="text-base text-gray-800 dark:text-gray-200">{summary.dailyDischargeAllTotal || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* ส่วนข้อมูลแยกตามกะ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">ข้อมูลกะเช้า</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำนวนผู้ป่วย</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">
                      {summary.morningCalculatedCensus !== undefined ? summary.morningCalculatedCensus : summary.morningPatientCensus || 0}
                    </p>
                  </div>
                  
                  {/* แสดงค่าที่ป้อนถ้าแตกต่างจากค่าที่คำนวณได้ */}
                  {summary.morningCalculatedCensus !== undefined && 
                   summary.morningCalculatedCensus !== summary.morningPatientCensus && (
                    <div className="flex justify-between mt-1">
                      <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500">ค่าที่ป้อน</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{summary.morningPatientCensus || 0}</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำนวนพยาบาล</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.morningNurseTotal || 0}</p>
                  </div>

                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">อัตราส่วน</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">
                      {summary.morningNurseRatio ? summary.morningNurseRatio.toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">ข้อมูลกะดึก</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำนวนผู้ป่วย</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">
                      {summary.nightCalculatedCensus !== undefined ? summary.nightCalculatedCensus : summary.nightPatientCensus || 0}
                    </p>
                  </div>
                  
                  {/* แสดงค่าที่ป้อนถ้าแตกต่างจากค่าที่คำนวณได้ */}
                  {summary.nightCalculatedCensus !== undefined && 
                   summary.nightCalculatedCensus !== summary.nightPatientCensus && (
                    <div className="flex justify-between mt-1">
                      <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500">ค่าที่ป้อน</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{summary.nightPatientCensus || 0}</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำนวนพยาบาล</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{summary.nightNurseTotal || 0}</p>
                  </div>

                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">อัตราส่วน</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">
                      {summary.nightNurseRatio ? summary.nightNurseRatio.toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 