'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | any;
  morningPatientCensus?: number;
  nightPatientCensus?: number;
  dailyPatientCensus?: number;
  dailyNurseTotal?: number;
  availableBeds?: number;
  unavailableBeds?: number;
  dailyNurseManagerTotal?: number;
  dailyRnTotal?: number;
  dailyPnTotal?: number;
  dailyWcTotal?: number;
  dailyNewAdmitTotal?: number;
  dailyReferInTotal?: number;
  dailyReferOutTotal?: number;
  dailyDeadTotal?: number;
}

interface PieChartSummaryProps {
  summaries: DailySummary[];
  selectedWard: string;
}

// กำหนดสีสำหรับกราฟวงกลม
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#EC7063', '#3498DB', '#1ABC9C', '#F1C40F', '#E67E22'];

type ChartDataType = 'nurse' | 'bed' | 'movement' | 'ward';

const PieChartSummary: React.FC<PieChartSummaryProps> = ({ summaries, selectedWard }) => {
  const [chartType, setChartType] = useState<ChartDataType>('nurse');
  
  // รวมข้อมูลล่าสุดจากทุกแผนก
  const getLatestData = () => {
    if (summaries.length === 0) return [];
    
    const latestByWard = new Map<string, DailySummary>();
    summaries.forEach(summary => {
      const existing = latestByWard.get(summary.wardId);
      if (!existing) {
        latestByWard.set(summary.wardId, summary);
        return;
      }
      
      const existingDate = existing.date instanceof Date ? existing.date : new Date(existing.date);
      const currentDate = summary.date instanceof Date ? summary.date : new Date(summary.date);
      
      if (currentDate > existingDate) {
        latestByWard.set(summary.wardId, summary);
      }
    });
    
    return Array.from(latestByWard.values());
  };
  
  const latestData = getLatestData();
  
  // ฟังก์ชันสำหรับการคำนวณข้อมูลตามประเภทของกราฟ
  const calculateChartData = () => {
    if (latestData.length === 0) return [];
    
    // กรณีเลือกแผนกเฉพาะ
    if (selectedWard !== 'all') {
      const wardData = latestData.find(d => d.wardId === selectedWard);
      if (!wardData) return [];
      
      switch (chartType) {
        case 'nurse':
          return [
            { name: 'Nurse Manager', value: wardData.dailyNurseManagerTotal || 0 },
            { name: 'RN', value: wardData.dailyRnTotal || 0 },
            { name: 'PN', value: wardData.dailyPnTotal || 0 },
            { name: 'WC', value: wardData.dailyWcTotal || 0 }
          ].filter(item => item.value > 0);
          
        case 'bed':
          return [
            { name: 'ผู้ป่วย', value: wardData.dailyPatientCensus || 0 },
            { name: 'เตียงว่าง', value: wardData.availableBeds || 0 },
            { name: 'เตียงไม่พร้อมใช้', value: wardData.unavailableBeds || 0 }
          ].filter(item => item.value > 0);
          
        case 'movement':
          return [
            { name: 'รับใหม่', value: wardData.dailyNewAdmitTotal || 0 },
            { name: 'Refer In', value: wardData.dailyReferInTotal || 0 },
            { name: 'Refer Out', value: wardData.dailyReferOutTotal || 0 },
            { name: 'Discharge', value: (wardData.dailyDeadTotal || 0) }
          ].filter(item => item.value > 0);
          
        default:
          return [];
      }
    }
    
    // กรณีเลือกทุกแผนก
    switch (chartType) {
      case 'nurse':
        {
          // รวมจำนวนพยาบาลแต่ละประเภทจากทุกแผนก
          let nurseManager = 0, rn = 0, pn = 0, wc = 0;
          latestData.forEach(ward => {
            nurseManager += ward.dailyNurseManagerTotal || 0;
            rn += ward.dailyRnTotal || 0;
            pn += ward.dailyPnTotal || 0;
            wc += ward.dailyWcTotal || 0;
          });
          
          return [
            { name: 'Nurse Manager', value: nurseManager },
            { name: 'RN', value: rn },
            { name: 'PN', value: pn },
            { name: 'WC', value: wc }
          ].filter(item => item.value > 0);
        }
        
      case 'bed':
        {
          // รวมจำนวนเตียงและผู้ป่วยจากทุกแผนก
          let patients = 0, available = 0, unavailable = 0;
          latestData.forEach(ward => {
            patients += ward.dailyPatientCensus || 0;
            available += ward.availableBeds || 0;
            unavailable += ward.unavailableBeds || 0;
          });
          
          return [
            { name: 'ผู้ป่วย', value: patients },
            { name: 'เตียงว่าง', value: available },
            { name: 'เตียงไม่พร้อมใช้', value: unavailable }
          ].filter(item => item.value > 0);
        }
        
      case 'movement':
        {
          // รวมข้อมูลการเข้าออกจากทุกแผนก
          let newAdmit = 0, referIn = 0, referOut = 0, discharge = 0;
          latestData.forEach(ward => {
            newAdmit += ward.dailyNewAdmitTotal || 0;
            referIn += ward.dailyReferInTotal || 0;
            referOut += ward.dailyReferOutTotal || 0;
            discharge += ward.dailyDeadTotal || 0;
          });
          
          return [
            { name: 'รับใหม่', value: newAdmit },
            { name: 'Refer In', value: referIn },
            { name: 'Refer Out', value: referOut },
            { name: 'Discharge', value: discharge }
          ].filter(item => item.value > 0);
        }
        
      case 'ward':
        // แสดงข้อมูลจำนวนผู้ป่วยแยกตามแผนก
        return latestData
          .map(ward => ({ name: ward.wardName, value: ward.dailyPatientCensus || 0 }))
          .filter(item => item.value > 0);
        
      default:
        return [];
    }
  };
  
  const chartData = calculateChartData();
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          กราฟวงกลมสรุปข้อมูล
        </h2>
        
        {/* ตัวเลือกประเภทของข้อมูลที่จะแสดง */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setChartType('nurse')}
            className={`px-4 py-2 rounded-md ${
              chartType === 'nurse'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            สัดส่วนพยาบาล
          </button>
          <button
            onClick={() => setChartType('bed')}
            className={`px-4 py-2 rounded-md ${
              chartType === 'bed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            สัดส่วนเตียง
          </button>
          <button
            onClick={() => setChartType('movement')}
            className={`px-4 py-2 rounded-md ${
              chartType === 'movement'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            การเข้า-ออก
          </button>
          {selectedWard === 'all' && (
            <button
              onClick={() => setChartType('ward')}
              className={`px-4 py-2 rounded-md ${
                chartType === 'ward'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
              }`}
            >
              จำนวนผู้ป่วยตามแผนก
            </button>
          )}
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [
                  `${value} ${chartType === 'nurse' ? 'คน' : chartType === 'bed' ? 'เตียง' : 'คน'}`, 
                  'จำนวน'
                ]} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">ไม่พบข้อมูลสำหรับแสดงในกราฟ</p>
        </div>
      )}
    </div>
  );
};

export default PieChartSummary; 