'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | any;
  morningPatientCensus?: number;
  nightPatientCensus?: number;
  dailyPatientCensus?: number;
  dailyNurseTotal?: number;
  dailyNurseRatio?: number;
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

interface LineChartSummaryProps {
  summaries: DailySummary[];
  selectedWard: string;
}

type DataType = 'patients' | 'nurses' | 'ratio' | 'movement';

// ฟังก์ชันสำหรับฟอร์แมตวันที่ในแกน X
const formatDate = (dateStr: string) => {
  return dateStr; // หรือฟอร์แมตตามที่ต้องการ
};

// คอมโพเนนต์ Custom Tooltip สำหรับแสดงข้อมูลเมื่อ hover
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
        <p className="font-bold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const LineChartSummary: React.FC<LineChartSummaryProps> = ({ summaries, selectedWard }) => {
  const [dataType, setDataType] = useState<DataType>('patients');
  
  // เตรียมข้อมูลสำหรับกราฟเส้น
  const prepareChartData = () => {
    if (summaries.length === 0) return [];
    
    // กรณีเลือกแผนกเฉพาะ
    if (selectedWard !== 'all') {
      // เรียงข้อมูลตามวันที่
      const sortedData = [...summaries].sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      return sortedData.map(summary => {
        const dateObj = summary.date instanceof Date ? summary.date : new Date(summary.date);
        return {
          date: format(dateObj, 'dd/MM/yyyy', { locale: th }),
          dateObj: dateObj,
          morningPatients: summary.morningPatientCensus || 0,
          nightPatients: summary.nightPatientCensus || 0,
          totalPatients: summary.dailyPatientCensus || 0,
          nurseManager: summary.dailyNurseManagerTotal || 0,
          rn: summary.dailyRnTotal || 0,
          pn: summary.dailyPnTotal || 0,
          wc: summary.dailyWcTotal || 0,
          totalNurses: summary.dailyNurseTotal || 0,
          nurseRatio: summary.dailyNurseRatio || 0,
          available: summary.availableBeds || 0,
          unavailable: summary.unavailableBeds || 0,
          newAdmit: summary.dailyNewAdmitTotal || 0,
          referIn: summary.dailyReferInTotal || 0, 
          referOut: summary.dailyReferOutTotal || 0,
          dead: summary.dailyDeadTotal || 0
        };
      });
    }
    
    // กรณีเลือกทุกแผนก ต้องรวมข้อมูลตามวันที่
    const dataByDate = new Map<string, any>();
    
    summaries.forEach(summary => {
      const dateObj = summary.date instanceof Date ? summary.date : new Date(summary.date);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      
      if (!dataByDate.has(dateStr)) {
        dataByDate.set(dateStr, {
          date: format(dateObj, 'dd/MM/yyyy', { locale: th }),
          dateObj: dateObj,
          morningPatients: 0,
          nightPatients: 0,
          totalPatients: 0,
          nurseManager: 0,
          rn: 0,
          pn: 0,
          wc: 0,
          totalNurses: 0,
          available: 0,
          unavailable: 0,
          newAdmit: 0,
          referIn: 0,
          referOut: 0,
          dead: 0,
          wards: new Set()
        });
      }
      
      const dailyData = dataByDate.get(dateStr);
      
      // ไม่นับซ้ำแผนกเดียวกัน
      if (!dailyData.wards.has(summary.wardId)) {
        dailyData.wards.add(summary.wardId);
        dailyData.morningPatients += summary.morningPatientCensus || 0;
        dailyData.nightPatients += summary.nightPatientCensus || 0;
        dailyData.totalPatients += summary.dailyPatientCensus || 0;
        dailyData.nurseManager += summary.dailyNurseManagerTotal || 0;
        dailyData.rn += summary.dailyRnTotal || 0;
        dailyData.pn += summary.dailyPnTotal || 0;
        dailyData.wc += summary.dailyWcTotal || 0;
        dailyData.totalNurses += summary.dailyNurseTotal || 0;
        dailyData.available += summary.availableBeds || 0;
        dailyData.unavailable += summary.unavailableBeds || 0;
        dailyData.newAdmit += summary.dailyNewAdmitTotal || 0;
        dailyData.referIn += summary.dailyReferInTotal || 0;
        dailyData.referOut += summary.dailyReferOutTotal || 0;
        dailyData.dead += summary.dailyDeadTotal || 0;
      }
    });
    
    // คำนวณอัตราส่วน
    dataByDate.forEach(data => {
      if (data.totalNurses > 0) {
        data.nurseRatio = Number((data.totalPatients / data.totalNurses).toFixed(2));
      } else {
        data.nurseRatio = 0;
      }
    });
    
    // แปลงเป็น array และเรียงตามวันที่
    return Array.from(dataByDate.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  };
  
  const chartData = prepareChartData();
  
  // เลือกชุดข้อมูลที่จะแสดงตาม dataType
  const getLines = () => {
    switch (dataType) {
      case 'patients':
        return (
          <>
            <Line type="monotone" dataKey="morningPatients" name="กะเช้า" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="nightPatients" name="กะดึก" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="totalPatients" name="รวม" stroke="#ff7300" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
          </>
        );
      case 'nurses':
        return (
          <>
            <Line type="monotone" dataKey="nurseManager" name="Nurse Manager" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="rn" name="RN" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="pn" name="PN" stroke="#ff7300" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="wc" name="WC" stroke="#d88488" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="totalNurses" name="รวม" stroke="#a4de6c" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
          </>
        );
      case 'ratio':
        return (
          <>
            <Line type="monotone" dataKey="nurseRatio" name="อัตราส่วนพยาบาล:ผู้ป่วย" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="available" name="เตียงว่าง" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="right" />
            <Line type="monotone" dataKey="unavailable" name="เตียงปิด" stroke="#ff7300" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="right" />
          </>
        );
      case 'movement':
        return (
          <>
            <Line type="monotone" dataKey="newAdmit" name="รับใหม่" stroke="#3498DB" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="referIn" name="Refer In" stroke="#2ECC71" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="referOut" name="Refer Out" stroke="#E74C3C" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
            <Line type="monotone" dataKey="dead" name="Discharge/Dead" stroke="#F39C12" strokeWidth={2} activeDot={{ r: 8 }} yAxisId="left" />
          </>
        );
      default:
        return null;
    }
  };
  
  // กำหนด label ของแกน Y ตาม dataType
  const getYAxisLabel = () => {
    switch (dataType) {
      case 'patients':
        return 'จำนวนผู้ป่วย (คน)';
      case 'nurses':
        return 'จำนวนพยาบาล (คน)';
      case 'ratio':
        return 'อัตราส่วน';
      case 'movement':
        return 'จำนวน (คน)';
      default:
        return '';
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          กราฟเส้นแสดงแนวโน้ม
        </h2>
        
        {/* ตัวเลือกประเภทของข้อมูลที่จะแสดง */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setDataType('patients')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'patients'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            จำนวนผู้ป่วย
          </button>
          <button
            onClick={() => setDataType('nurses')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'nurses'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            จำนวนพยาบาล
          </button>
          <button
            onClick={() => setDataType('ratio')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'ratio'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            อัตราส่วน
          </button>
          <button
            onClick={() => setDataType('movement')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'movement'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            การเข้า-ออก
          </button>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {getLines()}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">ไม่พบข้อมูลสำหรับการแสดงกราฟ</p>
        </div>
      )}
    </div>
  );
};

export default LineChartSummary; 