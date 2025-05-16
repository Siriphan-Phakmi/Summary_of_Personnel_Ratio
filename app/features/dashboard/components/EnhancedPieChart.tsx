'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
}

interface EnhancedPieChartProps {
  data: WardCensusData[];
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
  const chartData = data
    .filter(ward => ward.patientCount > 0) // เฉพาะแผนกที่มีคนไข้
    .map((ward, index) => ({
      name: ward.wardName,
      value: ward.patientCount,
      id: ward.id,
      // คำนวณเปอร์เซ็นต์
      percentage: ((ward.patientCount / data.reduce((sum, item) => sum + item.patientCount, 0)) * 100).toFixed(1)
    }));

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center">จำนวนเตียงว่าง</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={1}
              dataKey="value"
              onClick={(data) => onSelectWard(data.id)}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke={selectedWardId === entry.id ? '#fff' : 'none'}
                  strokeWidth={selectedWardId === entry.id ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [`${value} คน (${props.payload.percentage}%)`, `${name}`]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedPieChart; 