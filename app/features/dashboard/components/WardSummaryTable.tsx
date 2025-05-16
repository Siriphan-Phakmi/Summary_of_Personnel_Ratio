'use client';

import React from 'react';

interface WardSummaryData {
  id: string;
  wardName: string;
  patientCensus: number;
  nurseManager: number;
  rn: number;
  pn: number;
  wc: number;
  newAdmit: number;
  transferIn: number;
  referIn: number;
  discharge: number;
  transferOut: number;
  referOut: number;
  dead: number;
  available: number;
  unavailable: number;
  plannedDischarge: number;
}

interface WardSummaryTableProps {
  data: WardSummaryData[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  title?: string;
}

const WardSummaryTable: React.FC<WardSummaryTableProps> = ({
  data,
  selectedWardId,
  onSelectWard,
  title = 'ตารางข้อมูลรวมทั้งหมด'
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <h2 className="text-xl font-bold p-4 text-center border-b border-gray-200 dark:border-gray-700">
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Wards
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Patient Census
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Nurse Manager
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                RN
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                PN
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                WC
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30">
                New Admit
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30">
                Transfer In
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30">
                Refer In
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-red-50 dark:bg-red-900/30">
                Discharge
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-red-50 dark:bg-red-900/30">
                Transfer Out
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-red-50 dark:bg-red-900/30">
                Refer Out
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-red-50 dark:bg-red-900/30">
                Dead
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-green-50 dark:bg-green-900/30">
                Available
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-yellow-50 dark:bg-yellow-900/30">
                Unavailable
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Planned Discharge
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((ward) => (
              <tr 
                key={ward.id} 
                className={`
                  hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer
                  ${selectedWardId === ward.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
                onClick={() => onSelectWard(ward.id)}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {ward.wardName}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white font-semibold">
                  {ward.patientCensus}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                  {ward.nurseManager}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                  {ward.rn}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                  {ward.pn}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                  {ward.wc}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10">
                  {ward.newAdmit}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10">
                  {ward.transferIn}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10">
                  {ward.referIn}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10">
                  {ward.discharge}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10">
                  {ward.transferOut}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10">
                  {ward.referOut}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10">
                  {ward.dead}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10">
                  {ward.available}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
                  {ward.unavailable}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-purple-600 dark:text-purple-400">
                  {ward.plannedDischarge}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WardSummaryTable; 