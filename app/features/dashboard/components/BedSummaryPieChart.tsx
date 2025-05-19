'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

// ข้อมูลสำหรับแสดงสรุปเตียง (ว่าง/ไม่ว่าง/แผนจำหน่าย)
export interface BedSummaryData {
  availableBeds: number;
  unavailableBeds: number;
  plannedDischarge: number;
  wardName?: string; // เพิ่มชื่อ Ward
}

interface BedSummaryPieChartProps {
  data: BedSummaryData;
}

const BedSummaryPieChart: React.FC<BedSummaryPieChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const chartData = [
    { name: 'เตียงว่าง', value: data.availableBeds || 0, color: '#10B981' },
    { name: 'เตียงไม่ว่าง', value: data.unavailableBeds || 0, color: '#EF4444' },
    { name: 'แผนจำหน่าย', value: data.plannedDischarge || 0, color: '#3B82F6' }
  ].filter(item => item.value > 0);

  const totalBeds = data.availableBeds + data.unavailableBeds;
  const occupancyRate = totalBeds > 0 ? Math.round((data.unavailableBeds / totalBeds) * 100) : 0;
  const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{`${payload[0].name}: ${payload[0].value} เตียง`}</p>
          {payload[0].name !== 'แผนจำหน่าย' && totalBeds > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{`${(payload[0].value / totalBeds * 100).toFixed(1)}% ของจำนวนเตียงทั้งหมด`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex justify-center flex-wrap gap-6 mt-2">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {entry.value} {entry.name}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="text-center mb-2">
        <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {data.wardName ? `สถานะเตียง ${data.wardName}` : 'สถานะเตียงรวม'}
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          เตียงทั้งหมด: {totalBeds} เตียง (อัตราการครองเตียง: {occupancyRate}%)
        </p>
      </div>
      
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${value} เตียง`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg p-3 text-center">
          <p className="text-xs font-medium text-white mb-1">เตียงว่าง</p>
          <p className="text-2xl font-bold text-white">{data.availableBeds}</p>
        </div>
        <div className="bg-gradient-to-r from-red-400 to-red-500 rounded-lg p-3 text-center">
          <p className="text-xs font-medium text-white mb-1">เตียงไม่ว่าง</p>
          <p className="text-2xl font-bold text-white">{data.unavailableBeds}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg p-3 text-center">
          <p className="text-xs font-medium text-white mb-1">แผนจำหน่าย</p>
          <p className="text-2xl font-bold text-white">{data.plannedDischarge}</p>
        </div>
      </div>
    </div>
  );
};

export default BedSummaryPieChart; 