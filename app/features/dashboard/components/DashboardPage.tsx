'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, addDays, subWeeks, subMonths } from 'date-fns';
import { Timestamp, getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission, getAllWards } from '@/app/features/ward-form/services/wardService';
import { Ward, WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { UserRole } from '@/app/core/types/user';
import { COLLECTION_SUMMARIES, COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';
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
  { label: 'กำหนดเอง', value: 'custom' }
];

// ประเภทของการดูข้อมูล
enum ViewType {
  SUMMARY = 'summary',
  WARD_DETAIL = 'ward_detail',
  TREND = 'trend',
  ALL_WARDS = 'all_wards'
}

// ดึงข้อมูลจาก dailySummaries collection
const getDailySummary = async (wardId: string, dateString: string) => {
  console.log(`[getDailySummary] Fetching summary for wardId=${wardId}, date=${dateString}`);
  
  try {
    // แปลง wardId เป็นตัวพิมพ์ใหญ่เพื่อให้ตรงกับข้อมูลในฐานข้อมูล
    const formattedWardId = wardId.toUpperCase();
    
    // ดึงข้อมูลจาก dailySummaries collection
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    
    console.log(`[getDailySummary] Query params: formattedWardId=${formattedWardId}, dateString=${dateString}`);
    
    const summaryQuery = query(
      summariesRef,
      where('wardId', '==', formattedWardId),
      where('dateString', '==', dateString)
    );
    
    const querySnapshot = await getDocs(summaryQuery);
    console.log(`[getDailySummary] Found ${querySnapshot.size} summaries`);
    
    if (querySnapshot.size > 0) {
      const summaryDoc = querySnapshot.docs[0];
      const data = summaryDoc.data();
      
      console.log(`[getDailySummary] Summary data:`, data);
      
      // สร้างข้อมูลแบบฟอร์มจาก dailySummary
      const morningForm: WardFormData | null = data.morningFormId ? {
        id: data.morningFormId,
        patientCensus: data.morningPatientCensus || 0,
        calculatedCensus: data.morningCalculatedCensus,
        nurseManager: data.morningNurseManager || 0,
        rn: data.morningRn || 0,
        pn: data.morningPn || 0,
        wc: data.morningWc || 0,
        newAdmit: data.morningNewAdmit || 0,
        transferIn: data.morningTransferIn || 0,
        referIn: data.morningReferIn || 0,
        discharge: data.morningDischarge || 0,
        transferOut: data.morningTransferOut || 0,
        referOut: data.morningReferOut || 0,
        dead: data.morningDead || 0,
        available: data.availableBeds || 0,
        unavailable: data.unavailableBeds || 0,
        plannedDischarge: data.plannedDischarge || 0,
        admitTotal: data.morningAdmitTotal || 0,
        dischargeTotal: data.morningDischargeTotal || 0
      } : null;
      
      const nightForm: WardFormData | null = data.nightFormId ? {
        id: data.nightFormId,
        patientCensus: data.nightPatientCensus || 0,
        calculatedCensus: data.nightCalculatedCensus,
        nurseManager: data.nightNurseManager || 0,
        rn: data.nightRn || 0,
        pn: data.nightPn || 0,
        wc: data.nightWc || 0,
        newAdmit: data.nightNewAdmit || 0,
        transferIn: data.nightTransferIn || 0,
        referIn: data.nightReferIn || 0,
        discharge: data.nightDischarge || 0,
        transferOut: data.nightTransferOut || 0,
        referOut: data.nightReferOut || 0,
        dead: data.nightDead || 0,
        available: data.availableBeds || 0,
        unavailable: data.unavailableBeds || 0,
        plannedDischarge: data.plannedDischarge || 0,
        admitTotal: data.nightAdmitTotal || 0,
        dischargeTotal: data.nightDischargeTotal || 0
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
    
    // ดึงข้อมูลจาก dailySummaries collection
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    
    let trendQuery;
    
    if (wardId) {
      const formattedWardId = wardId.toUpperCase();
      trendQuery = query(
        summariesRef,
        where('wardId', '==', formattedWardId),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString),
        orderBy('dateString', 'asc')
      );
    } else {
      trendQuery = query(
        summariesRef,
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString),
        orderBy('dateString', 'asc')
      );
    }
    
    const querySnapshot = await getDocs(trendQuery);
    console.log(`[fetchPatientTrends] Found ${querySnapshot.size} data points`);
    
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
        dischargeCount: 0 // Use dischargeCount from TrendData
      });
      currentDate = addDays(currentDate, 1);
    }
    
    // รวมข้อมูลจากทุก ward ตามวันที่
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const dateString = data.dateString;
      const formattedDate = format(parseISO(dateString), 'dd/MM');
      
      const existingData = dateToDataMap.get(dateString) || {
        date: formattedDate,
        patientCount: 0,
        admitCount: 0,
        dischargeCount: 0 // Align with TrendData
      };
      
      // ใช้ข้อมูล night form ถ้ามี มิฉะนั้นใช้ morning form
      const patientCensus = data.nightPatientCensus || data.morningPatientCensus || 0;
      const admitTotal = (data.nightAdmitTotal || 0) + (data.morningAdmitTotal || 0);
      // Calculate discharge amount from summary data's dischargeTotal fields
      const dischargeAmount = (data.nightDischargeTotal || 0) + (data.morningDischargeTotal || 0);
      
      dateToDataMap.set(dateString, {
        date: formattedDate,
        patientCount: existingData.patientCount + patientCensus,
        admitCount: existingData.admitCount + admitTotal,
        dischargeCount: existingData.dischargeCount + dischargeAmount // Use dischargeCount
      });
    });
    
    // แปลง Map เป็น Array สำหรับใช้กับกราฟ
    const result = Array.from(dateToDataMap.values());
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
  const dashboardWardIdsUpper = DASHBOARD_WARDS.map(name => name.toUpperCase());

  const wardNameMap = new Map<string, string>();
  allAppWards.forEach(w => {
    if (w.id) { // Ensure ward id exists
        wardNameMap.set(w.id.toUpperCase(), w.wardName);
    }
  });

  try {
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    // Query for summaries of DASHBOARD_WARDS for the specific dateString
    const q = query(summariesRef,
                    where('dateString', '==', dateString),
                    where('wardId', 'in', dashboardWardIdsUpper.length > 0 ? dashboardWardIdsUpper : ['dummy_non_existent_id'])); // Firestore 'in' query requires a non-empty array

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(doc => {
      const summary = doc.data();
      const wardIdUpper = summary.wardId?.toUpperCase();

      if (wardIdUpper) {
        const wardName = wardNameMap.get(wardIdUpper) || wardIdUpper;

        // Prefer night data, fallback to morning data from the summary document
        const formDataSource = (summary.nightPatientCensus !== undefined || summary.nightFormId) ? 'night' : 'morning';
        
        const patientCensus = summary[`${formDataSource}PatientCensus`] ?? 0;
        const nurseManager = summary[`${formDataSource}NurseManager`] ?? 0;
        const rn = summary[`${formDataSource}Rn`] ?? 0;
        const pn = summary[`${formDataSource}Pn`] ?? 0;
        const wc = summary[`${formDataSource}Wc`] ?? 0;
        const newAdmit = summary[`${formDataSource}NewAdmit`] ?? 0;
        const transferIn = summary[`${formDataSource}TransferIn`] ?? 0;
        const referIn = summary[`${formDataSource}ReferIn`] ?? 0;
        const discharge = summary[`${formDataSource}Discharge`] ?? 0; // Individual discharge type
        const transferOut = summary[`${formDataSource}TransferOut`] ?? 0;
        const referOut = summary[`${formDataSource}ReferOut`] ?? 0;
        const dead = summary[`${formDataSource}Dead`] ?? 0;
        
        // availableBeds, unavailableBeds, plannedDischarge are usually daily totals on summary
        const available = summary.availableBeds ?? 0;
        const unavailable = summary.unavailableBeds ?? 0;
        // Use overall plannedDischarge if available, else from selected shift
        const plannedDischarge = summary.plannedDischarge ?? (summary[`${formDataSource}PlannedDischarge`] ?? 0);

        results.push({
          id: wardIdUpper, // Use the uppercase version consistent with map keys
          wardName: wardName,
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
      }
    });

    // Ensure all DASHBOARD_WARDS are present in results, adding empty ones if not found
    for (const dwIdUpper of dashboardWardIdsUpper) {
      if (!results.some(r => r.id.toUpperCase() === dwIdUpper)) {
        const wardName = wardNameMap.get(dwIdUpper) || dwIdUpper;
        results.push({
          id: dwIdUpper, wardName: wardName, patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
          newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0, transferOut: 0, referOut: 0,
          dead: 0, available: 0, unavailable: 0, plannedDischarge: 0
        });
      }
    }
    console.log(`[fetchAllWardSummaryData] Fetched summary data for ${dateString}:`, results);
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
        const hasAdminAccess = user.role === UserRole.ADMIN || 
                               user.role === UserRole.SUPER_ADMIN || 
                             user.role === UserRole.DEVELOPER;
        let userWards = hasAdminAccess ? await getAllWards() : await getWardsByUserPermission(user);
        
        // กรองเฉพาะ ward ที่กำหนดไว้ใน DASHBOARD_WARDS
        userWards = userWards.filter(ward => 
          DASHBOARD_WARDS.some(dashboardWard => 
            ward.wardName.toUpperCase().includes(dashboardWard.toUpperCase())
          )
        );
        
        setWards(userWards);
        if (userWards.length > 0) {
          setSelectedWardId(userWards[0].id);
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
    if (!selectedDate || !user || wards.length === 0) {
      return;
    }
    
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        
        // ดึงข้อมูลสรุปรวมทั้งหมด
        const summaryData = await fetchAllWardSummaryData(selectedDate, wards);
        setWardSummaryData(summaryData);
        
        // ดึงข้อมูลสถิติรวม 24 ชั่วโมง
        const stats = await fetchTotalStats(selectedDate);
        setTotalStats(stats);
      } catch (err) {
        console.error('[DashboardPage] Error fetching ward summary data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaryData();
  }, [selectedDate, user, wards]);
  
  // ดึงข้อมูลแนวโน้มผู้ป่วย
  useEffect(() => {
    if (!user || wards.length === 0) {
      return;
    }
    
    const fetchTrendDataHandler = async () => {
      try {
        setLoading(true);
        
        let start: Date;
        let end = new Date(selectedDate);
        
        switch (dateRange) {
          case '7days':
            start = subDays(end, 6);
            break;
          case '30days':
            start = subDays(end, 29);
            break;
          case 'custom':
            start = new Date(startDate);
            end = new Date(endDate);
            break;
          default: // today
            start = new Date(selectedDate);
            break;
        }
        
        // ดึงข้อมูลแนวโน้มตามช่วงเวลาที่เลือก
        const trends = await fetchPatientTrends(start, end, 
          currentView === ViewType.WARD_DETAIL && selectedWardId ? selectedWardId : undefined);
        
        // ใช้ trends โดยตรง เนื่องจากมีทั้ง dischargeTotal และ dischargeCount แล้ว
        setTrendData(trends);
      } catch (err) {
        console.error('[DashboardPage] Error fetching trend data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrendDataHandler();
  }, [selectedDate, dateRange, startDate, endDate, currentView, selectedWardId, user, wards]);

  const selectedWard = useMemo(() => wards.find(w => w.id === selectedWardId), [wards, selectedWardId]);
  
  // แสดง console.log เพื่อดูว่า summary มีค่าหรือไม่
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
  
  // แปลงข้อมูลสำหรับใช้แสดงบน Dashboard components
  const wardCensusData = useMemo(() => {
    // แปลง summaryDataList เป็นรูปแบบที่ใช้กับ EnhancedBarChart และ EnhancedPieChart
    return summaryDataList.map(ward => ({
      id: ward.id,
      wardName: ward.wardName,
      patientCount: ward.patientCensus
    }));
  }, [summaryDataList]);
  
  // จัดการการเปลี่ยนช่วงเวลา
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();
    
    switch (range) {
      case '7days':
        setStartDate(format(subDays(today, 6), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '30days':
        setStartDate(format(subDays(today, 29), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'custom':
        // ไม่ต้องเปลี่ยน startDate และ endDate
        break;
      default: // today
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
    }
  };
  
  return (
    <>
      <style>{printStyles}</style>
      <NavBar />
      <div className="container mx-auto p-4 pt-[80px] min-h-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
        <h1 className="text-2xl font-bold mb-6 text-center page-title">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print">
          <div>
            <label htmlFor="date-select" className="block text-sm font-medium mb-1">เลือกวันที่:</label>
            <div className="flex gap-2">
              <input
                type="date"
                id="date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input w-full"
                disabled={loading}
              />
              <button
                onClick={refreshData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                disabled={loading || !selectedWardId || !selectedDate}
                title="รีเฟรชข้อมูล"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentView(ViewType.SUMMARY)}
                className={`text-sm px-3 py-1 rounded-md transition ${
                  currentView === ViewType.SUMMARY 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                สรุปรวม
              </button>
              <button
                onClick={() => setCurrentView(ViewType.WARD_DETAIL)}
                className={`text-sm px-3 py-1 rounded-md transition ${
                  currentView === ViewType.WARD_DETAIL 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                รายละเอียดแผนก
              </button>
              <button
                onClick={() => setCurrentView(ViewType.TREND)}
                className={`text-sm px-3 py-1 rounded-md transition ${
                  currentView === ViewType.TREND 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                แนวโน้ม
              </button>
              <button
                onClick={() => setCurrentView(ViewType.ALL_WARDS)}
                className={`text-sm px-3 py-1 rounded-md transition ${
                  currentView === ViewType.ALL_WARDS 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                ตารางรวม
              </button>
            </div>
            
            <button
              onClick={() => window.print()}
              className="text-sm px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
            >
              พิมพ์รายงาน
            </button>
          </div>
        </div>
        
        {/* หน้าสรุปรวม */}
        {currentView === ViewType.SUMMARY && !loading && (
          <div className="space-y-6">
            <DashboardOverview
              date={new Date(selectedDate)}
              totalStats={totalStats}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EnhancedBarChart
                data={wardCensusData}
                selectedWardId={selectedWardId}
                onSelectWard={setSelectedWardId}
              />
              
              <EnhancedPieChart
                data={wardCensusData}
                selectedWardId={selectedWardId}
                onSelectWard={setSelectedWardId}
              />
            </div>
            
            <PatientTrendChart
              data={trendData}
              title="แนวโน้มจำนวนผู้ป่วย"
            />
          </div>
        )}
        
        {/* หน้ารายละเอียดแผนก */}
        {currentView === ViewType.WARD_DETAIL && selectedWardId && !loading && (
          <div className="space-y-6">
            <WardSummaryDashboard
              date={selectedDate}
              wards={wardCensusData}
              selectedWardId={selectedWardId}
              onSelectWard={setSelectedWardId}
              summary={summary}
              loading={loading}
            />
            
            <ShiftComparisonPanel
              summary={summary}
              wardName={selectedWard?.wardName || ''}
            />
          </div>
        )}
        
        {/* หน้าแนวโน้ม */}
        {currentView === ViewType.TREND && !loading && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4 text-center">แนวโน้มผู้ป่วย {selectedWard ? `- ${selectedWard.wardName}` : 'ทั้งหมด'}</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                {DATE_RANGE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleDateRangeChange(option.value)}
                    className={`text-sm px-3 py-2 rounded-md transition ${
                      dateRange === option.value 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {dateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="start-date" className="block text-sm font-medium mb-1">วันที่เริ่มต้น:</label>
                    <input
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-sm font-medium mb-1">วันที่สิ้นสุด:</label>
                    <input
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="form-input w-full"
                    />
                  </div>
                </div>
              )}
              
              <PatientTrendChart
                data={trendData}
                title={`แนวโน้มจำนวนผู้ป่วย ${selectedWard ? selectedWard.wardName : 'ทุกแผนก'}`}
              />
            </div>
          </div>
        )}
        
        {/* หน้าตารางรวม */}
        {currentView === ViewType.ALL_WARDS && !loading && (
          <div className="space-y-6">
            <WardSummaryTable
              data={summaryDataList}
              selectedWardId={selectedWardId}
              onSelectWard={setSelectedWardId}
              title="ข้อมูลรวมทุกแผนก"
            />
          </div>
        )}
        
        {/* แสดง Loading */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <div className="animate-pulse flex justify-center">
              <div className="h-8 w-8 bg-blue-400 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
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