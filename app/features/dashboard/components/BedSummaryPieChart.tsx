'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

import { useBedSummaryChartData } from '../hooks/useBedSummaryChartData';
import { BedSummaryData, WardBedData } from '@/app/features/dashboard/types';

import ChartLoadingState from './charts/ChartLoadingState';
import ChartEmptyState from './charts/ChartEmptyState';
import CustomPieChartTooltip from './charts/CustomPieChartTooltip';
import CustomPieChartLegend from './charts/CustomPieChartLegend';
import PieChartCenterLabel from './charts/PieChartCenterLabel';

interface BedSummaryPieChartProps {
  data: BedSummaryData | WardBedData[];
  isLoading?: boolean;
}

const BedSummaryPieChart: React.FC<BedSummaryPieChartProps> = ({ data, isLoading = false }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';

  const { chartData, pieChartData, totalAvailableBeds, totalUnavailableBeds, totalBeds } = useBedSummaryChartData(data);

  if (isLoading) {
    return <ChartLoadingState />;
  }

  if (chartData.length === 0 || (totalAvailableBeds === 0 && totalUnavailableBeds === 0)) {
    return <ChartEmptyState />;
  }

  return (
    <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
          <Tooltip content={<CustomPieChartTooltip />} />
          <Legend content={<CustomPieChartLegend />} verticalAlign="bottom" />
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
            outerRadius="80%"
            innerRadius="60%"
              fill="#8884d8"
              dataKey="value"
            isAnimationActive={true}
            >
              {pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          <PieChartCenterLabel 
            totalAvailableBeds={totalAvailableBeds}
            totalBeds={totalBeds}
            textColor={textColor}
          />
          </PieChart>
        </ResponsiveContainer>
    </div>
  );
};

export default BedSummaryPieChart;