'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Ward } from '@/app/core/types/ward';
import { useTheme } from 'next-themes';
import { PatientTrendChartProps } from './types/componentInterfaces';
import { TrendData } from './types/index';

const WARD_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#84cc16', // lime
  '#f43f5e', // rose
  '#6366f1', // indigo
  '#a855f7', // purple
  '#0ea5e9', // sky
  '#78716c', // stone
  '#d946ef', // fuchsia
  '#facc15', // yellow
];

type LineConfig = {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth: number;
};

const processWardTrendData = (wards: Ward[], chartData: any[]): { lines: LineConfig[], useWardLines: boolean } => {
  const firstItem = chartData[0];
  if (!firstItem?.wardData || Object.keys(firstItem?.wardData || {}).length === 0) {
    return {
      lines: [
        { dataKey: 'จำนวนผู้ป่วย', name: 'จำนวนผู้ป่วย', color: '#3b82f6', strokeWidth: 2 },
        { dataKey: 'รับเข้า', name: 'รับเข้า', color: '#10b981', strokeWidth: 1.5 },
        { dataKey: 'จำหน่าย', name: 'จำหน่าย', color: '#ef4444', strokeWidth: 1.5 }
      ],
      useWardLines: false
    };
  }

  const wardLines: LineConfig[] = wards.map((ward, index) => {
    const wardId = ward.id || '';
    return {
      dataKey: `แผนก_${wardId}`,
      name: ward.wardName,
      color: WARD_COLORS[index % WARD_COLORS.length],
      strokeWidth: 1.5
    };
  });

  return {
    lines: wardLines,
    useWardLines: true
  };
};

const PatientTrendChart: React.FC<PatientTrendChartProps> = ({ 
  data, 
  loading,
  selectedWardId,
  onSelectWard,
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  // ดึงค่าการแสดงแยกแผนกจาก localStorage ถ้ามี
  const [showWardDetails, setShowWardDetails] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPreference = localStorage.getItem('dashboardShowWardDetails');
        // ถ้ามีค่าเก็บไว้ ให้ใช้ค่านั้น แต่ถ้าไม่มีให้ค่าเริ่มต้นเป็น true (แสดงแยกแผนก)
        return savedPreference !== null ? savedPreference === 'true' : true;
      } catch (error) {
        console.error('Error reading display mode preference:', error);
        return true; // ค่าเริ่มต้นเป็น true (แสดงแยกแผนก)
      }
    }
    return true; // ค่าเริ่มต้นเป็น true (แสดงแยกแผนก)
  });
  
  if (loading) {
    return (
      <div className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
        <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto mt-4"></div>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">ไม่มีข้อมูลแนวโน้มผู้ป่วย</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">กรุณาเลือกช่วงวันที่อื่น</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => {
    const baseData: any = {
    date: item.date,
    'จำนวนผู้ป่วย': item.patientCount,
    'รับเข้า': item.admitCount,
    'จำหน่าย': 'dischargeCount' in item ? item.dischargeCount : 0 // Ensure dischargeCount exists
    };

    if (item.wardData && typeof item.wardData === 'object') {
      Object.keys(item.wardData).forEach(wardId => {
        if (item.wardData && item.wardData[wardId]) {
          baseData[`แผนก_${wardId}`] = item.wardData[wardId].patientCount;
        }
      });
    }

    return baseData;
  });

  const allWards = data.length > 0 && data[0].wardData 
    ? Object.values(data[0].wardData).map((wd: any) => ({ id: wd.wardName, wardName: wd.wardName })) 
    : [];

  const { lines, useWardLines } = processWardTrendData(allWards as Ward[], data);

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
          <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">วันที่: {label}</p>
          
          {payload.map((entry: any, index: number) => {
            const isWardData = entry.dataKey.startsWith('แผนก_');
            
            let displayName = entry.name || entry.dataKey;
            if (isWardData && !entry.name) {
              const wardId = entry.dataKey.replace('แผนก_', '');
              const ward = allWards.find(w => w.id === wardId);
              if (ward) {
                displayName = ward.wardName;
              }
            }
            
            return (
            <p 
              key={`tooltip-${index}`} 
              style={{ color: entry.color }}
              className="text-sm"
            >
                {displayName}: {Math.round(entry.value)} คน
            </p>
            );
          })}
        </div>
      );
    }
    return null;
  };
  
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onSelectWard) {
      onSelectWard(e.target.value);
    }
  };
  
  const toggleDisplayMode = () => {
    // สลับระหว่างการแสดงแยกแผนกและแสดงภาพรวม
    setShowWardDetails(!showWardDetails);
    
    // บันทึกสถานะลงใน localStorage เพื่อจำค่าไว้
    try {
      localStorage.setItem('dashboardShowWardDetails', (!showWardDetails).toString());
    } catch (error) {
      console.error('Error saving display mode preference:', error);
    }
  };

  const renderLineChart = (chartData: any[], wardLines: LineConfig[], useWardLines: boolean, showWardDetails: boolean) => {
    if (useWardLines && showWardDetails) {
      return (
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
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
          <Legend />
          {wardLines.map(line => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              dot={{ r: 2 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      );
    }
    
    return (
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
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
        <Legend />
        <Line type="monotone" dataKey="จำนวนผู้ป่วย" name="จำนวนผู้ป่วย" stroke={colors.patientCount} strokeWidth={2} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="รับเข้า" name="รับเข้า" stroke={colors.admitCount} strokeWidth={1.5} />
        <Line type="monotone" dataKey="จำหน่าย" name="จำหน่าย" stroke={colors.dischargeCount} strokeWidth={1.5} />
      </LineChart>
    );
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          แนวโน้มผู้ป่วย
        </h3>
        {useWardLines && (
            <button
              onClick={toggleDisplayMode}
          className="px-3 py-1 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showWardDetails ? 'แสดงภาพรวม' : 'แสดงแยกแผนก'}
            </button>
          )}
          </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          {renderLineChart(chartData, lines, useWardLines, showWardDetails)}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PatientTrendChart; 