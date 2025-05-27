'use client';

import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { useTheme } from 'next-themes';

interface DataItem {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

interface EnhancedBarChartProps {
  data: DataItem[];
  selectedWardId?: string;
  onSelectWard?: (wardId: string) => void;
  showShiftData?: boolean;
}

// ฟังก์ชันช่วยจัดรูปแบบตัวเลขให้เป็นจำนวนเต็ม
const integerFormatter = (value: number) => Math.round(value).toString();

// ค่าสีสำหรับกราฟแต่ละประเภท
const colors = {
  single: {
    default: '#3b82f6',
    selected: '#2563eb',
    dark: '#60a5fa',
    darkSelected: '#3b82f6'
  },
  morning: {
    default: '#3b82f6',
    selected: '#2563eb',
    dark: '#60a5fa',
    darkSelected: '#3b82f6'
  },
  night: {
    default: '#8b5cf6',
    selected: '#7c3aed',
    dark: '#a78bfa',
    darkSelected: '#8b5cf6'
  }
};

// กำหนดความสูงที่เหมาะสมตามจำนวนข้อมูล
const getOptimalHeight = (data: DataItem[]) => {
  // ต้องแสดงทุกแผนก (12 แผนก) ให้มีความสูงเพียงพอ
  const itemHeight = 40; // ความสูงต่อ 1 แท่งข้อมูล
  const minHeight = 300; // ความสูงขั้นต่ำ
  const maxHeight = 720; // ความสูงสูงสุด
  const baseHeight = 100; // ความสูงพื้นฐาน (สำหรับ legend, margin, ฯลฯ)
  
  const calculatedHeight = baseHeight + (data.length * itemHeight);
  return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
};

const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({ 
  data, 
  selectedWardId,
  onSelectWard = () => {},
  showShiftData = true
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // แปลงข้อมูลสำหรับแสดงในกราฟแท่ง
  const chartData = useMemo(() => {
    // เพิ่มข้อมูลทุกแผนก
    return data.map(item => ({
      ...item,
      // ถ้าไม่มีข้อมูลแยกเวร ให้ประมาณการจาก patientCount
      morningPatientCount: item.morningPatientCount !== undefined ? item.morningPatientCount : Math.round(item.patientCount * 0.45),
      nightPatientCount: item.nightPatientCount !== undefined ? item.nightPatientCount : Math.round(item.patientCount * 0.55)
    }));
  }, [data]);
  
  // แสดงข้อมูลในกราฟแท่ง
  return (
    <>
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
      
      <div style={{ height: `${getOptimalHeight(data)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
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
              formatter={(value: any, name: string) => {
                const formattedValue = Math.round(value);
                return [
                  `${formattedValue} คน`, 
                  name === 'morningPatientCount' ? 'เวรเช้า' : 
                  name === 'nightPatientCount' ? 'เวรดึก' : 'จำนวนผู้ป่วย'
                ];
              }}
              labelFormatter={(label) => `แผนก ${label}`}
            />
            <Legend />
            
            {/* แสดงข้อมูลเวรเช้า */}
            <Bar 
              dataKey="morningPatientCount" 
              name="เวรเช้า" 
              stackId="a"
              fill={isDarkMode ? colors.morning.dark : colors.morning.default}
              animationDuration={300}
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
              <LabelList 
                dataKey="morningPatientCount" 
                position="right" 
                formatter={integerFormatter}
                fill={isDarkMode ? '#e5e7eb' : '#4b5563'}
                fontSize={11}
                fontWeight="bold"
              />
            </Bar>
            
            {/* แสดงข้อมูลเวรดึก */}
            <Bar 
              dataKey="nightPatientCount" 
              name="เวรดึก" 
              stackId="a"
              fill={isDarkMode ? colors.night.dark : colors.night.default}
              animationDuration={300}
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
              <LabelList 
                dataKey="nightPatientCount" 
                position="right" 
                formatter={integerFormatter}
                fill={isDarkMode ? '#e5e7eb' : '#4b5563'}
                fontSize={11}
                fontWeight="bold"
                offset={30}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default EnhancedBarChart; 