'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
}

interface EnhancedBarChartProps {
  data: WardCensusData[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
}

const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({
  data,
  selectedWardId,
  onSelectWard
}) => {
  const chartData = data.map(ward => ({
    name: ward.wardName,
    value: ward.patientCount,
    id: ward.id,
    color: selectedWardId === ward.id ? '#3b82f6' : '#60a5fa'
  }));

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center">Ward/แผนก</h2>
      <div className="flex items-center mb-3">
        <div className="w-4 h-4 rounded-full bg-blue-400 mr-2"></div>
        <span className="text-sm">Patient Census (คงพยาบาล)</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
            barGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={50}
              tick={{ fontSize: 12 }} 
            />
            <Tooltip 
              formatter={(value) => [`${value} คน`, 'จำนวนผู้ป่วย']} 
              labelFormatter={(label) => `แผนก ${label}`}
            />
            <Bar 
              dataKey="value" 
              fill="#60a5fa" 
              barSize={18} 
              radius={[0, 4, 4, 0]}
              onClick={(data) => onSelectWard(data.id)}
              fillOpacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedBarChart; 