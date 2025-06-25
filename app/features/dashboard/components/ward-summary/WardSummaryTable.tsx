'use client';

import React from 'react';
import { WardSummaryTableProps } from '../types/componentInterfaces';
import { WardFormSummary } from '../types';
import { adaptArrayToOldWardSummaryFormat } from '../../utils/dataAdapters';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';

const WardSummaryTable: React.FC<WardSummaryTableProps> = ({
  data,
  selectedWardId,
  onSelectWard,
  title = 'ตารางข้อมูลรวมทั้งหมด',
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold text-center border-b border-gray-200 dark:border-gray-700 pb-4 text-gray-800 dark:text-white">
          {title}
        </h2>
        <div className="flex flex-col justify-center items-center h-64">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">กำลังโหลดข้อมูลตาราง...</p>
        </div>
      </div>
    );
  }

  // แปลงข้อมูลทั้งหมดเป็นรูปแบบเดิม
  const oldFormatData = adaptArrayToOldWardSummaryFormat(data);

  const renderShiftRow = (
    wardId: string,
    wardName: string,
    shiftName: string,
    shiftData: WardFormSummary | any | undefined,
    isSelected: boolean,
    onClick: () => void,
    rowType: 'morning' | 'night' | 'total'
  ) => {
    const isGrandTotal = wardId === 'GRAND_TOTAL';
    
    const getBgColor = () => {
      if (isGrandTotal) {
        if (rowType === 'total') return 'bg-blue-100 dark:bg-blue-800 font-bold border-2 border-blue-300 dark:border-blue-600';
        return 'bg-blue-50 dark:bg-blue-900/30 font-semibold border border-blue-200 dark:border-blue-700';
      }
      if (rowType === 'total') return 'bg-gray-100 dark:bg-gray-700 font-bold';
      if (isSelected) return 'bg-blue-50 dark:bg-blue-900/20';
      return 'hover:bg-gray-50 dark:hover:bg-gray-700';
    };

    const getTextColor = () => {
      if (isGrandTotal) {
        if (rowType === 'total') return 'text-blue-900 dark:text-blue-100 font-bold text-base';
        return 'text-blue-800 dark:text-blue-200 font-semibold';
      }
      if (rowType === 'total') return 'text-gray-900 dark:text-white font-bold';
      return 'text-gray-600 dark:text-gray-300';
    };

    if (!shiftData) {
      return (
        <tr key={`${wardId}-${rowType}`} className={`${getBgColor()} cursor-pointer`} onClick={onClick}>
          <td className={`px-4 py-2 text-sm ${getTextColor()}`}>
            {rowType === 'morning' ? wardName : ''}
          </td>
          <td className={`px-2 py-2 text-sm ${getTextColor()} text-center`}>
            {shiftName}
          </td>
          {/* แสดงเส้นประสำหรับทุกคอลัมน์ */}
          {Array.from({ length: 8 }, (_, i) => (
            <td key={`${wardId}-${rowType}-empty-${i}`} className={`px-2 py-2 text-sm ${getTextColor()} text-center`}>
              -
            </td>
          ))}
        </tr>
      );
    }

    return (
      <tr key={`${wardId}-${rowType}`} className={`${getBgColor()} cursor-pointer`} onClick={onClick}>
        <td className={`px-4 py-2 text-sm ${getTextColor()}`}>
          {rowType === 'morning' ? (isGrandTotal ? `🏥 ${wardName}` : wardName) : ''}
        </td>
        <td className={`px-2 py-2 text-sm ${getTextColor()} text-center`}>
          {shiftName}
        </td>
        <td className={`px-2 py-2 text-sm ${getTextColor()} text-center font-semibold ${isGrandTotal ? 'text-lg' : ''}`}>
          {shiftData.patientCensus}
        </td>
        <td className={`px-2 py-2 text-sm text-center ${
          isGrandTotal 
            ? 'text-blue-800 dark:text-blue-200 bg-blue-200 dark:bg-blue-800 font-bold' 
            : rowType === 'total' 
              ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20' 
              : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
        }`}>
          {shiftData.admitted}
        </td>
        <td className={`px-2 py-2 text-sm text-center ${
          isGrandTotal 
            ? 'text-blue-800 dark:text-blue-200 bg-blue-200 dark:bg-blue-800 font-bold' 
            : rowType === 'total' 
              ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20' 
              : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
        }`}>
          {shiftData.transferredIn}
        </td>
        <td className={`px-2 py-2 text-sm text-center ${
          isGrandTotal 
            ? 'text-red-800 dark:text-red-200 bg-red-200 dark:bg-red-800 font-bold' 
            : rowType === 'total' 
              ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20' 
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10'
        }`}>
          {shiftData.discharged}
        </td>
        <td className={`px-2 py-2 text-sm text-center ${
          isGrandTotal 
            ? 'text-red-800 dark:text-red-200 bg-red-200 dark:bg-red-800 font-bold' 
            : rowType === 'total' 
              ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20' 
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10'
        }`}>
          {shiftData.transferredOut}
        </td>
        <td className={`px-2 py-2 text-sm text-center ${
          isGrandTotal 
            ? 'text-red-800 dark:text-red-200 bg-red-200 dark:bg-red-800 font-bold' 
            : rowType === 'total' 
              ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20' 
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10'
        }`}>
          {shiftData.deaths}
        </td>
        <td className={`px-2 py-2 text-sm text-center ${
          isGrandTotal 
            ? 'text-green-800 dark:text-green-200 bg-green-200 dark:bg-green-800 font-bold' 
            : rowType === 'total' 
              ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/20' 
              : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10'
        }`}>
          {shiftData.availableBeds ?? '-'}
        </td>
        <td className={`px-2 py-2 text-sm text-center ${
          isGrandTotal 
            ? 'text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800 font-bold' 
            : rowType === 'total' 
              ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/20' 
              : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
        }`}>
          {shiftData.occupiedBeds ?? '-'}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <h2 className="text-xl font-bold p-4 text-center border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white">
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
                Shift
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Patient Census
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30">
                Admitted
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30">
                Transferred In
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-red-50 dark:bg-red-900/30">
                Discharged
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-red-50 dark:bg-red-900/30">
                Transferred Out
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-red-50 dark:bg-red-900/30">
                Deaths
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-green-50 dark:bg-green-900/30">
                Available Beds
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-yellow-50 dark:bg-yellow-900/30">
                Occupied Beds
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {oldFormatData.map((ward) => {
              const isSelected = selectedWardId === ward.wardId;
              const onClick = () => onSelectWard(ward.wardId);
              
              // เช็คว่าเป็น GRAND_TOTAL (รวมทุกแผนก) หรือไม่
              const isGrandTotal = ward.wardId === 'GRAND_TOTAL';
              
              const rows = [
                // เวรเช้า
                renderShiftRow(ward.wardId, ward.wardName, 'เวรเช้า', ward.morningShiftData, isSelected, onClick, 'morning'),
                
                // เวรดึก
                renderShiftRow(ward.wardId, ward.wardName, 'เวรดึก', ward.nightShiftData, isSelected, onClick, 'night'),
              ];

              // Total All - แสดงเฉพาะกรณีเป็น GRAND_TOTAL เท่านั้น
              if (isGrandTotal) {
                rows.push(renderShiftRow(ward.wardId, ward.wardName, 'Total All', ward.totalData, isSelected, onClick, 'total'));
              }
              
              // เส้นแบ่งระหว่าง Ward
              rows.push(
                <tr key={`${ward.wardId}-divider`} className="bg-gray-200 dark:bg-gray-600">
                  <td colSpan={10} className="h-1"></td>
                </tr>
              );
              
              return rows;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WardSummaryTable; 