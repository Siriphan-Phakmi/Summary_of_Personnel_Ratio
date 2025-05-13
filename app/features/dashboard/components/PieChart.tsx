'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DataItem {
  name: string;
  value: number;
  color: string;
}

interface CustomPieChartProps {
  data: DataItem[];
  title?: string;
}

const CustomPieChart: React.FC<CustomPieChartProps> = ({ data, title }) => {
  return (
    <div className="h-full w-full bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 text-center">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value}`, 'จำนวน']} />
            <Legend layout="vertical" align="right" verticalAlign="middle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CustomPieChart; 