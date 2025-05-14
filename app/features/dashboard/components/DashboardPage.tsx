'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, parseISO, eachDayOfInterval, startOfDay, endOfDay, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { Timestamp, collection, query, where, getDocs, orderBy, getDoc, doc, or, limit, collectionGroup } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { COLLECTION_SUMMARIES, COLLECTION_WARDS, COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission, getAllWards } from '@/app/features/ward-form/services/wardService';
import { getApprovedSummariesByDateRange } from '@/app/features/ward-form/services/approvalServices/dailySummary';
import { Ward, ShiftType, FormStatus } from '@/app/core/types/ward';
import { UserRole } from '@/app/core/types/user';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
         BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

// CSS สำหรับการพิมพ์
const printStyles = `
  @media print {
    body { background-color: white; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    .print-container { width: 100% !important; padding: 0 !important; margin: 0 !important; }
    .print-break-after { page-break-after: always; }
    .print-full-width { width: 100% !important; }
    nav, button, select, input, .bg-gray-100 { background-color: white !important; }
  }
`;

// Types
interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | Timestamp;
  dateString: string;
  allFormsApproved: boolean;
  
  // กะเช้า
  morningFormId?: string;
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
  morningAdmitTotal?: number;
  morningDischarge?: number;
  morningTransferOut?: number;
  morningReferOut?: number;
  morningDead?: number;
  morningDischargeTotal?: number;
  morningCalculatedCensus?: number; // เพิ่มฟิลด์ใหม่
  
  // กะดึก
  nightFormId?: string;
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
  nightAdmitTotal?: number;
  nightDischarge?: number;
  nightTransferOut?: number;
  nightReferOut?: number;
  nightDead?: number;
  nightDischargeTotal?: number;
  nightCalculatedCensus?: number; // เพิ่มฟิลด์ใหม่
  
  // รวม 24 ชั่วโมง
  dailyPatientCensus?: number;
  dailyNurseTotal?: number;
  dailyNurseRatio?: number;
  dailyAdmitTotal?: number;
  dailyDischargeAllTotal?: number;
  availableBeds?: number;
  unavailableBeds?: number;
  plannedDischarge?: number;
  opd24hr?: number;
  dailyNewAdmitTotal?: number;
  dailyReferInTotal?: number;
  dailyReferOutTotal?: number;
  dailyDeadTotal?: number;
  dailyNurseManagerTotal?: number;
  dailyRnTotal?: number;
  dailyPnTotal?: number;
  dailyWcTotal?: number;
  calculatedCensus?: number; // เพิ่มฟิลด์ใหม่
  
  // ระบุว่าเป็นข้อมูลตัวอย่างหรือไม่
  isDummyData?: boolean;
}

// สีที่ใช้ในแอพพลิเคชัน
const COLORS = {
  blue: '#3498DB',
  green: '#2ECC71',
  purple: '#9B59B6',
  yellow: '#F1C40F',
  orange: '#E67E22',
  red: '#E74C3C',
  teal: '#1ABC9C',
  gray: '#95A5A6'
};

// ข้อมูลการ์ดแสดงผล Ward
const WardCard = ({ title, count, onClick, isSelected }: { title: string; count: number; onClick?: () => void; isSelected?: boolean }) => {
  return (
    <div 
      className={`${isSelected ? 'bg-blue-700 dark:bg-blue-800 border-blue-500 border-2' : 'bg-light-card dark:bg-dark-card'} p-3 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={onClick}
    >
      <h3 className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-800 dark:text-dark-text'}`}>{title}</h3>
      <p className={`text-2xl font-bold my-1 ${isSelected ? 'text-white' : 'text-gray-800 dark:text-dark-text'}`}>{count}</p>
      <p className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
        {count > 0 ? 'คลิกดูรายละเอียด' : 'ไม่พบข้อมูล'}
      </p>
    </div>
  );
};

// ข้อมูลแถว (Row) ในตาราง
const DataRow = ({ label, data }: { label: string; data: number[] }) => {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <td className="py-2 px-3 font-medium text-light-text dark:text-dark-text">{label}</td>
      {data.map((value, index) => (
        <td key={index} className="py-2 px-3 text-center text-light-text dark:text-dark-text">{value}</td>
      ))}
    </tr>
  );
};

// Helper function เพื่อแปลง Firestore Timestamp หรือข้อมูลวันที่ในรูปแบบอื่นๆ ให้เป็น Date object
const toDateObject = (dateValue: any): Date => {
  if (!dateValue) return new Date(); // ส่งค่าวันที่ปัจจุบันถ้าไม่มีค่า
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // ตรวจสอบว่าเป็น Firebase Timestamp
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  
  // กรณีเป็น string หรือ timestamp
  try {
    return new Date(dateValue);
  } catch (error) {
    console.error('[toDateObject] Error parsing date:', error);
    return new Date(); // ส่งค่าวันที่ปัจจุบันในกรณีที่แปลงไม่ได้
  }
};

// Helper function เพื่อฟอร์แมตวันที่ให้เป็นสตริง
const formatDateString = (dateValue: any, formatStr: string = 'yyyy-MM-dd'): string => {
  const dateObj = toDateObject(dateValue);
  return format(dateObj, formatStr);
};

