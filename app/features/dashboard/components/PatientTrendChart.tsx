'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Ward } from '@/app/core/types/ward';
import { useTheme } from 'next-themes';

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
  allWards?: Ward[];
  onWardSelect?: (wardId: string) => void;
}

const PatientTrendChart: React.FC<PatientTrendChartProps> = ({ 
  data, 
  title, 
  wardName, 
  allWards = [],
  onWardSelect
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">ไม่มีข้อมูลแนวโน้มผู้ป่วย{wardName ? ` แผนก${wardName}` : ''}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">กรุณาเลือกแผนกหรือช่วงวันที่อื่น</p>
        </div>
        
        {allWards && allWards.length > 0 && onWardSelect && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-3">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">เลือกแผนกเพื่อดูข้อมูล</p>
            </div>
            <select 
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              onChange={(e) => onWardSelect(e.target.value)}
              defaultValue=""
            >
              <option value="">ทุกแผนก</option>
              {allWards.map(ward => (
                <option key={ward.id} value={ward.id || ''}>
                  {ward.wardName}
                </option>
              ))}
            </select>
          </div>
        )}
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

  // ตรวจสอบว่าเป็นมุมมองทุกแผนกหรือแผนกเดียว
  const isAllWardsView = wardName === 'ทุกแผนก';
  
  // Handler for ward selection
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onWardSelect) {
      onWardSelect(e.target.value);
    }
  };
  
  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        {title && <h3 className="text-lg font-semibold text-center text-gray-700 dark:text-gray-300">{title}</h3>}
        
        {allWards && allWards.length > 0 && onWardSelect && (
          <div className="mt-2 md:mt-0 flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">เลือกแผนก:</span>
            <select 
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              onChange={handleWardChange}
              value={isAllWardsView ? '' : wardName ? allWards.find(w => w.wardName === wardName)?.id || '' : ''}
            >
              <option value="">ทุกแผนก</option>
              {allWards.map(ward => (
                <option key={ward.id} value={ward.id || ''}>
                  {ward.wardName}
                </option>
              ))}
            </select>
            <div className="hidden md:block text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-2 py-1 rounded">
              <span>{isAllWardsView ? "แสดงภาพรวมทุกแผนก" : "เลือกแผนกเพื่อดูข้อมูลเฉพาะ"}</span>
            </div>
          </div>
        )}
      </div>
      
      {wardName && (
        <div className={`mb-4 px-4 py-2 rounded-md text-center 
            ${isAllWardsView 
              ? 'bg-purple-50 dark:bg-purple-900/20' 
              : 'bg-blue-50 dark:bg-blue-900/20'}`}
        >
          <span className={`font-medium 
            ${isAllWardsView 
              ? 'text-purple-600 dark:text-purple-300' 
              : 'text-blue-600 dark:text-blue-300'}`}
          >
            {isAllWardsView 
              ? 'แสดงข้อมูลภาพรวมของทุกแผนก' 
              : `แสดงข้อมูลเฉพาะแผนก ${wardName}`}
          </span>
          
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isAllWardsView 
              ? 'ข้อมูลเป็นการรวมยอดของทุกแผนกในช่วงวันที่เลือก' 
              : 'ข้อมูลแสดงการเคลื่อนไหวของผู้ป่วยเฉพาะแผนกที่เลือก'}
          </div>
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