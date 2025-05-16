'use client';

import React from 'react';
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

const COLORS = [
  '#36A2EB', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', 
  '#FFCD56', '#C9CBCF', '#7AC36A', '#5A9BD4', '#CE7058',
  '#D4A6C8', '#FAA75B', '#9D7660'
];

const EnhancedPieChart: React.FC<EnhancedPieChartProps> = ({
  data,
  selectedWardId,
  onSelectWard
}) => {
  // ตรวจสอบว่ามีข้อมูลที่ไม่เป็น 0 อย่างน้อย 1 รายการหรือไม่
  const hasNonZeroData = data.some(item => item.value > 0);
  const totalAvailableBeds = data.reduce((sum, item) => sum + item.value, 0);

  // เตรียมข้อมูลสำหรับแสดงบนกราฟ
  let chartData = data.map((ward, index) => ({
    name: ward.wardName,
    value: ward.value > 0 ? ward.value : (hasNonZeroData ? 0 : 1), // ถ้าทุกค่าเป็น 0 ให้แสดงเป็น 1 เพื่อให้กราฟมีขนาดเท่ากัน
    id: ward.id,
    percentage: totalAvailableBeds > 0 ? 
      Math.round((ward.value / totalAvailableBeds) * 100) : 
      (data.length > 0 ? Math.round(100 / data.length) : 0) // ถ้ารวม = 0 แต่มีข้อมูล ให้แสดงเป็นเปอร์เซ็นต์เท่าๆ กัน
  }));

  // ถ้าไม่มีข้อมูลเลย ให้แสดงข้อความ
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-center dark:text-white">จำนวนเตียงว่าง</h2>
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
    percentage: totalAvailableBeds > 0 ? Math.round((ward.value / totalAvailableBeds) * 100) : 0
  }));

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, percentage } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-gray-200">{name}</p>
          <p className="text-gray-600 dark:text-gray-300">จำนวนเตียงว่าง: {value}</p>
          <p className="text-gray-600 dark:text-gray-300">คิดเป็น: {percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom Label component
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    // อย่าแสดง Label ถ้าค่าเป็น 0
    if (chartData[index].value === 0) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // แสดงชื่อแผนกแทนเปอร์เซ็นต์
    return (
      <text 
        x={x} 
        y={y} 
        fill="#fff" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '12px', fontWeight: 'bold', textShadow: '0px 0px 3px rgba(0,0,0,0.9)' }}
      >
        {name}
      </text>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center dark:text-white">จำนวนเตียงว่าง</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onClick={(entryData) => onSelectWard(entryData.id)}
              labelLine={false}
              label={CustomLabel}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke={selectedWardId === entry.id ? '#fff' : 'none'} // ปรับสี stroke ตอน select
                  strokeWidth={selectedWardId === entry.id ? 2 : 0}
                  opacity={entry.value === 0 ? 0.5 : 1} // ลดความเข้มถ้าเป็น 0
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(valueKey, entry) => {
                const { color, payload } = entry as any;
                const { name, value, percentage } = payload;
                return (
                  <span className="text-gray-800 dark:text-gray-200" style={{ display: 'inline-block', marginRight: '10px' }}>
                    {`${name}: ${value} (${percentage}%)`}
                  </span>
                );
              }}
              layout="horizontal"
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedPieChart;