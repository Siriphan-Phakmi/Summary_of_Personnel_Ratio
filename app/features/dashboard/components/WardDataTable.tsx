'use client';

import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface WardData {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | any;
  dateString: string;
  morningPatientCensus?: number;
  morningNurseManager?: number;
  morningRn?: number;
  morningPn?: number;
  morningWc?: number;
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
  nightNewAdmit?: number;
  nightTransferIn?: number;
  nightReferIn?: number;
  nightDischarge?: number;
  nightTransferOut?: number;
  nightReferOut?: number;
  nightDead?: number;
  dailyPatientCensus?: number;
  availableBeds?: number;
  unavailableBeds?: number;
  plannedDischarge?: number;
}

interface WardDataTableProps {
  data: WardData[];
}

const WardDataTable: React.FC<WardDataTableProps> = ({ data }) => {
  const formatDate = (date: Date | any): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return format(dateObj, 'dd/MM/yyyy', { locale: th });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Wards
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Patient Census
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Nurse Manager
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              RN
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              PN
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              WC
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              New Admit
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Transfer In
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Refer In
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Transfer Out
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Refer Out
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Discharge
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Dead
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Available
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Unavailable
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              Planned Discharge
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, index) => (
            <React.Fragment key={item.id || index}>
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td className="py-2 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {item.wardName}<br/>
                  <span className="text-xs text-blue-600 dark:text-blue-400">{formatDate(item.date)} (กะเช้า)</span>
                </td>
                <td className="py-2 px-4 text-sm text-center font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {item.morningPatientCensus || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningNurseManager || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningRn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningPn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningWc || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningNewAdmit || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningTransferIn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningReferIn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningTransferOut || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningReferOut || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningDischarge || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.morningDead || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.availableBeds || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.unavailableBeds || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300">
                  {item.plannedDischarge || 0}
                </td>
              </tr>
              <tr className="bg-purple-50 dark:bg-purple-900/20">
                <td className="py-2 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {item.wardName}<br/>
                  <span className="text-xs text-purple-600 dark:text-purple-400">{formatDate(item.date)} (กะดึก)</span>
                </td>
                <td className="py-2 px-4 text-sm text-center font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {item.nightPatientCensus || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightNurseManager || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightRn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightPn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightWc || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightNewAdmit || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightTransferIn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightReferIn || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightTransferOut || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightReferOut || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightDischarge || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.nightDead || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.availableBeds || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                  {item.unavailableBeds || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center text-gray-500 dark:text-gray-300">
                  {item.plannedDischarge || 0}
                </td>
              </tr>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <td className="py-2 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  Total
                </td>
                <td className="py-2 px-4 text-sm text-center font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {item.dailyPatientCensus || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningNurseManager || 0) + (item.nightNurseManager || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningRn || 0) + (item.nightRn || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningPn || 0) + (item.nightPn || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningWc || 0) + (item.nightWc || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningNewAdmit || 0) + (item.nightNewAdmit || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningTransferIn || 0) + (item.nightTransferIn || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningReferIn || 0) + (item.nightReferIn || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningTransferOut || 0) + (item.nightTransferOut || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningReferOut || 0) + (item.nightReferOut || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningDischarge || 0) + (item.nightDischarge || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {(item.morningDead || 0) + (item.nightDead || 0)}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {item.availableBeds || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                  {item.unavailableBeds || 0}
                </td>
                <td className="py-2 px-4 text-sm text-center font-bold text-gray-900 dark:text-white">
                  {item.plannedDischarge || 0}
                </td>
              </tr>
              <tr className="h-6"></tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WardDataTable; 