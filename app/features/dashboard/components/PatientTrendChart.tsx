'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export interface TrendData {
  date: string;
  patientCount: number;
  admitCount: number;
  dischargeCount: number;
}

interface PatientTrendChartProps {
  data: TrendData[];
  title?: string;
}

const PatientTrendChart: React.FC<PatientTrendChartProps> = ({ data, title = 'จำนวนผู้ป่วยเข้ารักษาพยาบาลจำแนก' }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                const label = name === 'patientCount' 
                  ? 'จำนวนผู้ป่วย' 
                  : name === 'admitCount' 
                    ? 'รับเข้าใหม่' 
                    : 'จำหน่าย';
                return [`${value} คน`, label];
              }}
            />
            <Line 
              type="monotone" 
              dataKey="patientCount" 
              name="patientCount"
              stroke="#d53f8c" 
              strokeWidth={3} 
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
            />
            <ReferenceLine 
              y={0} 
              stroke="#666" 
            />
            <Line 
              type="monotone" 
              dataKey="admitCount" 
              name="admitCount"
              stroke="#3182ce" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="dischargeCount" 
              name="dischargeCount"
              stroke="#e53e3e" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PatientTrendChart; 