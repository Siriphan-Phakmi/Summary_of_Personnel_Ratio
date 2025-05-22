'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ปรับ Interface ให้ตรงกับข้อมูลที่ส่งมา
export interface PieChartDataItem {
  id: string;
  wardName: string;
  value: number; // จำนวนเตียงว่าง
  total?: number; // จำนวนเตียงทั้งหมด
  unavailable?: number; // จำนวนเตียงไม่ว่าง
  plannedDischarge?: number; // จำนวนเตียงที่วางแผนจำหน่าย
}

interface EnhancedPieChartProps {
  data: PieChartDataItem[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
}

// กำหนดสีให้สดใสและเหมาะกับทั้งโหมดสว่างและมืด
const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#d946ef', // fuchsia-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#14b8a6', // teal-500
  '#f43f5e', // rose-500
  '#a855f7', // purple-500
];

// กำหนดสีสำหรับโหมดมืด
const DARK_COLORS = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#a78bfa', // violet-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#22d3ee', // cyan-400
  '#e879f9', // fuchsia-400
  '#818cf8', // indigo-400
  '#a3e635', // lime-400
  '#2dd4bf', // teal-400
  '#fb7185', // rose-400
  '#c084fc', // purple-400
];

const EnhancedPieChart: React.FC<EnhancedPieChartProps> = ({
  data,
  selectedWardId,
  onSelectWard
}) => {
  // ใช้ useTheme hook จาก next-themes แทนการตรวจสอบเอง เพื่อให้สอดคล้องกับคอมโพเนนต์อื่นๆ
  const { theme } = require('next-themes').useTheme();
  const isDarkMode = theme === 'dark';

  // ตรวจสอบว่ามีข้อมูลที่ไม่เป็น 0 อย่างน้อย 1 รายการหรือไม่
  const hasNonZeroData = data.some(item => item.value > 0);
  const totalAvailableBeds = data.reduce((sum, item) => sum + (item.value || 0), 0);

  // เตรียมข้อมูลสำหรับแสดงบนกราฟ - ต้องแสดงทุก Ward เสมอ แม้ค่าจะเป็น 0
  const chartData = useMemo(() => {
    // แสดงทุก Ward เสมอ แม้ไม่มีข้อมูลหรือทุกค่าเป็น 0
    return data.map((ward) => ({
      name: ward.wardName,
      value: ward.value > 0 ? ward.value : 0,
      id: ward.id,
      // noData is true if available beds are 0 AND total beds are 0 (or undefined)
      noData: ward.value === 0 && (ward.total === undefined || ward.total === 0),
      percentage: totalAvailableBeds > 0 ?
        Math.round((ward.value / totalAvailableBeds) * 100) : 0,
      total: ward.total || 0,
      unavailable: ward.unavailable || 0
    }));
  }, [data, totalAvailableBeds]);

  // ถ้าไม่มีข้อมูลเลย ให้แสดงข้อความ (ทั้งนี้ต้องไม่มีข้อมูลจริงๆ ไม่ใช่แค่มีแต่ค่าเป็น 0)
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-white">จำนวนเตียงว่าง</h2>
        <div className="h-72 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">ไม่มีข้อมูลเตียงว่าง</p>
        </div>
      </div>
    );
  }

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, noData, percentage, total, unavailable, plannedDischarge } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-gray-200">{name}</p>
          {noData ? (
            <p className="text-gray-600 dark:text-gray-300">ไม่ได้กรอกข้อมูล</p>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-300">เตียงว่าง: {value}</p>
              <p className="text-gray-600 dark:text-gray-300">เตียงไม่ว่าง: {unavailable}</p>
              <p className="text-gray-600 dark:text-gray-300">เตียงทั้งหมด: {total}</p>
              <p className="text-gray-600 dark:text-gray-300">แผนจำหน่าย: {plannedDischarge || 0}</p>
              <p className="text-gray-600 dark:text-gray-300">คิดเป็น: {percentage}%</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Label component - แสดงเฉพาะบน segment ที่มีข้อมูล และปรับปรุงให้อ่านง่ายขึ้น
  const CustomLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, value, name, index, x, y, fill, noData } = props;

    if (value === 0) { // Do not show label if value is 0
      return null;
    }

    const boxWidth = 28; // เพิ่มความกว้างเล็กน้อย
    const boxHeight = 20; // เพิ่มความสูงเล็กน้อย
    const borderRadius = 4; // เพิ่มความโค้งมนเล็กน้อย

    // Position the box centered around the (x,y) point given by recharts
    const rectX = x - boxWidth / 2;
    const rectY = y - boxHeight / 2;

    return (
      <g>
        <rect
          x={rectX}
          y={rectY}
          width={boxWidth}
          height={boxHeight}
          rx={borderRadius}
          ry={borderRadius}
          fill={isDarkMode ? "#4B5563" : "#374151"} // Dark gray box
          stroke={isDarkMode ? "#6B7280" : "#1F2937"} // เพิ่ม stroke เพื่อให้เห็นชัดเจนขึ้น
          strokeWidth={0.5}
        />
        <text
          x={x}
          y={y}
          fill="#FFFFFF" // White text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11px" // เพิ่มขนาดตัวอักษรเล็กน้อย
          fontWeight="bold"
        >
          {Math.round(value)}
        </text>
      </g>
    );
  };

  // สร้างสีแบบไล่ระดับความเข้มของสีตามจำนวนข้อมูล
  const getColorScale = (baseColorLight: string, baseColorDark: string, index: number, noDataFlag: boolean) => {
    if (noDataFlag) {
      return isDarkMode ? '#4B5563' : '#9CA3AF'; // Gray for noData
    }
    return isDarkMode ? DARK_COLORS[index % DARK_COLORS.length] : COLORS[index % COLORS.length];
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md h-full">
      <h2 className="text-lg font-semibold mb-3 text-center text-gray-800 dark:text-white">จำนวนเตียงว่าง</h2>
      <div className="h-full" style={{ minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius="70%" // ใช้เป็นเปอร์เซ็นต์เพื่อความยืดหยุ่น
              paddingAngle={2}
              dataKey="value"
              onClick={(entryData) => onSelectWard(entryData.id)}
              labelLine={false} // ไม่แสดงเส้น
              label={<CustomLabel />}
              isAnimationActive={true}
              animationDuration={500}
              minAngle={1}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColorScale(COLORS[index % COLORS.length], DARK_COLORS[index % DARK_COLORS.length], index, entry.noData)}
                  stroke={selectedWardId === entry.id ? (isDarkMode ? '#FFFFFF' : '#1F2937') : (isDarkMode ? '#374151' : '#E5E7EB')}
                  strokeWidth={selectedWardId === entry.id ? 2 : 0.5}
                  style={{ cursor: 'pointer' }} // เพิ่ม cursor pointer
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value, entry) => {
                const { payload } = entry as any;
                // แสดงจำนวนเตียงว่างต่อท้ายชื่อ ward
                return (
                  <span style={{ 
                    color: isDarkMode ? '#D1D5DB' : '#374151', 
                    fontSize: '11px', 
                    marginLeft: '3px',
                    fontWeight: selectedWardId === payload.id ? 'bold' : 'normal'
                  }}>
                    {payload.name} ({payload.value})
                  </span>
                );
              }}
              layout="vertical"
              verticalAlign="middle"
              align="right"
              iconSize={8}
              iconType="circle" // เปลี่ยนเป็นวงกลม
              wrapperStyle={{ 
                fontSize: '11px', 
                paddingLeft: '10px',
                maxHeight: '180px',
                overflowY: 'auto' // เพิ่ม scroll กรณีมีข้อมูลเยอะ
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedPieChart;