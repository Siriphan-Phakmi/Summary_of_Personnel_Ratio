'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface TrendData {
  date: string;
  patientCount: number;
  admitCount: number;
  dischargeCount: number;
}

interface PatientTrendChartProps {
  data: TrendData[];
  title?: string;
  wardName?: string;
}

const PatientTrendChart: React.FC<PatientTrendChartProps> = ({ data, title, wardName }) => {
  const isDarkMode = React.useMemo(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, []);
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">ไม่มีข้อมูลแนวโน้มผู้ป่วย{wardName ? ` แผนก${wardName}` : ''}</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    date: item.date,
    'จำนวนผู้ป่วย': item.patientCount,
    'รับเข้า': item.admitCount,
    'จำหน่าย': item.dischargeCount
  }));

  const colors = {
    patientCount: isDarkMode ? '#60a5fa' : '#3b82f6',
    admitCount: isDarkMode ? '#34d399' : '#10b981',
    dischargeCount: isDarkMode ? '#f87171' : '#ef4444',
  };

  const valueFormatter = (value: any) => {
    return `${Math.round(value)} คน`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-gray-200">วันที่: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p 
              key={`tooltip-${index}`} 
              style={{ color: entry.color }}
              className="text-sm"
            >
              {entry.name}: {Math.round(entry.value)} คน
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4 text-center text-gray-700 dark:text-gray-300">{title}</h3>}
      {wardName && (
        <div className="mb-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-center">
          <span className="font-medium text-blue-600 dark:text-blue-300">
            แสดงข้อมูลของแผนก {wardName}
          </span>
        </div>
      )}
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: isDarkMode ? '#d1d5db' : '#4b5563' }}
              stroke={isDarkMode ? '#374151' : '#e5e7eb'}
            />
            <YAxis 
              tick={{ fill: isDarkMode ? '#d1d5db' : '#4b5563' }}
              stroke={isDarkMode ? '#374151' : '#e5e7eb'}
              tickFormatter={valueFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="จำนวนผู้ป่วย"
              stroke={colors.patientCount}
              activeDot={{ r: 8 }}
              dot={{ r: 3 }}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="รับเข้า"
              stroke={colors.admitCount}
              activeDot={{ r: 6 }}
              dot={{ r: 2 }}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="จำหน่าย"
              stroke={colors.dischargeCount}
              activeDot={{ r: 6 }}
              dot={{ r: 2 }}
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-2">
        {data.length > 0 ? `แสดงข้อมูล ${data.length} วัน` : ''}
      </div>
    </div>
  );
};

export default PatientTrendChart; 