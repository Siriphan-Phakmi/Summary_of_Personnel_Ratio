'use client';

import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | any;
  morningPatientCensus?: number;
  morningNurseManager?: number;
  morningRn?: number;
  morningPn?: number;
  morningWc?: number;
  morningNurseTotal?: number;
  morningNurseRatio?: number;
  morningNewAdmit?: number;
  morningTransferIn?: number;
  morningReferIn?: number;
  morningDischarge?: number;
  morningTransferOut?: number;
  morningReferOut?: number;
  morningDead?: number;
  nightPatientCensus?: number;
  nightNurseManager?: number;
  nightRn?: number;
  nightPn?: number;
  nightWc?: number;
  nightNurseTotal?: number;
  nightNurseRatio?: number;
  nightNewAdmit?: number;
  nightTransferIn?: number;
  nightReferIn?: number;
  nightDischarge?: number;
  nightTransferOut?: number;
  nightReferOut?: number;
  nightDead?: number;
  dailyPatientCensus?: number;
  dailyNurseTotal?: number;
  dailyNurseRatio?: number;
  availableBeds?: number;
  unavailableBeds?: number;
}

interface ShiftComparisonProps {
  summaries: DailySummary[];
  selectedWard: string;
  shift: 'morning' | 'night';
}

// Card component สำหรับแสดงสถิติ
const StatCard = ({ title, value, color = "blue" }: { title: string; value: string | number; color?: string }) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
    purple: "bg-purple-500 text-white",
    orange: "bg-orange-500 text-white",
    red: "bg-red-500 text-white",
    teal: "bg-teal-500 text-white",
  };
  
  const bgClass = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className={`rounded-lg shadow-md p-4 ${bgClass}`}>
      <h3 className="text-sm font-medium text-gray-100 opacity-90">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const ShiftComparison: React.FC<ShiftComparisonProps> = ({ summaries, selectedWard, shift }) => {
  // ดึงข้อมูลล่าสุด
  const getLatestSummary = () => {
    if (summaries.length === 0) return null;
    
    // ถ้าดูข้อมูลแผนกเดียว ให้ดึงข้อมูลล่าสุด
    if (selectedWard !== 'all') {
      return summaries.reduce((latest, current) => {
        if (current.wardId !== selectedWard) return latest;
        
        const latestDate = latest.date instanceof Date ? latest.date : new Date(latest.date);
        const currentDate = current.date instanceof Date ? current.date : new Date(current.date);
        return currentDate > latestDate ? current : latest;
      }, summaries.find(s => s.wardId === selectedWard) || summaries[0]);
    }
    
    // ถ้าดูทุกแผนก ให้รวมข้อมูลจากทุกแผนกล่าสุด
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
  
  const formatDate = (date: Date | any): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return format(dateObj, 'dd MMMM yyyy', { locale: th });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  };
  
  const latestData = getLatestSummary();
  
  if (!latestData) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">ไม่พบข้อมูล</p>
      </div>
    );
  }
  
  // เตรียมข้อมูลสำหรับกราฟเปรียบเทียบ
  const prepareComparisonData = () => {
    if (selectedWard !== 'all') {
      // กรณีเลือกแผนกเฉพาะ แสดงข้อมูลเวรเช้าและเวรดึกเปรียบเทียบกัน
      const data = latestData as DailySummary;
      return [
        {
          name: 'จำนวนผู้ป่วย',
          'เวรเช้า': data.morningPatientCensus || 0,
          'เวรดึก': data.nightPatientCensus || 0
        },
        {
          name: 'Nurse Manager',
          'เวรเช้า': data.morningNurseManager || 0,
          'เวรดึก': data.nightNurseManager || 0
        },
        {
          name: 'RN',
          'เวรเช้า': data.morningRn || 0,
          'เวรดึก': data.nightRn || 0
        },
        {
          name: 'PN',
          'เวรเช้า': data.morningPn || 0,
          'เวรดึก': data.nightPn || 0
        },
        {
          name: 'WC',
          'เวรเช้า': data.morningWc || 0,
          'เวรดึก': data.nightWc || 0
        },
        {
          name: 'พยาบาลทั้งหมด',
          'เวรเช้า': data.morningNurseTotal || 0,
          'เวรดึก': data.nightNurseTotal || 0
        },
        {
          name: 'รับใหม่',
          'เวรเช้า': data.morningNewAdmit || 0,
          'เวรดึก': data.nightNewAdmit || 0
        },
        {
          name: 'Transfer In',
          'เวรเช้า': data.morningTransferIn || 0,
          'เวรดึก': data.nightTransferIn || 0
        },
        {
          name: 'Refer In',
          'เวรเช้า': data.morningReferIn || 0,
          'เวรดึก': data.nightReferIn || 0
        },
        {
          name: 'Discharge',
          'เวรเช้า': data.morningDischarge || 0,
          'เวรดึก': data.nightDischarge || 0
        },
        {
          name: 'Transfer Out',
          'เวรเช้า': data.morningTransferOut || 0,
          'เวรดึก': data.nightTransferOut || 0
        },
        {
          name: 'Refer Out',
          'เวรเช้า': data.morningReferOut || 0,
          'เวรดึก': data.nightReferOut || 0
        },
        {
          name: 'Dead',
          'เวรเช้า': data.morningDead || 0,
          'เวรดึก': data.nightDead || 0
        }
      ];
    } else {
      // กรณีเลือกทุกแผนก แสดงเปรียบเทียบข้อมูลแต่ละแผนกในกะที่เลือก
      const wards = latestData as DailySummary[];
      
      // คัดเลือกข้อมูลตามกะที่เลือก
      if (shift === 'morning') {
        return wards.map(ward => ({
          name: ward.wardName,
          'ผู้ป่วย': ward.morningPatientCensus || 0,
          'พยาบาล': ward.morningNurseTotal || 0
        }));
      } else {
        return wards.map(ward => ({
          name: ward.wardName,
          'ผู้ป่วย': ward.nightPatientCensus || 0,
          'พยาบาล': ward.nightNurseTotal || 0
        }));
      }
    }
  };
  
  const comparisonData = prepareComparisonData();
  
  // กรณีเลือกแผนกเฉพาะ และข้อมูลมีเพียงเรคอร์ดเดียว
  if (selectedWard !== 'all') {
    const data = latestData as DailySummary;
    const shiftTitle = shift === 'morning' ? 'เวรเช้า' : 'เวรดึก';
    const shiftColor = shift === 'morning' ? 'blue' : 'purple';
    const bgClass = shift === 'morning' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-purple-50 dark:bg-purple-900/20';
    const borderClass = shift === 'morning' ? 'border-blue-200 dark:border-blue-800' : 'border-purple-200 dark:border-purple-800';
    
    // ดึงค่าตาม shift ที่เลือก
    const getValueByShift = (field1: number | undefined, field2: number | undefined) => {
      return shift === 'morning' ? field1 || 0 : field2 || 0;
    };
    
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            ข้อมูล{shiftTitle} {data.wardName} - {formatDate(data.date)}
          </h2>
          
          {/* ข้อมูลสรุปเฉพาะกะที่เลือก */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard 
              title={`จำนวนผู้ป่วย ${shiftTitle}`} 
              value={getValueByShift(data.morningPatientCensus, data.nightPatientCensus)} 
              color={shiftColor}
            />
            <StatCard 
              title={`จำนวนพยาบาล ${shiftTitle}`} 
              value={getValueByShift(data.morningNurseTotal, data.nightNurseTotal)} 
              color="green"
            />
            <StatCard 
              title={`อัตราส่วน ${shiftTitle}`} 
              value={getValueByShift(data.morningNurseRatio, data.nightNurseRatio)} 
              color="teal"
            />
            <StatCard 
              title="เตียงว่าง" 
              value={data.availableBeds || 0} 
              color="orange"
            />
          </div>
          
          {/* รายละเอียดกะ */}
          <div className={`${bgClass} p-4 rounded-lg shadow-sm`}>
            <h3 className={`text-lg font-semibold text-${shiftColor}-700 dark:text-${shiftColor}-300 mb-4`}>{shiftTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">จำนวนผู้ป่วย</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningPatientCensus, data.nightPatientCensus)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">Nurse Manager</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningNurseManager, data.nightNurseManager)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">RN</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningRn, data.nightRn)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">PN</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningPn, data.nightPn)}
                  </span>
                </div>
                <div className={`flex justify-between ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">WC</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningWc, data.nightWc)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">พยาบาลทั้งหมด</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningNurseTotal, data.nightNurseTotal)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">อัตราส่วน</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningNurseRatio, data.nightNurseRatio)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">รับใหม่</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningNewAdmit, data.nightNewAdmit)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">Transfer In</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningTransferIn, data.nightTransferIn)}
                  </span>
                </div>
                <div className={`flex justify-between ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">Refer In</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningReferIn, data.nightReferIn)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">Discharge</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningDischarge, data.nightDischarge)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">Transfer Out</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningTransferOut, data.nightTransferOut)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">Refer Out</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningReferOut, data.nightReferOut)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">Dead</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getValueByShift(data.morningDead, data.nightDead)}
                  </span>
                </div>
                <div className={`flex justify-between ${borderClass} pb-2`}>
                  <span className="text-gray-700 dark:text-gray-300">เตียงว่าง</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data.availableBeds || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* กราฟเปรียบเทียบระหว่างกะเช้าและกะดึก */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">เปรียบเทียบระหว่างกะเช้าและกะดึก</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="เวรเช้า" name="เวรเช้า" fill="#3498DB" />
                  <Bar dataKey="เวรดึก" name="เวรดึก" fill="#9B59B6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // กรณีเลือกทุกแผนก ให้แสดงการเปรียบเทียบระหว่างแผนก
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          ข้อมูล{shift === 'morning' ? 'เวรเช้า' : 'เวรดึก'} ทุกแผนก
        </h2>
        
        {/* ข้อมูลสรุปของทุกแผนกตามกะที่เลือก */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  แผนก
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  จำนวนผู้ป่วย
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nurse Manager
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  RN
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  PN
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  WC
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  พยาบาล
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  อัตราส่วน
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(latestData as DailySummary[]).map((ward) => (
                <tr 
                  key={ward.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{ward.wardName}</span>
                    <br />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ward.date)}</span>
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {shift === 'morning' ? ward.morningPatientCensus || 0 : ward.nightPatientCensus || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {shift === 'morning' ? ward.morningNurseManager || 0 : ward.nightNurseManager || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {shift === 'morning' ? ward.morningRn || 0 : ward.nightRn || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {shift === 'morning' ? ward.morningPn || 0 : ward.nightPn || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {shift === 'morning' ? ward.morningWc || 0 : ward.nightWc || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {shift === 'morning' ? ward.morningNurseTotal || 0 : ward.nightNurseTotal || 0}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-gray-900 dark:text-white">
                    {shift === 'morning' ? ward.morningNurseRatio || 0 : ward.nightNurseRatio || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* กราฟเปรียบเทียบแผนก */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            เปรียบเทียบระหว่างแผนก ({shift === 'morning' ? 'เวรเช้า' : 'เวรดึก'})
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'จำนวน (คน)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ผู้ป่วย" name="ผู้ป่วย" fill="#3498DB" />
                <Bar dataKey="พยาบาล" name="พยาบาล" fill="#2ECC71" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftComparison; 