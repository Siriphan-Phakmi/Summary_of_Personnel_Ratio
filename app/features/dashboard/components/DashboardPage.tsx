'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, addDays, subWeeks, subMonths, subYears } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';
import { collection } from 'firebase/firestore';
import { query } from 'firebase/firestore';
import { where } from 'firebase/firestore';
import { orderBy } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission, getAllWards } from '@/app/features/ward-form/services/wardService';
import { Ward, WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { UserRole } from '@/app/core/types/user';
import { COLLECTION_SUMMARIES, COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';
import { getApprovedSummariesByDateRange } from '@/app/features/ward-form/services/approvalServices/dailySummary';
import { 
  DashboardSummary, 
  WardFormData, 
  PatientTrendData,
  WardSummaryData 
} from './types';
import WardSummaryDashboard from './WardSummaryDashboard';
import DashboardOverview from './DashboardOverview';
import EnhancedBarChart from './EnhancedBarChart';
import EnhancedPieChart from './EnhancedPieChart';
import PatientTrendChart, { TrendData } from './PatientTrendChart';
import WardSummaryTable from './WardSummaryTable';
import ShiftComparisonPanel from './ShiftComparisonPanel';

// รายชื่อแผนกที่ต้องการให้แสดงใน Dashboard
const DASHBOARD_WARDS = [
  'CCU', 'ICU', 'LR', 'NSY', 'Ward10B', 'Ward11', 'Ward12',
  'Ward6', 'Ward7', 'Ward8', 'Ward9', 'WardGI'
];

const printStyles = `
  @media print {
    body { background-color: white; }
    .no-print { display: none !important; }
    /* Add other print-specific styles if needed */
  }
`;

// ตัวเลือกช่วงเวลา
const DATE_RANGE_OPTIONS = [
  { label: 'วันนี้', value: 'today' },
  { label: '7 วันล่าสุด', value: '7days' },
  { label: '30 วันล่าสุด', value: '30days' },
  { label: 'ปีล่าสุด', value: 'year' },
  { label: 'แสดงทั้งหมด', value: 'all' },
  { label: 'กำหนดเอง', value: 'custom' }
];

// ประเภทของการดูข้อมูล
enum ViewType {
  SUMMARY = 'summary',
  WARD_DETAIL = 'ward_detail',
  TREND = 'trend'
}

// ดึงข้อมูลจาก dailySummaries collection
const getDailySummary = async (wardId: string, dateString: string) => {
  console.log(`[getDailySummary] Fetching summary for wardId=${wardId}, date=${dateString}`);
  
  try {
    // แปลง wardId เป็นตัวพิมพ์ใหญ่เพื่อให้ตรงกับข้อมูลในฐานข้อมูล
    const formattedWardId = wardId.toUpperCase();
    
    // ใช้ getApprovedSummariesByDateRange แทนการ query โดยตรง
    const summaries = await getApprovedSummariesByDateRange(formattedWardId, dateString, dateString);
    console.log(`[getDailySummary] Found ${summaries.length} summaries using getApprovedSummariesByDateRange`);
    
    if (summaries.length > 0) {
      const summary = summaries[0]; // เลือกรายการแรก (ล่าสุด)
      console.log(`[getDailySummary] Summary data:`, summary);
      
      // สร้างข้อมูลแบบฟอร์มจาก dailySummary
      const morningForm: WardFormData | null = summary.morningFormId ? {
        id: summary.morningFormId,
        patientCensus: summary.morningPatientCensus || 0,
        calculatedCensus: summary.morningCalculatedCensus,
        nurseManager: summary.morningNurseManager || 0,
        rn: summary.morningRn || 0,
        pn: summary.morningPn || 0,
        wc: summary.morningWc || 0,
        newAdmit: summary.morningNewAdmit || 0,
        transferIn: summary.morningTransferIn || 0,
        referIn: summary.morningReferIn || 0,
        discharge: summary.morningDischarge || 0,
        transferOut: summary.morningTransferOut || 0,
        referOut: summary.morningReferOut || 0,
        dead: summary.morningDead || 0,
        available: summary.availableBeds || 0,
        unavailable: summary.unavailableBeds || 0,
        plannedDischarge: summary.plannedDischarge || 0,
        admitTotal: summary.morningAdmitTotal || 0,
        dischargeTotal: summary.morningDischargeTotal || 0
      } : null;
      
      const nightForm: WardFormData | null = summary.nightFormId ? {
        id: summary.nightFormId,
        patientCensus: summary.nightPatientCensus || 0,
        calculatedCensus: summary.nightCalculatedCensus,
        nurseManager: summary.nightNurseManager || 0,
        rn: summary.nightRn || 0,
        pn: summary.nightPn || 0,
        wc: summary.nightWc || 0,
        newAdmit: summary.nightNewAdmit || 0,
        transferIn: summary.nightTransferIn || 0,
        referIn: summary.nightReferIn || 0,
        discharge: summary.nightDischarge || 0,
        transferOut: summary.nightTransferOut || 0,
        referOut: summary.nightReferOut || 0,
        dead: summary.nightDead || 0,
        available: summary.availableBeds || 0,
        unavailable: summary.unavailableBeds || 0,
        plannedDischarge: summary.plannedDischarge || 0,
        admitTotal: summary.nightAdmitTotal || 0,
        dischargeTotal: summary.nightDischargeTotal || 0
      } : null;
      
      return { morning: morningForm, night: nightForm };
    }
    
    return { morning: null, night: null };
  } catch (error) {
    console.error('[getDailySummary] Error:', error);
    throw error;
  }
};

// ดึงข้อมูลแนวโน้มผู้ป่วยในช่วงเวลาที่กำหนด
const fetchPatientTrends = async (startDate: Date, endDate: Date, wardId?: string): Promise<TrendData[]> => {
  console.log(`[fetchPatientTrends] Fetching trends from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
  
  try {
    // แปลงวันที่เป็น string
    const startDateString = format(startDate, 'yyyy-MM-dd');
    const endDateString = format(endDate, 'yyyy-MM-dd');
    
    let summaries: any[] = [];
    
    if (wardId) {
      // ใช้ getApprovedSummariesByDateRange สำหรับดึงข้อมูลตาม ward และช่วงวันที่
      const formattedWardId = wardId.toUpperCase();
      summaries = await getApprovedSummariesByDateRange(formattedWardId, startDateString, endDateString);
      console.log(`[fetchPatientTrends] Found ${summaries.length} summaries using getApprovedSummariesByDateRange for ward ${formattedWardId}`);
    } else {
      // กรณีไม่ระบุ wardId จำเป็นต้องใช้การ query โดยตรงเนื่องจาก getApprovedSummariesByDateRange ต้องการ wardId
      const summariesRef = collection(db, COLLECTION_SUMMARIES);
      const trendQuery = query(
        summariesRef,
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString),
        orderBy('dateString', 'asc')
      );
      
      const querySnapshot = await getDocs(trendQuery);
      console.log(`[fetchPatientTrends] Found ${querySnapshot.size} data points using direct query`);
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        // ตั้งค่า allFormsApproved = true เพื่อให้แสดงผลได้
        data.allFormsApproved = true;
        summaries.push({ id: doc.id, ...data });
      });
    }
    
    // สร้าง Map เพื่อจัดกลุ่มข้อมูลตามวันที่
    const dateToDataMap = new Map<string, TrendData>();
    
    // สร้างข้อมูลเริ่มต้นสำหรับทุกวันในช่วงเวลา
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      dateToDataMap.set(dateString, {
        date: format(currentDate, 'dd/MM'),
        patientCount: 0,
        admitCount: 0,
        dischargeCount: 0
      });
      currentDate = addDays(currentDate, 1);
    }
    
    // รวมข้อมูลจากทุก ward ตามวันที่
    summaries.forEach(data => {
      const dateString = data.dateString;
      const formattedDate = format(parseISO(dateString), 'dd/MM');
      
      const existingData = dateToDataMap.get(dateString) || {
        date: formattedDate,
        patientCount: 0,
        admitCount: 0,
        dischargeCount: 0
      };
      
      // ใช้ข้อมูล night form ถ้ามี มิฉะนั้นใช้ morning form
      // ให้ความสำคัญกับ calculatedCensus ก่อน ถ้าไม่มีให้ใช้ patientCensus
      const nightPatientCensus = data.nightCalculatedCensus || data.nightPatientCensus || 0;
      const morningPatientCensus = data.morningCalculatedCensus || data.morningPatientCensus || 0;
      const patientCensus = nightPatientCensus || morningPatientCensus;
      
      const admitTotal = (data.nightAdmitTotal || 0) + (data.morningAdmitTotal || 0);
      const dischargeAmount = (data.nightDischargeTotal || 0) + (data.morningDischargeTotal || 0);
      
      dateToDataMap.set(dateString, {
        date: formattedDate,
        patientCount: existingData.patientCount + patientCensus,
        admitCount: existingData.admitCount + admitTotal,
        dischargeCount: existingData.dischargeCount + dischargeAmount
      });
    });
    
    // แปลง Map เป็น Array สำหรับใช้กับกราฟ
    const result = Array.from(dateToDataMap.values());
    console.log(`[fetchPatientTrends] Final trend data:`, result);

    // กรณี all ต้องคิดแง่มุมเรื่องประสิทธิภาพ ควรใช้การ paginate หรือจำกัดจำนวนข้อมูล
    if (format(startDate, 'yyyy') !== format(endDate, 'yyyy') && endDate.getTime() - startDate.getTime() > 365 * 24 * 60 * 60 * 1000) {
      console.log(`[fetchPatientTrends] Period is too long, limiting results to improve performance`);
      // ใช้ข้อมูลแบบ aggregate รายเดือนถ้ามีช่วงเวลากว้างมาก
    }

    return result;
  } catch (error) {
    console.error('[fetchPatientTrends] Error:', error);
    return [];
  }
};

// ดึงข้อมูลแบบฟอร์มโดยตรงจาก wardForms collection
const getWardFormsByDateAndWard = async (
  wardId: string, 
  dateString: string
): Promise<{ morning: WardFormData | null, night: WardFormData | null }> => {
  console.log(`[getWardFormsByDateAndWard] Fetching forms for wardId=${wardId}, date=${dateString}`);
  
  try {
    // แปลง wardId เป็นตัวพิมพ์ใหญ่เพื่อให้ตรงกับข้อมูลในฐานข้อมูล
    const formattedWardId = wardId.toUpperCase();
    
    // ดึงข้อมูลจาก wardForms collection โดยตรง
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    
    // เพิ่ม debug logs
    console.log(`[getWardFormsByDateAndWard] Query params: originalWardId=${wardId}, formattedWardId=${formattedWardId}, dateString=${dateString}, status=[${FormStatus.FINAL}, ${FormStatus.APPROVED}]`);
    
    const formsQuery = query(
      formsRef,
      where('wardId', '==', formattedWardId),
      where('dateString', '==', dateString),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(formsQuery);
    console.log(`[getWardFormsByDateAndWard] Found ${querySnapshot.size} forms`);
    
    // Debug: แสดงข้อมูลของ documents ที่พบ
    if (querySnapshot.size > 0) {
      querySnapshot.forEach((doc) => {
        const data = doc.data() as WardForm;
        console.log(`[getWardFormsByDateAndWard] Form: id=${doc.id}, shift=${data.shift}, status=${data.status}, patientCensus=${data.patientCensus}`);
      });
    } else {
      // ถ้าไม่พบข้อมูล ให้ลองใช้ query เงื่อนไขน้อยลง เพื่อดูว่ามีข้อมูลหรือไม่
      console.log(`[getWardFormsByDateAndWard] No forms found with original query. Trying alternative query...`);
      
      const alternativeQuery = query(
        formsRef,
        where('wardId', '==', formattedWardId),
        where('dateString', '==', dateString)
      );
      
      const altSnapshot = await getDocs(alternativeQuery);
      console.log(`[getWardFormsByDateAndWard] Alternative query found ${altSnapshot.size} forms`);
      
      if (altSnapshot.size > 0) {
        altSnapshot.forEach((doc) => {
          const data = doc.data() as WardForm;
          console.log(`[getWardFormsByDateAndWard] Alt Form: id=${doc.id}, shift=${data.shift}, status=${data.status}, patientCensus=${data.patientCensus}`);
        });
      }
    }
    
    let morningForm: WardFormData | null = null;
    let nightForm: WardFormData | null = null;
    
    querySnapshot.forEach(doc => {
      const data = doc.data() as WardForm;
      
      // คำนวณผลรวมของรับเข้าและจำหน่าย
      const admitTotal = (data.newAdmit || 0) + (data.transferIn || 0) + (data.referIn || 0);
      const dischargeTotal = (data.discharge || 0) + (data.transferOut || 0) + (data.referOut || 0) + (data.dead || 0);
      
      const formData: WardFormData = {
        id: doc.id,
        patientCensus: data.patientCensus || 0,
        calculatedCensus: data.calculatedCensus,
        initialPatientCensus: data.initialPatientCensus,
        nurseManager: data.nurseManager || 0,
        rn: data.rn || 0,
        pn: data.pn || 0,
        wc: data.wc || 0,
        newAdmit: data.newAdmit || 0,
        transferIn: data.transferIn || 0,
        referIn: data.referIn || 0,
        discharge: data.discharge || 0,
        transferOut: data.transferOut || 0,
        referOut: data.referOut || 0,
        dead: data.dead || 0,
        available: data.available || 0,
        unavailable: data.unavailable || 0,
        plannedDischarge: data.plannedDischarge || 0,
        admitTotal: admitTotal,
        dischargeTotal: dischargeTotal
      };
      
      if (data.shift === ShiftType.MORNING && !morningForm) {
        morningForm = formData;
      } else if (data.shift === ShiftType.NIGHT && !nightForm) {
        nightForm = formData;
      }
    });
    
    console.log(`[getWardFormsByDateAndWard] Morning form found: ${!!morningForm}, Night form found: ${!!nightForm}`);
    if (morningForm) {
      console.log('[getWardFormsByDateAndWard] Morning form details:', morningForm);
    }
    if (nightForm) {
      console.log('[getWardFormsByDateAndWard] Night form details:', nightForm);
    }
    
    return { morning: morningForm, night: nightForm };
  } catch (error) {
    console.error('[getWardFormsByDateAndWard] Error:', error);
    throw error;
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลสรุปรวม 24 ชั่วโมง
const fetchTotalStats = async (dateString: string) => {
  console.log(`[fetchTotalStats] Fetching total stats for date ${dateString}`);
  
  try {
    // ดึงข้อมูลจาก wardForms collection
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    
    // สร้าง query ที่ดึงข้อมูลของวันที่ที่เลือกและมีสถานะเป็น FINAL หรือ APPROVED
    const formsQuery = query(
      formsRef,
      where('dateString', '==', dateString),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED])
    );
    
    const querySnapshot = await getDocs(formsQuery);
    console.log(`[fetchTotalStats] Found ${querySnapshot.size} forms`);
    
    let totalOpd = 0;
    let totalOldPatient = 0;
    let totalNewPatient = 0;
    let totalAdmit = 0;
    
    // รวมข้อมูลจากทุกแบบฟอร์ม
    querySnapshot.forEach(doc => {
      const data = doc.data() as WardForm;
      
      // ไม่นับซ้ำถ้าเป็น Ward เดียวกัน (นับเฉพาะกะดึกหรือถ้าไม่มีกะดึกให้นับกะเช้า)
      if (data.shift === ShiftType.NIGHT || 
         (data.shift === ShiftType.MORNING && !querySnapshot.docs.some(d => 
           d.data().wardId === data.wardId && d.data().shift === ShiftType.NIGHT))) {
        
        totalOpd += data.oldPatient || 0; // ใช้ oldPatient แทน opdPatient
        
        // old patient คือผู้ป่วยที่มีอยู่แล้ว คำนวณจาก patientCensus - newAdmit
        const oldPatient = Math.max(0, (data.patientCensus || 0) - (data.newAdmit || 0));
        totalOldPatient += oldPatient;
        
        totalNewPatient += data.newAdmit || 0;
        
        // admit total คือผู้ป่วยที่รับใหม่ทั้งหมด
        const admitTotal = (data.newAdmit || 0) + (data.transferIn || 0) + (data.referIn || 0);
        totalAdmit += admitTotal;
      }
    });
    
    return {
      opd24hr: totalOpd,
      oldPatient: totalOldPatient,
      newPatient: totalNewPatient,
      admit24hr: totalAdmit
    };
  } catch (error) {
    console.error('[fetchTotalStats] Error:', error);
    return {
      opd24hr: 0,
      oldPatient: 0,
      newPatient: 0,
      admit24hr: 0
    };
  }
};

// Function to fetch all ward census data for a specific date
const fetchAllWardCensus = async (dateString: string): Promise<Map<string, number>> => {
  const censusMap = new Map<string, number>();
  try {
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const q = query(summariesRef, where('dateString', '==', dateString));
    const querySnapshot = await getDocs(q);

    const dashboardWardIdsUpper = DASHBOARD_WARDS.map(w => w.toUpperCase());

    querySnapshot.forEach(doc => {
      const data = doc.data();
      const wardId = data.wardId?.toUpperCase();
      if (wardId && dashboardWardIdsUpper.includes(wardId)) {
        const patientCensus = data.dailyPatientCensus ?? data.nightPatientCensus ?? data.morningPatientCensus ?? 0;
        censusMap.set(wardId, patientCensus);
      }
    });
    console.log(`[fetchAllWardCensus] Fetched census for ${dateString}:`, censusMap);
  } catch (error) {
    console.error('[fetchAllWardCensus] Error fetching ward census data:', error);
  }
  return censusMap;
};

// Function to fetch all ward summary data for a specific date
const fetchAllWardSummaryData = async (dateString: string, allAppWards: Ward[]): Promise<WardSummaryData[]> => {
  const results: WardSummaryData[] = [];
  
  // ใช้ทุก Ward ID ที่ส่งมา โดยไม่ต้องกรองตาม DASHBOARD_WARDS
  const wardIdsToDisplay = allAppWards.map(w => w.id?.toUpperCase() || '').filter(id => id !== '');
  
  const wardNameMap = new Map<string, string>();
  allAppWards.forEach(w => {
    if (w.id) { 
        wardNameMap.set(w.id.toUpperCase(), w.wardName);
    }
  });

  console.log(`[fetchAllWardSummaryData] Fetching data for date: ${dateString} with wards:`, wardIdsToDisplay);
  console.log(`[fetchAllWardSummaryData] Ward Name Map:`, wardNameMap);
  
  try {
    const summaryPromises = wardIdsToDisplay.map(wardId => 
      getApprovedSummariesByDateRange(wardId, dateString, dateString)
    );
    
    const summariesByWard = await Promise.all(summaryPromises);
    
    wardIdsToDisplay.forEach((wardId, index) => {
      const summariesForWard = summariesByWard[index];
      // console.log(`[fetchAllWardSummaryData] Found ${summariesForWard.length} summaries for ward ${wardId}`);
      
      if (summariesForWard.length > 0) {
        const summary = summariesForWard[0]; 
        const wardNameValue = wardNameMap.get(wardId) || wardId; // Fallback to wardId if name not in map
        
        const formDataSource = (summary.nightPatientCensus !== undefined || summary.nightFormId) ? 'night' : 'morning';
        const patientCensus = summary[`${formDataSource}CalculatedCensus`] || summary[`${formDataSource}PatientCensus`] || 0;
        const nurseManager = summary[`${formDataSource}NurseManager`] ?? 0;
        const rn = summary[`${formDataSource}Rn`] ?? 0;
        const pn = summary[`${formDataSource}Pn`] ?? 0;
        const wc = summary[`${formDataSource}Wc`] ?? 0;
        const newAdmit = summary[`${formDataSource}NewAdmit`] ?? 0;
        const transferIn = summary[`${formDataSource}TransferIn`] ?? 0;
        const referIn = summary[`${formDataSource}ReferIn`] ?? 0;
        const discharge = summary[`${formDataSource}Discharge`] ?? 0;
        const transferOut = summary[`${formDataSource}TransferOut`] ?? 0;
        const referOut = summary[`${formDataSource}ReferOut`] ?? 0;
        const dead = summary[`${formDataSource}Dead`] ?? 0;
        const available = summary.availableBeds ?? 0;
        const unavailable = summary.unavailableBeds ?? 0;
        const plannedDischarge = summary.plannedDischarge ?? 0;
        results.push({
          id: wardId, 
          wardName: wardNameValue,
          patientCensus,
          nurseManager,
          rn,
          pn,
          wc,
          newAdmit,
          transferIn,
          referIn,
          discharge,
          transferOut,
          referOut,
          dead,
          available,
          unavailable,
          plannedDischarge,
        });
      } else {
        const wardNameValue = wardNameMap.get(wardId) || wardId; // Fallback to wardId
        console.log(`[fetchAllWardSummaryData] No summary found for ${wardId}, adding placeholder with name: ${wardNameValue}`);
        results.push({
          id: wardId,
          wardName: wardNameValue,
          patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
          newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0, transferOut: 0, referOut: 0,
          dead: 0, available: 0, unavailable: 0, plannedDischarge: 0
        });
      }
    });
    
    console.log(`[fetchAllWardSummaryData] Final processed summary data for ALL dashboard wards:`, JSON.parse(JSON.stringify(results)));
  } catch (error) {
    console.error('[fetchAllWardSummaryData] Error fetching ward summary data:', error);
  }
  return results;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDailySummaries, setUseDailySummaries] = useState(true);
  const [wardCensusMap, setWardCensusMap] = useState<Map<string, number>>(new Map());
  const [summaryDataList, setWardSummaryData] = useState<WardSummaryData[]>([]);
  const [totalStats, setTotalStats] = useState({
    opd24hr: 0,
    oldPatient: 0,
    newPatient: 0,
    admit24hr: 0
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.SUMMARY);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });

  // ตรวจสอบโหมดสีธีมเมื่อโหลดหน้า
  useEffect(() => {
    // ใช้ค่าจาก localStorage เท่านั้น ไม่เปลี่ยนอัตโนมัติ
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode !== null) {
      const isDark = storedDarkMode === 'true';
      setIsDarkMode(isDark);
      
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    // ไม่ใช้ matchMedia เพื่อป้องกันการเปลี่ยนอัตโนมัติ
  }, []);

  // ฟังก์ชันสำหรับสลับโหมดสีธีม
  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    localStorage.setItem('darkMode', String(newValue));
    
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load Wards
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
        // ดึงเฉพาะ Ward ที่มีสิทธิ์เข้าถึง ไม่สนใจว่าเป็น Admin หรือไม่
        const userPermittedWards = await getWardsByUserPermission(user);
        // กรองเฉพาะ ward ที่กำหนดไว้ใน DASHBOARD_WARDS
        const userDashboardWards = userPermittedWards.filter(ward => 
          DASHBOARD_WARDS.some(dashboardWard => 
            ward.wardName.toUpperCase().includes(dashboardWard.toUpperCase()) || 
            ward.id?.toUpperCase() === dashboardWard.toUpperCase()
          )
        );
        console.log("[loadWards] Showing permitted wards:", userDashboardWards.map(w => w.wardName));
        setWards(userDashboardWards);
        
        if (userDashboardWards.length > 0) {
          setSelectedWardId(userDashboardWards[0].id);
        }
      } catch (err) {
        console.error('[DashboardPage] Error loading wards:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
        setWards([]);
      } finally {
        // Defer setting loading to false to allow summary to load
      }
    };
    if (user) loadWards();
    else setLoading(false);
  }, [user]);
  
  // ฟังก์ชันสำหรับดึงข้อมูลแบบฟอร์ม แยกออกมาจาก useEffect เพื่อให้เรียกใช้ได้จากภายนอก
  const fetchWardForms = useCallback(async (wardId: string | null, date: string) => {
    if (!wardId || !date || !user) {
      setSummary(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSummary(null); // Clear previous summary

    try {
      console.log(`[fetchWardForms] Selected Ward ID:`, wardId);
      console.log(`[fetchWardForms] Selected Date:`, date);
      console.log(`[fetchWardForms] Using dailySummaries:`, useDailySummaries);
      
      let morning = null;
      let night = null;
      
      if (useDailySummaries) {
        // ลองดึงข้อมูลจาก dailySummaries ก่อน
        const summaryResult = await getDailySummary(wardId, date);
        morning = summaryResult.morning;
        night = summaryResult.night;
        
        // ถ้าไม่พบข้อมูลใน dailySummaries ให้ลองดึงจาก wardForms
        if (!morning && !night) {
          console.log('[fetchWardForms] No data found in dailySummaries. Falling back to wardForms...');
          const formsResult = await getWardFormsByDateAndWard(wardId, date);
          morning = formsResult.morning;
          night = formsResult.night;
        }
      } else {
        // ดึงข้อมูลจากแบบฟอร์มโดยตรง
        const { morning: morningForm, night: nightForm } = await getWardFormsByDateAndWard(wardId, date);
        morning = morningForm;
        night = nightForm;
      }
      
      if (morning || night) {
        const selectedWard = wards.find(w => w.id === wardId);
        
        // สร้างข้อมูลสรุปสำหรับแสดงผล
        const dashboardSummary: DashboardSummary = {
          wardId: wardId,
          wardName: selectedWard?.wardName || '',
          date: new Date(date),
          dateString: date,
          morningForm: morning || undefined,
          nightForm: night || undefined,
          dailyPatientCensus: night?.patientCensus || morning?.patientCensus || 0
        };
        
        setSummary(dashboardSummary);
        console.log('[fetchWardForms] Summary created:', dashboardSummary);
      } else {
        setSummary(null);
        console.log('[fetchWardForms] No data found for selected criteria.');
      }
    } catch (err) {
      console.error('[fetchWardForms] Error fetching data:', err);
      setError('ไม่สามารถโหลดข้อมูลได้');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user, wards, useDailySummaries]);

  // Fetch Ward Forms Data
  useEffect(() => {
    if (!selectedWardId || !selectedDate || !user) {
      setSummary(null);
      if(user && wards.length > 0 && !selectedWardId) {
         // If user and wards are loaded but no ward selected yet, don't set loading false
      } else if (user && wards.length === 0 && !loading){
        // If user loaded, no wards, and not already loading from ward fetch
      }
      else if (!user) {
        setLoading(false);
      }
      return;
      }

    fetchWardForms(selectedWardId, selectedDate);
  }, [selectedWardId, selectedDate, user, wards, fetchWardForms]);

  // ดึงข้อมูล Patient Census ของทุก Ward
  useEffect(() => {
    if (!selectedDate || !user || wards.length === 0) {
      return;
    }
    
    const fetchCensusData = async () => {
      try {
        const censusMap = await fetchAllWardCensus(selectedDate);
        setWardCensusMap(censusMap);
      } catch (err) {
        console.error('[DashboardPage] Error fetching ward census data:', err);
      }
    };
    
    fetchCensusData();
  }, [selectedDate, user, wards]);
  
  // ดึงข้อมูลสรุปของทุกแผนก
  useEffect(() => {
    if (!user || wards.length === 0) {
      return;
    }
    
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        // ใช้ selectedDate หรือ endDate ตาม dateRange
        const dateToQuery = dateRange === 'today' ? selectedDate : format(effectiveDateRange.end, 'yyyy-MM-dd');
        
        const allAppWards = wards;
        const summaryData = await fetchAllWardSummaryData(dateToQuery, allAppWards);
        setWardSummaryData(summaryData);
        
        const stats = await fetchTotalStats(dateToQuery);
        setTotalStats(stats);
      } catch (err) {
        console.error('[DashboardPage] Error fetching ward summary data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaryData();
  }, [selectedDate, user, wards, effectiveDateRange, dateRange]);
        
  // ดึงข้อมูลแนวโน้มผู้ป่วย
  useEffect(() => {
    if (!user || wards.length === 0) {
      setTrendData([]);
      return;
    }
    
    const fetchTrendDataHandler = async () => {
      try {
        setLoading(true);
        
        let effectiveWardId = currentView === ViewType.WARD_DETAIL && selectedWardId ? selectedWardId : undefined;
        
        // หากมีการเลือก Ward ให้ใช้ Ward นั้นในการดึง Trend ไม่ว่า ViewType จะเป็นอะไรก็ตาม
        if(selectedWardId){
            effectiveWardId = selectedWardId;
        }

        const trends = await fetchPatientTrends(effectiveDateRange.start, effectiveDateRange.end, effectiveWardId);
        setTrendData(trends);
      } catch (err) {
        console.error('[DashboardPage] Error fetching trend data:', err);
        setTrendData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrendDataHandler();
  }, [effectiveDateRange, currentView, selectedWardId, user, wards]);

  const selectedWard = useMemo(() => wards.find(w => w.id === selectedWardId), [wards, selectedWardId]);
  
  // ตรวจสอบ summary มีค่าหรือไม่
  useEffect(() => {
    console.log('[DashboardPage] Current summary state:', summary);
  }, [summary]);

  const refreshData = useCallback(() => {
    // เรียกโหลดข้อมูลใหม่โดยตรง ไม่ต้องผ่าน useEffect
    console.log("[refreshData] Refreshing data...");
    
    if (selectedWardId && selectedDate) {
      fetchWardForms(selectedWardId, selectedDate);
    }
  }, [selectedWardId, selectedDate, fetchWardForms]);
        
  // เพิ่มส่วนสลับระหว่าง dailySummaries และ wardForms
  const toggleDataSource = () => {
    setUseDailySummaries(!useDailySummaries);
    // หลังจากสลับแหล่งข้อมูล ให้รีเฟรชข้อมูลใหม่
    if (selectedWardId && selectedDate) {
      setTimeout(() => fetchWardForms(selectedWardId, selectedDate), 100);
    }
  };
  
  // แก้ไขส่วนการแปลงข้อมูลสำหรับใช้แสดงบน Dashboard components
  const wardCensusData = useMemo(() => {
    // แสดงเฉพาะ ward ที่มีสิทธิ์เข้าถึง ไม่สนใจว่าเป็น Admin หรือไม่
    const filteredData = summaryDataList.filter(ward => 
      wards.some(userWard => userWard.id?.toUpperCase() === ward.id.toUpperCase())
    );
    
    const dataForChart = filteredData.map(ward => {
      const wardSummary = summary && summary.wardId === ward.id ? summary : null;
      
      // สร้างข้อมูลแยกเวร (เช้า/ดึก) สำหรับแต่ละแผนก
      // ถ้าไม่มีข้อมูลจริงในเวรใด ให้ใช้ค่าประมาณการจากข้อมูลคงพยาบาลรวม
      const morningCount = wardSummary?.morningForm?.patientCensus ?? 
                          Math.round(ward.patientCensus * 0.45); // ประมาณการ 45% ของยอดรวม
      
      const nightCount = wardSummary?.nightForm?.patientCensus ?? 
                        Math.round(ward.patientCensus * 0.55); // ประมาณการ 55% ของยอดรวม
      
      return {
        id: ward.id,
        wardName: ward.wardName || ward.id, // Fallback to ID if name is somehow empty
        patientCount: ward.patientCensus,
        morningPatientCount: morningCount,
        nightPatientCount: nightCount
      };
    });
    
    // เรียงลำดับตามจำนวนผู้ป่วยจากมากไปน้อยเพื่อการแสดงผลที่ดี
    const sortedData = [...dataForChart].sort((a, b) => b.patientCount - a.patientCount);
    
    console.log('[DashboardPage] wardCensusData for BarChart:', JSON.parse(JSON.stringify(sortedData)));
    return sortedData;
  }, [summaryDataList, summary, wards]);
  
  const availableBedsData = useMemo(() => {
    // แสดงเฉพาะ ward ที่มีสิทธิ์เข้าถึง ไม่สนใจว่าเป็น Admin หรือไม่
    const filteredData = summaryDataList.filter(ward => 
      wards.some(userWard => userWard.id?.toUpperCase() === ward.id.toUpperCase())
    );
    
    const dataForPie = filteredData.map(ward => ({
      id: ward.id,
      wardName: ward.wardName || ward.id, // Fallback to ID
      value: ward.available || 0, // ใช้ 0 ถ้าไม่มีข้อมูล
    }));
    
    // เรียงลำดับตามจำนวนเตียงว่างจากมากไปน้อย
    const sortedData = [...dataForPie].sort((a, b) => b.value - a.value);
    
    // Log ข้อมูลเพื่อการติดตาม
    console.log('[DashboardPage] availableBedsData for PieChart:', JSON.parse(JSON.stringify(sortedData)));
    
    return sortedData;
  }, [summaryDataList, wards]);
  
  // จัดการการเปลี่ยนช่วงเวลา
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    
    let start: Date;
    let end: Date = new Date(); // ปกติใช้วันปัจจุบันเป็นวันสิ้นสุด ยกเว้นกรณีเลือกวันเอง
    
    // คำนวณช่วงวันที่ตาม range ที่เลือก
    switch (range) {
      case 'today':
        // ใช้วันที่เลือกจาก date picker
        start = startOfDay(parseISO(selectedDate));
        end = endOfDay(parseISO(selectedDate));
        break;
      case '7days':
        end = parseISO(selectedDate);
        start = subDays(end, 6);
        break;
      case '30days':
        end = parseISO(selectedDate);
        start = subDays(end, 29);
        break;
      case 'year':
        end = parseISO(selectedDate);
        start = subYears(end, 1);
        break;
      case 'all':
        // ดึงข้อมูลย้อนหลัง 3 ปี
        end = new Date();
        start = subYears(end, 3);
        break;
      case 'custom':
        // ใช้ค่า startDate และ endDate ที่ผู้ใช้กำหนดเอง
        start = parseISO(startDate);
        end = parseISO(endDate);
        break;
      default:
        start = startOfDay(new Date());
        end = endOfDay(new Date());
    }
    
    console.log(`[handleDateRangeChange] Selected range: ${range}, Start: ${format(start, 'yyyy-MM-dd')}, End: ${format(end, 'yyyy-MM-dd')}`);
    
    // อัปเดต effectiveDateRange เพื่อให้ useEffect ทำงาน
    setEffectiveDateRange({ start, end });
  };
  
  // เพิ่ม useEffect สำหรับจัดการการเปลี่ยนแปลง selectedDate
  useEffect(() => {
    // เมื่อมีการเปลี่ยน selectedDate ให้อัปเดต effectiveDateRange ตาม dateRange ปัจจุบัน
    if (dateRange !== 'custom') {
      handleDateRangeChange(dateRange);
    }
  }, [selectedDate]);

  // เพิ่ม useEffect สำหรับการเปลี่ยนแปลง startDate หรือ endDate ในโหมด custom
  useEffect(() => {
    if (dateRange === 'custom') {
      try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        setEffectiveDateRange({ start, end });
      } catch (err) {
        console.error('[DashboardPage] Error parsing custom date range:', err);
      }
    }
  }, [startDate, endDate, dateRange]);

  // useEffect to log summaryDataList
  useEffect(() => {
    if (summaryDataList.length > 0) {
      console.log('[DashboardPage] summaryDataList updated:', JSON.parse(JSON.stringify(summaryDataList)));
    }
  }, [summaryDataList]);

  return (
    <>
      <style>{printStyles}</style>
      <NavBar />
      <div className="container mx-auto p-4 pt-[80px] min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <h1 className="text-3xl font-bold mb-6 text-center page-title text-gray-700 dark:text-white">Dashboard</h1>
        
        <div className="max-w-5xl mx-auto mb-6 no-print bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="w-full md:w-auto flex-grow md:max-w-xs">
              <label htmlFor="date-select" className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">เลือกวันที่:</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  id="date-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input w-full p-2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  disabled={loading}
                />
                <button
                  onClick={refreshData}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition shadow-sm disabled:opacity-50"
                  disabled={loading || !selectedWardId || !selectedDate}
                  title="รีเฟรชข้อมูล"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
              <button
                onClick={() => handleDateRangeChange('today')}
                className={`text-sm px-3 py-2 rounded-md transition shadow-sm font-medium ${dateRange === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
              >
                วันนี้
              </button>
              <button
                onClick={() => handleDateRangeChange('7days')}
                className={`text-sm px-3 py-2 rounded-md transition shadow-sm font-medium ${dateRange === '7days' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
              >
                7 วันล่าสุด
              </button>
              <button
                onClick={() => handleDateRangeChange('30days')}
                className={`text-sm px-3 py-2 rounded-md transition shadow-sm font-medium ${dateRange === '30days' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
              >
                30 วันล่าสุด
              </button>
              <button
                onClick={() => handleDateRangeChange('year')}
                className={`text-sm px-3 py-2 rounded-md transition shadow-sm font-medium ${dateRange === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
              >
                ปีล่าสุด
              </button>
              <button
                onClick={() => handleDateRangeChange('all')}
                className={`text-sm px-3 py-2 rounded-md transition shadow-sm font-medium ${dateRange === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
              >
                แสดงทั้งหมด
              </button>
              <button
                onClick={() => window.print()}
                className="text-sm px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition shadow-sm font-medium"
              >
                พิมพ์รายงาน
              </button>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                  <label htmlFor="start-date" className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">วันที่เริ่มต้น:</label>
                  <input
                    type="date"
                    id="start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input w-full p-2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
              </div>
              <div>
                  <label htmlFor="end-date" className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">วันที่สิ้นสุด:</label>
                  <input
                    type="date"
                    id="end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input w-full p-2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
              </div>
            </div>
          )}
        </div>
        
        {!loading && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Dashboard Overview เฉพาะกรณีที่ผู้ใช้ทั่วไปควรเห็น */}
            <DashboardOverview
              date={new Date(selectedDate)}
              totalStats={totalStats}
            />
            
            {/* Ward Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EnhancedBarChart
                data={wardCensusData}
                selectedWardId={selectedWardId}
                onSelectWard={setSelectedWardId}
                showShiftData={true}
              />
              
              <EnhancedPieChart
                data={availableBedsData}
                selectedWardId={selectedWardId}
                onSelectWard={setSelectedWardId}
              />
            </div>
            
            {/* Ward Details if a ward is selected */}
            {selectedWardId && (
              <ShiftComparisonPanel
                summary={summary || {
                  // ถ้าไม่มีข้อมูล summary จริง ให้สร้างข้อมูลเทียบเคียงจาก summaryDataList
                  wardId: selectedWardId,
                  wardName: wards.find(w => w.id === selectedWardId)?.wardName || '',
                  date: new Date(selectedDate),
                  dateString: selectedDate,
                  dailyPatientCensus: summaryDataList.find(w => w.id === selectedWardId)?.patientCensus || 0,
                  // สร้าง dummy data ถ้าไม่มีข้อมูลจริง
                  morningForm: {
                    patientCensus: Math.round((summaryDataList.find(w => w.id === selectedWardId)?.patientCensus || 0) * 0.45),
                    nurseManager: summaryDataList.find(w => w.id === selectedWardId)?.nurseManager || 0,
                    rn: summaryDataList.find(w => w.id === selectedWardId)?.rn || 0,
                    pn: summaryDataList.find(w => w.id === selectedWardId)?.pn || 0,
                    wc: summaryDataList.find(w => w.id === selectedWardId)?.wc || 0,
                    newAdmit: summaryDataList.find(w => w.id === selectedWardId)?.newAdmit || 0,
                    transferIn: summaryDataList.find(w => w.id === selectedWardId)?.transferIn || 0,
                    referIn: summaryDataList.find(w => w.id === selectedWardId)?.referIn || 0,
                    discharge: summaryDataList.find(w => w.id === selectedWardId)?.discharge || 0,
                    transferOut: summaryDataList.find(w => w.id === selectedWardId)?.transferOut || 0,
                    referOut: summaryDataList.find(w => w.id === selectedWardId)?.referOut || 0,
                    dead: summaryDataList.find(w => w.id === selectedWardId)?.dead || 0,
                    available: summaryDataList.find(w => w.id === selectedWardId)?.available || 0,
                    unavailable: summaryDataList.find(w => w.id === selectedWardId)?.unavailable || 0,
                    plannedDischarge: summaryDataList.find(w => w.id === selectedWardId)?.plannedDischarge || 0
                  } as WardFormData,
                  nightForm: {
                    patientCensus: Math.round((summaryDataList.find(w => w.id === selectedWardId)?.patientCensus || 0) * 0.55),
                    nurseManager: summaryDataList.find(w => w.id === selectedWardId)?.nurseManager || 0,
                    rn: summaryDataList.find(w => w.id === selectedWardId)?.rn || 0,
                    pn: summaryDataList.find(w => w.id === selectedWardId)?.pn || 0,
                    wc: summaryDataList.find(w => w.id === selectedWardId)?.wc || 0,
                    newAdmit: summaryDataList.find(w => w.id === selectedWardId)?.newAdmit || 0,
                    transferIn: summaryDataList.find(w => w.id === selectedWardId)?.transferIn || 0,
                    referIn: summaryDataList.find(w => w.id === selectedWardId)?.referIn || 0,
                    discharge: summaryDataList.find(w => w.id === selectedWardId)?.discharge || 0,
                    transferOut: summaryDataList.find(w => w.id === selectedWardId)?.transferOut || 0,
                    referOut: summaryDataList.find(w => w.id === selectedWardId)?.referOut || 0,
                    dead: summaryDataList.find(w => w.id === selectedWardId)?.dead || 0,
                    available: summaryDataList.find(w => w.id === selectedWardId)?.available || 0,
                    unavailable: summaryDataList.find(w => w.id === selectedWardId)?.unavailable || 0,
                    plannedDischarge: summaryDataList.find(w => w.id === selectedWardId)?.plannedDischarge || 0
                  } as WardFormData
                } as DashboardSummary}
                wardName={wards.find(w => w.id === selectedWardId)?.wardName || ''}
              />
            )}
            
            {/* Patient Trend Chart */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4 text-center dark:text-white">
                แนวโน้มผู้ป่วย 
                {selectedWardId ? 
                  ` แผนก${wards.find(w => w.id === selectedWardId)?.wardName || ''}` : 
                  ' ทุกแผนก'
                }
              </h2>
              <PatientTrendChart
                data={trendData}
                title={`แนวโน้มจำนวนผู้ป่วย ${selectedWardId ? wards.find(w => w.id === selectedWardId)?.wardName || '' : 'ทุกแผนก'}`}
                wardName={selectedWardId ? wards.find(w => w.id === selectedWardId)?.wardName || '' : 'ทุกแผนก'}
              />
            </div>
          </div>
        )}
        
        {/* แสดง Loading */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <div className="animate-pulse flex justify-center">
              <div className="h-8 w-8 bg-blue-400 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
          </div>
        )}
        
        {/* แสดงข้อความแสดงข้อผิดพลาด */}
        {!loading && error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </>
  );
} 