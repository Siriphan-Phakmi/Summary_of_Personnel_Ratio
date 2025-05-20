'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ปรับ Interface ให้ตรงกับข้อมูลที่ส่งมา (id, wardName, value for available beds)
interface PieChartDataItem {
  id: string;
  wardName: string;
  value: number; // จำนวนเตียงว่าง
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
  // ตรวจสอบว่ากำลังใช้ dark mode หรือไม่
  const isDarkMode = useMemo(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, []);

  // ตรวจสอบว่ามีข้อมูลที่ไม่เป็น 0 อย่างน้อย 1 รายการหรือไม่
  const hasNonZeroData = data.some(item => item.value > 0);
  const totalAvailableBeds = data.reduce((sum, item) => sum + item.value, 0);

  // เตรียมข้อมูลสำหรับแสดงบนกราฟ
  const chartData = useMemo(() => {
    // แม้ไม่มีข้อมูลหรือทุกค่าเป็น 0 ก็ต้องแสดงทุก Ward
    return data.map((ward, index) => ({
      name: ward.wardName,
      value: ward.value > 0 ? ward.value : 0, // ถ้าเป็น 0 ให้เก็บเป็น 0 เพื่อให้แสดงว่าไม่มีข้อมูล
      id: ward.id,
      noData: ward.value === 0, // เพิ่ม flag สำหรับบ่งชี้ว่าไม่มีข้อมูล
      percentage: totalAvailableBeds > 0 ? 
        Math.round((ward.value / totalAvailableBeds) * 100) : 0
    }));
  }, [data, totalAvailableBeds]);

  // ถ้าไม่มีข้อมูลเลย ให้แสดงข้อความ
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

  // สำหรับ tooltip แสดงค่าที่แท้จริง (ไม่ใช่ค่าที่ปรับสำหรับการแสดงผล)
  const originalData = data.map(ward => ({
    name: ward.wardName,
    value: ward.value,
    id: ward.id,
    noData: ward.value === 0,
    percentage: totalAvailableBeds > 0 ? Math.round((ward.value / totalAvailableBeds) * 100) : 0
  }));

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, noData } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-gray-200">{name}</p>
          {noData ? (
            <p className="text-gray-600 dark:text-gray-300">ไม่ได้กรอกข้อมูล</p>
          ) : (
            <>
          <p className="text-gray-600 dark:text-gray-300">จำนวนเตียงว่าง: {value}</p>
              <p className="text-gray-600 dark:text-gray-300">คิดเป็น: {payload[0].payload.percentage}%</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Label component
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value, payload }: any) => {
    // แสดง label สำหรับทุก ward แม้จะไม่มีข้อมูล
    if (payload.noData) return null; // ไม่แสดง label สำหรับ Ward ที่ไม่มีข้อมูล
    if (value === 0) return null;    // ไม่แสดง label สำหรับค่า 0

    const RADIAN = Math.PI / 180;
    const radiusFactor = data.length > 6 ? 0.6 : 0.7; // ลดขนาด label ถ้ามี ward เยอะ
    const radius = innerRadius + (outerRadius - innerRadius) * radiusFactor;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // แสดงชื่อ Ward และจำนวนเตียง
    const labelContent = `${name}: ${Math.round(value)}`;
    const textLength = labelContent.length;
    const fontSize = data.length > 8 ? '9px' : (textLength > 15 ? '9px' : '10px');

    return (
      <text 
        x={x} 
        y={y} 
        fill="#fff" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ 
          fontSize, 
          fontWeight: 'bold', 
          textShadow: '0px 0px 3px rgba(0,0,0,0.7)' 
        }}
      >
        {labelContent}
      </text>
    );
  };

  // สร้างสีแบบไล่ระดับความเข้มของสีตามจำนวนข้อมูล
  const getColorScale = (baseColorLight: string, baseColorDark: string, index: number, noData: boolean) => {
    // ถ้าไม่มีข้อมูล ให้แสดงเป็นสีเทา
    if (noData) {
      return isDarkMode ? '#4B5563' : '#9CA3AF'; // สีเทาสำหรับ Ward ที่ไม่มีข้อมูล
    }
    
    return isDarkMode ? DARK_COLORS[index % DARK_COLORS.length] : COLORS[index % COLORS.length];
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-white">จำนวนเตียงว่าง</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={0} // เปลี่ยนเป็น 0 เพื่อให้แสดงเป็นกราฟวงกลมเต็มรูปแบบ (ไม่เป็นโดนัท)
              outerRadius={90}
              paddingAngle={1} // ลดช่องว่างเพื่อให้แสดงเป็นกราฟวงกลมปกติ
              dataKey="value"
              onClick={(entryData) => onSelectWard(entryData.id)}
              labelLine={false} // ไม่ต้องแสดงเส้นออกไปนอกกราฟ
              label={CustomLabel}
              isAnimationActive={true}
              animationDuration={500}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorScale(COLORS[index % COLORS.length], DARK_COLORS[index % DARK_COLORS.length], index, entry.noData)} 
                  stroke={selectedWardId === entry.id ? '#fff' : 'none'} 
                  strokeWidth={selectedWardId === entry.id ? 3 : 0} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(valueKey, entry) => {
                const { color, payload } = entry as any;
                const { name, value, noData } = payload;
                const originalValue = originalData.find(d => d.name === name)?.value || 0;
                
                // แสดงชื่อ Ward และจำนวนเตียง หรือ "ไม่ได้กรอกข้อมูล" ถ้าไม่มีข้อมูล
                return (
                  <span className="text-gray-800 dark:text-gray-200 text-xs" style={{ fontSize: '11px' }}>
                    {`${name}: ${noData ? "ไม่ได้กรอกข้อมูล" : `${Math.round(originalValue)} เตียง`}`}
                  </span>
                );
              }}
              layout="vertical"
              verticalAlign="middle" 
              align="right"
              wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedPieChart;