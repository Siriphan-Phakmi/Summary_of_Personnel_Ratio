'use client';

import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission } from '@/app/features/census/forms/services/wardService';
import { getDailySummariesByFilters } from '@/app/features/census/forms/services/approvalService';
import { DailySummary } from '@/app/core/types/approval';
import { Ward } from '@/app/core/types/ward';
import { getApprovedSummariesByDateRange } from '@/app/features/census/forms/services/approvalServices/dailySummary';
import { UserRole } from '@/app/core/types/user';

export default function DashboardPage() {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [approvedOnly, setApprovedOnly] = useState<boolean>(false);

  // โหลดรายการแผนกตามสิทธิ์ผู้ใช้
  useEffect(() => {
    const loadWards = async () => {
      if (!user) return;
      
      try {
        const userWards = await getWardsByUserPermission(user);
        setWards(userWards);
        
        // ถ้ามีแผนกอย่างน้อย 1 แผนก ให้เลือกแผนกตามสิทธิ์
        if (userWards.length > 0) {
          // กำหนดการเลือกแผนกตามบทบาทและสิทธิ์
          if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER) {
            // Admin และ Developer สามารถเลือกแผนกได้อิสระ เริ่มต้นที่แผนกแรก
            setSelectedWard(userWards[0].id);
          } else if (user.role === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
            // Approver เริ่มต้นที่แผนกแรกที่ตนมีสิทธิ์อนุมัติ
            setSelectedWard(user.approveWardIds[0]);
          } else if ((user.role === UserRole.NURSE || user.role === UserRole.VIEWER) && user.floor) {
            // Nurse และ Viewer เห็นเฉพาะแผนกที่ตนสังกัด
            const assignedWard = userWards.find(ward => ward.id === user.floor);
            if (assignedWard) {
              setSelectedWard(assignedWard.id);
            } else {
              console.warn(`[DashboardPage] User with floor ${user.floor} does not have access to that ward`);
              setError('คุณไม่มีสิทธิ์ในการเข้าถึงแผนกนี้');
            }
          } else {
            // กรณีอื่นๆ เลือกแผนกแรก
            setSelectedWard(userWards[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading wards:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
      }
    };
    
    loadWards();
  }, [user]);

  // โหลดข้อมูลสรุปเมื่อมีการเลือกแผนกหรือช่วงวันที่
  useEffect(() => {
    const loadSummaries = async () => {
      if (!selectedWard || !startDate || !endDate || !user) return;
      
      // สำหรับ NURSE หรือ VIEWER ตรวจสอบว่าเลือกแผนกตรงกับ user.floor หรือไม่
      if ((user.role === UserRole.NURSE || user.role === UserRole.VIEWER) && user.floor && selectedWard !== user.floor) {
        console.warn(`[DashboardPage] User with role ${user.role} attempted to view data from ward ${selectedWard} but is assigned to ${user.floor}`);
        setSummaries([]);
        setError('คุณไม่มีสิทธิ์ดูข้อมูลของแผนกนี้');
        setLoading(false);
        return;
      }
      
      // สำหรับ APPROVER ตรวจสอบว่าเลือกแผนกที่มีสิทธิ์อนุมัติหรือไม่
      if (user.role === UserRole.APPROVER && user.approveWardIds && !user.approveWardIds.includes(selectedWard)) {
        console.warn(`[DashboardPage] Approver attempted to view data from ward ${selectedWard} but has permission for ${user.approveWardIds.join(', ')}`);
        setSummaries([]);
        setError('คุณไม่มีสิทธิ์ดูข้อมูลของแผนกนี้');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        if (approvedOnly) {
          // โหลดเฉพาะข้อมูลที่อนุมัติแล้ว
          await loadApprovedSummaries();
        } else {
          // โหลดข้อมูลทั้งหมด
          const filters = {
            wardId: selectedWard,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          };
          
          const data = await getDailySummariesByFilters(filters);
          setSummaries(data);
        }
      } catch (err) {
        console.error('Error loading summaries:', err);
        setError('ไม่สามารถโหลดข้อมูลสรุปได้');
      } finally {
        setLoading(false);
      }
    };
    
    loadSummaries();
  }, [selectedWard, startDate, endDate, approvedOnly, user]);

  // โหลดเฉพาะข้อมูลที่ได้รับการอนุมัติแล้ว
  const loadApprovedSummaries = async () => {
    try {
      const approvedData = await getApprovedSummariesByDateRange(
        selectedWard, 
        new Date(startDate), 
        new Date(endDate)
      );
      setSummaries(approvedData);
    } catch (err) {
      console.error('Error loading approved summaries:', err);
      setError('ไม่สามารถโหลดข้อมูลที่อนุมัติแล้ว');
      throw err;
    }
  };

  // สร้างฟังก์ชันสำหรับคำนวณค่าเฉลี่ย
  const calculateAverage = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sum = values.reduce((total, value) => total + value, 0);
    return sum / values.length;
  };

  // คำนวณสถิติสรุป
  const calculateStats = () => {
    if (summaries.length === 0) {
      return {
        avgPatientCensus: 0,
        avgNurseTotal: 0,
        avgNurseRatio: 0,
        totalAdmissions: 0,
        totalDischarges: 0,
        avgOPD: 0
      };
    }
    
    const patientCensus = summaries.map(s => s.dailyPatientCensus || 0);
    const nurseTotal = summaries.map(s => s.dailyNurseTotal || 0);
    const nurseRatio = summaries.map(s => s.dailyNurseRatio || 0);
    const admissions = summaries.map(s => s.dailyAdmitTotal || 0);
    const discharges = summaries.map(s => s.dailyDischargeAllTotal || 0);
    const opd = summaries.map(s => s.opd24hr || 0);
    
    return {
      avgPatientCensus: calculateAverage(patientCensus),
      avgNurseTotal: calculateAverage(nurseTotal),
      avgNurseRatio: calculateAverage(nurseRatio),
      totalAdmissions: admissions.reduce((sum, val) => sum + val, 0),
      totalDischarges: discharges.reduce((sum, val) => sum + val, 0),
      avgOPD: calculateAverage(opd)
    };
  };

  const stats = calculateStats();

  // ฟังก์ชันฟอร์แมตวันที่เป็นภาษาไทย
  const formatThaiDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'd MMMM yyyy', { locale: th });
    } catch (err) {
      return dateString;
    }
  };

  // เพิ่มการตรวจสอบว่าผู้ใช้มีสิทธิ์ในการเปลี่ยนแผนกหรือไม่
  const canSelectAnyWard = user && (
    user.role === UserRole.ADMIN || 
    user.role === UserRole.SUPER_ADMIN || 
    user.role === UserRole.DEVELOPER
  );

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">รายงานและแดชบอร์ด</h1>
          
          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  เลือกแผนก
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm 
                  focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                  dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={!canSelectAnyWard}
                >
                  <option value="">-- เลือกแผนก --</option>
                  {wards.map((ward) => (
                    <option 
                      key={ward.id} 
                      value={ward.id}
                      disabled={!canSelectAnyWard && ward.id !== (user?.floor || '')}
                    >
                      {ward.wardName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm 
                  focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                  dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm 
                  focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                  dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={approvedOnly}
                  onChange={(e) => setApprovedOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">แสดงเฉพาะข้อมูลที่อนุมัติแล้ว</span>
              </label>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ผู้ป่วยเฉลี่ย/วัน</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgPatientCensus.toFixed(1)}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">พยาบาลเฉลี่ย/วัน</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgNurseTotal.toFixed(1)}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">อัตราส่วนพยาบาล:ผู้ป่วย</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgNurseRatio.toFixed(2)}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">รับใหม่ทั้งหมด</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalAdmissions}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">จำหน่ายทั้งหมด</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalDischarges}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">OPD เฉลี่ย/วัน</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgOPD.toFixed(1)}</p>
            </div>
          </div>
          
          {/* Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">รายงานสรุปรายวัน</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-300">กำลังโหลดข้อมูล...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            ) : summaries.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-300">ไม่พบข้อมูล กรุณาเลือกแผนกและช่วงวันที่อื่น</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">วันที่</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ผู้ป่วยกะเช้า</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ผู้ป่วยกะดึก</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">พยาบาลเช้า</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">พยาบาลดึก</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">รับใหม่</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">จำหน่าย</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">อัตราส่วน</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {summaries.map((summary) => (
                      <tr key={summary.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {formatThaiDate(summary.dateString)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {summary.morningPatientCensus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {summary.nightPatientCensus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {summary.morningNurseTotal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {summary.nightNurseTotal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {summary.dailyAdmitTotal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {summary.dailyDischargeAllTotal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {summary.dailyNurseRatio ? summary.dailyNurseRatio.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 