// Component หลัก
export default function DashboardPage() {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAdmin, setIsAdmin] = useState(false);

  // โหลดรายการ Ward
  useEffect(() => {
    const loadWards = async () => {
      if (!user) {
        setWards([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        let userWards = [];
        
        // ตรวจสอบสิทธิ์การเข้าถึง
        const hasAdminAccess = user.role === UserRole.ADMIN || 
                               user.role === UserRole.SUPER_ADMIN || 
                               user.role === UserRole.DEVELOPER ||
                               user.role === UserRole.HEAD_NURSE ||
                               user.role === UserRole.APPROVER;
        
        setIsAdmin(hasAdminAccess);
        
        if (hasAdminAccess) {
          // สำหรับ admin ดึงข้อมูลทุกแผนก
          userWards = await getAllWards();
        } else {
          // สำหรับผู้ใช้ทั่วไป ดึงเฉพาะแผนกที่มีสิทธิ์
          userWards = await getWardsByUserPermission(user);
          
          // ถ้าไม่ได้รับข้อมูลแผนก แต่ผู้ใช้มี floor กำหนดไว้ ให้พยายามดึงข้อมูลจาก floor
          if ((!userWards || userWards.length === 0) && user.floor) {
            try {
              const wardSnapshot = await getDoc(doc(db, COLLECTION_WARDS, user.floor));
              if (wardSnapshot.exists()) {
                const wardData = wardSnapshot.data() as Ward;
                userWards = [{
                  ...wardData,
                  id: wardSnapshot.id
                }];
              }
            } catch (err) {
              console.error('[DashboardPage] Error fetching ward by floor:', err);
            }
          }
        }
        
        setWards(userWards);
        
        // ถ้ามีแผนก ให้เลือกแผนกแรก
        if (userWards.length > 0) {
          setSelectedWardId(userWards[0].id);
        }
      } catch (err) {
        console.error('[DashboardPage] Error loading wards:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
        setWards([]);
      } finally {
        setLoading(false);
      }
    };
    
    if(user) loadWards();
    else {
      setLoading(false);
      setWards([]);
      setSelectedWardId(null);
    }
  }, [user]);
  
  // โหลดข้อมูลสรุปเมื่อเลือก Ward
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!user) {
        setSummaries([]);
        setLoading(false);
        return;
      }

        setLoading(true);
        setError(null);
          
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);

      console.log(`[DashboardPage] Date range: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);
      console.log(`[DashboardPage] Selected ward: ${selectedWardId || 'All'}`);

      try {
        // ลองดึงข้อมูลจาก dailySummaries ก่อน
        console.log("[DashboardPage] Trying to fetch data from dailySummaries first");
        
        // สร้าง query สำหรับดึงข้อมูลจาก dailySummaries
        let summariesQueryResult;
        if (selectedWardId) {
          summariesQueryResult = await getApprovedSummariesByDateRange(
            selectedWardId,
            startDateObj,
            endDateObj
          );
        } else {
          // ถ้าไม่ได้เลือก wardId ให้ดึงข้อมูลสำหรับแต่ละ ward แล้วรวมเข้าด้วยกัน
          console.log("[DashboardPage] No ward selected, will fetch data for all wards");
          
          const allWards = wards || [];
          console.log(`[DashboardPage] Found ${allWards.length} wards to query`);
          
          const wardPromises = allWards.map(ward => 
            getApprovedSummariesByDateRange(ward.id, startDateObj, endDateObj)
          );
          
          const wardResults = await Promise.all(wardPromises);
          
          // รวมผลลัพธ์จากทุก ward
          summariesQueryResult = wardResults.flat();
          console.log(`[DashboardPage] Combined ${summariesQueryResult.length} results from all wards`);
        }
        
        // แสดงจำนวนข้อมูลที่ได้รับ
        console.log(`[DashboardPage] Received ${summariesQueryResult.length} summaries from dailySummaries`);
        
        // แสดงข้อมูลตัวอย่าง 2 รายการแรก (ถ้ามี)
        if (summariesQueryResult.length > 0) {
          summariesQueryResult.slice(0, 2).forEach((item, index) => {
            console.log(`[DashboardPage] Example summary ${index + 1}:`, {
              id: item.id,
              wardId: item.wardId,
              wardName: item.wardName,
              date: item.dateString,
              morningFormId: item.morningFormId ? 'exists' : 'missing',
              nightFormId: item.nightFormId ? 'exists' : 'missing',
              dailyPatientCensus: item.dailyPatientCensus,
              calculatedCensus: item.calculatedCensus, 
              morningCalculatedCensus: item.morningCalculatedCensus,
              nightCalculatedCensus: item.nightCalculatedCensus,
              allFormsApproved: item.allFormsApproved
          });
        });
        }
        
        // คัดกรองข้อมูลเฉพาะที่มีค่า dailyPatientCensus และจัดเรียงตามวันที่
        const filteredSummaries = summariesQueryResult
          .filter(summary => {
            // ยกเลิกการตรวจสอบ dailyPatientCensus เพื่อให้แสดงข้อมูลแม้จะเป็น 0 หรือ null
            // เปลี่ยนจากการกรองเฉพาะที่มีข้อมูล เป็นเอาทุกรายการ แม้ค่าจะเป็น 0 หรือ null
            const hasWardInfo = summary.wardId && summary.wardName;
            
            // ไม่กรองตามสถานะ allFormsApproved อีกต่อไป
            // const isApproved = summary.allFormsApproved === true;
            
            const result = hasWardInfo; // เอาทั้งหมดที่มีข้อมูลแผนก ไม่จำเป็นต้องมีข้อมูลผู้ป่วย
            
            if (!result) {
              console.log(`[DashboardPage] Filtered out summary ${summary.id}, date ${summary.dateString}, hasWardInfo: ${hasWardInfo}`);
            } else {
              console.log(`[DashboardPage] Keeping summary ${summary.id}, date ${summary.dateString}, wardName: ${summary.wardName}, dailyPatientCensus: ${summary.dailyPatientCensus || 0}`);
            }
            
            return result;
          })
          .sort((a, b) => {
            // จัดเรียงตามวันที่จากเก่าไปใหม่
            const dateA = new Date(a.dateString);
            const dateB = new Date(b.dateString);
            return dateA.getTime() - dateB.getTime();
          })
          .map(summary => {
            // แปลงข้อมูลให้ตรงกับ interface DailySummary
            return {
              ...summary,
              // ถ้า dailyPatientCensus เป็น undefined หรือ null ให้แทนค่าด้วย 0
              dailyPatientCensus: summary.dailyPatientCensus ?? 0,
              morningPatientCensus: summary.morningPatientCensus ?? 0,
              nightPatientCensus: summary.nightPatientCensus ?? 0,
              // ตรวจสอบและเก็บค่า calculatedCensus (ถ้ามี)
              calculatedCensus: (summary as any).calculatedCensus ?? 0,
              morningCalculatedCensus: (summary as any).morningCalculatedCensus ?? 0,
              nightCalculatedCensus: (summary as any).nightCalculatedCensus ?? 0,
              // แปลงเป็น boolean เสมอ
              allFormsApproved: summary.allFormsApproved === true, 
              date: summary.date instanceof Date ? summary.date : new Date(summary.dateString),
            } as DailySummary;
          });
        
        console.log(`[DashboardPage] After filtering: ${filteredSummaries.length} summaries remaining`);
        
        // แม้ไม่มีข้อมูล ก็ไม่ throw error แล้ว
        console.log(filteredSummaries.length > 0 
          ? "[DashboardPage] Successfully fetched daily summaries" 
          : "[DashboardPage] No valid dailySummaries found, but continuing anyway");
        
        // ถึงไม่มีข้อมูลก็ยังตั้งค่า summaries เป็นอาร์เรย์ว่าง
        setSummaries(filteredSummaries);
        
        // ตรวจสอบว่ามี calculatedCensus ใน summaries หรือไม่
        const hasSummaryWithCalculatedCensus = filteredSummaries.some(summary => 
          summary.calculatedCensus !== undefined && summary.calculatedCensus !== null
        );
        
        console.log(`[DashboardPage] Has calculatedCensus in summaries: ${hasSummaryWithCalculatedCensus}`);
        
        if (hasSummaryWithCalculatedCensus) {
          console.log('[DashboardPage] Samples of calculatedCensus:',
            filteredSummaries.filter(s => s.calculatedCensus !== undefined)
              .slice(0, 3)
              .map(s => ({
                wardId: s.wardId,
                wardName: s.wardName,
                calculatedCensus: s.calculatedCensus,
                morningCalculatedCensus: s.morningCalculatedCensus,
                nightCalculatedCensus: s.nightCalculatedCensus
              }))
          );
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error("[DashboardPage] Error fetching daily summaries:", error);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูลสรุปประจำวัน กรุณาลองใหม่อีกครั้ง");
        setSummaries([]); // ตั้งค่าเป็นอาร์เรย์ว่างเมื่อเกิด error
        setLoading(false);
      }
    };
    
    if (user && wards) {
    fetchSummaries();
    }
  }, [user, wards, startDate, endDate, selectedWardId]);

  // เตรียมข้อมูลแสดงจำนวนผู้ป่วยแต่ละ Ward
  const wardStats = wards.map(ward => {
    // หาข้อมูลล่าสุดของแต่ละ ward
    const wardSummaries = summaries
      .filter(s => s.wardId === ward.id)
      .sort((a, b) => {
        const dateA = toDateObject(a.date);
        const dateB = toDateObject(b.date);
        return dateB.getTime() - dateA.getTime(); // เรียงจากใหม่ไปเก่า
      });
    
    // ใช้ข้อมูลล่าสุด
    const wardSummary = wardSummaries.length > 0 ? wardSummaries[0] : null;
    
    // เลือกค่า census ที่มีค่ามากที่สุดจากข้อมูลที่มี
    let count = 0;
    if (wardSummary) {
      // ตรวจสอบฟิลด์ calculateCensus ก่อน (ค่าที่ถูกคำนวณและบันทึกโดยผู้อนุมัติ)
      const calculatedCensus = (wardSummary as any).calculatedCensus;
      const dailyCensus = wardSummary.dailyPatientCensus;
      const morningCensus = wardSummary.morningPatientCensus;
      const nightCensus = wardSummary.nightPatientCensus;
      // ตรวจสอบค่า morningCalculatedCensus และ nightCalculatedCensus ด้วย
      const morningCalculatedCensus = (wardSummary as any).morningCalculatedCensus;
      const nightCalculatedCensus = (wardSummary as any).nightCalculatedCensus;
      
      // ลองใช้ค่าที่มีตามลำดับความสำคัญ
      if (typeof calculatedCensus === 'number' && calculatedCensus > 0) {
        count = calculatedCensus;
      } else if (typeof nightCalculatedCensus === 'number' && nightCalculatedCensus > 0) {
        count = nightCalculatedCensus;  // ใช้ค่าจากกะดึกซึ่งเป็นค่าล่าสุด
      } else if (typeof morningCalculatedCensus === 'number' && morningCalculatedCensus > 0) {
        count = morningCalculatedCensus;
      } else if (typeof dailyCensus === 'number' && dailyCensus > 0) {
        count = dailyCensus;
      } else if (typeof nightCensus === 'number' && nightCensus > 0) {
        count = nightCensus;
      } else if (typeof morningCensus === 'number' && morningCensus > 0) {
        count = morningCensus;
      }
      
      console.log(`[DashboardPage] Ward ${ward.wardName} census values:`, {
        calculatedCensus,
        morningCalculatedCensus,
        nightCalculatedCensus,
        dailyCensus, 
        morningCensus, 
        nightCensus, 
        selectedValue: count
      });
    }
    
    return {
      id: ward.id,
      name: ward.wardName,
      count: count
    };
  });
  
  // เพิ่ม console.log เพื่อตรวจสอบ wardStats
  console.log('[DashboardPage] wardStats:', wardStats);
  
  // กรองเฉพาะ wards ที่มีในระบบ (ไม่ใช้เงื่อนไข allFormsApproved)
  const approvedWards = wards.filter(ward => {
    const wardSummary = summaries.find(s => s.wardId === ward.id);
    return !!wardSummary;
  });
  
  // เตรียมข้อมูลสำหรับกราฟวงกลม (สัดส่วนผู้ป่วย)
  const preparePieChartData = () => {
    if (summaries.length === 0) return [];
    
    // สร้างข้อมูลจาก tableData ที่มีการเรียงลำดับและเลือกข้อมูลล่าสุดแล้ว
    const pieData = tableData
      .filter(item => item.patientCensus > 0)
      .map(item => ({
        name: item.ward,
        value: item.patientCensus
      }));
      
    console.log('[DashboardPage] Pie chart data:', pieData);
    return pieData;
  };
  
  // เตรียมข้อมูลสำหรับกราฟแท่ง (การกระจายผู้ป่วย)
  const prepareBarChartData = () => {
    if (summaries.length === 0) return [];
    
    // สร้างข้อมูลจาก tableData
    const barData = tableData
      .filter(item => item.patientCensus > 0)
      .map(item => ({
        name: item.ward,
        patients: item.patientCensus
      }));
      
    console.log('[DashboardPage] Bar chart data:', barData);
    return barData;
  };

  // สีสำหรับกราฟวงกลม
  const CHART_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];
  
  // ถ้ามีข้อมูลล่าสุดของ Ward ที่เลือก
  const selectedWardSummary = selectedWardId 
    ? summaries.find(s => s.wardId === selectedWardId)
    : null;

  // ส่วนแสดงข้อมูลตาราง
  const tableData = wards.map(ward => {
    // หาข้อมูลล่าสุดของแต่ละ ward
    const wardSummaries = summaries
      .filter(s => s.wardId === ward.id)
      .sort((a, b) => {
        const dateA = toDateObject(a.date);
        const dateB = toDateObject(b.date);
        return dateB.getTime() - dateA.getTime(); // เรียงจากใหม่ไปเก่า
      });
    
    const wardSummary = wardSummaries.length > 0 ? wardSummaries[0] : null;
    
    // Debug log
    console.log(`[DashboardPage] Table data for ward ${ward.id} (${ward.wardName}):`, 
      wardSummary ? {
        found: true,
        id: wardSummary.id,
        date: wardSummary.dateString,
        patientCensus: wardSummary.dailyPatientCensus,
        nurseTotal: wardSummary.dailyNurseTotal,
        morningCensus: wardSummary.morningPatientCensus, 
        nightCensus: wardSummary.nightPatientCensus,
        rawData: { 
          allKeys: Object.keys(wardSummary),
          morningKeys: Object.keys(wardSummary).filter(k => k.startsWith('morning')),
          nightKeys: Object.keys(wardSummary).filter(k => k.startsWith('night'))
        }
      } : {
        found: false,
        reason: summaries.length > 0 ? "No matching ward ID" : "No summaries available" 
      }
    );
    
    return {
      ward: ward.wardName,
      patientCensus: wardSummary?.dailyPatientCensus || 0,
      nurseManager: wardSummary?.dailyNurseManagerTotal || 0,
      rn: wardSummary?.dailyRnTotal || 0,
      pn: wardSummary?.dailyPnTotal || 0,
      wc: wardSummary?.dailyWcTotal || 0,
      nurseTotal: wardSummary?.dailyNurseTotal || 0, 
      nurseRatio: wardSummary?.dailyNurseRatio || 0
    };
  });

  // เพิ่มข้อมูลยอดรวม
  const totalRow = {
    ward: 'Total',
    patientCensus: tableData.reduce((sum, row) => sum + (row.patientCensus || 0), 0),
    nurseManager: tableData.reduce((sum, row) => sum + (row.nurseManager || 0), 0),
    rn: tableData.reduce((sum, row) => sum + (row.rn || 0), 0),
    pn: tableData.reduce((sum, row) => sum + (row.pn || 0), 0),
    wc: tableData.reduce((sum, row) => sum + (row.wc || 0), 0),
    nurseTotal: tableData.reduce((sum, row) => sum + (row.nurseTotal || 0), 0),
    nurseRatio: calculateTotalRatio(tableData)
  };

  // ฟังก์ชันสำหรับคำนวณอัตราส่วนทั้งหมด
  function calculateTotalRatio(data: any[]): number {
    const totalPatients = data.reduce((sum, row) => sum + (row.patientCensus || 0), 0);
    const totalNurses = data.reduce((sum, row) => sum + (row.nurseTotal || 0), 0);
    
    if (totalNurses === 0) return 0;
    return +(totalPatients / totalNurses).toFixed(2);
  }

  // Log data for debugging
  console.log('[DashboardPage] Table data summary:', {
    rows: tableData.length,
    totalRow: {
      patientCensus: totalRow.patientCensus,
      nurseTotal: totalRow.nurseTotal,
      nurseRatio: totalRow.nurseRatio
    }
  });

  // ฟังก์ชันสำหรับสร้างข้อมูลตัวอย่างเพื่อแสดงในกราฟ
  const createDummySummariesIfNeeded = () => {
    // ถ้ามีข้อมูลจริงอยู่แล้ว ไม่ต้องสร้างข้อมูลตัวอย่าง
    if (summaries && summaries.length > 0) {
      return summaries;
    }

    console.log("[DashboardPage] Creating dummy summaries for visualization");
    
    // สร้างช่วงวันที่สำหรับข้อมูลตัวอย่าง
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // คำนวณจำนวนวันในช่วงเวลาที่เลือก
    const days = eachDayOfInterval({
      start: startDateObj,
      end: endDateObj
    });
    
    // สร้างข้อมูลตัวอย่างสำหรับแต่ละวัน
    const dummyData = days.map((day, index) => {
      // สุ่มค่าข้อมูลสำหรับแสดงในกราฟ
      const patientCensus = Math.floor(Math.random() * 20) + 10; // สุ่มค่าระหว่าง 10-30
      const nurseTotal = Math.floor(Math.random() * 5) + 5;      // สุ่มค่าระหว่าง 5-10
      
      // กำหนดค่าสัดส่วนพยาบาลต่อผู้ป่วย
      const ratio = nurseTotal / patientCensus;
      
      // สร้างข้อมูลตัวอย่าง
      return {
        id: `dummy_${format(day, 'yyyyMMdd')}`,
        wardId: selectedWardId || 'dummy',
        wardName: wards?.find(w => w.id === selectedWardId)?.wardName || 'ข้อมูลตัวอย่าง',
        date: day,
        dateString: format(day, 'yyyy-MM-dd'),
        
        // ข้อมูลกะเช้า
        morningPatientCensus: patientCensus,
        morningNurseTotal: nurseTotal,
        morningNurseRatio: ratio,
        
        // ข้อมูลกะดึก
        nightPatientCensus: patientCensus,
        nightNurseTotal: nurseTotal,
        nightNurseRatio: ratio,
        
        // ข้อมูลรวม 24 ชั่วโมง
        dailyPatientCensus: patientCensus,
        dailyNurseTotal: nurseTotal * 2, // รวมทั้ง 2 กะ
        dailyNurseRatio: ratio,
        
        // ข้อมูลผู้ป่วย admission
        dailyNewAdmitTotal: Math.floor(Math.random() * 5),
        dailyDischargeTotal: Math.floor(Math.random() * 5),
        
        // สถานะการอนุมัติ
        allFormsApproved: true,
        
        // ระบุว่าเป็นข้อมูลตัวอย่าง
        isDummyData: true
      } as DailySummary;
    });
    
    console.log(`[DashboardPage] Created ${dummyData.length} dummy summaries`);
    return dummyData;
  };

  // แก้ไขฟังก์ชันที่ใช้สำหรับแสดงกราฟ
  // กราฟเส้นแสดงความเปลี่ยนแปลงรายวัน
  const { patientCensusSeries, nursePatientRatioSeries } = useMemo(() => {
    // ใช้ข้อมูลจริงหรือข้อมูลตัวอย่าง (ถ้าไม่มีข้อมูลจริง)
    const dataToUse = summaries.length > 0 ? summaries : createDummySummariesIfNeeded();
    
    // ข้อมูลสำหรับกราฟจำนวนผู้ป่วย
    const patientData = dataToUse.map(summary => ({
      x: format(summary.date instanceof Date ? summary.date : new Date(summary.dateString), 'dd/MM'),
      y: summary.dailyPatientCensus || 0
    }));
    
    // ข้อมูลสำหรับกราฟอัตราส่วนพยาบาลต่อผู้ป่วย
    const ratioData = dataToUse.map(summary => ({
      x: format(summary.date instanceof Date ? summary.date : new Date(summary.dateString), 'dd/MM'),
      y: Number((summary.dailyNurseRatio || 0).toFixed(2))
    }));
    
    return {
      patientCensusSeries: [{ name: 'จำนวนผู้ป่วย', data: patientData }],
      nursePatientRatioSeries: [{ name: 'อัตราส่วนพยาบาลต่อผู้ป่วย', data: ratioData }]
    };
  }, [summaries, startDate, endDate, selectedWardId, wards]);

  // ฟังก์ชันสำหรับแสดงตารางข้อมูลสรุป
  const renderSummaryTable = () => {
    // ใช้ข้อมูลจริงหรือข้อมูลตัวอย่าง (ถ้าไม่มีข้อมูลจริง)
    const dataToRender = summaries.length > 0 ? summaries : createDummySummariesIfNeeded();
    
    // ถ้าไม่มีข้อมูลใดๆ เลยให้แสดงข้อความ
    if (!dataToRender || dataToRender.length === 0) {
  return (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">ไม่พบข้อมูลสำหรับช่วงเวลาที่เลือก</p>
        </div>
      );
    }

    // ถ้าเป็นข้อมูลตัวอย่าง ให้แสดงป้ายกำกับ
    const showDummyAlert = dataToRender.some(item => item.isDummyData);
    
    return (
      <div className="overflow-x-auto">
        {showDummyAlert && (
          <div className="bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 p-3 mb-4 rounded-md">
            <p className="text-sm font-medium">
              <span className="mr-2">⚠️</span> 
              กำลังแสดงข้อมูลตัวอย่าง เนื่องจากไม่พบข้อมูลจริงในระบบสำหรับช่วงเวลาที่เลือก
            </p>
          </div>
        )}
        
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                วันที่
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                วอร์ด
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                จำนวนผู้ป่วย
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                จำนวนพยาบาล (เช้า)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                จำนวนพยาบาล (ดึก)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                จำนวนพยาบาล (รวม)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                พยาบาล:ผู้ป่วย (เช้า)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                พยาบาล:ผู้ป่วย (ดึก)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                พยาบาล:ผู้ป่วย (เฉลี่ย)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {dataToRender.map((summary, index) => (
              <tr key={summary.id || index} className={summary.isDummyData ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {format(summary.date instanceof Date ? summary.date : new Date(summary.dateString), 'dd/MM/yyyy')}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.wardName}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.dailyPatientCensus || 0}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.morningNurseTotal || 0}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.nightNurseTotal || 0}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.dailyNurseTotal || 0}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.morningNurseRatio ? summary.morningNurseRatio.toFixed(2) : '0.00'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.nightNurseRatio ? summary.nightNurseRatio.toFixed(2) : '0.00'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {summary.dailyNurseRatio ? summary.dailyNurseRatio.toFixed(2) : '0.00'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                  {(summary.dailyPatientCensus || 0) + (summary.dailyNurseTotal || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // เพิ่ม console.log เพื่อตรวจสอบ wardStats
  console.log('[DashboardPage] Complete wardStats:', wardStats);
  
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg print-container">
      <style>{printStyles}</style>
      <NavBar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">จำนวนผู้ป่วยแยกตามแผนก</h1>
            
            <div className="flex space-x-2 no-print">
              <button 
                className="bg-btn-primary hover:bg-btn-primary-hover text-white px-4 py-2 rounded-lg flex items-center"
                onClick={() => window.print()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                </svg>
                พิมพ์รายงาน
              </button>
              
              <button 
                className="bg-btn-success hover:bg-btn-success-hover text-white px-4 py-2 rounded-lg flex items-center"
                onClick={() => {
                  alert('ฟังก์ชันส่งออกเป็น Excel จะถูกพัฒนาในอนาคต');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                ส่งออก Excel
              </button>
            </div>
          </div>
          
          {/* ตัวกรองและเลือก Ward */}
          <div className="flex flex-wrap gap-4 mb-6 no-print">
            {/* แสดง dropdown เฉพาะกรณีที่เป็น Admin หรือมีสิทธิ์ดูหลาย Ward */}
            {(isAdmin || wards.length > 1) && (
              <div className="flex flex-col">
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  เลือกแผนก {isAdmin && <span className="text-xs text-gray-400 dark:text-gray-500">(สำหรับกรองข้อมูลเฉพาะ Ward)</span>}
                </label>
            <select 
                  className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 h-10 w-48"
              value={selectedWardId || ''}
              onChange={(e) => setSelectedWardId(e.target.value)}
            >
                  {isAdmin && <option value="" className="text-gray-900 dark:text-white">ทุกแผนก</option>}
                  {!isAdmin && <option value="" className="text-gray-900 dark:text-white">เลือกแผนก</option>}
              {wards.map(ward => (
                    <option key={ward.id} value={ward.id} className="text-gray-900 dark:text-white">{ward.wardName}</option>
              ))}
            </select>
              </div>
            )}
            
            <div className="flex flex-col">
              <label className="text-sm text-gray-500 dark:text-gray-400">วันที่เริ่มต้น</label>
              <input
                type="date"
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 h-10 w-48"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-500 dark:text-gray-400">วันที่สิ้นสุด</label>
              <input
                type="date"
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 h-10 w-48"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          {/* แสดงวันที่ข้อมูลล่าสุด */}
          {summaries.length > 0 && (
            <div className="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  แสดงข้อมูลล่าสุด ณ วันที่ {format(summaries[0].date instanceof Date ? summaries[0].date : new Date(), 'dd MMMM yyyy', { locale: th })}
                </p>
              </div>
            </div>
          )}
          
          {/* แสดงผลจำนวนผู้ป่วยแยกตาม Ward */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-10 text-light-text dark:text-dark-text">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                <span className="ml-3">กำลังโหลดข้อมูล...</span>
              </div>
            ) : error ? (
              <div className="col-span-full bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-300 px-4 py-3 rounded">
                <p>{error}</p>
              </div>
            ) : (
              wardStats.map(ward => (
                <WardCard 
                  key={ward.id}
                  title={ward.name}
                  count={ward.count}
                  onClick={() => setSelectedWardId(ward.id)}
                  isSelected={ward.id === selectedWardId}
                />
              ))
            )}
          </div>
          
          {/* กราฟเส้นแสดงสถิติย้อนหลัง - ย้ายขึ้นมาอยู่ก่อนตาราง */}
          <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">จำนวนผู้ป่วยรายวัน</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={summaries.map(s => ({
                    date: format(s.date instanceof Date ? s.date : new Date(), 'dd/MM'),
                    morning: s.morningPatientCensus || 0,
                    night: s.nightPatientCensus || 0,
                    total: s.dailyPatientCensus || 0
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-color)" />
                  <YAxis stroke="var(--text-color)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }} />
                  <Legend formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>} />
                  <Line type="monotone" dataKey="morning" name="กะเช้า" stroke="#8884d8" />
                  <Line type="monotone" dataKey="night" name="กะดึก" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="total" name="รวม" stroke="#ffc658" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* ตาราง Patient Census By Nurse Manager */}
          <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4 mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="py-2 px-3 text-left text-light-text dark:text-dark-text">หัวข้อ</th>
                    {wards.map(ward => (
                      <th key={ward.id} className="py-2 px-3 text-center text-light-text dark:text-dark-text">{ward.wardName}</th>
                    ))}
                    {/* เพิ่มคอลัมน์ Total สำหรับแสดงผลรวม */}
                    <th className="py-2 px-3 text-center text-light-text dark:text-dark-text">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  {loading ? (
                    <tr>
                      <td colSpan={wards.length + 2} className="py-4 text-center text-light-text dark:text-dark-text">กำลังโหลดข้อมูล...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={wards.length + 2} className="py-4 text-center text-red-500 dark:text-red-400">{error}</td>
                    </tr>
                  ) : tableData.length === 0 ? (
                    <tr>
                      <td colSpan={wards.length + 2} className="py-4 text-center text-light-text dark:text-dark-text">ไม่พบข้อมูล กรุณาเลือกช่วงเวลาอื่น</td>
                    </tr>
                  ) : (
                    <>
                      <DataRow 
                        label="Patient Census" 
                        data={[...tableData.map(row => row.patientCensus), totalRow.patientCensus]} 
                      />
                      <DataRow 
                        label="Nurse Manager" 
                        data={[...tableData.map(row => row.nurseManager), totalRow.nurseManager]} 
                      />
                      <DataRow 
                        label="RN" 
                        data={[...tableData.map(row => row.rn), totalRow.rn]} 
                      />
                      <DataRow 
                        label="PN" 
                        data={[...tableData.map(row => row.pn), totalRow.pn]} 
                      />
                      <DataRow 
                        label="WC" 
                        data={[...tableData.map(row => row.wc), totalRow.wc]} 
                      />
                      <DataRow 
                        label="Nurse Total" 
                        data={[...tableData.map(row => row.nurseTotal), totalRow.nurseTotal]} 
                      />
                      <DataRow 
                        label="Nurse Ratio" 
                        data={[...tableData.map(row => row.nurseRatio), totalRow.nurseRatio]} 
                      />
                      <DataRow 
                        label="New Admit" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyNewAdmitTotal || 0;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return sum + (wardSummary?.dailyNewAdmitTotal || 0);
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Transfer In" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningTransfer = wardSummary?.morningTransferIn || 0;
                          const nightTransfer = wardSummary?.nightTransferIn || 0;
                          return morningTransfer + nightTransfer;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningTransfer = wardSummary?.morningTransferIn || 0;
                          const nightTransfer = wardSummary?.nightTransferIn || 0;
                          return sum + morningTransfer + nightTransfer;
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Refer In" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyReferInTotal || 0;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return sum + (wardSummary?.dailyReferInTotal || 0);
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Transfer Out" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningTransfer = wardSummary?.morningTransferOut || 0;
                          const nightTransfer = wardSummary?.nightTransferOut || 0;
                          return morningTransfer + nightTransfer;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningTransfer = wardSummary?.morningTransferOut || 0;
                          const nightTransfer = wardSummary?.nightTransferOut || 0;
                          return sum + morningTransfer + nightTransfer;
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Refer Out" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyReferOutTotal || 0;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return sum + (wardSummary?.dailyReferOutTotal || 0);
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Discharge" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningDischarge = wardSummary?.morningDischarge || 0;
                          const nightDischarge = wardSummary?.nightDischarge || 0;
                          return morningDischarge + nightDischarge;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningDischarge = wardSummary?.morningDischarge || 0;
                          const nightDischarge = wardSummary?.nightDischarge || 0;
                          return sum + morningDischarge + nightDischarge;
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Dead" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyDeadTotal || 0;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return sum + (wardSummary?.dailyDeadTotal || 0);
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Available" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.availableBeds || 0;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return sum + (wardSummary?.availableBeds || 0);
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Unavailable" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.unavailableBeds || 0;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return sum + (wardSummary?.unavailableBeds || 0);
                        }, 0)]} 
                      />
                      <DataRow 
                        label="Planned Discharge" 
                        data={[...wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.plannedDischarge || 0;
                        }), wards.reduce((sum, ward) => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return sum + (wardSummary?.plannedDischarge || 0);
                        }, 0)]} 
                      />
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* กราฟวงกลมและกราฟแท่ง */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">การกระจายผู้ป่วย (แผนภูมิวงกลม)</h2>
              <div className="h-64">
                {loading ? (
                  <div className="h-full flex justify-center items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-light-text dark:text-dark-text">กำลังโหลดข้อมูล...</span>
                  </div>
                ) : preparePieChartData().length === 0 ? (
                  <div className="h-full flex justify-center items-center text-gray-500 dark:text-gray-400">
                    ไม่มีข้อมูลการกระจายผู้ป่วยสำหรับช่วงเวลาที่เลือก
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {preparePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }} />
                      <Legend formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
            
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">การกระจายผู้ป่วย (แผนภูมิแท่ง)</h2>
              <div className="h-64">
                {loading ? (
                  <div className="h-full flex justify-center items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-light-text dark:text-dark-text">กำลังโหลดข้อมูล...</span>
                  </div>
                ) : prepareBarChartData().length === 0 ? (
                  <div className="h-full flex justify-center items-center text-gray-500 dark:text-gray-400">
                    ไม่มีข้อมูลการกระจายผู้ป่วยสำหรับช่วงเวลาที่เลือก
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareBarChartData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-color)" />
                      <YAxis stroke="var(--text-color)" />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }} />
                      <Legend formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>} />
                    <Bar dataKey="patients" name="จำนวนผู้ป่วย" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
          
          {/* รายละเอียดเพิ่มเติมของ Ward ที่เลือก */}
          {selectedWardSummary && (
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">รายละเอียดแผนก {selectedWardSummary.wardName}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                  <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">ข้อมูลกะเช้า</h3>
                  <div className="space-y-1 text-gray-800 dark:text-gray-200">
                    <div className="flex justify-between">
                      <span>จำนวนผู้ป่วย:</span>
                      <span className="font-bold">{selectedWardSummary.morningPatientCensus || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำนวนพยาบาล:</span>
                      <span className="font-bold">{selectedWardSummary.morningNurseTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>อัตราส่วน:</span>
                      <span className="font-bold">{selectedWardSummary.morningNurseRatio || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>รับใหม่:</span>
                      <span className="font-bold">{selectedWardSummary.morningNewAdmit || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำหน่าย:</span>
                      <span className="font-bold">{selectedWardSummary.morningDischarge || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                  <h3 className="font-semibold mb-2 text-purple-800 dark:text-purple-200">ข้อมูลกะดึก</h3>
                  <div className="space-y-1 text-gray-800 dark:text-gray-200">
                    <div className="flex justify-between">
                      <span>จำนวนผู้ป่วย:</span>
                      <span className="font-bold">{selectedWardSummary.nightPatientCensus || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำนวนพยาบาล:</span>
                      <span className="font-bold">{selectedWardSummary.nightNurseTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>อัตราส่วน:</span>
                      <span className="font-bold">{selectedWardSummary.nightNurseRatio || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>รับใหม่:</span>
                      <span className="font-bold">{selectedWardSummary.nightNewAdmit || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำหน่าย:</span>
                      <span className="font-bold">{selectedWardSummary.nightDischarge || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-100 dark:border-green-800">
                  <h3 className="font-semibold mb-2 text-green-800 dark:text-green-200">สรุปรวม 24 ชั่วโมง</h3>
                  <div className="space-y-1 text-gray-800 dark:text-gray-200">
                    <div className="flex justify-between">
                      <span>จำนวนผู้ป่วยรวม:</span>
                      <span className="font-bold">{selectedWardSummary.dailyPatientCensus || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำนวนพยาบาล:</span>
                      <span className="font-bold">{selectedWardSummary.dailyNurseTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>อัตราส่วนเฉลี่ย:</span>
                      <span className="font-bold">{selectedWardSummary.dailyNurseRatio || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>รับใหม่ทั้งหมด:</span>
                      <span className="font-bold">{selectedWardSummary.dailyNewAdmitTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำหน่าย/เสียชีวิต:</span>
                      <span className="font-bold">{selectedWardSummary.dailyDischargeAllTotal || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 text-light-text dark:text-dark-text">สัดส่วนบุคลากรพยาบาล</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Nurse Manager', value: selectedWardSummary.dailyNurseManagerTotal || 0 },
                            { name: 'RN', value: selectedWardSummary.dailyRnTotal || 0 },
                            { name: 'PN', value: selectedWardSummary.dailyPnTotal || 0 },
                            { name: 'WC', value: selectedWardSummary.dailyWcTotal || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label
                        >
                          <Cell fill="#F1C40F" />
                          <Cell fill="#3498DB" />
                          <Cell fill="#2ECC71" />
                          <Cell fill="#9B59B6" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }} />
                        <Legend formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 text-light-text dark:text-dark-text">เปรียบเทียบกะเช้า/กะดึก</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'ผู้ป่วย', morning: selectedWardSummary.morningPatientCensus || 0, night: selectedWardSummary.nightPatientCensus || 0 },
                          { name: 'พยาบาล', morning: selectedWardSummary.morningNurseTotal || 0, night: selectedWardSummary.nightNurseTotal || 0 },
                          { name: 'รับใหม่', morning: selectedWardSummary.morningNewAdmit || 0, night: selectedWardSummary.nightNewAdmit || 0 },
                          { name: 'จำหน่าย', morning: selectedWardSummary.morningDischarge || 0, night: selectedWardSummary.nightDischarge || 0 }
                        ]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="name" stroke="var(--text-color)" />
                        <YAxis stroke="var(--text-color)" />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }} />
                        <Legend formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>} />
                        <Bar dataKey="morning" name="กะเช้า" fill="#8884d8" />
                        <Bar dataKey="night" name="กะดึก" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 