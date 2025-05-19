'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, addDays, subWeeks, subMonths, subYears, addMonths } from 'date-fns';
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
import { useTheme } from 'next-themes';
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
import CalendarWithEvents from './CalendarWithEvents';
import BedSummaryPieChart, { BedSummaryData } from './BedSummaryPieChart';

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
  { label: 'เดือนล่าสุด', value: 'lastMonth' },
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

// Function to fetch all ward summary data for a specific date range
const fetchAllWardSummaryData = async (startDateString: string, endDateString: string, allAppWards: Ward[]): Promise<WardSummaryData[]> => {
  const results: WardSummaryData[] = [];
  
  // ใช้ทุก Ward ID ที่ส่งมา โดยไม่ต้องกรองตาม DASHBOARD_WARDS
  const wardIdsToDisplay = allAppWards.map(w => w.id?.toUpperCase() || '').filter(id => id !== '');
  
  const wardNameMap = new Map<string, string>();
  allAppWards.forEach(w => {
    if (w.id) { 
        wardNameMap.set(w.id.toUpperCase(), w.wardName);
    }
  });

  const isDateRange = startDateString !== endDateString;
  console.log(`[fetchAllWardSummaryData] Fetching data for date range: ${startDateString} - ${endDateString} (isDateRange: ${isDateRange})`);
  console.log(`[fetchAllWardSummaryData] Ward Name Map:`, wardNameMap);
  
  try {
    // สร้าง Map ของ wardId -> สรุปข้อมูลรวม
    const wardSummaryMap = new Map<string, WardSummaryData>();
    
    // เริ่มต้นสร้างข้อมูลเปล่าสำหรับแต่ละ ward
    wardIdsToDisplay.forEach(wardId => {
      const wardNameValue = wardNameMap.get(wardId) || wardId;
      wardSummaryMap.set(wardId, {
        id: wardId,
        wardName: wardNameValue,
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
        available: 0,
        unavailable: 0,
        plannedDischarge: 0,
        // ข้อมูลสำหรับการหาค่าเฉลี่ย (ในกรณีที่มีหลายวัน)
        daysWithData: 0
      });
    });
    
    // ตรวจสอบว่าเป็นช่วงวันที่หรือวันเดียว
    if (isDateRange) {
      // ดึงข้อมูลสำหรับทุกวันในช่วงวันที่
      for (const wardId of wardIdsToDisplay) {
        const summariesForWard = await getApprovedSummariesByDateRange(wardId, startDateString, endDateString);
        console.log(`[fetchAllWardSummaryData] Found ${summariesForWard.length} summaries for ward ${wardId} in date range`);
      
        // นับจำนวนวันที่มีข้อมูล และรวมข้อมูลจากทุกวัน
      if (summariesForWard.length > 0) {
          const summaryData = wardSummaryMap.get(wardId)!;
          summaryData.daysWithData = summariesForWard.length;

          // รวมค่าจากทุกวัน
          summariesForWard.forEach(summary => {
            const formDataSource = (summary.nightPatientCensus !== undefined || summary.nightFormId) ? 'night' : 'morning';
            // บวกค่าลงในผลรวม
            summaryData.patientCensus += summary[`${formDataSource}CalculatedCensus`] || summary[`${formDataSource}PatientCensus`] || 0;
            summaryData.nurseManager += summary[`${formDataSource}NurseManager`] ?? 0;
            summaryData.rn += summary[`${formDataSource}Rn`] ?? 0;
            summaryData.pn += summary[`${formDataSource}Pn`] ?? 0;
            summaryData.wc += summary[`${formDataSource}Wc`] ?? 0;
            summaryData.newAdmit += summary[`${formDataSource}NewAdmit`] ?? 0;
            summaryData.transferIn += summary[`${formDataSource}TransferIn`] ?? 0;
            summaryData.referIn += summary[`${formDataSource}ReferIn`] ?? 0;
            summaryData.discharge += summary[`${formDataSource}Discharge`] ?? 0;
            summaryData.transferOut += summary[`${formDataSource}TransferOut`] ?? 0;
            summaryData.referOut += summary[`${formDataSource}ReferOut`] ?? 0;
            summaryData.dead += summary[`${formDataSource}Dead`] ?? 0;
            summaryData.available += summary.availableBeds ?? 0;
            summaryData.unavailable += summary.unavailableBeds ?? 0;
            summaryData.plannedDischarge += summary.plannedDischarge ?? 0;
          });

          // อัปเดต Map ด้วยข้อมูลที่รวมแล้ว
          wardSummaryMap.set(wardId, summaryData);
        }
      }
      
      // แปลง Map เป็น Array และคำนวณค่าเฉลี่ยถ้าต้องการ (อาจต้องหารด้วยจำนวนวันที่มีข้อมูล)
      const wardSummaryEntries = Array.from(wardSummaryMap.entries());
      for (const [wardId, summaryData] of wardSummaryEntries) {
        // หากมีข้อมูลมากกว่า 1 วัน จะใช้ค่าเฉลี่ย
        if (summaryData.daysWithData && summaryData.daysWithData > 1) {
          // หาค่าเฉลี่ยโดยหารด้วยจำนวนวันที่มีข้อมูล
          summaryData.patientCensus = Math.round(summaryData.patientCensus / summaryData.daysWithData);
          summaryData.nurseManager = Math.round(summaryData.nurseManager / summaryData.daysWithData);
          summaryData.rn = Math.round(summaryData.rn / summaryData.daysWithData);
          summaryData.pn = Math.round(summaryData.pn / summaryData.daysWithData);
          summaryData.wc = Math.round(summaryData.wc / summaryData.daysWithData);
          
          // ข้อมูลรับผู้ป่วยและจำหน่ายไม่ต้องหาค่าเฉลี่ยเพราะเป็นยอดรวมในช่วงเวลา
          // summaryData.newAdmit, transferIn, referIn, discharge, etc.
          
          summaryData.available = Math.round(summaryData.available / summaryData.daysWithData);
          summaryData.unavailable = Math.round(summaryData.unavailable / summaryData.daysWithData);
          summaryData.plannedDischarge = Math.round(summaryData.plannedDischarge / summaryData.daysWithData);
        }
        
        // ลบ field ที่ใช้เฉพาะการคำนวณภายใน
        delete summaryData.daysWithData;
        results.push(summaryData);
      }
    } else {
      // วันเดียว ดึงข้อมูลตามปกติ
      for (const wardId of wardIdsToDisplay) {
        const summariesForWard = await getApprovedSummariesByDateRange(wardId, startDateString, endDateString);
        if (summariesForWard.length > 0) {
          const summary = summariesForWard[0]; // ใช้วันล่าสุด
          const wardNameValue = wardNameMap.get(wardId) || wardId;
        
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
          // กรณีไม่มีข้อมูลให้เพิ่มข้อมูลว่าง
          const wardNameValue = wardNameMap.get(wardId) || wardId;
        console.log(`[fetchAllWardSummaryData] No summary found for ${wardId}, adding placeholder with name: ${wardNameValue}`);
        results.push({
          id: wardId,
          wardName: wardNameValue,
          patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
          newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0, transferOut: 0, referOut: 0,
          dead: 0, available: 0, unavailable: 0, plannedDischarge: 0
        });
      }
      }
    }
    
    console.log(`[fetchAllWardSummaryData] Final processed summary data:`, JSON.parse(JSON.stringify(results)));
  } catch (error) {
    console.error('[fetchAllWardSummaryData] Error fetching ward summary data:', error);
  }
  return results;
};

