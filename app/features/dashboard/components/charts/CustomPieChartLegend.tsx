'use client';

import React from 'react';

const CustomPieChartLegend = ({ payload }: any) => {
  if (!payload || payload.length === 0) {
    return null;
  }

  const allZeroValues = payload.every((entry: any) => entry.payload.value === 0 && entry.payload.unavailable === 0);
  if (allZeroValues) {
    return (
      <div className="pt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        ไม่มีข้อมูลเตียงว่างในทุกวอร์ด
      </div>
    );
  }

  return (
    <div className="pt-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {payload.map((entry: any, index: number) => {
          const { color, payload: itemPayload } = entry;
          const { name, value, isUnavailable, totalBeds } = itemPayload;
          const percentage = totalBeds > 0 ? ((value / totalBeds) * 100).toFixed(0) : 0;
          
          if (isUnavailable) {
            return (
              <li key={`item-${index}`} className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                <span className="w-3 h-3 mr-2" style={{ backgroundColor: color }} />
                <span>{name}: ไม่ว่างทั้งหมด</span>
              </li>
            );
          }
          
          return (
            <li key={`item-${index}`} className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              <span className="w-3 h-3 mr-2" style={{ backgroundColor: color }} />
              <span>{name}: {value} เตียง ({percentage}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default React.memo(CustomPieChartLegend); 