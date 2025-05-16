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
    <div className="bg-white dark:bg-slate-800 text-gray-800 dark:text-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200 dark:border-gray-700">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">Daily Patient Census and Staffing</h2>
        <p className="text-blue-600 dark:text-blue-300 mt-1">ข้อมูลวันที่ {format(date, 'dd/MM/yyyy')}</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-500/50 transform transition-transform hover:scale-105">
          <div className="text-sm text-red-700 dark:text-red-300 font-medium">OPD 24hr</div>
          <div className="text-2xl font-bold text-red-800 dark:text-red-100 mt-1">{totalStats.opd24hr}</div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-500/50 transform transition-transform hover:scale-105">
          <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Old Patient</div>
          <div className="text-2xl font-bold text-purple-800 dark:text-purple-100 mt-1">{totalStats.oldPatient}</div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-500/50 transform transition-transform hover:scale-105">
          <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">New Patient</div>
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-100 mt-1">{totalStats.newPatient}</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-500/50 transform transition-transform hover:scale-105">
          <div className="text-sm text-green-700 dark:text-green-300 font-medium">Admit 24hr</div>
          <div className="text-2xl font-bold text-green-800 dark:text-green-100 mt-1">{totalStats.admit24hr}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview; 