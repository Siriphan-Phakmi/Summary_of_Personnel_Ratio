'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

interface EnhancedBarChartProps {
  data: WardCensusData[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  showShiftData?: boolean;
}

const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({
  data,
  selectedWardId,
  onSelectWard,
  showShiftData = false
}) => {
  // คำนวณความสูงของ chart แบบ dynamic
  const chartHeight = Math.max(350, data.length * 45); // ขั้นต่ำ 350px, เพิ่ม 45px ต่อแผนก

  // สีที่ใช้สำหรับ bar chart
  const colors = {
    morning: {
      default: '#3b82f6', // blue-500
      selected: '#2563eb', // blue-600
      dark: '#60a5fa', // blue-400 for dark mode
      darkSelected: '#93c5fd', // blue-300 for dark mode
    },
    night: {
      default: '#8b5cf6', // violet-500
      selected: '#7c3aed', // violet-600
      dark: '#a78bfa', // violet-400 for dark mode
      darkSelected: '#c4b5fd', // violet-300 for dark mode
    },
    single: {
      default: '#8884d8', // กรณีไม่แยกเวร
      selected: '#9333ea', // purple-600
      dark: '#a855f7', // purple-500 for dark mode
      darkSelected: '#c084fc', // purple-400 for dark mode
    }
  };

  // แปลงข้อมูลสำหรับกราฟ
  const chartData = React.useMemo(() => {
    if (showShiftData) {
      return data.map((item) => ({
        id: item.id,
        wardName: item.wardName,
        morningPatientCount: item.morningPatientCount || 0,
        nightPatientCount: item.nightPatientCount || 0
      }));
    } else {
      return data.map((item) => ({
        id: item.id,
        wardName: item.wardName,
        patientCount: item.patientCount || 0
      }));
    }
  }, [data, showShiftData]);

  // คอมโพเนนต์ทูลทิปที่กำหนดเองเพื่อแสดงรายละเอียดเพิ่มเติมใน tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (showShiftData) {
        const morning = payload.find((p: any) => p.dataKey === 'morningPatientCount');
        const night = payload.find((p: any) => p.dataKey === 'nightPatientCount');
        
        return (
          <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
            <p className="font-bold text-gray-800 dark:text-gray-200">แผนก {label}</p>
            <div className="mt-2">
              <p className="text-blue-500 dark:text-blue-300">เวรเช้า: {Math.round(morning?.value || 0)} คน</p>
              <p className="text-indigo-500 dark:text-indigo-300">เวรดึก: {Math.round(night?.value || 0)} คน</p>
              <p className="font-semibold mt-1 border-t border-gray-200 dark:border-gray-700 pt-1 text-gray-600 dark:text-gray-300">
                รวม: {Math.round((morning?.value || 0) + (night?.value || 0))} คน
              </p>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
            <p className="font-bold text-gray-800 dark:text-gray-200">แผนก {label}</p>
            <p className="text-gray-600 dark:text-gray-300">จำนวนผู้ป่วย: {Math.round(payload[0].value)} คน</p>
          </div>
        );
      }
    }
    return null;
  };

  // Custom legend for shift data
  const CustomLegend = () => (
    <div className="flex items-center justify-center mb-3 space-x-6">
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-blue-500 dark:bg-blue-400 mr-2"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">เวรเช้า</span>
      </div>
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-violet-500 dark:bg-violet-400 mr-2"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">เวรดึก</span>
      </div>
    </div>
  );

  // นี่คือฟังก์ชันที่จะแปลงค่าให้เป็นจำนวนเต็ม
  const integerFormatter = (value: any): string => {
    // ตรวจสอบว่า value เป็น string หรือ number และแปลงเป็น number ก่อนเรียก Math.round
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    // ถ้า isNaN ให้คืนค่า "0" แทน
    return isNaN(numValue) ? "0" : Math.round(numValue).toString();
  };

  // ตรวจสอบว่ากำลังใช้ dark mode หรือไม่
  const isDarkMode = React.useMemo(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, []);

  // คำนวณความสูงที่เหมาะสมตามจำนวน Ward
  const getOptimalHeight = (data: WardCensusData[]) => {
    // กำหนดความสูงขั้นต่ำและความสูงต่อ ward
    const minHeight = 300;
    const heightPerWard = 45; // เพิ่มความสูงต่อ ward เพื่อให้มีพื้นที่เพียงพอ
    
    return Math.max(minHeight, data.length * heightPerWard);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-white">จำนวนผู้ป่วย (คงพยาบาล)</h2>
      
      {showShiftData && <CustomLegend />}
      
      <div style={{ height: `${getOptimalHeight(data)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {!showShiftData ? (
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 90, left: 10, bottom: 5 }}
              barCategoryGap={8}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis 
                type="number" 
                tickFormatter={integerFormatter} 
                stroke={isDarkMode ? '#d1d5db' : '#4b5563'}
                tick={{ fill: isDarkMode ? '#d1d5db' : '#4b5563' }}
              />
              <YAxis 
                type="category" 
                dataKey="wardName" 
                tick={{ fontSize: 12, fill: isDarkMode ? '#d1d5db' : '#4b5563' }}
                width={100}
                stroke={isDarkMode ? '#374151' : '#e5e7eb'}
              />
              <Tooltip 
                formatter={(value: any) => [Math.round(value) + " คน", "จำนวนผู้ป่วย"]}
                content={<CustomTooltip />}
              />
              <Bar 
                dataKey="patientCount" 
                name="จำนวนผู้ป่วย" 
                fill={isDarkMode ? colors.single.dark : colors.single.default}
                animationDuration={300}
                radius={[0, 4, 4, 0]}
                label={{ 
                  position: 'right',
                  formatter: (value: any) => integerFormatter(value),
                  fill: isDarkMode ? '#e5e7eb' : '#4b5563',
                  fontSize: 11,
                  fontWeight: 'bold'
                }}
                onClick={(data) => onSelectWard(data.id)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={selectedWardId === entry.id ? 
                      (isDarkMode ? colors.single.darkSelected : colors.single.selected) : 
                      (isDarkMode ? colors.single.dark : colors.single.default)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 80, left: 80, bottom: 5 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis 
                type="number" 
                tickFormatter={integerFormatter} 
                stroke={isDarkMode ? '#d1d5db' : '#4b5563'}
                tick={{ fill: isDarkMode ? '#d1d5db' : '#4b5563' }}
              />
              <YAxis 
                type="category" 
                dataKey="wardName" 
                tick={{ fontSize: 12, fill: isDarkMode ? '#d1d5db' : '#4b5563' }}
                width={100}
                stroke={isDarkMode ? '#374151' : '#e5e7eb'}
              />
              <Tooltip 
                content={<CustomTooltip />}
              />
              <Bar 
                dataKey="morningPatientCount" 
                name="เวรเช้า" 
                fill={isDarkMode ? colors.morning.dark : colors.morning.default}
                animationDuration={300}
                radius={[0, 4, 4, 0]}
                label={{ 
                  position: 'right',
                  formatter: (value: any) => integerFormatter(value),
                  fill: isDarkMode ? '#e5e7eb' : '#4b5563',
                  fontSize: 11,
                  fontWeight: 'bold'
                }}
                onClick={(data) => onSelectWard(data.id)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-morning-${index}`}
                    fill={selectedWardId === entry.id ? 
                      (isDarkMode ? colors.morning.darkSelected : colors.morning.selected) : 
                      (isDarkMode ? colors.morning.dark : colors.morning.default)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
              <Bar 
                dataKey="nightPatientCount" 
                name="เวรดึก" 
                fill={isDarkMode ? colors.night.dark : colors.night.default}
                animationDuration={300}
                radius={[0, 4, 4, 0]}
                label={{ 
                  position: 'right',
                  formatter: (value: any) => integerFormatter(value),
                  fill: isDarkMode ? '#e5e7eb' : '#4b5563',
                  fontSize: 11,
                  fontWeight: 'bold',
                  offset: 30
                }}
                onClick={(data) => onSelectWard(data.id)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-night-${index}`}
                    fill={selectedWardId === entry.id ? 
                      (isDarkMode ? colors.night.darkSelected : colors.night.selected) : 
                      (isDarkMode ? colors.night.dark : colors.night.default)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedBarChart; 