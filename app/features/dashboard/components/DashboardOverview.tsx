'use client';

import React from 'react';
import { format } from 'date-fns';

interface DashboardOverviewProps {
  date: Date;
  totalStats: {
    opd24hr: number;
    oldPatient: number;
    newPatient: number;
    admit24hr: number;
  };
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ date, totalStats }) => {
  return (
    <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-6 rounded-lg shadow-lg mb-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">Daily Patient Census and Staffing</h2>
        <p className="text-blue-300">ข้อมูลวันที่ {format(date, 'dd/MM/yyyy')}</p>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-gradient-to-br from-red-500/20 to-red-700/20 p-4 rounded-lg border border-red-500/50">
          <div className="text-sm text-red-300">OPD 24hr</div>
          <div className="text-2xl font-bold">{totalStats.opd24hr}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-700/20 p-4 rounded-lg border border-purple-500/50">
          <div className="text-sm text-purple-300">Old Patient</div>
          <div className="text-2xl font-bold">{totalStats.oldPatient}</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-700/20 p-4 rounded-lg border border-blue-500/50">
          <div className="text-sm text-blue-300">New Patient</div>
          <div className="text-2xl font-bold">{totalStats.newPatient}</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/20 to-green-700/20 p-4 rounded-lg border border-green-500/50">
          <div className="text-sm text-green-300">Admit 24hr</div>
          <div className="text-2xl font-bold">{totalStats.admit24hr}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview; 