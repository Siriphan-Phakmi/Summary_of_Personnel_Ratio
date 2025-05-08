'use client';

import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission, getAllWards } from '@/app/features/census/forms/services/wardService';
import { getDailySummariesByFilters } from '@/app/features/census/forms/services/approvalService';
import { DailySummary } from '@/app/core/types/approval';
import { Ward } from '@/app/core/types/ward';
import { getApprovedSummariesByDateRange } from '@/app/features/census/forms/services/approvalServices/dailySummary';
import { UserRole } from '@/app/core/types/user';

// สร้าง StatCard component เพื่อใช้ซ้ำ (ถ้ายังไม่มี)
const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h4>
    <p className="text-xl font-bold text-gray-800 dark:text-white">{value}</p>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'table'>('details');
  const [approvedOnly, setApprovedOnly] = useState(false);

  // โหลดรายการแผนกตามสิทธิ์ผู้ใช้
  useEffect(() => {
    const loadWards = async () => {
      if (!user) {
        setWards([]); // Clear wards if no user
        setLoading(false); // Ensure loading is set to false
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const userWards = await getWardsByUserPermission(user);
        setWards(userWards);
        
        // ถ้ามีแผนกอย่างน้อย 1 แผนก ให้เลือกแผนกตามสิทธิ์
        if (userWards.length > 0) {
          // กำหนดการเลือกแผนกตามบทบาทและสิทธิ์
          if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER) {
            setSelectedWard(userWards[0].id); // Admin และ Developer สามารถเลือกแผนกได้อิสระ เริ่มต้นที่แผนกแรก
          } else if (user.role === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
            // Approver เริ่มต้นที่แผนกแรกที่ตนมีสิทธิ์อนุมัติ
            // Ensure user.approveWardIds is treated as an array
            const approveWards = Array.isArray(user.approveWardIds) ? user.approveWardIds : [];
            const firstApprovableWard = userWards.find(ward => approveWards.includes(ward.id));
            if (firstApprovableWard) {
              setSelectedWard(firstApprovableWard.id);
            } else {
              setSelectedWard(userWards[0].id); // Fallback to first ward if no specifically approvable ward is found
            }
          } else if ((user.role === UserRole.NURSE || user.role === UserRole.VIEWER) && user.floor) {
            // Nurse และ Viewer เห็นเฉพาะแผนกที่ตนสังกัด
            const assignedWard = userWards.find(ward => ward.id === user.floor);
            if (assignedWard) {
              setSelectedWard(assignedWard.id);
            } else {
              console.warn(`[DashboardPage] User ${user.uid} with floor ${user.floor} does not have direct access to that ward or ward list is filtered.`);
              // อาจจะแสดงข้อความว่าไม่พบแผนกที่กำหนด หรือเลือกแผนกแรกในลิสต์ถ้ามี
              if(userWards.length > 0) setSelectedWard(userWards[0].id);
              else setError('ไม่พบแผนกที่ท่านสังกัด หรือ ไม่มีสิทธิ์เข้าถึงแผนกใดๆ');
            }
          } else {
            // กรณีอื่นๆ เลือกแผนกแรก
            setSelectedWard(userWards[0].id);
          }
        } else {
          setError('ไม่พบแผนกที่ท่านมีสิทธิ์เข้าถึง');
        }
      } catch (err) {
        console.error('[DashboardPage] Error loading wards:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
        setWards([]); // Clear wards on error
      } finally {
        // setLoading(false); // Delay setting loading to false until summaries are also attempted to load
        // This will be handled by the second useEffect or if selectedWard remains empty
      }
    };
    
    if(user) loadWards(); // Only load wards if user object exists
    else {
      setLoading(false); // No user, not loading
      setWards([]);
      setSelectedWard('');
    }
  }, [user]); // Reload wards only when user object changes

  // โหลดข้อมูลสรุปเมื่อมีการเลือกแผนกหรือช่วงวันที่
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!selectedWard || !startDate || !endDate) {
        setSummaries([]); // Clear summaries if filters are not set
        // If selectedWard is not set, it might be because loadWards hasn't finished or found a ward
        // So, we should ensure loading is false here if we're not going to fetch.
        if (!selectedWard) setLoading(false);
        return;
      }
      try {
        setLoading(true); // Set loading true before fetching summaries
        setError(null);
        
        // Log the current state for debugging
        console.log(`[DashboardPage] Fetching summaries with filters: ward=${selectedWard}, startDate=${startDate}, endDate=${endDate}, approvedOnly=${approvedOnly}`);
        
        let result: DailySummary[];
        if (approvedOnly) {
          console.log("[DashboardPage] Fetching ONLY APPROVED summaries");
          result = await getApprovedSummariesByDateRange(
            selectedWard,
            new Date(startDate),
            new Date(endDate)
          );
        } else {
          console.log("[DashboardPage] Fetching ALL summaries (approved and not)");
          result = await getDailySummariesByFilters({
            wardId: selectedWard,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            approvedOnly: false // Ensure this is explicitly false when fetching all
          });
        }
        
        // Log the result for debugging
        console.log(`[DashboardPage] Fetched ${result.length} summaries. Filter: ${approvedOnly ? 'Approved Only' : 'All'}. Ward: ${selectedWard}`);
        
        setSummaries(result);
      } catch (err: any) {
        console.error('[DashboardPage] Error fetching summaries:', err);
        setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
        setSummaries([]); // Clear summaries on error
      } finally {
        setLoading(false); // Set loading false after fetching summaries attempt
      }
    };
    
    fetchSummaries();
  }, [selectedWard, startDate, endDate, approvedOnly]);

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
    
    console.log("[calculateStats] Processing statistics for", summaries.length, "summaries");
    
    // แสดงข้อมูลสำหรับดีบัก
    summaries.forEach((summary, index) => {
      console.log(`[Summary ${index}] ID: ${summary.id}, Date: ${summary.dateString}`);
      console.log(`- Morning: patients=${summary.morningPatientCensus}, nurses=${summary.morningNurseTotal}`);
      console.log(`- Night: patients=${summary.nightPatientCensus}, nurses=${summary.nightNurseTotal}`);
      console.log(`- Daily: patients=${summary.dailyPatientCensus}, nurses=${summary.dailyNurseTotal}`);
      console.log(`- Forms: morning=${!!summary.morningFormId}, night=${!!summary.nightFormId}, approved=${summary.allFormsApproved}`);
    });
    
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
      <NavBar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b dark:border-gray-700">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">รายงานแผนกและอัตรากำลัง</h1>
                <p className="text-gray-600 dark:text-gray-400">ข้อมูลสรุปผู้ป่วยและอัตรากำลังพยาบาลตามช่วงวันที่</p>
              </div>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
              <div>
                <label htmlFor="wardSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เลือกแผนก</label>
                <select
                  id="wardSelect"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                >
                  <option value="">เลือกแผนก</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>{ward.wardName}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่เริ่มต้น</label>
                <input
                  id="startDate"
                  type="date"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่สิ้นสุด</label>
                <input
                  id="endDate"
                  type="date"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              
              <div className="md:col-span-3 flex items-center mt-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={approvedOnly}
                    onChange={() => setApprovedOnly(!approvedOnly)}
                  />
                  <div className={`w-10 h-5 rounded-full ${approvedOnly ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} relative inline-flex flex-shrink-0 transition-colors duration-200`}>
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform duration-200 transform ${approvedOnly ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">แสดงเฉพาะข้อมูลที่อนุมัติแล้ว</span>
                </label>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-blue-500 dark:border-blue-600">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ผู้ป่วยเฉลี่ย/วัน</h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgPatientCensus.toFixed(1)}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-green-500 dark:border-green-600">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">พยาบาลเฉลี่ย/วัน</h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgNurseTotal.toFixed(1)}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-purple-500 dark:border-purple-600">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">อัตราส่วนพยาบาล:ผู้ป่วย</h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgNurseRatio.toFixed(2)}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-yellow-500 dark:border-yellow-600">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">รับใหม่ทั้งหมด</h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalAdmissions}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-red-500 dark:border-red-600">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">จำหน่ายทั้งหมด</h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalDischarges}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-teal-500 dark:border-teal-600">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">OPD เฉลี่ย/วัน</h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.avgOPD.toFixed(1)}</p>
              </div>
            </div>
            
            {/* Data Table and Shift Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">รายงานสรุปรายวัน</h2>
              </div>
              
              {/* Results */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 dark:text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 dark:text-red-300 font-medium mb-2">{error}</p>
                  <p className="text-red-600 dark:text-red-400 text-sm">โปรดลองเลือกช่วงวันที่และแผนกอีกครั้ง</p>
                </div>
              ) : summaries.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">ไม่พบข้อมูลในช่วงเวลาที่เลือก</h3>
                  <p className="text-gray-500 dark:text-gray-400">ลองเลือกช่วงวันที่อื่น หรือ ตรวจสอบว่าได้เลือกแผนกถูกต้องหรือไม่</p>
                  {approvedOnly && (
                    <p className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                      ลองยกเลิกตัวเลือก "แสดงเฉพาะข้อมูลที่อนุมัติแล้ว" เพื่อดูข้อมูลทั้งหมด
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Shift Details Section */}
                  {summaries.map((summary) => (
                    <div key={summary.id + '-details'} className="p-6 border-b dark:border-gray-700">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                        รายละเอียดข้อมูลวันที่: {formatThaiDate(summary.dateString)} ({summary.wardName})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Morning Shift Data */}
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-lg shadow">
                          <h4 className="text-md font-semibold text-blue-800 dark:text-blue-300 mb-4 pb-2 border-b border-blue-200 dark:border-blue-800">กะเช้า (Morning)</h4>
                          <div className="space-y-3 text-sm">
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">จำนวนผู้ป่วย:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.morningPatientCensus || 0}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">จำนวนพยาบาล:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.morningNurseTotal || 0}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">อัตราส่วน:</span> <span className="font-bold text-gray-900 dark:text-white">{(summary.morningNurseRatio || 0).toFixed(2)}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">รับเข้า:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.morningAdmitTotal || 0}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">จำหน่าย:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.morningDischargeTotal || 0}</span></p>
                          </div>
                        </div>
                        {/* Night Shift Data */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-5 rounded-lg shadow">
                          <h4 className="text-md font-semibold text-indigo-800 dark:text-indigo-300 mb-4 pb-2 border-b border-indigo-200 dark:border-indigo-800">กะดึก (Night)</h4>
                          <div className="space-y-3 text-sm">
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">จำนวนผู้ป่วย:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.nightPatientCensus || 0}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">จำนวนพยาบาล:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.nightNurseTotal || 0}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">อัตราส่วน:</span> <span className="font-bold text-gray-900 dark:text-white">{(summary.nightNurseRatio || 0).toFixed(2)}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">รับเข้า:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.nightAdmitTotal || 0}</span></p>
                            <p className="flex justify-between"><span className="font-medium text-gray-700 dark:text-gray-300">จำหน่าย:</span> <span className="font-bold text-gray-900 dark:text-white">{summary.nightDischargeTotal || 0}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Existing Data Table (สรุปแบบตาราง) */}
                  <div className="overflow-x-auto mt-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700">วันที่</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider border-b dark:border-gray-700">ผู้ป่วยกะเช้า</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border-b dark:border-gray-700">ผู้ป่วยกะดึก</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider border-b dark:border-gray-700">พยาบาลเช้า</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border-b dark:border-gray-700">พยาบาลดึก</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider border-b dark:border-gray-700">รับใหม่</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider border-b dark:border-gray-700">จำหน่าย</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider border-b dark:border-gray-700">อัตราส่วน</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {summaries.map((summary, index) => (
                          <tr key={summary.id} className={index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900/50"}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {formatThaiDate(summary.dateString)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-300 font-medium">
                              {summary.morningPatientCensus}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-300 font-medium">
                              {summary.nightPatientCensus}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                              {summary.morningNurseTotal}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                              {summary.nightNurseTotal}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                              {summary.dailyAdmitTotal}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                              {summary.dailyDischargeAllTotal}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-300 font-medium">
                              {summary.dailyNurseRatio ? summary.dailyNurseRatio.toFixed(2) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 