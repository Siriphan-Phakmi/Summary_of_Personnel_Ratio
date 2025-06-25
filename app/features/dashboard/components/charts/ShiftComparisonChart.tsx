import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ShiftComparisonChartProps {
  data: any[];
  title: string;
  morningDataKey?: string;
  nightDataKey?: string;
  morningLabel?: string;
  nightLabel?: string;
  morningColor?: string;
  nightColor?: string;
  valueFormatter?: (value: number) => string;
}

/**
 * แสดงกราฟเปรียบเทียบข้อมูลระหว่างกะเช้าและกะดึก
 */
const ShiftComparisonChart: React.FC<ShiftComparisonChartProps> = ({
  data,
  title,
  morningDataKey = 'กะเช้า',
  nightDataKey = 'กะดึก',
  morningLabel = 'กะเช้า (Morning)',
  nightLabel = 'กะดึก (Night)',
  morningColor = '#3b82f6',
  nightColor = '#4f46e5',
  valueFormatter = (value) => `${value} คน`
}) => {
  // ฟังก์ชันฟอร์แมตวันที่เป็นภาษาไทย
  const formatThaiDate = (date: Date): string => {
    try {
      return format(date, 'd MMMM yyyy', { locale: th });
    } catch (err) {
      return format(date, 'yyyy-MM-dd');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [valueFormatter(Number(value)), '']}
              labelFormatter={(label) => `วันที่: ${label}`}
            />
            <Legend />
            <Bar dataKey={morningDataKey} fill={morningColor} name={morningLabel} />
            <Bar dataKey={nightDataKey} fill={nightColor} name={nightLabel} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ShiftComparisonChart; 