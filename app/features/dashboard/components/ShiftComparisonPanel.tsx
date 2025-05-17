'use client';

import React from 'react';
import { format } from 'date-fns';
import { DashboardSummary } from './types';

interface ShiftComparisonPanelProps {
  summary: DashboardSummary | null;
  wardName?: string;
}

const ShiftComparisonPanel: React.FC<ShiftComparisonPanelProps> = ({ summary, wardName }) => {
  if (!summary) {
    return null;
  }

  const morningPatients = summary.morningForm?.patientCensus || 0;
  const morningNurses = (summary.morningForm?.nurseManager || 0) + 
                      (summary.morningForm?.rn || 0) + 
                      (summary.morningForm?.pn || 0);
  
  const nightPatients = summary.nightForm?.patientCensus || 0;
  const nightNurses = (summary.nightForm?.nurseManager || 0) + 
                    (summary.nightForm?.rn || 0) + 
                    (summary.nightForm?.pn || 0);
  
  const morningNurseManager = summary.morningForm?.nurseManager || 0;
  const morningRN = summary.morningForm?.rn || 0;
  const morningPN = summary.morningForm?.pn || 0;
  
  const nightNurseManager = summary.nightForm?.nurseManager || 0;
  const nightRN = summary.nightForm?.rn || 0;
  const nightPN = summary.nightForm?.pn || 0;
  
  const morningRatio = morningPatients > 0 && morningNurses > 0 
    ? morningPatients / morningNurses 
    : 0;
  
  const nightRatio = nightPatients > 0 && nightNurses > 0 
    ? nightPatients / nightNurses 
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-white">
        เปรียบเทียบเวรเช้า-ดึก {wardName || summary.wardName}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-300">เวรเช้า</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2 border-blue-200 dark:border-blue-800">
              <span className="text-gray-700 dark:text-gray-200">จำนวนผู้ป่วย:</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">{morningPatients} คน</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2 border-blue-200 dark:border-blue-800">
              <span className="text-gray-700 dark:text-gray-200">จำนวนพยาบาล (รวม):</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">{morningNurses} คน</span>
            </div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Nurse Manager:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{morningNurseManager} คน</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">RN:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{morningRN} คน</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">PN:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{morningPN} คน</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-700 dark:text-gray-200">อัตราส่วน (ผู้ป่วย:พยาบาล):</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                {morningRatio > 0 ? morningRatio.toFixed(2) : 'N/A'} : 1
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-3 text-indigo-700 dark:text-indigo-300">เวรดึก</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2 border-indigo-200 dark:border-indigo-800">
              <span className="text-gray-700 dark:text-gray-200">จำนวนผู้ป่วย:</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">{nightPatients} คน</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2 border-indigo-200 dark:border-indigo-800">
              <span className="text-gray-700 dark:text-gray-200">จำนวนพยาบาล (รวม):</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">{nightNurses} คน</span>
            </div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Nurse Manager:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{nightNurseManager} คน</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">RN:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{nightRN} คน</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">PN:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{nightPN} คน</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-700 dark:text-gray-200">อัตราส่วน (ผู้ป่วย:พยาบาล):</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                {nightRatio > 0 ? nightRatio.toFixed(2) : 'N/A'} : 1
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-gray-50 dark:bg-gray-700/40 p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">การเปรียบเทียบ</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr className="border-b dark:border-gray-600">
                <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-200 font-semibold">รายการ</th>
                <th className="py-3 px-4 text-center text-blue-600 dark:text-blue-300 font-semibold">เวรเช้า</th>
                <th className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-300 font-semibold">เวรดึก</th>
                <th className="py-3 px-4 text-center text-gray-700 dark:text-gray-200 font-semibold">ต่าง</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4 text-gray-700 dark:text-gray-200">จำนวนผู้ป่วย</td>
                <td className="py-3 px-4 text-center text-blue-700 dark:text-blue-300 font-medium bg-blue-50/50 dark:bg-blue-900/10">{morningPatients}</td>
                <td className="py-3 px-4 text-center text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-indigo-900/10">{nightPatients}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`font-semibold rounded px-2 py-1 ${
                    nightPatients > morningPatients 
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                      : nightPatients < morningPatients 
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {nightPatients !== morningPatients ? 
                      (nightPatients > morningPatients ? '+' : '') + (nightPatients - morningPatients) : 
                      '-'}
                  </span>
                </td>
              </tr>
              <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4 text-gray-700 dark:text-gray-200">จำนวนพยาบาล</td>
                <td className="py-3 px-4 text-center text-blue-700 dark:text-blue-300 font-medium bg-blue-50/50 dark:bg-blue-900/10">{morningNurses}</td>
                <td className="py-3 px-4 text-center text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-indigo-900/10">{nightNurses}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`font-semibold rounded px-2 py-1 ${
                    nightNurses > morningNurses 
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                      : nightNurses < morningNurses 
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {nightNurses !== morningNurses ? 
                      (nightNurses > morningNurses ? '+' : '') + (nightNurses - morningNurses) : 
                      '-'}
                  </span>
                </td>
              </tr>
              
              <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
                <td className="py-2 px-4 text-gray-600 dark:text-gray-300 pl-8">Nurse Manager</td>
                <td className="py-2 px-4 text-center text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">{morningNurseManager}</td>
                <td className="py-2 px-4 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5">{nightNurseManager}</td>
                <td className="py-2 px-4 text-center">
                  <span className={`font-medium text-sm rounded px-2 py-0.5 ${
                    nightNurseManager > morningNurseManager 
                      ? 'text-green-500 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10' 
                      : nightNurseManager < morningNurseManager 
                        ? 'text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10' 
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {nightNurseManager !== morningNurseManager ? 
                      (nightNurseManager > morningNurseManager ? '+' : '') + (nightNurseManager - morningNurseManager) : 
                      '-'}
                  </span>
                </td>
              </tr>
              <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
                <td className="py-2 px-4 text-gray-600 dark:text-gray-300 pl-8">RN</td>
                <td className="py-2 px-4 text-center text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">{morningRN}</td>
                <td className="py-2 px-4 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5">{nightRN}</td>
                <td className="py-2 px-4 text-center">
                  <span className={`font-medium text-sm rounded px-2 py-0.5 ${
                    nightRN > morningRN 
                      ? 'text-green-500 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10' 
                      : nightRN < morningRN 
                        ? 'text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10' 
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {nightRN !== morningRN ? 
                      (nightRN > morningRN ? '+' : '') + (nightRN - morningRN) : 
                      '-'}
                  </span>
                </td>
              </tr>
              <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
                <td className="py-2 px-4 text-gray-600 dark:text-gray-300 pl-8">PN</td>
                <td className="py-2 px-4 text-center text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">{morningPN}</td>
                <td className="py-2 px-4 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5">{nightPN}</td>
                <td className="py-2 px-4 text-center">
                  <span className={`font-medium text-sm rounded px-2 py-0.5 ${
                    nightPN > morningPN 
                      ? 'text-green-500 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10' 
                      : nightPN < morningPN 
                        ? 'text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10' 
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {nightPN !== morningPN ? 
                      (nightPN > morningPN ? '+' : '') + (nightPN - morningPN) : 
                      '-'}
                  </span>
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4 text-gray-700 dark:text-gray-200">อัตราส่วน (ผู้ป่วย:พยาบาล)</td>
                <td className="py-3 px-4 text-center text-blue-700 dark:text-blue-300 font-medium bg-blue-50/50 dark:bg-blue-900/10">
                  {morningRatio > 0 ? morningRatio.toFixed(2) : 'N/A'} : 1
                </td>
                <td className="py-3 px-4 text-center text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-indigo-900/10">
                  {nightRatio > 0 ? nightRatio.toFixed(2) : 'N/A'} : 1
                </td>
                <td className="py-3 px-4 text-center">
                  {morningRatio > 0 && nightRatio > 0 ? (
                    <span className={`font-semibold rounded px-2 py-1 ${
                      nightRatio > morningRatio + 0.1
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                        : nightRatio < morningRatio - 0.1
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                          : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {(nightRatio - morningRatio).toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShiftComparisonPanel; 