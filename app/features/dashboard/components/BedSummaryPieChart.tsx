'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

// ข้อมูลสำหรับแสดงสรุปเตียง (ว่าง/ไม่ว่าง/แผนจำหน่าย)
export interface BedSummaryData {
  availableBeds?: number; // จาก dailySummaries
  unavailableBeds?: number; // จาก dailySummaries
  plannedDischarge?: number;
  available?: number; // จาก wardForm
  unavailable?: number; // จาก wardForm
  wardName?: string; // เพิ่มชื่อ Ward
}

// ข้อมูลสำหรับแต่ละ Ward
export interface WardBedData {
  id: string;
  wardName: string;
  available: number;
  unavailable: number;
  plannedDischarge: number;
}

interface BedSummaryPieChartProps {
  data: BedSummaryData | WardBedData[];
}

const BedSummaryPieChart: React.FC<BedSummaryPieChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // แสดง console.log เพื่อตรวจสอบข้อมูลที่ได้รับ
  console.log('BedSummaryPieChart received data:', JSON.parse(JSON.stringify(data)));

  // กำหนดสีให้สดใสสำหรับแต่ละ ward
  const COLORS = [
    '#FFD700', // สีเหลืองทอง (4A)
    '#87CEEB', // สีฟ้าอ่อน (9B)
    '#FFA07A', // สีส้มอ่อน (7B)
    '#FFB6C1', // สีชมพูอ่อน (10B)
    '#DDA0DD', // สีม่วงอ่อน (11B)
    '#98FB98', // สีเขียวอ่อน (SEMI-ICU 10B)
    '#FF7F50', // สีส้มแดง (SEMI-ICU 8B)
    '#00BFFF', // สีฟ้าสด (8B)
    '#32CD32', // สีเขียวสด
    '#FF69B4', // สีชมพูสด
    '#9370DB', // สีม่วง
    '#20B2AA', // สีเขียวฟ้า
  ];

  // สีสำหรับกรณีไม่มีเตียงว่าง
  const NO_AVAILABLE_BEDS_COLOR = '#D3D3D3'; // Light gray

  // ตรวจสอบว่าข้อมูลเป็นอาร์เรย์หรือไม่
  const isMultipleWards = Array.isArray(data);
  
  let chartData: any[] = [];
  let totalAvailableBeds = 0;
  let totalUnavailableBeds = 0;
  let totalBeds = 0;
  
  // สร้างข้อมูลสำหรับแสดงบนกราฟ
  if (isMultipleWards) {
    // กรณีข้อมูลเป็นอาร์เรย์ของ WardBedData
    // แสดงข้อมูลทุกแผนก ไม่ว่าจะมีเตียงว่างหรือไม่
    chartData = (data as WardBedData[])
      .map((ward, index) => {
        const availableBeds = ward.available || 0;
        const unavailableBeds = ward.unavailable || 0;
        // ถ้าไม่มีข้อมูลทั้ง available และ unavailable ให้ใช้ค่าดีฟอลต์ 
        // เพื่อให้มีอะไรแสดงใน chart
        const defaultTotal = (availableBeds === 0 && unavailableBeds === 0) ? 10 : 0;
        const defaultUnavailable = (availableBeds === 0 && unavailableBeds === 0) ? 10 : 0;
        
        totalAvailableBeds += availableBeds;
        totalUnavailableBeds += unavailableBeds || defaultUnavailable;
        totalBeds += availableBeds + (unavailableBeds || defaultUnavailable) || defaultTotal;
        
        return {
          id: ward.id,
          name: ward.wardName || ward.id,
          value: availableBeds,
          unavailable: unavailableBeds || defaultUnavailable,
          totalBeds: availableBeds + (unavailableBeds || defaultUnavailable) || defaultTotal,
          plannedDischarge: ward.plannedDischarge || 0,
          color: availableBeds > 0 ? COLORS[index % COLORS.length] : NO_AVAILABLE_BEDS_COLOR,
        };
      });
  } else {
    // กรณีข้อมูลเป็น BedSummaryData แบบเดิม
    const singleData = data as BedSummaryData;
    
    // รองรับทั้ง availableBeds (จาก dailySummaries) และ available (จาก wardForm)
    const availableBeds = singleData.available || singleData.availableBeds || 0;
    const unavailableBeds = singleData.unavailable || singleData.unavailableBeds || 0;
    // ถ้าไม่มีข้อมูลทั้ง available และ unavailable ให้ใช้ค่าดีฟอลต์
    const defaultTotal = (availableBeds === 0 && unavailableBeds === 0) ? 10 : 0;
    const defaultUnavailable = (availableBeds === 0 && unavailableBeds === 0) ? 10 : 0;
    
    totalAvailableBeds = availableBeds;
    totalUnavailableBeds = unavailableBeds || defaultUnavailable;
    totalBeds = availableBeds + (unavailableBeds || defaultUnavailable) || defaultTotal;
    
    chartData = [
      { 
        name: singleData.wardName || 'เตียงว่าง', 
        value: availableBeds, 
        unavailable: unavailableBeds || defaultUnavailable,
        totalBeds: availableBeds + (unavailableBeds || defaultUnavailable) || defaultTotal,
        plannedDischarge: singleData.plannedDischarge || 0,
        color: availableBeds > 0 ? COLORS[0] : NO_AVAILABLE_BEDS_COLOR
      }
    ];
  }

  // ถ้าไม่มีข้อมูลเลยให้แสดงข้อความแจ้งเตือน
  if (chartData.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูล</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
          ไม่พบข้อมูลแผนกหรือเตียงในระบบ กรุณาตรวจสอบการเชื่อมต่อกับฐานข้อมูล
        </p>
      </div>
    );
  }

  // เตรียมข้อมูลสำหรับกราฟวงกลม
  let pieChartData: any[] = [];
  
  // ถ้าไม่มีเตียงว่างเลย ให้แสดงเป็นกราฟวงกลมที่แสดงเฉพาะเตียงไม่ว่าง
  if (totalAvailableBeds === 0) {
    // สร้างข้อมูลสำหรับแสดงเฉพาะเตียงที่ไม่ว่าง
    pieChartData = chartData.map(item => ({
      id: item.id,
      name: item.name,
      value: item.unavailable,
      totalBeds: item.totalBeds,
      color: NO_AVAILABLE_BEDS_COLOR,
      isUnavailable: true // เพิ่ม flag เพื่อระบุว่าเป็นข้อมูลเตียงไม่ว่าง
    }));
  } else {
    // กรณีมีเตียงว่าง ให้ใช้ข้อมูลเตียงว่างตามปกติ
    pieChartData = chartData.map(item => ({
      id: item.id,
      name: item.name,
      value: item.value,
      unavailable: item.unavailable,
      totalBeds: item.totalBeds,
      plannedDischarge: item.plannedDischarge,
      color: item.color
    }));
  }

  const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, unavailable, isUnavailable, totalBeds, plannedDischarge } = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {name}
          </p>
          {isUnavailable ? (
            // กรณีเป็นข้อมูลเตียงไม่ว่าง
            <p className="text-xs text-gray-700 dark:text-gray-300">
              จำนวนเตียงไม่ว่าง: <span className="font-medium">{value}</span> เตียง
            </p>
          ) : (
            // กรณีเป็นข้อมูลเตียงว่าง
            <>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                จำนวนเตียงว่าง: <span className="font-medium">{value}</span> เตียง
              </p>
              {unavailable !== undefined && (
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  จำนวนเตียงไม่ว่าง: <span className="font-medium">{unavailable}</span> เตียง
                </p>
              )}
              {plannedDischarge !== undefined && plannedDischarge > 0 && (
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  แผนจำหน่าย: <span className="font-medium">{plannedDischarge}</span>
                </p>
              )}
            </>
          )}
          {totalBeds !== undefined && (
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
              เตียงทั้งหมด: <span className="font-medium">{totalBeds}</span> เตียง
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <div className="pt-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-start">
          {payload.map((entry: any, index: number) => (
            <li key={`item-${index}`} className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {entry.name} <span className="font-semibold">{entry.payload.isUnavailable ? 'ไม่ว่าง' : 'ว่าง'}: {entry.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <div className="text-center mb-3">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {totalAvailableBeds > 0 ? 'จำนวนเตียงว่าง' : 'จำนวนเตียงไม่ว่าง'}
        </h3>
        {totalAvailableBeds > 0 ? (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            เตียงว่างทั้งหมด: <span className="font-medium">{totalAvailableBeds}</span> เตียง
            {totalUnavailableBeds > 0 && ` (เตียงไม่ว่าง: ${totalUnavailableBeds})`}
          </p>
        ) : (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ไม่มีเตียงว่าง (เตียงไม่ว่าง: <span className="font-medium">{totalUnavailableBeds}</span> เตียง)
          </p>
        )}
      </div>
      
      <div className="flex-grow flex items-center justify-center" style={{ minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius="65%"
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => (value > 0 ? `${value}` : '')}
              labelLine={false}
              isAnimationActive={true}
              animationDuration={800}
            >
              {pieChartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  stroke={isDarkMode ? '#374151' : '#f8fafc'}
                  strokeWidth={0.5}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BedSummaryPieChart; 