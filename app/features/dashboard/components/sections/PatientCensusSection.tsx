import React from 'react';

interface TotalStats {
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
}

interface PatientCensusSectionProps {
  totalStats: TotalStats;
  loading: boolean;
}

/**
 * Component แสดงข้อมูล Patient Census และ Staffing
 */
const PatientCensusSection: React.FC<PatientCensusSectionProps> = ({
  totalStats,
  loading
}) => {
  // ตรวจสอบว่าไม่มีข้อมูลหรือไม่
  const hasNoData = Object.values(totalStats).every(val => val === 0);

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
        Daily Patient Census and Staffing
      </h2>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : hasNoData ? (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูลผู้ป่วยสำหรับวันที่เลือก</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
            ข้อมูลยังไม่ถูกบันทึกโดยผู้ใช้งาน หรืออยู่ระหว่างการอนุมัติจากหัวหน้าหอผู้ป่วย
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white opacity-80">OPD 24hr</p>
                <p className="text-3xl font-bold text-white">{totalStats.opd24hr}</p>
              </div>
              <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white opacity-80">Old Patient</p>
                <p className="text-3xl font-bold text-white">{totalStats.oldPatient}</p>
              </div>
              <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white opacity-80">New Patient</p>
                <p className="text-3xl font-bold text-white">{totalStats.newPatient}</p>
              </div>
              <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white opacity-80">Admit 24hr</p>
                <p className="text-3xl font-bold text-white">{totalStats.admit24hr}</p>
              </div>
              <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCensusSection; 