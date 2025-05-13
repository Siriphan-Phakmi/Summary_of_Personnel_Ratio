'use client';

import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | any;
  morningPatientCensus?: number;
  morningNurseManager?: number;
  morningRn?: number;
  morningPn?: number;
  morningWc?: number;
  morningNurseTotal?: number;
  morningNurseRatio?: number;
  morningNewAdmit?: number;
  morningTransferIn?: number;
  morningReferIn?: number;
  morningDischarge?: number;
  morningTransferOut?: number;
  morningReferOut?: number;
  morningDead?: number;
  nightPatientCensus?: number;
  nightNurseManager?: number;
  nightRn?: number;
  nightPn?: number;
  nightWc?: number;
  nightNurseTotal?: number;
  nightNurseRatio?: number;
  nightNewAdmit?: number;
  nightTransferIn?: number;
  nightReferIn?: number;
  nightDischarge?: number;
  nightTransferOut?: number;
  nightReferOut?: number;
  nightDead?: number;
  dailyPatientCensus?: number;
  dailyNurseTotal?: number;
  dailyNurseRatio?: number;
  availableBeds?: number;
  unavailableBeds?: number;
  plannedDischarge?: number;
}

interface WardSummaryStatsProps {
  summaries: DailySummary[];
  selectedWard: string;
}

const WardSummaryStats: React.FC<WardSummaryStatsProps> = ({ summaries, selectedWard }) => {
  // ดึงข้อมูลล่าสุด
  const getLatestSummary = () => {
    if (summaries.length === 0) return null;
    
    // ถ้าดูข้อมูลแผนกเดียว ให้ดึงข้อมูลล่าสุด
    if (selectedWard !== 'all') {
      return summaries.reduce((latest, current) => {
        if (current.wardId !== selectedWard) return latest;
        
        const latestDate = latest.date instanceof Date ? latest.date : new Date(latest.date);
        const currentDate = current.date instanceof Date ? current.date : new Date(current.date);
        return currentDate > latestDate ? current : latest;
      }, summaries.find(s => s.wardId === selectedWard) || summaries[0]);
    }
    
    // ถ้าดูทุกแผนก ให้รวมข้อมูลจากทุกแผนกล่าสุด
    const latestByWard = new Map<string, DailySummary>();
    summaries.forEach(summary => {
      const existing = latestByWard.get(summary.wardId);
      if (!existing) {
        latestByWard.set(summary.wardId, summary);
        return;
      }
      
      const existingDate = existing.date instanceof Date ? existing.date : new Date(existing.date);
      const currentDate = summary.date instanceof Date ? summary.date : new Date(summary.date);
      
      if (currentDate > existingDate) {
        latestByWard.set(summary.wardId, summary);
      }
    });
    
    return Array.from(latestByWard.values());
  };
  
  const formatDate = (date: Date | any): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return format(dateObj, 'dd MMMM yyyy', { locale: th });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  };
  
  const latestData = getLatestSummary();
  
  if (!latestData) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">ไม่พบข้อมูล</p>
      </div>
    );
  }
  
  // กรณีดูแผนกเดียว
  if (selectedWard !== 'all') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            รายละเอียด {(latestData as DailySummary).wardName} - {formatDate((latestData as DailySummary).date)}
          </h2>
          
          {/* ข้อมูลสรุปรวม */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500 text-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-blue-100">จำนวนผู้ป่วยทั้งหมด</h3>
              <p className="text-2xl font-bold">{(latestData as DailySummary).dailyPatientCensus || 0}</p>
            </div>
            <div className="bg-green-500 text-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-green-100">จำนวนพยาบาลทั้งหมด</h3>
              <p className="text-2xl font-bold">{(latestData as DailySummary).dailyNurseTotal || 0}</p>
            </div>
            <div className="bg-purple-500 text-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-purple-100">อัตราส่วนพยาบาล:ผู้ป่วย</h3>
              <p className="text-2xl font-bold">{(latestData as DailySummary).dailyNurseRatio || 0}</p>
            </div>
            <div className="bg-teal-500 text-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-teal-100">เตียงว่าง</h3>
              <p className="text-2xl font-bold">{(latestData as DailySummary).availableBeds || 0}</p>
            </div>
          </div>
          
          {/* รายละเอียดแยกตามกะ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* กะเช้า */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-4">กะเช้า</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">จำนวนผู้ป่วย</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningPatientCensus || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Nurse Manager</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningNurseManager || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">RN</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningRn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">PN</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningPn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">WC</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningWc || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">พยาบาลทั้งหมด</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningNurseTotal || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">อัตราส่วน</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningNurseRatio || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">รับใหม่</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningNewAdmit || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Transfer In</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningTransferIn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Refer In</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningReferIn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Discharge</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningDischarge || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Transfer Out</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningTransferOut || 0}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Refer Out</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningReferOut || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Dead</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).morningDead || 0}</span>
                </div>
              </div>
            </div>
            
            {/* กะดึก */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">กะดึก</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">จำนวนผู้ป่วย</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightPatientCensus || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Nurse Manager</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightNurseManager || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">RN</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightRn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">PN</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightPn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">WC</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightWc || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">พยาบาลทั้งหมด</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightNurseTotal || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">อัตราส่วน</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightNurseRatio || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">รับใหม่</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightNewAdmit || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Transfer In</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightTransferIn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Refer In</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightReferIn || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Discharge</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightDischarge || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Transfer Out</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightTransferOut || 0}</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300">Refer Out</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightReferOut || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Dead</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(latestData as DailySummary).nightDead || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // กรณีดูทุกแผนก
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          รายละเอียดทุกแผนก
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  แผนก
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  จำนวนผู้ป่วย
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  พยาบาล
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  อัตราส่วน
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  เตียงว่าง
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  รับใหม่
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  ออก
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(latestData as DailySummary[]).map((ward) => (
                <tr 
                  key={ward.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{ward.wardName}</span>
                    <br />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ward.date)}</span>
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {ward.dailyPatientCensus || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {ward.dailyNurseTotal || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {ward.dailyNurseRatio || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {ward.availableBeds || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {(ward.morningNewAdmit || 0) + (ward.nightNewAdmit || 0)}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {(ward.morningDischarge || 0) + (ward.nightDischarge || 0) + (ward.morningDead || 0) + (ward.nightDead || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WardSummaryStats; 