'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardSummary } from './types';

interface ShiftComparisonPanelProps {
  summary: DashboardSummary | null;
  wardName: string;
}

const ShiftComparisonPanel: React.FC<ShiftComparisonPanelProps> = ({ summary, wardName }) => {
  if (!summary || (!summary.morningForm && !summary.nightForm)) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500 dark:text-gray-400">ไม่พบข้อมูลเปรียบเทียบกะสำหรับ {wardName}</p>
      </div>
    );
  }

  const morningShift = summary.morningForm || {
    patientCensus: 0,
    nurseManager: 0,
    rn: 0,
    pn: 0,
    wc: 0,
    newAdmit: 0,
    transferIn: 0,
    referIn: 0,
    discharge: 0,
    transferOut: 0,
    referOut: 0,
    dead: 0,
    admitTotal: 0,
    dischargeTotal: 0
  };

  const nightShift = summary.nightForm || {
    patientCensus: 0,
    nurseManager: 0,
    rn: 0,
    pn: 0,
    wc: 0,
    newAdmit: 0,
    transferIn: 0,
    referIn: 0,
    discharge: 0,
    transferOut: 0,
    referOut: 0,
    dead: 0,
    admitTotal: 0,
    dischargeTotal: 0
  };

  const comparisonData = [
    {
      name: 'Patient Census',
      กะเช้า: morningShift.patientCensus,
      กะดึก: nightShift.patientCensus,
    },
    {
      name: 'รวมบุคลากร',
      กะเช้า: (morningShift.nurseManager || 0) + (morningShift.rn || 0) + (morningShift.pn || 0) + (morningShift.wc || 0),
      กะดึก: (nightShift.nurseManager || 0) + (nightShift.rn || 0) + (nightShift.pn || 0) + (nightShift.wc || 0),
    },
    {
      name: 'รับเข้า',
      กะเช้า: morningShift.admitTotal || (morningShift.newAdmit || 0) + (morningShift.transferIn || 0) + (morningShift.referIn || 0),
      กะดึก: nightShift.admitTotal || (nightShift.newAdmit || 0) + (nightShift.transferIn || 0) + (nightShift.referIn || 0),
    },
    {
      name: 'จำหน่าย',
      กะเช้า: morningShift.dischargeTotal || (morningShift.discharge || 0) + (morningShift.transferOut || 0) + (morningShift.referOut || 0) + (morningShift.dead || 0),
      กะดึก: nightShift.dischargeTotal || (nightShift.discharge || 0) + (nightShift.transferOut || 0) + (nightShift.referOut || 0) + (nightShift.dead || 0),
    },
  ];

  const detailComparisonData = [
    { 
      category: 'บุคลากร',
      items: [
        { name: 'Nurse Manager', กะเช้า: morningShift.nurseManager || 0, กะดึก: nightShift.nurseManager || 0 },
        { name: 'RN', กะเช้า: morningShift.rn || 0, กะดึก: nightShift.rn || 0 },
        { name: 'PN', กะเช้า: morningShift.pn || 0, กะดึก: nightShift.pn || 0 },
        { name: 'WC', กะเช้า: morningShift.wc || 0, กะดึก: nightShift.wc || 0 },
      ]
    },
    {
      category: 'รับเข้า',
      items: [
        { name: 'New Admit', กะเช้า: morningShift.newAdmit || 0, กะดึก: nightShift.newAdmit || 0 },
        { name: 'Transfer In', กะเช้า: morningShift.transferIn || 0, กะดึก: nightShift.transferIn || 0 },
        { name: 'Refer In', กะเช้า: morningShift.referIn || 0, กะดึก: nightShift.referIn || 0 },
      ]
    },
    {
      category: 'จำหน่าย',
      items: [
        { name: 'Discharge', กะเช้า: morningShift.discharge || 0, กะดึก: nightShift.discharge || 0 },
        { name: 'Transfer Out', กะเช้า: morningShift.transferOut || 0, กะดึก: nightShift.transferOut || 0 },
        { name: 'Refer Out', กะเช้า: morningShift.referOut || 0, กะดึก: nightShift.referOut || 0 },
        { name: 'Dead', กะเช้า: morningShift.dead || 0, กะดึก: nightShift.dead || 0 },
      ]
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-6 text-center">เปรียบเทียบเวรเช้า - เวรดึก ({wardName})</h2>
      
      <div className="h-72 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="กะเช้า" fill="#3b82f6" name="กะเช้า" />
            <Bar dataKey="กะดึก" fill="#f43f5e" name="กะดึก" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {detailComparisonData.map((group, groupIndex) => (
          <div key={groupIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-medium">
              {group.category}
            </div>
            <div className="p-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      รายการ
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-blue-500 dark:text-blue-400">
                      กะเช้า
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-red-500 dark:text-red-400">
                      กะดึก
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {group.items.map((item, itemIndex) => (
                    <tr key={itemIndex}>
                      <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {item.name}
                      </td>
                      <td className="px-2 py-2 text-sm text-center font-medium text-blue-600 dark:text-blue-400">
                        {item.กะเช้า}
                      </td>
                      <td className="px-2 py-2 text-sm text-center font-medium text-red-600 dark:text-red-400">
                        {item.กะดึก}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShiftComparisonPanel; 