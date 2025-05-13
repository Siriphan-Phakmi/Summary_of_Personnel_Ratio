'use client';

import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | any;
  dateString: string;
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

interface OverallStatsProps {
  summaries: DailySummary[];
  selectedWard: string;
}

// กำหนดสีสำหรับกราฟวงกลม
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#EC7063'];

// Stat Card component
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

const OverallStats: React.FC<OverallStatsProps> = ({ summaries, selectedWard }) => {
  // ดึงข้อมูลล่าสุด
  const getLatestSummary = () => {
    if (summaries.length === 0) return null;
    
    // ถ้าดูข้อมูลแผนกเดียว ให้ดึงข้อมูลล่าสุด
    if (selectedWard !== 'all') {
      return summaries.reduce((latest, current) => {
        const latestDate = latest.date instanceof Date ? latest.date : new Date(latest.date);
        const currentDate = current.date instanceof Date ? current.date : new Date(current.date);
        return currentDate > latestDate ? current : latest;
      }, summaries[0]);
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
    
    // รวมข้อมูลจากทุกแผนก
    const totalSummary: DailySummary = {
      id: 'total',
      wardId: 'all',
      wardName: 'ทุกแผนก',
      date: new Date(),
      dateString: format(new Date(), 'yyyy-MM-dd'),
      dailyPatientCensus: 0,
      dailyNurseTotal: 0,
      availableBeds: 0,
      unavailableBeds: 0,
      dailyNurseManagerTotal: 0,
      dailyRnTotal: 0,
      dailyPnTotal: 0,
      dailyWcTotal: 0,
      dailyNewAdmitTotal: 0,
      dailyReferInTotal: 0,
      dailyReferOutTotal: 0,
      dailyDeadTotal: 0,
    };
    
    latestByWard.forEach(summary => {
      totalSummary.dailyPatientCensus = (totalSummary.dailyPatientCensus || 0) + (summary.dailyPatientCensus || 0);
      totalSummary.dailyNurseTotal = (totalSummary.dailyNurseTotal || 0) + (summary.dailyNurseTotal || 0);
      totalSummary.availableBeds = (totalSummary.availableBeds || 0) + (summary.availableBeds || 0);
      totalSummary.unavailableBeds = (totalSummary.unavailableBeds || 0) + (summary.unavailableBeds || 0);
      totalSummary.dailyNurseManagerTotal = (totalSummary.dailyNurseManagerTotal || 0) + (summary.dailyNurseManagerTotal || 0);
      totalSummary.dailyRnTotal = (totalSummary.dailyRnTotal || 0) + (summary.dailyRnTotal || 0);
      totalSummary.dailyPnTotal = (totalSummary.dailyPnTotal || 0) + (summary.dailyPnTotal || 0);
      totalSummary.dailyWcTotal = (totalSummary.dailyWcTotal || 0) + (summary.dailyWcTotal || 0);
      totalSummary.dailyNewAdmitTotal = (totalSummary.dailyNewAdmitTotal || 0) + (summary.dailyNewAdmitTotal || 0);
      totalSummary.dailyReferInTotal = (totalSummary.dailyReferInTotal || 0) + (summary.dailyReferInTotal || 0);
      totalSummary.dailyReferOutTotal = (totalSummary.dailyReferOutTotal || 0) + (summary.dailyReferOutTotal || 0);
      totalSummary.dailyDeadTotal = (totalSummary.dailyDeadTotal || 0) + (summary.dailyDeadTotal || 0);
    });
    
    // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วย
    if (totalSummary.dailyPatientCensus && totalSummary.dailyNurseTotal) {
      totalSummary.dailyNurseRatio = Number((totalSummary.dailyPatientCensus / totalSummary.dailyNurseTotal).toFixed(2));
    }
    
    return totalSummary;
  };
  
  const latestSummary = getLatestSummary();
  
  // ข้อมูลสำหรับกราฟวงกลมแสดงสัดส่วนของพยาบาล
  const prepareNurseData = () => {
    if (!latestSummary) return [];
    
    const data = [
      { name: 'Nurse Manager', value: latestSummary.dailyNurseManagerTotal || 0 },
      { name: 'RN', value: latestSummary.dailyRnTotal || 0 },
      { name: 'PN', value: latestSummary.dailyPnTotal || 0 },
      { name: 'WC', value: latestSummary.dailyWcTotal || 0 }
    ];
    
    // กรองเฉพาะรายการที่มีค่ามากกว่า 0
    return data.filter(item => item.value > 0);
  };
  
  // ข้อมูลสำหรับกราฟวงกลมแสดงสัดส่วนเตียง
  const prepareBedData = () => {
    if (!latestSummary) return [];
    
    return [
      { name: 'ผู้ป่วย', value: latestSummary.dailyPatientCensus || 0 },
      { name: 'เตียงว่าง', value: latestSummary.availableBeds || 0 },
      { name: 'เตียงไม่พร้อมใช้', value: latestSummary.unavailableBeds || 0 }
    ];
  };
  
  // ข้อมูลสำหรับกราฟวงกลมแสดงการเข้า-ออก
  const prepareMovementData = () => {
    if (!latestSummary) return [];
    
    return [
      { name: 'รับใหม่', value: latestSummary.dailyNewAdmitTotal || 0 },
      { name: 'Refer In', value: latestSummary.dailyReferInTotal || 0 },
      { name: 'Discharge', value: (latestSummary.dailyDeadTotal || 0) + (latestSummary.dailyReferOutTotal || 0) },
    ];
  };
  
  const nurseData = prepareNurseData();
  const bedData = prepareBedData();
  const movementData = prepareMovementData();
  
  if (!latestSummary) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">ไม่พบข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          ภาพรวม {selectedWard === 'all' ? 'ทุกแผนก' : latestSummary.wardName}
        </h2>
        
        {/* สถิติสำคัญ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="จำนวนผู้ป่วยทั้งหมด" 
            value={latestSummary.dailyPatientCensus || 0} 
            color="blue"
          />
          <StatCard 
            title="จำนวนพยาบาลทั้งหมด" 
            value={latestSummary.dailyNurseTotal || 0} 
            color="green"
          />
          <StatCard 
            title="อัตราส่วนพยาบาล:ผู้ป่วย" 
            value={latestSummary.dailyNurseRatio || 0} 
            color="purple"
          />
          <StatCard 
            title="เตียงว่าง" 
            value={latestSummary.availableBeds || 0} 
            color="teal"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* กราฟสัดส่วนพยาบาล */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">สัดส่วนพยาบาล</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nurseData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {nurseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} คน`, 'จำนวน']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* กราฟสัดส่วนเตียง */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">สัดส่วนเตียง</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bedData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} เตียง`, 'จำนวน']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* กราฟการเข้า-ออก */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">การเข้า-ออก</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={movementData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {movementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} คน`, 'จำนวน']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallStats; 