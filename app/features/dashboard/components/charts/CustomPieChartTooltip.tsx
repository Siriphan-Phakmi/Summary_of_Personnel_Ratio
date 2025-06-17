'use client';

import React from 'react';

const CustomPieChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, value, unavailable, isUnavailable, totalBeds, plannedDischarge } = payload[0].payload;
    
    // You might want to pass a specific "no data" message as a prop
    if (value === 0 && (unavailable === undefined || unavailable === 0)) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-md">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            ไม่มีข้อมูล
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            ไม่พบข้อมูลสำหรับวันที่เลือก
          </p>
        </div>
      );
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border-2 border-gray-300 dark:border-gray-600 rounded shadow-md">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          {name}
        </p>
        {isUnavailable ? (
          <p className="text-xs text-gray-700 dark:text-gray-300">
            เตียงไม่ว่าง: <span className="font-medium text-red-500 dark:text-red-400">{value}</span>
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              เตียงว่าง: <span className="font-medium text-green-500 dark:text-green-400">{value}</span>
            </p>
            {unavailable !== undefined && (
              <p className="text-xs text-gray-700 dark:text-gray-300">
                เตียงไม่ว่าง: <span className="font-medium text-red-500 dark:text-red-400">{unavailable}</span>
              </p>
            )}
            {plannedDischarge !== undefined && plannedDischarge > 0 && (
              <p className="text-xs text-gray-700 dark:text-gray-300">
                แผนจำหน่าย: <span className="font-medium text-blue-500 dark:text-blue-400">{plannedDischarge}</span>
              </p>
            )}
          </>
        )}
        {totalBeds !== undefined && (
          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
            เตียงทั้งหมด: <span className="font-medium">{totalBeds}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default React.memo(CustomPieChartTooltip); 