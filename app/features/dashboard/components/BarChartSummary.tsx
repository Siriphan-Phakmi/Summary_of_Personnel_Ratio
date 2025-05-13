'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

interface BarChartSummaryProps {
  summaries: DailySummary[];
  selectedWard: string;
}

type DataType = 'patient-shift' | 'nurse-types' | 'bed-status' | 'ward-comparison';

const BarChartSummary: React.FC<BarChartSummaryProps> = ({ summaries, selectedWard }) => {
  const [dataType, setDataType] = useState<DataType>('patient-shift');
  
  // เตรียมข้อมูลสำหรับกราฟแท่ง
  const prepareChartData = () => {
    if (summaries.length === 0) return [];
    
    // ใช้เฉพาะข้อมูลล่าสุด
    const getLatestByWard = () => {
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
    
    // ข้อมูลล่าสุดของแต่ละแผนก
    const latestData = getLatestByWard();
    
    switch (dataType) {
      case 'patient-shift': {
        // แสดงจำนวนผู้ป่วยแยกตามกะเช้า-ดึก
        if (selectedWard !== 'all') {
          // กรณีเลือกแผนกเฉพาะ แสดงผลตามวันที่
          const sortedData = [...summaries]
            .filter(s => s.wardId === selectedWard)
            .sort((a, b) => {
              const dateA = a.date instanceof Date ? a.date : new Date(a.date);
              const dateB = b.date instanceof Date ? b.date : new Date(b.date);
              return dateA.getTime() - dateB.getTime();
            })
            .slice(-7); // แสดงแค่ 7 วันล่าสุด
          
          return sortedData.map(summary => {
            const dateObj = summary.date instanceof Date ? summary.date : new Date(summary.date);
            return {
              date: format(dateObj, 'dd/MM/yy', { locale: th }),
              'กะเช้า': summary.morningPatientCensus || 0,
              'กะดึก': summary.nightPatientCensus || 0,
              'รวม 24 ชม.': summary.dailyPatientCensus || 0
            };
          });
        } else {
          // กรณีเลือกทุกแผนก รวมข้อมูลของทุกแผนก
          const dataByDate = new Map<string, any>();
          
          summaries.forEach(summary => {
            const dateObj = summary.date instanceof Date ? summary.date : new Date(summary.date);
            const dateStr = format(dateObj, 'yyyy-MM-dd');
            
            if (!dataByDate.has(dateStr)) {
              dataByDate.set(dateStr, {
                date: format(dateObj, 'dd/MM/yy', { locale: th }),
                dateObj,
                'กะเช้า': 0,
                'กะดึก': 0,
                'รวม 24 ชม.': 0,
                wards: new Set()
              });
            }
            
            const data = dataByDate.get(dateStr);
            if (!data.wards.has(summary.wardId)) {
              data.wards.add(summary.wardId);
              data['กะเช้า'] += summary.morningPatientCensus || 0;
              data['กะดึก'] += summary.nightPatientCensus || 0;
              data['รวม 24 ชม.'] += summary.dailyPatientCensus || 0;
            }
          });
          
          return Array.from(dataByDate.values())
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
            .slice(-7); // แสดงแค่ 7 วันล่าสุด
        }
      }
      
      case 'nurse-types': {
        // แสดงจำนวนพยาบาลแต่ละประเภท
        if (selectedWard !== 'all') {
          // กรณีเลือกแผนกเฉพาะ แสดงผลตามวันที่
          const sortedData = [...summaries]
            .filter(s => s.wardId === selectedWard)
            .sort((a, b) => {
              const dateA = a.date instanceof Date ? a.date : new Date(a.date);
              const dateB = b.date instanceof Date ? b.date : new Date(b.date);
              return dateA.getTime() - dateB.getTime();
            })
            .slice(-7); // แสดงแค่ 7 วันล่าสุด
          
          return sortedData.map(summary => {
            const dateObj = summary.date instanceof Date ? summary.date : new Date(summary.date);
            return {
              date: format(dateObj, 'dd/MM/yy', { locale: th }),
              'Nurse Manager': summary.dailyNurseManagerTotal || 0,
              'RN': summary.dailyRnTotal || 0,
              'PN': summary.dailyPnTotal || 0,
              'WC': summary.dailyWcTotal || 0,
              'รวม': summary.dailyNurseTotal || 0
            };
          });
        } else {
          // กรณีเลือกทุกแผนก ใช้เฉพาะข้อมูลล่าสุดของแต่ละแผนก
          return latestData.map(ward => ({
            name: ward.wardName,
            'Nurse Manager': ward.dailyNurseManagerTotal || 0,
            'RN': ward.dailyRnTotal || 0,
            'PN': ward.dailyPnTotal || 0,
            'WC': ward.dailyWcTotal || 0,
            'รวม': ward.dailyNurseTotal || 0
          }));
        }
      }
      
      case 'bed-status': {
        // แสดงสถานะเตียง (ไม่ว่าง/ว่าง/ไม่พร้อมใช้)
        if (selectedWard !== 'all') {
          // กรณีเลือกแผนกเฉพาะ แสดงผลตามวันที่
          const sortedData = [...summaries]
            .filter(s => s.wardId === selectedWard)
            .sort((a, b) => {
              const dateA = a.date instanceof Date ? a.date : new Date(a.date);
              const dateB = b.date instanceof Date ? b.date : new Date(b.date);
              return dateA.getTime() - dateB.getTime();
            })
            .slice(-7); // แสดงแค่ 7 วันล่าสุด
          
          return sortedData.map(summary => {
            const dateObj = summary.date instanceof Date ? summary.date : new Date(summary.date);
            return {
              date: format(dateObj, 'dd/MM/yy', { locale: th }),
              'ผู้ป่วย': summary.dailyPatientCensus || 0,
              'เตียงว่าง': summary.availableBeds || 0,
              'เตียงไม่พร้อมใช้': summary.unavailableBeds || 0
            };
          });
        } else {
          // กรณีเลือกทุกแผนก ใช้เฉพาะข้อมูลล่าสุดของแต่ละแผนก
          return latestData.map(ward => ({
            name: ward.wardName,
            'ผู้ป่วย': ward.dailyPatientCensus || 0,
            'เตียงว่าง': ward.availableBeds || 0,
            'เตียงไม่พร้อมใช้': ward.unavailableBeds || 0
          }));
        }
      }
      
      case 'ward-comparison': {
        // เปรียบเทียบจำนวนผู้ป่วยและพยาบาลตามแผนก
        // กรณีนี้ใช้เฉพาะข้อมูลล่าสุดของแต่ละแผนก
        return latestData.map(ward => ({
          name: ward.wardName,
          'จำนวนผู้ป่วย': ward.dailyPatientCensus || 0,
          'จำนวนพยาบาล': ward.dailyNurseTotal || 0
        }));
      }
      
      default:
        return [];
    }
  };
  
  const chartData = prepareChartData();
  
  // กำหนดแท่งสำหรับกราฟตาม dataType
  const getBars = () => {
    switch (dataType) {
      case 'patient-shift':
        return (
          <>
            <Bar dataKey="กะเช้า" name="กะเช้า" fill="#3498DB" />
            <Bar dataKey="กะดึก" name="กะดึก" fill="#9B59B6" />
            <Bar dataKey="รวม 24 ชม." name="รวม 24 ชม." fill="#2C3E50" />
          </>
        );
      case 'nurse-types':
        return (
          <>
            <Bar dataKey="Nurse Manager" name="Nurse Manager" fill="#1ABC9C" />
            <Bar dataKey="RN" name="RN" fill="#3498DB" />
            <Bar dataKey="PN" name="PN" fill="#9B59B6" />
            <Bar dataKey="WC" name="WC" fill="#F1C40F" />
            <Bar dataKey="รวม" name="รวม" fill="#2C3E50" />
          </>
        );
      case 'bed-status':
        return (
          <>
            <Bar dataKey="ผู้ป่วย" name="ผู้ป่วย" fill="#3498DB" />
            <Bar dataKey="เตียงว่าง" name="เตียงว่าง" fill="#2ECC71" />
            <Bar dataKey="เตียงไม่พร้อมใช้" name="เตียงไม่พร้อมใช้" fill="#E74C3C" />
          </>
        );
      case 'ward-comparison':
        return (
          <>
            <Bar dataKey="จำนวนผู้ป่วย" name="จำนวนผู้ป่วย" fill="#3498DB" />
            <Bar dataKey="จำนวนพยาบาล" name="จำนวนพยาบาล" fill="#2ECC71" />
          </>
        );
      default:
        return null;
    }
  };
  
  // กำหนด label ของแกน Y ตาม dataType
  const getYAxisLabel = () => {
    switch (dataType) {
      case 'patient-shift':
      case 'nurse-types':
      case 'ward-comparison':
        return 'จำนวน (คน)';
      case 'bed-status':
        return 'จำนวน (เตียง)';
      default:
        return '';
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          กราฟแท่งเปรียบเทียบ
        </h2>
        
        {/* ตัวเลือกประเภทของข้อมูลที่จะแสดง */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setDataType('patient-shift')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'patient-shift'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            ผู้ป่วยตามกะ
          </button>
          <button
            onClick={() => setDataType('nurse-types')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'nurse-types'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            ประเภทพยาบาล
          </button>
          <button
            onClick={() => setDataType('bed-status')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'bed-status'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            สถานะเตียง
          </button>
          <button
            onClick={() => setDataType('ward-comparison')}
            className={`px-4 py-2 rounded-md ${
              dataType === 'ward-comparison'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            เปรียบเทียบแผนก
          </button>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={dataType === 'patient-shift' || (selectedWard !== 'all' && dataType !== 'ward-comparison') ? "date" : "name"} />
              <YAxis label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {getBars()}
            </BarChart>
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

export default BarChartSummary; 