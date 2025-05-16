'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

interface EnhancedBarChartProps {
  data: WardCensusData[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  showShiftData?: boolean;
}

const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({
  data,
  selectedWardId,
  onSelectWard,
  showShiftData = false
}) => {
  const chartData = data.map(ward => {
    if (showShiftData) {
      return {
        name: ward.wardName,
        id: ward.id,
        'กะเช้า': ward.morningPatientCount || 0,
        'กะดึก': ward.nightPatientCount || 0,
        color: selectedWardId === ward.id ? '#3b82f6' : '#60a5fa'
      };
    } else {
      return {
        name: ward.wardName,
        value: ward.patientCount,
        id: ward.id,
        color: selectedWardId === ward.id ? '#3b82f6' : '#60a5fa'
      };
    }
  });

  // คอมโพเนนต์ทูลทิปที่กำหนดเองเพื่อแสดงรายละเอียดเพิ่มเติมใน tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (showShiftData) {
        const morning = payload.find((p: any) => p.dataKey === 'กะเช้า');
        const night = payload.find((p: any) => p.dataKey === 'กะดึก');
        
        return (
          <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
            <p className="font-bold text-gray-800 dark:text-gray-200">แผนก {label}</p>
            <div className="mt-2">
              <p className="text-blue-500">กะเช้า: {Math.round(morning?.value || 0)} คน</p>
              <p className="text-indigo-600">กะดึก: {Math.round(night?.value || 0)} คน</p>
              <p className="font-semibold mt-1 border-t border-gray-200 dark:border-gray-700 pt-1 text-gray-600 dark:text-gray-300">
                รวม: {Math.round((morning?.value || 0) + (night?.value || 0))} คน
              </p>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
            <p className="font-bold text-gray-800 dark:text-gray-200">แผนก {label}</p>
            <p className="text-gray-600 dark:text-gray-300">จำนวนผู้ป่วย: {Math.round(payload[0].value)} คน</p>
          </div>
        );
      }
    }
    return null;
  };

  // Custom legend for shift data
  const CustomLegend = () => (
    <div className="flex items-center justify-center mb-3 space-x-6">
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-blue-400 mr-2"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">กะเช้า</span>
      </div>
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-blue-600 mr-2"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">กะดึก</span>
      </div>
    </div>
  );

  // Custom Y-axis label
  const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-5}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#666"
          className="text-xs dark:text-gray-300"
          style={{ fontSize: '12px' }}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center dark:text-white">Patient Census (คงพยาบาล)</h2>
      
      {showShiftData && <CustomLegend />}
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {!showShiftData ? (
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
                width={70}
                tick={<CustomYAxisTick />}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#60a5fa" 
                barSize={18} 
                radius={[0, 4, 4, 0]}
                onClick={(data) => onSelectWard(data.id)}
                fillOpacity={0.8}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={selectedWardId === entry.id ? '#3b82f6' : '#60a5fa'} 
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={70}
                tick={<CustomYAxisTick />}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="กะเช้า" 
                fill="#60a5fa" 
                barSize={10} 
                radius={[0, 4, 4, 0]}
                onClick={(data) => onSelectWard(data.id)}
                fillOpacity={0.9}
                stackId="a"
                name="กะเช้า"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-morning-${index}`}
                    fill={selectedWardId === entry.id ? '#3b82f6' : '#60a5fa'} 
                  />
                ))}
              </Bar>
              <Bar 
                dataKey="กะดึก" 
                fill="#2563eb" 
                barSize={10} 
                radius={[0, 4, 4, 0]}
                onClick={(data) => onSelectWard(data.id)}
                fillOpacity={0.9}
                stackId="a"
                name="กะดึก"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-night-${index}`}
                    fill={selectedWardId === entry.id ? '#1d4ed8' : '#2563eb'} 
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedBarChart; 