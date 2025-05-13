'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataItem {
  name: string;
  [key: string]: string | number;
}

interface CustomBarChartProps {
  data: DataItem[];
  bars: {name: string, color: string}[];
  title?: string;
  xAxisDataKey?: string;
}

const BarChartComponent: React.FC<CustomBarChartProps> = ({ 
  data, 
  bars, 
  title,
  xAxisDataKey = "name"
}) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {bars.map((bar, index) => (
              <Bar 
                key={`bar-${index}`}
                dataKey={bar.name} 
                fill={bar.color} 
                name={bar.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChartComponent; 