// ตรวจสอบว่าผู้ใช้มีการเข้าถึง Ward ที่ระบุหรือไม่
const hasAccessToWard = (wardId: string, userWards: Ward[]): boolean => {
  return userWards.some(w => w.id === wardId);
};

// นำเข้า type สำหรับ markers
type CalendarMarker = { date: string; status: 'draft' | 'final' | 'approved' };

// Function to display a "no data" message with more visual appeal
const NoDataMessage = ({ message = 'ไม่พบข้อมูล', subMessage = 'ข้อมูลยังไม่ถูกบันทึกโดยผู้ใช้งาน', icon = 'default' }) => {
  let iconSvg;
  
  switch (icon) {
    case 'bed':
      iconSvg = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 dark:text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7h-3a2 2 0 00-2 2v1H2v7c0 1.1.9 2 2 2h16a2 2 0 002-2v-7a2 2 0 00-2-2h-2V9a2 2 0 00-2-2zm0 4h-5V9h5v2zM2 13h20" />
        </svg>
      );
      break;
    case 'chart':
      iconSvg = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 dark:text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
      break;
    case 'table':
      iconSvg = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 dark:text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
      break;
    case 'user':
      iconSvg = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 dark:text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
      break;
    case 'compare':
      iconSvg = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 dark:text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
      break;
    default:
      iconSvg = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 dark:text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-6">
      {iconSvg}
      <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{message}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 text-center max-w-xs">{subMessage}</p>
    </div>
  );
};

