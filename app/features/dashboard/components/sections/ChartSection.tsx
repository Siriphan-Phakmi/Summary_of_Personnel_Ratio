'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import NoDataMessage from '@/app/features/dashboard/components/NoDataMessage';
import EnhancedBarChart from '../charts/EnhancedBarChart';
import BedSummaryPieChart from '../charts/BedSummaryPieChart';
import { PieChartDataItem } from '@/app/features/dashboard/components/types/chart-types';
import { logInfo } from '@/app/features/dashboard/utils';

// Interface สำหรับข้อมูลกราฟแท่ง
interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

interface ChartSectionProps {
  bedCensusData: WardCensusData[];
  pieChartData: PieChartDataItem[];
  loading: boolean;
  selectedWardId: string | null;
  handleSelectWard: (wardId: string) => void;
  user?: { floor?: string } | null;
  isRegularUser?: boolean;
}

/**
 * คอมโพเนนต์แสดงกราฟแท่งและกราฟวงกลมของจำนวนผู้ป่วยและสถานะเตียง
 */
const ChartSection: React.FC<ChartSectionProps> = ({
  bedCensusData,
  pieChartData,
  loading,
  selectedWardId,
  handleSelectWard,
  user,
  isRegularUser = false
}) => {
  const { theme } = useTheme();

  return (
    <div className="grid grid-cols-1 gap-6 mb-10 lg:grid-cols-12 overflow-hidden">
      {/* Patient Count by Ward - กราฟแท่งแสดงจำนวนผู้ป่วยตามแผนก */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm lg:col-span-7">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Patient Census (คงพยาบาล) ตามแผนก</h2>
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : bedCensusData.length > 0 ? (
          <div className="w-full" style={{ height: Math.max(400, Math.min(720, bedCensusData.length * 56)) }}>
            <EnhancedBarChart 
              data={selectedWardId
                ? bedCensusData.filter(item => item.id.toUpperCase() === selectedWardId.toUpperCase())
                : bedCensusData}
              selectedWardId={selectedWardId || null}
              onSelectWard={handleSelectWard}
              showShiftData={true}
            />
          </div>
        ) : (
          <NoDataMessage 
            message="ไม่พบข้อมูลสำหรับแสดงกราฟ" 
            subMessage="ไม่พบข้อมูลจำนวนผู้ป่วยสำหรับการแสดงกราฟในช่วงเวลาที่เลือก" 
            icon="chart"
          />
        )}
      </div>
      
      {/* Bed Status - กราฟวงกลมแสดงสถานะเตียง */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm lg:col-span-5 overflow-hidden">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">จำนวนเตียงว่าง</h2>
        {(() => {
          // ใช้ IIFE เพื่อ debug ข้อมูลและตรวจสอบว่ามีเตียงไม่ว่างหรือไม่
          if (process.env.NODE_ENV !== 'production') {
            logInfo("Enhanced data for BedSummaryPieChart:", JSON.stringify(
              pieChartData.map(item => ({
                id: item.id,
                wardName: item.wardName,
                available: item.value,
                unavailable: item.unavailable || 0,
                plannedDischarge: item.plannedDischarge || 0
              }))
            ));
          }
          return null;
        })()}
        <div className="w-full h-full">
          <div className="h-[450px]">
            {loading ? (
              // กำลังโหลดข้อมูล - แสดง loading spinner ที่ชัดเจน
              <div className="h-full w-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-3"></div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">กำลังโหลดข้อมูล</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  กำลังดึงข้อมูลเตียงจากระบบ โปรดรอสักครู่...
                </p>
              </div>
            ) : pieChartData && pieChartData.length > 0 ? (
              <BedSummaryPieChart 
                data={(selectedWardId
                  ? pieChartData.filter(item => item.id.toUpperCase() === selectedWardId.toUpperCase())
                  : isRegularUser && user?.floor
                    ? pieChartData.filter(item => item.id.toUpperCase() === user.floor?.toUpperCase())
                    : pieChartData
                  ).map(item => {
                    // แปลงข้อมูลก่อนส่งไปยัง component
                    const formattedItem = {
                      id: item.id,
                      name: item.wardName, // แก้ไข: เปลี่ยน 'wardName' เป็น 'name' ให้ตรงตาม WardBedData type
                      available: item.value,
                      unavailable: item.unavailable || 0,
                      plannedDischarge: item.plannedDischarge || 0
                    };
                    
                    // ตรวจสอบข้อมูลในโหมด development
                    if (process.env.NODE_ENV !== 'production') {
                      console.log("[PieChart Item]", formattedItem);
                    }
                    return formattedItem;
                  })}
                isLoading={loading}
              />
            ) : (
              // ไม่มีข้อมูลหรือข้อมูลว่างเปล่า
              <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูล</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 px-4">
                  ไม่พบข้อมูลเตียงสำหรับวันที่เลือก <br/>
                  กรุณาเลือกวันที่อื่น หรือตรวจสอบการบันทึกข้อมูล
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartSection; 