// Component to display Ward Census buttons
const WardCensusButtons = ({ 
  wards, 
  wardCensusMap, 
  selectedWardId, 
  onWardSelect,
  onActionSelect
}: { 
  wards: Ward[], 
  wardCensusMap: Map<string, number>, 
  selectedWardId: string | null, 
  onWardSelect: (wardId: string) => void,
  onActionSelect?: (action: string) => void 
}) => {
  // Filter wards to display only ones with data
  const displayWards = wards.filter(ward => ward.id);
  
  // คำนวณข้อมูล Ward ที่มีผู้ป่วยมากที่สุด 3 อันดับแรก
  const topWards = [...displayWards]
    .sort((a, b) => {
      const countA = wardCensusMap.get(a.id?.toUpperCase() || '') || 0;
      const countB = wardCensusMap.get(b.id?.toUpperCase() || '') || 0;
      return countB - countA;
    })
    .slice(0, 3);
  
  if (displayWards.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
        ไม่พบข้อมูล Ward
      </div>
    );
  }
  
  // ฟังก์ชันสำหรับการไปยังส่วนต่างๆ
  const handleAction = (action: string) => {
    if (onActionSelect) {
      onActionSelect(action);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
      <div className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {displayWards.map(ward => {
            const patientCount = wardCensusMap.get(ward.id?.toUpperCase() || '') || 0;
            const isSelected = selectedWardId === ward.id;
            
            return (
              <button
                key={ward.id}
                onClick={() => onWardSelect(ward.id || '')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                } transition-colors duration-200`}
              >
                <span>{ward.wardName || ward.id}</span>
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                  isSelected 
                    ? 'bg-white bg-opacity-20 text-white' 
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                }`}>
                  {patientCount}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="flex mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mr-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ดูเพิ่มเติม:
          </div>
          <button 
            onClick={() => handleAction('comparison')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-3 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            เปรียบเทียบเวร
          </button>
          <button 
            onClick={() => handleAction('trend')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            แนวโน้มผู้ป่วย
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
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
  const [dateRange, setDateRange] = useState('custom');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.SUMMARY);
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  const [markers, setMarkers] = useState<CalendarMarker[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  
  // เพิ่ม ref สำหรับ scroll ไปยังส่วนต่างๆ
  const shiftComparisonRef = React.useRef<HTMLDivElement>(null);
  const wardSummaryRef = React.useRef<HTMLDivElement>(null);
  const patientTrendRef = React.useRef<HTMLDivElement>(null);

  // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
  const isAdmin = useMemo(() => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  }, [user]);

  // อัพเดทเวลามีการเปลี่ยนแปลง Ward ที่เลือก
  const handleSelectWard = (wardId: string) => {
    // ถ้าผู้ใช้มีสิทธิ์เข้าถึง Ward นี้ หรือเป็น Admin ให้เลือกได้
    if (isAdmin || hasAccessToWard(wardId, wards)) {
      setSelectedWardId(wardId);
      
      // หลังจากเลือก ward ทำการเลื่อนไปที่ส่วนเปรียบเทียบ
      setTimeout(() => {
        shiftComparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // ฟังก์ชันสำหรับการทำงานเมื่อผู้ใช้เลือกดูส่วนต่างๆ
  const handleActionSelect = (action: string) => {
    switch (action) {
      case 'comparison':
        setTimeout(() => {
          shiftComparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        break;
      case 'trend':
        setTimeout(() => {
          patientTrendRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        break;
      default:
        break;
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
        // ใช้ทั้งวันเริ่มต้นและวันสิ้นสุดสำหรับดึงข้อมูลตามช่วงวันที่
        const startDateStr = format(effectiveDateRange.start, 'yyyy-MM-dd');
        const endDateStr = format(effectiveDateRange.end, 'yyyy-MM-dd');
        
        const allAppWards = wards;
        const summaryData = await fetchAllWardSummaryData(startDateStr, endDateStr, allAppWards);
        setWardSummaryData(summaryData);
        
        // เฉพาะวันสุดท้ายสำหรับ totalStats
        const stats = await fetchTotalStats(endDateStr);
        setTotalStats(stats);
      } catch (err) {
        console.error('[DashboardPage] Error fetching ward summary data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaryData();
  }, [effectiveDateRange, user, wards]);
        
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

  // ฟังก์ชันคำนวณจำนวนเตียงรวมตามช่วงวันที่
  const calculateBedSummary = useCallback(async () => {
    try {
      setLoading(true);
      // ระบุช่วงเวลาที่ต้องการดึงข้อมูล
      const startDateString = format(effectiveDateRange.start, 'yyyy-MM-dd');
      const endDateString = format(effectiveDateRange.end, 'yyyy-MM-dd');
      
      // ดึงข้อมูลเฉพาะ Ward ที่มีสิทธิ์เข้าถึง
      const wardIds = wards.map(w => w.id?.toUpperCase() || '').filter(id => id !== '');
      
      // ดึงข้อมูลจาก dailySummaries แยกตาม Ward
      const summariesByWardPromises = wardIds.map(wardId => 
        getApprovedSummariesByDateRange(wardId, startDateString, endDateString)
      );
      
      const summariesByWard = await Promise.all(summariesByWardPromises);
      
      // รวมจำนวนเตียงจากทุก Ward และทุกวันในช่วงเวลา
      let totalAvailable = 0;
      let totalUnavailable = 0;
      let totalPlannedDischarge = 0;
      
      summariesByWard.forEach(summaries => {
        summaries.forEach(summary => {
          // ใช้ค่าที่ตรงกับชื่อฟิลด์ใน BedSummaryData
          // ใช้เฉพาะ availableBeds, unavailableBeds, plannedDischarge ซึ่งมีอยู่ใน DailySummary
          
          totalAvailable += summary.availableBeds || 0;
          totalUnavailable += summary.unavailableBeds || 0;
          totalPlannedDischarge += summary.plannedDischarge || 0;
          
          console.log(`[calculateBedSummary] Summary for ${summary.wardId}: available=${summary.availableBeds || 0}, unavailable=${summary.unavailableBeds || 0}, planned=${summary.plannedDischarge || 0}`);
        });
      });
      
      // ถ้ายังไม่มีข้อมูล ลองดึงจาก wardForms
      if (totalAvailable === 0 && totalUnavailable === 0 && selectedWardId) {
        try {
          const dateToQuery = format(effectiveDateRange.end, 'yyyy-MM-dd');
          const formsData = await getWardFormsByDateAndWard(selectedWardId, dateToQuery);
          
          // ใช้ข้อมูลจาก night form ถ้ามี ไม่งั้นใช้ข้อมูลจาก morning form
          const formData = formsData.night || formsData.morning;
          
          if (formData) {
            // ใน WardFormData ฟิลด์ชื่อ available และ unavailable
            totalAvailable = formData.available || 0;
            totalUnavailable = formData.unavailable || 0;
            totalPlannedDischarge = formData.plannedDischarge || 0;
            
            console.log(`[calculateBedSummary] Using data from wardForms: available=${totalAvailable}, unavailable=${totalUnavailable}, planned=${totalPlannedDischarge}`);
          }
        } catch (err) {
          console.error('[calculateBedSummary] Error fetching ward forms:', err);
        }
      }
      
      // สร้างข้อมูลที่ตรงกับ BedSummaryData interface
      const bedSummary: BedSummaryData = {
        availableBeds: totalAvailable,
        unavailableBeds: totalUnavailable,
        plannedDischarge: totalPlannedDischarge
      };
      
      console.log(`[calculateBedSummary] Final summary: availableBeds=${bedSummary.availableBeds}, unavailableBeds=${bedSummary.unavailableBeds}, plannedDischarge=${bedSummary.plannedDischarge}`);
      
      return bedSummary;
    } catch (error) {
      console.error('[calculateBedSummary] Error calculating bed summary:', error);
      return {
        availableBeds: 0,
        unavailableBeds: 0,
        plannedDischarge: 0
      };
    } finally {
      setLoading(false);
    }
  }, [effectiveDateRange, wards, selectedWardId]);
  
  // state สำหรับเก็บข้อมูลสรุปเตียง
  const [bedSummaryData, setBedSummaryData] = useState<BedSummaryData>({
    availableBeds: 0,
    unavailableBeds: 0,
    plannedDischarge: 0
  });

  // ฟังก์ชันสำหรับรีเฟรชข้อมูลทั้งหมด
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user || wards.length === 0) return;

      // ดึงข้อมูลสรุปทั้งหมด
      const dateToQuery = format(effectiveDateRange.end, 'yyyy-MM-dd');
      const summaryData = await fetchAllWardSummaryData(dateToQuery, dateToQuery, wards);
      setWardSummaryData(summaryData);
      
      // ดึงข้อมูลสถิติทั้งหมด
      const stats = await fetchTotalStats(dateToQuery);
      setTotalStats(stats);
      
      // ดึงข้อมูล Census
      const censusMap = await fetchAllWardCensus(dateToQuery);
      setWardCensusMap(censusMap);
      
      // ดึงข้อมูลแนวโน้ม
      const effectiveWardId = selectedWardId ?? undefined;
      const trends = await fetchPatientTrends(effectiveDateRange.start, effectiveDateRange.end, effectiveWardId);
      setTrendData(trends);
      
      // ดึงข้อมูลแบบฟอร์ม
      if (selectedWardId) {
        await fetchWardForms(selectedWardId, dateToQuery);
      }
      
      // ดึงข้อมูลเตียง
      const bedSummary = await calculateBedSummary();
      setBedSummaryData(bedSummary);
      
      console.log('[refreshData] All data refreshed successfully');
    } catch (error) {
      console.error("[refreshData] Error refreshing data:", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  }, [user, wards, effectiveDateRange, fetchWardForms, selectedWardId, calculateBedSummary]);
  
  // เพิ่ม effect สำหรับโหลดข้อมูลใหม่เมื่อมีการเปลี่ยนช่วงวันที่
  useEffect(() => {
    if (user && wards.length > 0) {
      refreshData();
    }
  }, [effectiveDateRange, user, wards, refreshData]);

  // ดึงข้อมูลสรุปเตียงเมื่อเปลี่ยนแปลงช่วงวันที่หรือ Ward
  useEffect(() => {
    const fetchBedSummary = async () => {
      const summary = await calculateBedSummary();
      setBedSummaryData(summary);
    };
    
    if (user && wards.length > 0) {
      fetchBedSummary();
    }
  }, [effectiveDateRange, wards, user, calculateBedSummary]);
        
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
    // ป้องกันการแสดงข้อมูลซ้ำ
    const uniqueWardIds = new Set<string>();
    
    // ใช้ wardMap เพื่อแก้ไขปัญหาการแสดงผลซ้ำซ้อน
    const wardMap = new Map<string, {
      id: string;
      wardName: string;
      patientCount: number;
      morningPatientCount?: number;
      nightPatientCount?: number;
    }>();

    // แสดงเฉพาะ ward ที่มีสิทธิ์เข้าถึง ไม่สนใจว่าเป็น Admin หรือไม่
    const filteredData = summaryDataList.filter(ward => 
      wards.some(userWard => userWard.id?.toUpperCase() === ward.id.toUpperCase())
    );
    
    filteredData.forEach(ward => {
      // ตรวจสอบว่าเคยมีแผนกนี้แล้วหรือไม่
      if (uniqueWardIds.has(ward.id.toUpperCase())) {
        return; // ข้ามข้อมูลซ้ำ
      }
      
      uniqueWardIds.add(ward.id.toUpperCase());
      
      const wardSummary = summary && summary.wardId === ward.id ? summary : null;
      
      // สร้างข้อมูลแยกเวร (เช้า/ดึก) สำหรับแต่ละแผนก
      // ถ้าไม่มีข้อมูลจริงในเวรใด ให้ใช้ค่าประมาณการจากข้อมูลคงพยาบาลรวม
      const morningCount = wardSummary?.morningForm?.patientCensus ?? 
                          Math.round(ward.patientCensus * 0.45); // ประมาณการ 45% ของยอดรวม
      
      const nightCount = wardSummary?.nightForm?.patientCensus ?? 
                        Math.round(ward.patientCensus * 0.55); // ประมาณการ 55% ของยอดรวม
      
      wardMap.set(ward.id, {
        id: ward.id,
        wardName: ward.wardName || ward.id, // Fallback to ID if name is somehow empty
        patientCount: ward.patientCensus,
        morningPatientCount: morningCount,
        nightPatientCount: nightCount
      });
    });
    
    // เรียงลำดับตามจำนวนผู้ป่วยจากมากไปน้อยเพื่อการแสดงผลที่ดี
    const sortedData = Array.from(wardMap.values()).sort((a, b) => b.patientCount - a.patientCount);
    
    console.log('[DashboardPage] wardCensusData for BarChart:', JSON.parse(JSON.stringify(sortedData)));
    return sortedData;
  }, [summaryDataList, summary, wards]);
  
  // จัดการการเปลี่ยนช่วงเวลา
  const handleDateRangeChange = (newRange: string) => {
    let newStartDate = startDate;
    let newEndDate = endDate;
    
    const today = new Date();
    
    switch(newRange) {
      case 'today':
        newStartDate = format(today, 'yyyy-MM-dd');
        newEndDate = format(today, 'yyyy-MM-dd');
        break;
      case '7days':
        newStartDate = format(subDays(today, 6), 'yyyy-MM-dd');
        newEndDate = format(today, 'yyyy-MM-dd');
        break;
      case '30days':
        newStartDate = format(subDays(today, 29), 'yyyy-MM-dd');
        newEndDate = format(today, 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        newStartDate = format(firstDayOfLastMonth, 'yyyy-MM-dd');
        newEndDate = format(lastDayOfLastMonth, 'yyyy-MM-dd');
        break;
      case 'all':
        // แสดงข้อมูลของ 1 ปีล่าสุด
        newStartDate = format(subYears(today, 1), 'yyyy-MM-dd');
        newEndDate = format(today, 'yyyy-MM-dd');
        break;
      case 'custom':
        // ใช้ค่าเดิม
        break;
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };
    
  // ปรับ effectiveDateRange ให้ใช้ startDate และ endDate โดยตรง
  useEffect(() => {
      try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        setEffectiveDateRange({ start, end });
      console.log(`[DashboardPage] Setting date range: ${format(start, 'yyyy-MM-dd')} - ${format(end, 'yyyy-MM-dd')}`);
      } catch (err) {
      console.error('[DashboardPage] Error parsing date range:', err);
      }
  }, [startDate, endDate]);

  // useEffect สำหรับดึงข้อมูล markers จาก dailySummaries
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const summariesRef = collection(db, COLLECTION_SUMMARIES);
        // ดึงข้อมูลย้อนหลัง 6 เดือน และข้อมูลอนาคต 1 เดือน
        const startStr = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
        const endStr = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        const q = query(
          summariesRef,
          where('dateString', '>=', startStr),
          where('dateString', '<=', endStr)
        );
        
        const snapshot = await getDocs(q);
        const markersData: CalendarMarker[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const status = data.allFormsApproved ? 'approved' : 
                      (data.morningFormId || data.nightFormId) ? 'final' : 'draft';
          
          markersData.push({
            date: data.dateString,
            status
          });
        });
        
        // กรองให้เหลือแค่เป็นรายวัน ไม่ซ้ำกัน โดยเอาสถานะที่สูงกว่า (approved > final > draft)
        const uniqueDates = new Map<string, CalendarMarker>();
        markersData.forEach(marker => {
          const existing = uniqueDates.get(marker.date);
          if (!existing || 
              (marker.status === 'approved') || 
              (marker.status === 'final' && existing.status !== 'approved')) {
            uniqueDates.set(marker.date, marker);
    }
        });
        
        const finalMarkers = Array.from(uniqueDates.values());
        console.log(`[fetchMarkers] Loaded ${finalMarkers.length} date markers`);
        setMarkers(finalMarkers);
      } catch (error) {
        console.error('[fetchMarkers] Error:', error);
      }
    };
    
    fetchMarkers();
  }, []);

  // สร้าง event จากข้อมูล markers
  const calendarEvents = useMemo(() => {
    if (!markers || markers.length === 0) return [];
    
    return markers.map(marker => {
      let color: 'purple' | 'sky' | 'emerald' | 'yellow';
      let title = '';
      
      switch (marker.status) {
        case 'draft':
          color = 'yellow';
          title = 'รายงานฉบับร่าง';
          break;
        case 'final':
          color = 'emerald';
          title = 'รายงานสมบูรณ์';
          break;
        case 'approved':
          color = 'purple';
          title = 'รายงานที่อนุมัติแล้ว';
          break;
        default:
          color = 'sky';
          title = 'ไม่ระบุ';
      }
      
      return {
        id: `${marker.date}-${marker.status}`,
        title,
        description: `สถานะ: ${marker.status}`,
        date: marker.date,
        startTime: '00:00',
        endTime: '23:59',
        color
      };
    });
  }, [markers]);

  const isDarkMode = theme === 'dark';

  // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่ และแสดงแนวโน้มผู้ป่วยตามบทบาท
  const shouldShowAllWardsTrend = useMemo(() => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  }, [user]);

  // เพิ่มประสิทธิภาพการแสดงผลสำหรับผู้ดูแลระบบ
  useEffect(() => {
    // ถ้าเป็นผู้ดูแลระบบ และไม่ได้เลือกแผนกเฉพาะ
    if (isAdmin && dateRange === 'today' && !selectedWardId && wards.length > 0) {
      console.log("[DashboardPage] Admin detected: Setting default view to show all wards for today");
      // ตั้งค่าเริ่มต้นให้ดูข้อมูลวันนี้ของทุกแผนก
      const today = format(new Date(), 'yyyy-MM-dd');
      setStartDate(today);
      setEndDate(today);
      setSelectedDate(today);
    }
  }, [isAdmin, wards, selectedWardId]);

  // แสดงข้อมูลแนวโน้มผู้ป่วยสำหรับผู้ดูแลระบบ
  const getTrendTitle = () => {
    if (isAdmin) {
      if (selectedWardId) {
        const ward = wards.find(w => w.id === selectedWardId);
        return `แนวโน้มผู้ป่วย${ward?.wardName ? ` แผนก${ward.wardName}` : ''}`;
      } else {
        return 'แนวโน้มผู้ป่วยทุกแผนก';
      }
    } else {
      return `แนวโน้มผู้ป่วย${selectedWard?.wardName ? ` แผนก${selectedWard.wardName}` : ''}`;
    }
  };

  // Prepare Pie Chart data for bed availability
  useEffect(() => {
    if (bedSummaryData) {
      const total = bedSummaryData.availableBeds + bedSummaryData.unavailableBeds;
      
      if (total > 0) {
        setPieChartData([
          { name: 'เตียงว่าง', value: bedSummaryData.availableBeds, color: 'bg-emerald-500' },
          { name: 'เตียงไม่ว่าง', value: bedSummaryData.unavailableBeds, color: 'bg-red-500' },
          { name: 'แผนจำหน่าย', value: bedSummaryData.plannedDischarge, color: 'bg-blue-500' }
        ]);
      } else {
        setPieChartData([]);
      }
    }
  }, [bedSummaryData]);

  // แสดงหน้า Dashboard
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <style dangerouslySetInnerHTML={{ __html: printStyles }} />
          
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            
            <div className="flex space-x-2">
              <select
                value={dateRange}
                onChange={(e) => {
                  const value = e.target.value;
                  setDateRange(value);
                  handleDateRangeChange(value);
                }}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DATE_RANGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {dateRange === 'custom' && (
                <div className="flex space-x-2">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setCurrentView(ViewType.SUMMARY)}
                    className="px-2 py-1 rounded-md text-sm font-medium bg-blue-600 text-white"
                  >
                    ตกลง
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Calendar Section - Updated with new component */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <CalendarWithEvents 
              events={calendarEvents}
              darkMode={theme === 'dark'}
              showUpcomingEvents={false}
              className="rounded-xl"
              onDateChange={(date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                setSelectedDate(dateStr);
              }}
            />
            
            <div className="flex justify-center p-3 space-x-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-2"></span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">รายงานฉบับร่าง</span>
              </div>
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">รายงานสมบูรณ์</span>
              </div>
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2"></span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">รายงานที่อนุมัติแล้ว</span>
              </div>
            </div>
          </div>
          
          {/* Daily Patient Census and Staffing */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
              Daily Patient Census and Staffing
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ข้อมูลวันที่ {selectedDate}
              </span>
            </h2>
            
            {Object.values(totalStats).every(val => val === 0) ? (
              <NoDataMessage 
                message="ไม่พบข้อมูลผู้ป่วยสำหรับวันที่เลือก" 
                subMessage="ข้อมูลยังไม่ถูกบันทึกโดยผู้ใช้งาน หรืออยู่ระหว่างการอนุมัติจากหัวหน้าหอผู้ป่วย" 
                icon="user"
              />
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
          
          {/* Add Ward Census Buttons */}
          {wardCensusMap.size > 0 && (
            <WardCensusButtons
              wards={wards}
              wardCensusMap={wardCensusMap}
              selectedWardId={selectedWardId}
              onWardSelect={handleSelectWard}
              onActionSelect={handleActionSelect}
            />
          )}
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Patient Count by Ward */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">จำนวนผู้ป่วยตามแผนก</h2>
              {wardCensusData.length > 0 ? (
                <div className="h-72">
                  <EnhancedBarChart 
                    data={wardCensusData}
                    selectedWardId={selectedWardId}
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
            
            {/* Bed Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">สถานะเตียง</h2>
              {pieChartData.length > 0 ? (
                <div className="h-72">
                  <BedSummaryPieChart data={bedSummaryData} />
                </div>
              ) : (
                <NoDataMessage 
                  message="ไม่พบข้อมูลสถานะเตียง" 
                  subMessage="ไม่พบข้อมูลเตียงว่าง/ไม่ว่าง สำหรับช่วงเวลาที่เลือก กรุณาตรวจสอบการบันทึกข้อมูลเตียง" 
                  icon="bed"
                />
              )}
            </div>
          </div>
          
          {/* Rest of the Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">จำนวนผู้ป่วย (ตามหอผู้ป่วย)</h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm h-full">
                {wards.length > 0 ? (
                  <div className="space-y-3">
                    {summary && (
                      <WardSummaryDashboard 
                        summary={summary} 
                        date={selectedDate}
                        wards={wards.map(ward => ({
                          id: ward.id || '',
                          wardName: ward.wardName,
                          patientCount: wardCensusMap.get(ward.id?.toUpperCase() || '') || 0
                        }))}
                        selectedWardId={selectedWardId}
                        onSelectWard={handleSelectWard}
                        loading={loading}
                      />
                    )}
                    {!summary && !loading && (
                      <NoDataMessage 
                        message="ไม่พบข้อมูลสำหรับวันที่เลือก"
                        subMessage="กรุณาเลือกวันที่มีการบันทึกข้อมูล หรือตรวจสอบการอนุมัติจากหัวหน้า"
                        icon="user"
                      />
                    )}
                    {loading && (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <NoDataMessage
                    message="ไม่พบหอผู้ป่วยที่มีสิทธิ์เข้าถึง"
                    subMessage="คุณอาจไม่มีสิทธิ์ในการเข้าถึงข้อมูลหอผู้ป่วย กรุณาติดต่อผู้ดูแลระบบ"
                    icon="user"
                  />
                )}
              </div>
            </div>
            
            <div className="lg:col-span-8">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
                สรุปรายหอผู้ป่วย ({format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')})
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm overflow-x-auto">
                {summaryDataList.length > 0 ? (
                  <div className="h-full">
                    <WardSummaryTable 
                      data={summaryDataList} 
                      selectedWardId={selectedWardId}
                      onSelectWard={handleSelectWard}
                      title="ตารางข้อมูลรวมทั้งหมด"
                    />
                  </div>
                ) : (
                  <NoDataMessage 
                    message="ไม่พบข้อมูลสรุปรายหอผู้ป่วย" 
                    subMessage="ไม่พบข้อมูลหรือยังไม่มีการบันทึกข้อมูลในช่วงเวลาที่เลือก"
                    icon="table"
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* Ward Comparison Panel */}
          <div className="mt-6" ref={shiftComparisonRef}>
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">เปรียบเทียบเวรเช้า-ดึก</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              {selectedWardId ? (
                <div>
                  <div className="mb-4">
                    <label htmlFor="ward-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">เลือกหอผู้ป่วย:</label>
                    <select
                      id="ward-select"
                      value={selectedWardId}
                      onChange={(e) => handleSelectWard(e.target.value)}
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md w-full max-w-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {wards.map((ward) => (
                        <option key={ward.id} value={ward.id || ''}>
                          {ward.wardName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {summary ? (
                    <ShiftComparisonPanel
                      summary={summary}
                      wardName={summary.wardName}
                      allWards={wards}
                      onWardSelect={handleSelectWard}
                    />
                  ) : (
                    <NoDataMessage 
                      message="ไม่พบข้อมูลการเปรียบเทียบสำหรับวอร์ดที่เลือก" 
                      subMessage="ไม่พบข้อมูลเวรเช้า-ดึกสำหรับวอร์ดที่เลือกในวันนี้ หรือข้อมูลยังไม่ได้รับการอนุมัติ" 
                      icon="compare"
                    />
                  )}
                </div>
              ) : (
                <NoDataMessage 
                  message="กรุณาเลือกวอร์ด" 
                  subMessage="เลือกวอร์ดเพื่อดูข้อมูลการเปรียบเทียบระหว่างเวรเช้าและเวรดึก" 
                  icon="compare"
                />
              )}
            </div>
          </div>
          
          {/* Patient Trend Chart */}
          <div className="mt-6" ref={patientTrendRef}>
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
              {getTrendTitle()}
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
              </span>
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              {shouldShowAllWardsTrend && (
                <div className="mb-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">แสดงข้อมูล:</span>
                    <button
                      onClick={() => setSelectedWardId(null)}
                      className={`px-3 py-1 mr-2 rounded-md text-xs font-medium ${
                        selectedWardId === null ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                      }`}
                    >
                      ทุกวอร์ด
                    </button>
                    {selectedWardId && (
                      <button
                        onClick={() => setSelectedWardId(null)}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                      >
                        {wards.find(w => w.id === selectedWardId)?.wardName} (คลิกเพื่อดูทุกวอร์ด)
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {trendData.length > 0 ? (
                <div className="h-72">
                  <PatientTrendChart 
                    data={trendData} 
                    wardName={selectedWardId ? wards.find(w => w.id === selectedWardId)?.wardName : isAdmin ? 'ทุกแผนก' : selectedWard?.wardName}
                    allWards={isAdmin ? wards : []}
                    onWardSelect={handleSelectWard}
                  />
                </div>
              ) : (
                <div className="h-72">
                  <PatientTrendChart 
                    data={[]} 
                    wardName={selectedWardId ? wards.find(w => w.id === selectedWardId)?.wardName : isAdmin ? 'ทุกแผนก' : selectedWard?.wardName}
                    allWards={isAdmin ? wards : []}
                    onWardSelect={handleSelectWard}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 