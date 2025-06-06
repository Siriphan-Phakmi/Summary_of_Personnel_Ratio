'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, addDays, subMonths, addMonths, getDay, endOfMonth, startOfMonth, isSameDay, differenceInDays, parse } from 'date-fns';
import { th } from 'date-fns/locale';
import { getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission, getAllWards } from '@/app/features/ward-form/services/wardService';
import { Ward, WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { UserRole, User } from '@/app/core/types/user';
import { COLLECTION_SUMMARIES, COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';
import { getApprovedSummariesByDateRange } from '@/app/features/ward-form/services/approvalServices/dailySummary';
import { useTheme } from 'next-themes';
import { Timestamp } from 'firebase/firestore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Local components
import { 
  DashboardSummary, 
  WardFormData, 
  PatientTrendData,
  WardSummaryData,
  WardFormSummary,
  WardSummaryDataWithShifts
} from './types';
import WardSummaryDashboard from './WardSummaryDashboard';
import EnhancedBarChart from './EnhancedBarChart';
import EnhancedPieChart, { PieChartDataItem } from './EnhancedPieChart';
import PatientTrendChart, { TrendData } from './PatientTrendChart';
import WardSummaryTable from './WardSummaryTable';
import ShiftComparisonPanel from './ShiftComparisonPanel';
import CalendarWithEvents, { Event } from './CalendarWithEvents';
import BedSummaryPieChart from './BedSummaryPieChart';
import NoDataMessage from './NoDataMessage';
import WardCensusButtons from './WardCensusButtons';

// นิยาม interface สำหรับข้อมูลกราฟแท่งของจำนวนเตียง
interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
};

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
  { label: 'กำหนดเอง', value: 'custom' }
];

// ประเภทของการดูข้อมูล
enum ViewType {
  SUMMARY = 'summary',
  WARD_DETAIL = 'ward_detail'
}

// สำหรับ development mode เท่านั้น - ใช้สำหรับการ log ข้อมูล
const logInfo = (message: string, ...data: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, ...data);
  }
};

// สำหรับ development mode เท่านั้น - ใช้สำหรับการ log ข้อผิดพลาด
const logError = (message: string, error: any) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  } else {
    // ในโหมด production อาจส่งข้อมูลไปยังระบบ error tracking เช่น Sentry
    // หรือเก็บใน analytics โดยไม่มีข้อมูลส่วนบุคคล
  }
};

// ดึงข้อมูลจาก dailySummaries collection
const getDailySummary = async (wardId: string, dateString: string) => {
  logInfo(`[getDailySummary] Fetching summary for wardId=${wardId}, date=${dateString}`);
  
  try {
    // แปลง wardId เป็นตัวพิมพ์ใหญ่เพื่อให้ตรงกับข้อมูลในฐานข้อมูล
    const formattedWardId = wardId.toUpperCase();
    
    // ใช้ getApprovedSummariesByDateRange แทนการ query โดยตรง
    const summaries = await getApprovedSummariesByDateRange(formattedWardId, dateString, dateString);
    logInfo(`[getDailySummary] Found ${summaries.length} summaries using getApprovedSummariesByDateRange`);
    
    if (summaries.length > 0) {
      const summary = summaries[0]; // เลือกรายการแรก (ล่าสุด)
      logInfo(`[getDailySummary] Summary data:`, summary);
      
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
        // แก้ไขให้ใช้ค่าจาก availableBeds, unavailableBeds และ plannedDischarge โดยตรงจาก summary
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
        // แก้ไขให้ใช้ค่าจาก availableBeds, unavailableBeds และ plannedDischarge โดยตรงจาก summary
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
    logError('[getDailySummary] Error:', error);
    throw error;
  }
};

// ดึงข้อมูลแนวโน้มผู้ป่วยในช่วงเวลาที่กำหนด
const fetchPatientTrends = async (startDate: Date, endDate: Date, wardId?: string, fetchAllTimeData: boolean = false, user?: User | null, currentWards?: Ward[]): Promise<TrendData[]> => {
  // ถ้า fetchAllTimeData เป็น true, ปรับ startDate และ endDate
  const effectiveStartDate = fetchAllTimeData ? parseISO('1970-01-01') : startDate;
  const effectiveEndDate = fetchAllTimeData ? addDays(new Date(),1) : endDate; // เพิ่มวันเผื่อข้อมูลล่าสุด

  logInfo(`[fetchPatientTrends] Fetching trends from ${format(effectiveStartDate, 'yyyy-MM-dd')} to ${format(effectiveEndDate, 'yyyy-MM-dd')} (Ward: ${wardId}, AllTime: ${fetchAllTimeData})`);
  
  try {
    // แปลงวันที่เป็น string
    const startDateString = format(effectiveStartDate, 'yyyy-MM-dd');
    const endDateString = format(effectiveEndDate, 'yyyy-MM-dd');
    
    let summaries: any[] = [];
    let allWardSummaries: Record<string, any[]> = {}; // เพิ่มตัวแปรเก็บข้อมูลแยกตาม ward
    
    if (wardId) {
      // ใช้ getApprovedSummariesByDateRange สำหรับดึงข้อมูลตาม ward และช่วงวันที่
      const formattedWardId = wardId.toUpperCase();
      summaries = await getApprovedSummariesByDateRange(formattedWardId, startDateString, endDateString);
      logInfo(`[fetchPatientTrends] Found ${summaries.length} summaries using getApprovedSummariesByDateRange for ward ${formattedWardId}`);
    } else if (user && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.DEVELOPER && user.floor) {
      // ถ้าเป็น User ทั่วไป และไม่ได้ระบุ wardId ให้ดึงข้อมูลเฉพาะ floor ของ user
      const formattedWardId = user.floor.toUpperCase();
      summaries = await getApprovedSummariesByDateRange(formattedWardId, startDateString, endDateString);
      // ลบ user.email เนื่องจากอาจจะไม่มีใน User type
      logInfo(`[fetchPatientTrends] User Role: ${user.role}. Fetching trends for own floor: ${formattedWardId}`);
    } else {
      // กรณี Admin หรือไม่ได้ระบุ wardId และไม่ใช่ User ทั่วไป (ต้องการดูข้อมูลแยกทุก ward)
      // ใช้ currentWards ที่ส่งเข้ามาจากภายนอกแทนการดึงจาก getAllWards เพื่อให้ข้อมูลสอดคล้องกับสิทธิ์ผู้ใช้
      const allWardsToFetch: Ward[] = currentWards || [];
      
      // ดึงข้อมูลสำหรับแต่ละ ward
      const wardPromises = allWardsToFetch
        .filter((ward: Ward) => ward.id && DASHBOARD_WARDS.some(dw => dw.toUpperCase() === ward.id.toUpperCase()))
        .map(async (ward: Ward) => { // เพิ่ม type Ward
          if (!ward.id) return [];
          
          const wardSummaries = await getApprovedSummariesByDateRange(
            ward.id.toUpperCase(), 
            startDateString, 
            endDateString
          );
          
          if (wardSummaries.length > 0) {
            allWardSummaries[ward.id.toUpperCase()] = wardSummaries;
          }
          
          return wardSummaries;
        });
      
      // รวมข้อมูลจากทุก ward
      await Promise.all(wardPromises);
      
      // ถ้าไม่พบข้อมูลใน dailySummaries ให้ลองดึงจาก wardForms โดยตรง
      if (Object.keys(allWardSummaries).length === 0) {
        const q = query(
          collection(db, COLLECTION_WARDFORMS),
          where('date', '>=', startDateString),
          where('date', '<=', endDateString),
          where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
          orderBy('date', 'asc')
      );
      
        const querySnapshot = await getDocs(q);
        logInfo(`[fetchPatientTrends] Found ${querySnapshot.size} data points using direct query`);
      
        // จัดกลุ่มข้อมูลตาม ward
      querySnapshot.forEach(doc => {
        const data = doc.data();
          const wardId = data.wardId?.toUpperCase();
          
          if (wardId && (!user || user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER || 
                         (user.floor && user.floor.toUpperCase() === wardId))) {
            if (!allWardSummaries[wardId]) {
              allWardSummaries[wardId] = [];
            }
            
            allWardSummaries[wardId].push({
              ...data,
              id: doc.id
            });
          }
        });
      }
    }
    
    // สร้าง Map เพื่อจัดกลุ่มข้อมูลตามวันที่
    const dateToDataMap = new Map<string, TrendData>();
    
    // สร้างข้อมูลเริ่มต้นสำหรับทุกวันในช่วงเวลา
    let currentDate = effectiveStartDate;
    while (currentDate <= effectiveEndDate) {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      dateToDataMap.set(dateString, {
        date: format(currentDate, 'dd/MM'),
        patientCount: 0,
        admitCount: 0,
        dischargeCount: 0,
        wardData: {}
      });
      currentDate = addDays(currentDate, 1);
    }
    
    // ประมวลผลข้อมูลสำหรับการแสดงผลในกราฟแนวโน้ม
    logInfo(`[fetchPatientTrends] Processing data for ${Object.keys(allWardSummaries).length} wards`);
    
    // เพิ่มข้อมูลแยกตาม ward (ถ้ามี)
    if (Object.keys(allWardSummaries).length > 0) {
      // วนทุกวันที่และทุก ward ที่มีข้อมูล
      const allDates = Array.from(dateToDataMap.keys());
      for (const dateString of allDates) {
        const trendData = dateToDataMap.get(dateString)!;
        
        // ค่ารวมสำหรับวันนี้
        let totalPatientCensus = 0;
        let totalAdmitCount = 0;
        let totalDischargeCount = 0;
        
        for (const wardId of Object.keys(allWardSummaries)) {
          const wardSummaries = allWardSummaries[wardId];
          
          // หาข้อมูลสำหรับ ward นี้ในวันนี้
          const wardSummary = wardSummaries.find(s => s.dateString === dateString || s.date === dateString);
          
          if (wardSummary) {
            const nightPatientCensus = wardSummary.nightCalculatedCensus || wardSummary.nightPatientCensus || 0;
            const morningPatientCensus = wardSummary.morningCalculatedCensus || wardSummary.morningPatientCensus || 0;
            const patientCensus = nightPatientCensus || morningPatientCensus;
            
            const admitTotal = (wardSummary.nightAdmitTotal || 0) + (wardSummary.morningAdmitTotal || 0);
            const dischargeAmount = (wardSummary.nightDischargeTotal || 0) + (wardSummary.morningDischargeTotal || 0);
            
            // ใช้ COLLECTION_WARDFORMS เพื่อหาชื่อแผนก
            const wardDetails = await getWardById(wardId);
            
            // เพิ่มข้อมูลสำหรับ ward นี้
            if (!trendData.wardData) {
              trendData.wardData = {};
            }
            
            trendData.wardData[wardId] = {
              wardName: wardDetails?.wardName || wardId,
              patientCount: patientCensus,
              admitCount: admitTotal,
              dischargeCount: dischargeAmount
            };
            
            // เพิ่มจำนวนในยอดรวม
            totalPatientCensus += patientCensus;
            totalAdmitCount += admitTotal;
            totalDischargeCount += dischargeAmount;
          } else {
            // ถ้าไม่พบข้อมูลวันนี้ ให้ใส่ข้อมูลว่าง
            const wardDetails = await getWardById(wardId);
            
            if (!trendData.wardData) {
              trendData.wardData = {};
            }
            
            trendData.wardData[wardId] = {
              wardName: wardDetails?.wardName || wardId,
              patientCount: 0,
              admitCount: 0,
              dischargeCount: 0
            };
          }
        }
        
        // อัพเดทค่ารวมสำหรับวันนี้
        trendData.patientCount = totalPatientCensus;
        trendData.admitCount = totalAdmitCount;
        trendData.dischargeCount = totalDischargeCount;
        
        // อัพเดทข้อมูลใน map
        dateToDataMap.set(dateString, trendData);
      }
    } else {
      // รวมข้อมูลจากทุก ward ตามวันที่ (วิธีเดิม)
    summaries.forEach(data => {
      const dateString = data.dateString;
        if (!dateString) return;
        
      const formattedDate = format(parseISO(dateString), 'dd/MM');
      
      const existingData = dateToDataMap.get(dateString) || {
        date: formattedDate,
        patientCount: 0,
        admitCount: 0,
          dischargeCount: 0,
          wardData: {}
      };
      
      // ใช้ข้อมูล night form ถ้ามี มิฉะนั้นใช้ morning form
      const nightPatientCensus = data.nightCalculatedCensus || data.nightPatientCensus || 0;
      const morningPatientCensus = data.morningCalculatedCensus || data.morningPatientCensus || 0;
      const patientCensus = nightPatientCensus || morningPatientCensus;
      
      const admitTotal = (data.nightAdmitTotal || 0) + (data.morningAdmitTotal || 0);
      const dischargeAmount = (data.nightDischargeTotal || 0) + (data.morningDischargeTotal || 0);
        
        // เพิ่มข้อมูลแยกตาม ward ถ้ามี wardId
        if (data.wardId) {
          if (!existingData.wardData) {
            existingData.wardData = {};
          }
          
          existingData.wardData[data.wardId] = {
            wardName: data.wardName || data.wardId,
            patientCount: patientCensus,
            admitCount: admitTotal,
            dischargeCount: dischargeAmount
          };
        }
      
      dateToDataMap.set(dateString, {
        date: formattedDate,
        patientCount: existingData.patientCount + patientCensus,
        admitCount: existingData.admitCount + admitTotal,
          dischargeCount: existingData.dischargeCount + dischargeAmount,
          wardData: existingData.wardData
      });
    });
    }
    
    // แปลง Map เป็น Array สำหรับใช้กับกราฟ
    const result = Array.from(dateToDataMap.values());
    logInfo(`[fetchPatientTrends] Final trend data:`, result);
    return result;
  } catch (error) {
    logError('[fetchPatientTrends] Error fetching patient trends:', error);
    return [];
  }
};

// Helper function to get Ward by ID
const getWardById = async (wardId: string): Promise<Ward | null> => {
  try {
    const wardsRef = collection(db, 'wards');
    const q = query(wardsRef, where('id', '==', wardId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const wardData = snapshot.docs[0].data() as Ward;
      return wardData;
    }
    return null;
  } catch (error) {
    console.error(`[getWardById] Error getting ward ${wardId}:`, error);
    return null;
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
    
    // ดึงข้อมูลแบบฟอร์มที่มีการอนุมัติแล้ว (APPROVED) หรือบันทึกเสร็จสิ้น (FINAL)
    const approvedFormsQuery = query(
      formsRef,
      where('wardId', '==', formattedWardId),
      where('dateString', '==', dateString),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED])
    );
    
    const approvedQuerySnapshot = await getDocs(approvedFormsQuery);
    console.log(`[getWardFormsByDateAndWard] Found ${approvedQuerySnapshot.size} forms with FINAL or APPROVED status`);
    
    // Debug: แสดงข้อมูลของ documents ที่พบ
    if (approvedQuerySnapshot.size > 0) {
      approvedQuerySnapshot.forEach((doc) => {
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
    
    // แยกเป็น 2 ส่วน - ดึงข้อมูลกะเช้า และ กะดึก แยกจากกัน
    // ดึงข้อมูลกะเช้า - แก้ไขเพื่อให้แสดงข้อมูลกะเช้าหลังอนุมัติ
    const morningQuery = query(
      formsRef,
      where('wardId', '==', formattedWardId),
      where('dateString', '==', dateString),
      where('shift', '==', ShiftType.MORNING),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const morningSnapshot = await getDocs(morningQuery);
    if (!morningSnapshot.empty) {
      const doc = morningSnapshot.docs[0];
      const data = doc.data() as WardForm;
      console.log(`[getWardFormsByDateAndWard] Found morning form: id=${doc.id}, status=${data.status}, patientCensus=${data.patientCensus}`);
      
      // คำนวณผลรวมของรับเข้าและจำหน่าย
      const admitTotal = (data.newAdmit || 0) + (data.transferIn || 0) + (data.referIn || 0);
      const dischargeTotal = (data.discharge || 0) + (data.transferOut || 0) + (data.referOut || 0) + (data.dead || 0);
      
      morningForm = {
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
    }
    
    // ดึงข้อมูลกะดึก
    const nightQuery = query(
      formsRef,
      where('wardId', '==', formattedWardId),
      where('dateString', '==', dateString),
      where('shift', '==', ShiftType.NIGHT),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const nightSnapshot = await getDocs(nightQuery);
    if (!nightSnapshot.empty) {
      const doc = nightSnapshot.docs[0];
      const data = doc.data() as WardForm;
      console.log(`[getWardFormsByDateAndWard] Found night form: id=${doc.id}, status=${data.status}, patientCensus=${data.patientCensus}`);
      
      // คำนวณผลรวมของรับเข้าและจำหน่าย
      const admitTotal = (data.newAdmit || 0) + (data.transferIn || 0) + (data.referIn || 0);
      const dischargeTotal = (data.discharge || 0) + (data.transferOut || 0) + (data.referOut || 0) + (data.dead || 0);
      
      nightForm = {
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
    }
    
    // ใช้การค้นหาแบบแยกตามกะแทนการวนลูปทั้งหมด
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
const fetchTotalStats = async (startDateString: string, endDateString: string, user?: User | null, wardId?: string) => {
  console.log(`[fetchTotalStats] Fetching total stats for date range: ${startDateString} - ${endDateString}`);
  
  try {
    // ดึงข้อมูลจาก wardForms collection
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    
    // สร้าง query ที่ดึงข้อมูลในช่วงวันที่ที่เลือกและมีสถานะเป็น FINAL หรือ APPROVED
    let formsQuery = query(
      formsRef,
      where('dateString', '>=', startDateString),
      where('dateString', '<=', endDateString),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED])
    );

    // กรองข้อมูลตาม ward ที่เลือกถ้ามี, หากไม่มีและไม่ใช่ Admin ให้กรองตาม ward ของ user
    if (wardId) {
      formsQuery = query(formsQuery, where('wardId', '==', wardId.toUpperCase()));
      console.log(`[fetchTotalStats] Filtering by selected ward: ${wardId.toUpperCase()}`);
    } else if (user && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.DEVELOPER && user.floor) {
      formsQuery = query(formsQuery, where('wardId', '==', user.floor.toUpperCase()));
      console.log(`[fetchTotalStats] Filtering by user floor: ${user.floor.toUpperCase()}`);
    }
    
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
const fetchAllWardSummaryData = async (startDateString: string, endDateString: string, allAppWards: Ward[], fetchAllTimeData: boolean = false, user: User | null) => {
  const results: WardSummaryData[] = [];
  
  // กรอง allAppWards ตามสิทธิ์ผู้ใช้ก่อน
  let wardsToProcess = allAppWards;
  if (user && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.DEVELOPER) {
    // ถ้าไม่ใช่ Admin ให้แสดงเฉพาะ ward ที่ผู้ใช้มีสิทธิ์
    // ลองใช้ user.floor หรือ user.ward ถ้า accessibleWards ไม่มี
    if (user.floor) { // สมมติว่า user.floor คือ ID ของ ward ที่ผู้ใช้สังกัด
      wardsToProcess = allAppWards.filter(ward => ward.id === user.floor);
    } else {
      // หากไม่มีข้อมูล floor หรือ ward ใน user object อาจจะต้องใช้ logic อื่น
      // หรือ default ไปที่การไม่แสดงข้อมูล/แสดงข้อมูลของ ward แรกที่พบ
      wardsToProcess = []; // หรือ allAppWards.slice(0,1) หรือจัดการตามความเหมาะสม
      console.warn("[fetchAllWardSummaryData] User is not Admin and has no floor/ward information. No wards will be processed for summary.");
    }
  }
  console.log(`[fetchAllWardSummaryData] User role: ${user?.role}, Processing ${wardsToProcess.length} wards out of ${allAppWards.length} total wards.`);

  const wardIdsToDisplay = wardsToProcess.map(w => w.id?.toUpperCase() || '').filter(id => id !== '');
  
  const wardNameMap = new Map<string, string>();
  wardsToProcess.forEach(w => {
    if (w.id) { 
        wardNameMap.set(w.id.toUpperCase(), w.wardName);
    }
  });

  // ถ้า fetchAllTimeData เป็น true, ปรับ startDateString เป็นค่าเริ่มต้นมากๆ เพื่อดึงข้อมูลทั้งหมด
  // และ endDateString เป็นปัจจุบัน (หรืออนาคตเล็กน้อยเผื่อข้อมูลที่กำลังจะเข้า)
  const effectiveStartDateString = fetchAllTimeData ? '1970-01-01' : startDateString;
  // endDateString ควรเป็นปัจจุบันเสมอสำหรับการดึงข้อมูลทั้งหมด หรือตามที่ผู้ใช้เลือก
  const effectiveEndDateString = fetchAllTimeData ? format(addDays(new Date(), 1), 'yyyy-MM-dd') : endDateString;

  const isDateRange = !fetchAllTimeData && effectiveStartDateString !== effectiveEndDateString;

  console.log(`[fetchAllWardSummaryData] Fetching data for date range: ${effectiveStartDateString} - ${effectiveEndDateString} (isDateRange: ${isDateRange}, fetchAllTime: ${fetchAllTimeData})`);
  console.log(`[fetchAllWardSummaryData] Ward Name Map:`, wardNameMap);
  
  try {
    const wardSummaryMap = new Map<string, WardSummaryData>();
    
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
        daysWithData: 0 // ใช้สำหรับคำนวณค่าเฉลี่ยถ้าเป็นช่วงวันที่
      });
    });
    
    // ไม่ว่าจะเป็นช่วงวันที่หรือวันเดียว หรือดึงข้อมูลทั้งหมด ก็จะวนดึงข้อมูลของแต่ละ ward
    for (const wardId of wardIdsToDisplay) {
      // ใช้ effectiveStartDateString และ effectiveEndDateString ที่ปรับแล้ว
      const summariesForWard = await getApprovedSummariesByDateRange(wardId, effectiveStartDateString, effectiveEndDateString);
      console.log(`[fetchAllWardSummaryData] Found ${summariesForWard.length} summaries for ward ${wardId} in range ${effectiveStartDateString}-${effectiveEndDateString}`);
    
      if (summariesForWard.length > 0) {
        const summaryData = wardSummaryMap.get(wardId)!;
        
        if (isDateRange || fetchAllTimeData) { // ถ้าเป็นช่วงวันที่ หรือดึงข้อมูลทั้งหมด ให้รวมและ/หรือหาค่าเฉลี่ย
          summaryData.daysWithData = summariesForWard.length;
          summariesForWard.forEach(summary => {
            const formDataSource = (summary.nightPatientCensus !== undefined || summary.nightFormId) ? 'night' : 'morning';
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

          if (summaryData.daysWithData > 0) {
            // สำหรับข้อมูลที่เป็นค่าสะสม (เช่น newAdmit, discharge) ไม่ต้องหาค่าเฉลี่ย
            // สำหรับข้อมูลที่เป็น snapshot (เช่น patientCensus, staffing, beds) ให้หาค่าเฉลี่ย
            summaryData.patientCensus = Math.round(summaryData.patientCensus / summaryData.daysWithData);
            summaryData.nurseManager = Math.round(summaryData.nurseManager / summaryData.daysWithData);
            summaryData.rn = Math.round(summaryData.rn / summaryData.daysWithData);
            summaryData.pn = Math.round(summaryData.pn / summaryData.daysWithData);
            summaryData.wc = Math.round(summaryData.wc / summaryData.daysWithData);
            summaryData.available = Math.round(summaryData.available / summaryData.daysWithData);
            summaryData.unavailable = Math.round(summaryData.unavailable / summaryData.daysWithData);
            summaryData.plannedDischarge = Math.round(summaryData.plannedDischarge / summaryData.daysWithData);
          }
        } else { // กรณีวันเดียว (ไม่ใช่ isDateRange และไม่ใช่ fetchAllTimeData)
          const summary = summariesForWard[0]; // ใช้วันล่าสุด (ซึ่งควรจะเป็นวันเดียวกับที่ query)
          const formDataSource = (summary.nightPatientCensus !== undefined || summary.nightFormId) ? 'night' : 'morning';
          summaryData.patientCensus = summary[`${formDataSource}CalculatedCensus`] || summary[`${formDataSource}PatientCensus`] || 0;
          summaryData.nurseManager = summary[`${formDataSource}NurseManager`] ?? 0;
          summaryData.rn = summary[`${formDataSource}Rn`] ?? 0;
          summaryData.pn = summary[`${formDataSource}Pn`] ?? 0;
          summaryData.wc = summary[`${formDataSource}Wc`] ?? 0;
          summaryData.newAdmit = summary[`${formDataSource}NewAdmit`] ?? 0;
          summaryData.transferIn = summary[`${formDataSource}TransferIn`] ?? 0;
          summaryData.referIn = summary[`${formDataSource}ReferIn`] ?? 0;
          summaryData.discharge = summary[`${formDataSource}Discharge`] ?? 0;
          summaryData.transferOut = summary[`${formDataSource}TransferOut`] ?? 0;
          summaryData.referOut = summary[`${formDataSource}ReferOut`] ?? 0;
          summaryData.dead = summary[`${formDataSource}Dead`] ?? 0;
          
          // ดึงข้อมูลเตียงจาก dailySummaries หรือ wardForms
          // เนื่องจาก dailySummaries เก็บด้วยชื่อฟิลด์ availableBeds ส่วน wardForms เก็บด้วยชื่อฟิลด์ available
          if (summary.availableBeds !== undefined && summary.availableBeds !== null) {
            // กรณีมีข้อมูล availableBeds จาก dailySummaries
            summaryData.available = summary.availableBeds;
            summaryData.unavailable = summary.unavailableBeds ?? 0;
            summaryData.plannedDischarge = summary.plannedDischarge ?? 0;
          } else {
            // กรณีไม่มีข้อมูลใน availableBeds
            if (summary.unavailableBeds !== undefined && summary.unavailableBeds !== null) {
              // มีเฉพาะข้อมูล unavailableBeds แต่ไม่มี availableBeds
              summaryData.unavailable = summary.unavailableBeds;
              summaryData.plannedDischarge = summary.plannedDischarge ?? 0;
              
              // ดึงข้อมูล available จาก wardForms
              try {
                const { morning, night } = await getWardFormsByDateAndWard(wardId, summary.dateString);
                const wardForm = (formDataSource === 'night') ? night : morning;
                
                if (wardForm) {
                  summaryData.available = wardForm.available || 0;
                } else {
                  summaryData.available = 0; // ไม่พบข้อมูลใน wardForm
                }
              } catch (error) {
                console.error(`[fetchAllWardSummaryData] Error fetching ward form data for available: ${wardId}`, error);
                summaryData.available = 0; // กรณีเกิด error
              }
            } else {
              // ไม่มีข้อมูลใน dailySummaries เลย ดึงข้อมูลจาก wardForms ทั้งหมด
              try {
                const { morning, night } = await getWardFormsByDateAndWard(wardId, summary.dateString);
                const wardForm = (formDataSource === 'night') ? night : morning;
                
                if (wardForm) {
                  // พบข้อมูลใน wardForm
                  summaryData.available = wardForm.available || 0;
                  summaryData.unavailable = wardForm.unavailable || 0;
                  summaryData.plannedDischarge = wardForm.plannedDischarge || 0;
                  console.log(`[fetchAllWardSummaryData] Got bed data from wardForm: ${wardId}, available=${summaryData.available}`);
                } else {
                  // ไม่พบข้อมูลทั้ง dailySummaries และ wardForms ใช้ค่าดัมมี่
                  console.log(`[fetchAllWardSummaryData] No bed data found for ${wardId}, using dummy values with real total beds`);
                  // ดึงข้อมูลจากทะเบียนจำนวนเตียงทั้งหมดของแผนก (หรือใช้ค่าดีฟอลต์ตามแผนก)
                  const wardDetails = allAppWards.find((w: Ward) => w.id?.toUpperCase() === wardId);
                  // ตั้งค่าดีฟอลต์จำนวนเตียงตามแผนก
                  let defaultTotalBeds = 0; // เปลี่ยนจาก 20 เป็น 0 เพื่อไม่ให้แสดงค่าดีฟอลต์ที่ไม่ถูกต้อง
                  
                  // ไม่ใช้ค่า default ที่ไม่ถูกต้อง - ใช้ค่า 0 แทน
                  summaryData.available = 0; // ตั้งค่าเริ่มต้นให้ไม่มีเตียงว่าง
                  summaryData.unavailable = 0; // ตั้งค่าเริ่มต้นให้ไม่มีเตียงไม่ว่าง
                  summaryData.plannedDischarge = 0; // ไม่มีแผนจำหน่าย
                }
              } catch (error) {
                // กรณีเกิด error ใช้ค่าดัมมี่
                console.error(`[fetchAllWardSummaryData] Error fetching ward form data: ${wardId}`, error);
                summaryData.available = 3;
                summaryData.unavailable = 7;
                summaryData.plannedDischarge = 1;
              }
            }
          }
        }
        wardSummaryMap.set(wardId, summaryData);
      }
    }
    
    // แปลง Map เป็น Array 
    Array.from(wardSummaryMap.values()).forEach(summaryData => {
      delete summaryData.daysWithData; // ลบ field ที่ใช้เฉพาะการคำนวณภายใน
      results.push(summaryData);
    });
    
    console.log(`[fetchAllWardSummaryData] Final processed summary data (Count: ${results.length}):`, JSON.parse(JSON.stringify(results)));
  } catch (error) {
    console.error('[fetchAllWardSummaryData] Error fetching ward summary data:', error);
  }
  
  // ตรวจสอบความสมบูรณ์ของข้อมูลก่อนส่งออก
  results.forEach(ward => {
    // ตรวจสอบว่าข้อมูลเตียงว่างและไม่ว่างมีค่าที่สมเหตุสมผลหรือไม่
    const available = ward.available || 0;
    
    // ถ้าไม่มีข้อมูลเตียงไม่ว่างเลย ให้ใช้ค่า 0
    if (ward.unavailable === undefined || ward.unavailable === null) {
      ward.unavailable = 0;
      console.log(`[fetchAllWardSummaryData] Setting unavailable beds to 0 for ${ward.id}`);
    }
    
    // ถ้าไม่มีข้อมูลเตียงวางแผนจำหน่าย ให้ใช้ค่า 0
    if (ward.plannedDischarge === undefined || ward.plannedDischarge === null) {
      ward.plannedDischarge = 0;
    }
    
    console.log(`[fetchAllWardSummaryData] Final bed data for ${ward.id}: available=${ward.available}, unavailable=${ward.unavailable}, plannedDischarge=${ward.plannedDischarge}`);
  });
  
  return results;
};

// ตรวจสอบว่าผู้ใช้มีการเข้าถึง Ward ที่ระบุหรือไม่
const hasAccessToWard = (wardId: string, userWards: Ward[]): boolean => {
  return userWards.some(w => w.id === wardId);
};

// นำเข้า type สำหรับ markers
type CalendarMarker = { date: string; status: 'draft' | 'final' | 'approved' };

// ฟังก์ชันสำหรับแปลงวันที่เป็นชื่อวันภาษาไทย
const getThaiDayName = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDay();
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return thaiDays[day];
  } catch (error) {
    return '';
  }
};

// เพิ่ม interface สำหรับข้อมูลกราฟเส้นรายวัน
interface DailyPatientData {
  date: string;
  displayDate: string;
  morningPatientCount: number;
  nightPatientCount: number;
  totalPatientCount: number;
  wardId: string;
  wardName: string;
}

function DashboardPage() {
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
  const [tableData, setTableData] = useState<WardSummaryDataWithShifts[]>([]);
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
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  const [markers, setMarkers] = useState<CalendarMarker[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartDataItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]);
  const [dailyPatientData, setDailyPatientData] = useState<DailyPatientData[]>([]);
  const [dateRangeForDailyChart, setDateRangeForDailyChart] = useState('7days');
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // state สำหรับเก็บข้อมูลจำนวนเตียงระหว่างเวรเช้า-ดึก
  const [bedCensusData, setBedCensusData] = useState<WardCensusData[]>([]);
  
  // เพิ่ม ref สำหรับ scroll ไปยังส่วนต่างๆ
  const shiftComparisonRef = React.useRef<HTMLDivElement>(null);
  const wardSummaryRef = React.useRef<HTMLDivElement>(null);
  const patientTrendRef = React.useRef<HTMLDivElement>(null);

  // ตรวจสอบว่าผู้ใช้เป็นผู้ใช้ทั่วไปหรือไม่
  const isRegularUser = useMemo(() => {
    return user?.role !== UserRole.ADMIN && 
           user?.role !== UserRole.SUPER_ADMIN && 
           user?.role !== UserRole.DEVELOPER;
  }, [user]);

  // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
  const isAdmin = useMemo(() => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  }, [user]);

  // ฟังก์ชันสำหรับจัดการเมื่อมีการเปลี่ยนช่วงวันที่
  const handleDateRangeChange = useCallback((value: string) => {
    // ตั้งค่าช่วงวันที่ตามตัวเลือกที่เลือก
    switch(value) {
      case 'today':
        // วันนี้
        setEffectiveDateRange({
          start: startOfDay(new Date()),
          end: endOfDay(new Date())
        });
        
        // อัปเดต startDate และ endDate ให้เป็นวันเดียวกัน
        const today = format(new Date(), 'yyyy-MM-dd');
        setStartDate(today);
        setEndDate(today);
        break;
      case 'custom':
        // ใช้ค่า startDate และ endDate ที่ผู้ใช้กำหนด
        if (startDate && endDate) {
          setEffectiveDateRange({
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate))
          });
        }
        break;
      case 'all':
        // แสดงข้อมูลทั้งหมด
        setEffectiveDateRange({
          start: startOfDay(parseISO('2021-01-01')), // หรือวันที่เริ่มต้นที่ต้องการ
          end: endOfDay(new Date()) // วันปัจจุบัน
        });
        break;
      default:
        // ค่าดีฟอลต์คือวันนี้
        setEffectiveDateRange({
          start: startOfDay(new Date()),
          end: endOfDay(new Date())
        });
        break;
    }
  }, [startDate, endDate]);

  // อัพเดทเวลามีการเปลี่ยนแปลง Ward ที่เลือก
  const handleSelectWard = (wardId: string) => {
    // ถ้า wardId เป็นค่าว่าง ให้แสดงทุกแผนก
    if (wardId === "") {
      setSelectedWardId(null);
      console.log(`[handleSelectWard] Selecting all departments`);
      
      // แสดง loading indicator
      setLoading(true);
      
      // โหลดข้อมูลทั้งหมดใหม่
      (async () => {
        try {
          // ดึงข้อมูลทั้งหมดพร้อมกัน
          const promises = [
            // โหลดข้อมูล census
            fetchAllWardCensus(selectedDate),
            
            // โหลดข้อมูล stats
            fetchTotalStats(startDate, endDate, user, undefined),
            
            // โหลดข้อมูลแนวโน้มของทุกแผนก
            fetchPatientTrends(
            effectiveDateRange.start, 
            effectiveDateRange.end, 
            undefined, // ไม่ระบุ wardId เพื่อดึงข้อมูลทุกแผนก
            false, // ไม่ดึงข้อมูลทั้งหมด
            user, // ส่ง user เข้าไป
            wards // ส่ง wards ที่กรองแล้วเข้าไป
            ).then(trends => {
          setTrendData(trends);
              return trends;
            })
          ];
          
          await Promise.all(promises);
          logInfo(`[handleSelectWard] Successfully loaded all data for all departments`);
          
          // เรียกฟังก์ชันดึงข้อมูลผู้ป่วยรายวันหลังจากการดึงข้อมูลอื่นๆ เสร็จสิ้น
          await fetchDailyPatientData();
        } catch (error) {
          logError('[handleSelectWard] Error loading data:', error);
        } finally {
          setLoading(false);
        }
      })();
      
      // ไม่ต้อง scroll ไปที่ส่วนเปรียบเทียบ เพราะไม่มีแผนกที่เลือก
      patientTrendRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    // ถ้าผู้ใช้ทั่วไปและ wardId ไม่ตรงกับ ward ของผู้ใช้ ให้ข้ามการทำงาน
    if (isRegularUser && user?.floor && user.floor.toUpperCase() !== wardId.toUpperCase()) {
      console.log(`[handleSelectWard] Regular user (${user?.floor}) cannot select different ward (${wardId})`);
      return;
    }
    
    // ถ้าผู้ใช้มีสิทธิ์เข้าถึง Ward นี้ หรือเป็น Admin ให้เลือกได้
    if (isAdmin || hasAccessToWard(wardId, wards)) {
      setSelectedWardId(wardId);
      
      // แสดง loading indicator
      setLoading(true);
      
      // โหลดข้อมูลทั้งหมดใหม่
      (async () => {
        try {
          // ดึงข้อมูล ward form และ summary ก่อน
      if (selectedDate) {
            await getWardFormsByDateAndWard(wardId, selectedDate);
      }
      
          // ดึงข้อมูลทั้งหมดพร้อมกัน
          const promises = [
            // โหลดข้อมูล census
            fetchAllWardCensus(selectedDate),
            
            // โหลดข้อมูล stats
            fetchTotalStats(startDate, endDate, user, wardId),
            
            // โหลดข้อมูลแนวโน้ม
            fetchPatientTrends(
              effectiveDateRange.start, 
              effectiveDateRange.end, 
              wardId
            ).then(trends => {
            setTrendData(trends);
              return trends;
            })
          ];
          
          await Promise.all(promises);
          logInfo(`[handleSelectWard] Successfully loaded all data for ward ${wardId}`);
          
          // เรียกฟังก์ชันดึงข้อมูลผู้ป่วยรายวันหลังจากการดึงข้อมูลอื่นๆ เสร็จสิ้น
          await fetchDailyPatientData();
          } catch (error) {
          logError('[handleSelectWard] Error loading data:', error);
        } finally {
          setLoading(false);
          }
      })();
      
      // หลังจากเลือก ward ทำการเลื่อนไปที่ส่วนเปรียบเทียบ
        shiftComparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ฟังก์ชันสำหรับการทำงานเมื่อผู้ใช้เลือกดูส่วนต่างๆ
  const handleActionSelect = (action: string) => {
    switch (action) {
      case 'comparison':
        // ต้องมีการเลือก ward ก่อนเสมอ
        if (!selectedWardId && wards.length > 0) {
          setSelectedWardId(wards[0].id || '');
          // โหลดข้อมูล ward ใหม่
          if (wards[0].id && selectedDate) {
            fetchWardForms(wards[0].id, selectedDate);
          }
        }
        // ลบ setTimeout
          shiftComparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'trend':
        // กรณีเลือกดูแนวโน้ม ให้เลื่อนไปที่ส่วนแนวโน้ม
        // ลบ setTimeout
          patientTrendRef.current?.scrollIntoView({ behavior: 'smooth' });
          // หากไม่มีข้อมูลแนวโน้ม ให้โหลดใหม่
          if (trendData.length === 0) {
            const fetchTrend = async () => {
              try {
                const trends = await fetchPatientTrends(
                  effectiveDateRange.start, 
                  effectiveDateRange.end, 
                  selectedWardId || undefined
                );
                setTrendData(trends);
              } catch (error) {
                console.error('[handleActionSelect] Error fetching trend data:', error);
              }
            };
            fetchTrend();
          }
        break;
      case 'refresh':
        // กรณีสั่งรีเฟรชข้อมูล ให้โหลดข้อมูลใหม่ทั้งหมด
        refreshData();
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
        
        // สำหรับผู้ใช้ทั่วไป ให้เลือก Ward ของตัวเองโดยอัตโนมัติ
        if (isRegularUser && user.floor) {
          const userWard = userDashboardWards.find(w => 
            w.id?.toUpperCase() === user.floor?.toUpperCase()
          );
          if (userWard && userWard.id) {
            setSelectedWardId(userWard.id);
            console.log(`[loadWards] Regular user: Auto-selecting user's ward: ${userWard.id}`);
          } else if (userDashboardWards.length > 0) {
            // เลือก ward แรกที่ไม่ใช่ Ward6
            const firstNonWard6 = userDashboardWards.find(w => w.id?.toUpperCase() !== 'WARD6');
            if (firstNonWard6 && firstNonWard6.id) {
              setSelectedWardId(firstNonWard6.id);
            } else {
              setSelectedWardId(userDashboardWards[0].id);
            }
          }
        } else {
          // สำหรับแอดมิน ไม่เลือก ward ใดเป็นค่าเริ่มต้น เพื่อให้แสดงข้อมูลทุกแผนก
          setSelectedWardId(null);
          console.log(`[loadWards] Admin user: Not selecting any ward by default to show all departments`);
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
  }, [user, isRegularUser]);
  
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
    if (!selectedDate || !user) {
      return;
    }
    
    const fetchCensusData = async () => {
      setLoading(true);
      try {
        // ดึง census map ก่อน
        const censusMap = await fetchAllWardCensus(selectedDate);
        setWardCensusMap(censusMap);
        
        // ใช้ Promise.all เพื่อ parallelize การดึงข้อมูล ward forms และ summaries
        const bedPromises = wards
          .filter(ward => ward.id)
          .map(async ward => {
            const wardId = ward.id!.toUpperCase();
            try {
              // ดึงข้อมูล forms และ summaries พร้อมกัน
              const [{ morning, night }, summaryResult] = await Promise.all([
                getWardFormsByDateAndWard(ward.id!, selectedDate),
                getDailySummary(ward.id!, selectedDate)
              ]);
              const morningData = morning || summaryResult.morning;
              const nightData = night || summaryResult.night;
              return {
                id: wardId,
                wardName: ward.wardName,
                patientCount: morningData?.patientCensus || nightData?.patientCensus || 0,
                morningPatientCount: morningData?.patientCensus || 0,
                nightPatientCount: nightData?.patientCensus || 0
              };
            } catch (err) {
              console.error(`[DashboardPage] Error fetching bed data for ward ${ward.id}:`, err);
              return {
                id: ward.id!.toUpperCase(),
                wardName: ward.wardName,
                patientCount: 0,
                morningPatientCount: 0,
                nightPatientCount: 0
              };
            }
          });
        const initialBedData = await Promise.all(bedPromises);
        // สร้าง set ของ ward ที่ประมวลผลแล้ว
        const processedWardIds = new Set(initialBedData.map(item => item.id));
        
        // เพิ่มข้อมูลจาก initial bed data
        let bedCensusArr: WardCensusData[] = [...initialBedData];
        
        // ส่วนแผนกเพิ่มเติม (ยังคงเดิม)
        
        // เพิ่มข้อมูลสำหรับแผนกที่ไม่ได้อยู่ใน wards (แผนกที่ผู้ใช้ไม่มีสิทธิ์เข้าถึง)
        // กำหนดรายชื่อแผนกทั้งหมดที่ต้องแสดงใน Dashboard
        const allWardIds = ['CCU', 'ICU', 'LR', 'NSY', 'WARD10B', 'WARD11', 'WARD12', 'WARD6', 'WARD7', 'WARD8', 'WARD9', 'WARDGI'];
        const allWardNames: { [key: string]: string } = {
          'CCU': 'CCU', 'ICU': 'ICU', 'LR': 'LR', 'NSY': 'NSY', 
          'WARD10B': 'Ward10B', 'WARD11': 'Ward11', 'WARD12': 'Ward12', 
          'WARD6': 'Ward6', 'WARD7': 'Ward7', 'WARD8': 'Ward8', 'WARD9': 'Ward9', 'WARDGI': 'WardGI'
        };
        
        // เพิ่มแผนกที่ยังไม่มีข้อมูล
        for (const wardId of allWardIds) {
          if (!processedWardIds.has(wardId)) {
            try {
              // ดึงข้อมูลจาก wardForms โดยตรง - จะมีข้อมูลแยกเวรเช้า-ดึก
              const { morning, night } = await getWardFormsByDateAndWard(wardId, selectedDate);
              
              // ดึงข้อมูลจาก dailySummaries เพิ่มเติม (ถ้ามี) - จะมีข้อมูลรวมทั้งวัน
              const summaryResult = await getDailySummary(wardId, selectedDate);
              
              // ใช้ข้อมูลจาก getWardFormsByDateAndWard ก่อน ถ้าไม่มีจึงใช้จาก getDailySummary
              const morningData = morning || summaryResult.morning;
              const nightData = night || summaryResult.night;
              
              console.log(`[fetchCensusData] Data for additional ward ${wardId}: morning=${!!morningData}, night=${!!nightData}`);
              
              // ใช้ข้อมูลที่มีจริงจากฐานข้อมูล
              bedCensusArr.push({
                id: wardId,
                wardName: allWardNames[wardId] || wardId,
                patientCount: morningData?.patientCensus || nightData?.patientCensus || 0,
                morningPatientCount: morningData?.patientCensus || 0,
                nightPatientCount: nightData?.patientCensus || 0
              });
            } catch (err) {
              console.error(`[DashboardPage] Error fetching data for additional ward ${wardId}:`, err);
              // ใส่ข้อมูลเปล่าแทนหากมีข้อผิดพลาด
              bedCensusArr.push({
                id: wardId,
                wardName: allWardNames[wardId] || wardId,
                patientCount: 0,
                morningPatientCount: 0,
                nightPatientCount: 0
              });
            }
          }
        }
        
        // เรียงลำดับตามจำนวนเตียงเริ่มจากมากไปน้อย
        bedCensusArr.sort((a: WardCensusData, b: WardCensusData) => {
          const aTotal = (a.morningPatientCount || 0) + (a.nightPatientCount || 0);
          const bTotal = (b.morningPatientCount || 0) + (b.nightPatientCount || 0);
          return bTotal - aTotal;
        });
        
        console.log(`[fetchCensusData] Total wards in bedCensusArr: ${bedCensusArr.length}`);
        setBedCensusData(bedCensusArr);
      } catch (err) {
        console.error('[DashboardPage] Error fetching ward census data:', err);
      } finally {
        setLoading(false);
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
        const fetchAllTime = dateRange === 'all';
        // หาก fetchAllTime เป็น true, startDate และ endDate จะถูก override ใน fetchAllWardSummaryData
        // หากไม่ใช่ ให้ใช้ effectiveDateRange ปกติ
        const startDateStr = fetchAllTime ? '1970-01-01' : format(effectiveDateRange.start, 'yyyy-MM-dd');
        const endDateStr = fetchAllTime ? format(addDays(new Date(), 1), 'yyyy-MM-dd') : format(effectiveDateRange.end, 'yyyy-MM-dd');
        
        const allAppWards = wards; // wards นี้ควรเป็น state ที่มีข้อมูล ward ทั้งหมดที่ผู้ใช้มีสิทธิ์
        // ส่ง flag fetchAllTime และ user เข้าไป
        const summaryData = await fetchAllWardSummaryData(startDateStr, endDateStr, allAppWards, fetchAllTime, user);
        setWardSummaryData(summaryData);
        
        // totalStats ควรดึงข้อมูลของวันล่าสุดในช่วงที่เลือก หรือวันปัจจุบันถ้าเป็น "แสดงทั้งหมด"
        const statsDate = fetchAllTime ? format(new Date(), 'yyyy-MM-dd') : format(effectiveDateRange.end, 'yyyy-MM-dd');
        const stats = await fetchTotalStats(statsDate, statsDate, user, selectedWardId || undefined); // ส่ง user และ selectedWardId เข้าไป
        setTotalStats(stats);
      } catch (err) {
        console.error('[DashboardPage] Error fetching ward summary data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaryData();
  }, [effectiveDateRange, user, wards, dateRange, selectedWardId]);
        
  // ดึงข้อมูลแนวโน้มผู้ป่วย
  useEffect(() => {
    if (!user || wards.length === 0) {
      setTrendData([]);
      return;
    }
    
    const fetchTrendDataHandler = async () => {
      try {
        setLoading(true);
        
        const fetchAllTime = dateRange === 'all';
        let effectiveWardId = undefined;
        
        // ถ้ามีการเลือก ward เฉพาะเจาะจง
        if (selectedWardId && currentView === ViewType.WARD_DETAIL) {
            effectiveWardId = selectedWardId;
        } else if (selectedWardId && dateRange !== 'all') {
            // กรณีเลือกแผนกแต่ไม่ได้อยู่ใน view รายละเอียด และไม่ได้เลือกแสดงทั้งหมด
            effectiveWardId = selectedWardId;
        }
        
        console.log(`[fetchTrendDataHandler] Fetching trend data: effectiveWardId=${effectiveWardId}, dateRange=${dateRange}, fetchAllTime=${fetchAllTime}`);
        
        // หาก fetchAllTime เป็น true, startDate และ endDate จะถูก override ใน fetchPatientTrends
        // หากไม่ใช่ ให้ใช้ effectiveDateRange ปกติ
        const trends = await fetchPatientTrends(
            effectiveDateRange.start, 
            effectiveDateRange.end, 
            effectiveWardId,
            fetchAllTime, // ส่ง flag fetchAllTime เข้าไป
            user, // ส่ง user เข้าไป
            wards // ส่ง wards ที่กรองสิทธิ์แล้วเข้าไป
        );
        
        if (trends.length > 0) {
            console.log(`[fetchTrendDataHandler] Fetched ${trends.length} data points. Sample data:`, trends[0]);
        } else {
            console.log(`[fetchTrendDataHandler] No trend data fetched.`);
        }
        
        setTrendData(trends);
      } catch (err) {
        console.error('[DashboardPage] Error fetching trend data:', err);
        setTrendData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrendDataHandler();
  }, [effectiveDateRange, currentView, selectedWardId, user, wards, dateRange]); // เพิ่ม dateRange ใน dependencies

  const selectedWard = useMemo(() => wards.find(w => w.id === selectedWardId), [wards, selectedWardId]);
  
  // ตรวจสอบ summary มีค่าหรือไม่
  useEffect(() => {
    console.log('[DashboardPage] Current summary state:', summary);
  }, [summary]);

  // ฟังก์ชันคำนวณจำนวนเตียงรวมตามช่วงวันที่
  const calculateBedSummary = useCallback(async () => {
    logInfo("[calculateBedSummary] Starting bed summary calculation...");
    
    // ตั้งค่า loading หลังจาก 300ms เพื่อป้องกันการกระพริบของ UI
    const loadingTimer = setTimeout(() => setLoading(true), 300);
    
    try {
      // สร้างชุดข้อมูลสำหรับแต่ละ Ward ทั้งหมด
      const summaryMap = new Map<string, { total: number, available: number, unavailable: number, plannedDischarge: number }>();
      
      // แทนที่จะดึงข้อมูลทีละ ward ให้ดึงข้อมูลทุก ward พร้อมกัน
      const wardPromises = wards
        .filter(ward => ward.id) // กรองเฉพาะ ward ที่มี id
        .map(async (ward) => {
          try {
            if (!ward.id) return null;
            
            // ใช้ selectedDate แทน effectiveDateRange.end
            const currentDateString = selectedDate;
            logInfo(`[calculateBedSummary] Getting data for ward ${ward.id} on date ${currentDateString}`);
            
            // ดึงข้อมูลแบบฟอร์มของ ward ในวันที่เลือก - ดึงทั้ง ward form และ daily summary พร้อมกัน
            const [wardFormResult, dailySummaryResult] = await Promise.all([
              getWardFormsByDateAndWard(ward.id, currentDateString),
              getDailySummary(ward.id, currentDateString)
            ]);
            
            // รวมข้อมูลจาก ward form และ daily summary
            const { morning: wardFormMorning, night: wardFormNight } = wardFormResult;
            const { morning: summaryMorning, night: summaryNight } = dailySummaryResult;
            
            // ใช้ข้อมูลจาก ward form หากมี ถ้าไม่มีให้ใช้จาก daily summary
            const morning = wardFormMorning || summaryMorning;
            const night = wardFormNight || summaryNight;
            
            // ใช้ข้อมูลเวรเช้าเป็นหลัก ถ้าไม่มีให้ใช้เวรดึก
            let availableBeds = 0;
            let unavailableBeds = 0;
            let plannedDischarge = 0;
            let totalBeds = 0;
            
            if (morning) {
              availableBeds = morning.available || 0;
              unavailableBeds = morning.unavailable || 0;
              plannedDischarge = morning.plannedDischarge || 0;
              totalBeds = (morning.available || 0) + (morning.unavailable || 0);
            } else if (night) {
              availableBeds = night.available || 0;
              unavailableBeds = night.unavailable || 0;
              plannedDischarge = night.plannedDischarge || 0;
              totalBeds = (night.available || 0) + (night.unavailable || 0);
            }
            
            // ตรวจสอบความถูกต้องของข้อมูล
            if (availableBeds < 0) availableBeds = 0;
            if (unavailableBeds < 0) unavailableBeds = 0;
            if (plannedDischarge < 0) plannedDischarge = 0;
            
            return {
              id: ward.id,
              wardName: ward.wardName,
              value: availableBeds,
              unavailable: unavailableBeds,
              plannedDischarge: plannedDischarge,
              total: totalBeds
            };
          } catch (error) {
            logError(`[calculateBedSummary] Error processing ward ${ward.id}:`, error);
            // กรณีมีข้อผิดพลาด ให้ส่งข้อมูลว่างเปล่า
            return {
              id: ward.id || 'unknown',
              wardName: ward.wardName || 'Unknown Ward',
              value: 0,
              unavailable: 0,
              plannedDischarge: 0,
              total: 0
            };
          }
        });
      
      // รอให้ทุก ward ทำงานเสร็จพร้อมกัน
      const results = await Promise.all(wardPromises);
      
      // กรองข้อมูลที่เป็น null ออก
      const filteredResults = results.filter(result => result !== null) as PieChartDataItem[];
      
      // ตรวจสอบว่ามีข้อมูลอย่างน้อย 1 รายการหรือไม่
      logInfo(`[calculateBedSummary] Processed ${filteredResults.length} wards with bed data`);
      
      // อัพเดท pieChartData
      setPieChartData(filteredResults);
      
      return filteredResults;
    } catch (error) {
      logError('[calculateBedSummary] Error calculating bed summary:', error);
      // กรณีมีข้อผิดพลาด ให้ล้างข้อมูลเพื่อแสดงข้อความไม่มีข้อมูล
      setPieChartData([]);
      return [];
    } finally {
      // ยกเลิก timer หากยังไม่ได้ทำงาน
      clearTimeout(loadingTimer);
      // ปิด loading หลังจากเสร็จสิ้น
      setLoading(false);
    }
  }, [selectedDate, wards]);

  // ฟังก์ชันสำหรับรีเฟรชข้อมูลทั้งหมด
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user || wards.length === 0) return;

      const fetchAllTime = dateRange === 'all';
      const currentEndDate = fetchAllTime ? new Date() : effectiveDateRange.end;
      const currentStartDate = fetchAllTime ? parseISO('1970-01-01') : effectiveDateRange.start;

      const dateToQueryStats = format(currentEndDate, 'yyyy-MM-dd');
      const startDateForSummary = format(currentStartDate, 'yyyy-MM-dd');
      const endDateForSummary = format(currentEndDate, 'yyyy-MM-dd');

      logInfo(`[refreshData] Refreshing data for dateRange=${dateRange}, start=${startDateForSummary}, end=${endDateForSummary}`);

      // ดึงข้อมูลสรุปทั้งหมด
      // ส่ง flag fetchAllTime เข้าไปใน fetchAllWardSummaryData
      const summaryData = await fetchAllWardSummaryData(startDateForSummary, endDateForSummary, wards, fetchAllTime, user);
      setWardSummaryData(summaryData);
      
      // ดึงข้อมูลสถิติทั้งหมด
      const stats = await fetchTotalStats(startDateForSummary, endDateForSummary, user, selectedWardId || undefined); // รวม selectedWardId
      setTotalStats(stats);
      
      // ดึงข้อมูล Census
      const censusMap = await fetchAllWardCensus(dateToQueryStats); // Census ยังคงใช้ dateToQueryStats (วันสุดท้าย)
      setWardCensusMap(censusMap);
      
      // ดึงข้อมูลแนวโน้ม
      const effectiveWardId = selectedWardId ?? undefined;
      // ส่ง flag fetchAllTime เข้าไปใน fetchPatientTrends
      const trends = await fetchPatientTrends(currentStartDate, currentEndDate, effectiveWardId, fetchAllTime, user, wards);
      setTrendData(trends);
      
      // ดึงข้อมูลแบบฟอร์ม
      if (selectedWardId) {
        // fetchWardForms ควรดึงข้อมูลของ selectedDate (ถ้า dateRange ไม่ใช่ 'all')
        // หรือวันล่าสุดถ้า dateRange เป็น 'all'
        const formDateToQuery = dateRange === 'all' ? format(new Date(), 'yyyy-MM-dd') : selectedDate;
        await fetchWardForms(selectedWardId, formDateToQuery);
      }
      
      // เรียกใช้ฟังก์ชัน createTableData เพื่อสร้างข้อมูลตาราง
      await createTableData();
      
      // เรียกใช้ calculateBedSummary เพื่อคำนวณข้อมูลกราฟวงกลม
      await calculateBedSummary();
      
      logInfo("[refreshData] All data refreshed successfully including bed summary data");

    } catch (error) {
      console.error('[refreshData] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, effectiveDateRange, selectedDate, selectedWardId, user, wards, calculateBedSummary]);

  // แยกฟังก์ชัน createTableData ออกมาเพื่อลดความซับซ้อน
  const createTableData = useCallback(async () => {
    if (!user || wards.length === 0) return;
    
    try {
      logInfo('[createTableData] Creating table data...');
      
      // สร้างข้อมูลสำหรับตาราง
      const results = await Promise.all(
        wards.filter(ward => ward.id).map(async ward => {
          try {
            // ดึงข้อมูลจาก wardForms
            const { morning, night } = await getWardFormsByDateAndWard(ward.id!, selectedDate);
            
            // ข้อมูลจาก dailySummaries
            const summaryResult = await getDailySummary(ward.id!, selectedDate);
            
            const morningData = morning || summaryResult.morning;
            const morningShift: WardFormSummary | undefined = morning ? {
              patientCensus: morning.patientCensus || 0,
              nurseManager: morning.nurseManager || 0,
              rn: morning.rn || 0,
              pn: morning.pn || 0,
              wc: morning.wc || 0,
              newAdmit: morning.newAdmit || 0,
              transferIn: morning.transferIn || 0,
              referIn: morning.referIn || 0,
              discharge: morning.discharge || 0,
              transferOut: morning.transferOut || 0,
              referOut: morning.referOut || 0,
              dead: morning.dead || 0,
              available: morning.available || 0,
              unavailable: morning.unavailable || 0,
              plannedDischarge: morning.plannedDischarge || 0
            } : undefined;
            
            const nightData = night || summaryResult.night;
            const nightShift: WardFormSummary | undefined = night ? {
              patientCensus: night.patientCensus || 0,
              nurseManager: night.nurseManager || 0,
              rn: night.rn || 0,
              pn: night.pn || 0,
              wc: night.wc || 0,
              newAdmit: night.newAdmit || 0,
              transferIn: night.transferIn || 0,
              referIn: night.referIn || 0,
              discharge: night.discharge || 0,
              transferOut: night.transferOut || 0,
              referOut: night.referOut || 0,
              dead: night.dead || 0,
              available: night.available || 0,
              unavailable: night.unavailable || 0,
              plannedDischarge: night.plannedDischarge || 0
            } : undefined;
            
            return {
              id: ward.id!,
              wardName: ward.wardName,
              morningShift,
              nightShift,
              totalData: {
                patientCensus: morningShift?.patientCensus || nightShift?.patientCensus || 0,
                nurseManager: morningShift?.nurseManager || nightShift?.nurseManager || 0,
                rn: morningShift?.rn || nightShift?.rn || 0,
                pn: morningShift?.pn || nightShift?.pn || 0,
                wc: morningShift?.wc || nightShift?.wc || 0,
                newAdmit: morningShift?.newAdmit || nightShift?.newAdmit || 0,
                transferIn: morningShift?.transferIn || nightShift?.transferIn || 0,
                referIn: morningShift?.referIn || nightShift?.referIn || 0,
                discharge: morningShift?.discharge || nightShift?.discharge || 0,
                transferOut: morningShift?.transferOut || nightShift?.transferOut || 0,
                referOut: morningShift?.referOut || nightShift?.referOut || 0,
                dead: morningShift?.dead || nightShift?.dead || 0,
                available: morningShift?.available || nightShift?.available || 0,
                unavailable: morningShift?.unavailable || nightShift?.unavailable || 0,
                plannedDischarge: morningShift?.plannedDischarge || nightShift?.plannedDischarge || 0
              }
            };
          } catch (error) {
            console.error(`[createTableData] Error processing ward ${ward.id}:`, error);
            return {
              id: ward.id!,
              wardName: ward.wardName,
              morningShift: undefined,
              nightShift: undefined,
              totalData: {
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
                plannedDischarge: 0
              }
            };
          }
        })
      );
      
      // เพิ่ม Grand Total
      const grandTotal: WardSummaryDataWithShifts = {
        id: 'GRAND_TOTAL',
        wardName: 'Total All',
        morningShift: (() => {
          const total: WardFormSummary = {
            patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
            newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0,
            transferOut: 0, referOut: 0, dead: 0, available: 0,
            unavailable: 0, plannedDischarge: 0
          };
          results.forEach(ward => {
            if (ward.morningShift) {
              Object.keys(total).forEach(key => {
                (total as any)[key] += (ward.morningShift as any)[key] || 0;
              });
            }
          });
          return total;
        })(),
        nightShift: (() => {
          const total: WardFormSummary = {
            patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
            newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0,
            transferOut: 0, referOut: 0, dead: 0, available: 0,
            unavailable: 0, plannedDischarge: 0
          };
          results.forEach(ward => {
            if (ward.nightShift) {
              Object.keys(total).forEach(key => {
                (total as any)[key] += (ward.nightShift as any)[key] || 0;
              });
            }
          });
          return total;
        })(),
        totalData: (() => {
          const total: WardFormSummary = {
            patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
            newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0,
            transferOut: 0, referOut: 0, dead: 0, available: 0,
            unavailable: 0, plannedDischarge: 0
          };
          summaryDataList.forEach(ward => {
            Object.keys(total).forEach(key => {
              (total as any)[key] += (ward as any)[key] || 0;
            });
          });
          return total;
        })()
      };
      
      setTableData([...results, grandTotal]);
    } catch (error) {
      console.error('[createTableData] Error:', error);
      setTableData([]);
    }
  }, [selectedDate, summaryDataList, user, wards]);

  // เรียกใช้ createTableData เมื่อ summaryDataList หรือ selectedDate เปลี่ยนแปลง
  useEffect(() => {
    createTableData();
  }, [createTableData, summaryDataList, selectedDate]);
  


  useEffect(() => {
    if (!loading && markers.length > 0) {
      // แปลง markers เป็น calendarEvents
      const events: Event[] = markers.map(marker => {
        let color: 'purple' | 'sky' | 'emerald' | 'yellow' = 'sky';
        let title = 'รายงาน';
        
        switch(marker.status) {
          case 'approved':
            color = 'purple';
            title = 'รายงานที่อนุมัติแล้ว';
            break;
          case 'final':
            color = 'emerald';
            title = 'รายงานสมบูรณ์';
            break;
          case 'draft':
            color = 'yellow';
            title = 'รายงานฉบับร่าง';
            break;
        }
        
        return {
          id: `marker-${marker.date}`,
          title: title,
          description: `สถานะการรายงานประจำวันที่ ${marker.date}`,
          date: marker.date,
          startTime: '00:00',
          endTime: '23:59',
          color: color
        };
      });
      
      setCalendarEvents(events);
    }
  }, [markers, loading]);

  // เพิ่ม useEffect เพื่อเรียกใช้ calculateBedSummary เมื่อข้อมูลเปลี่ยนแปลง
  useEffect(() => {
    if (user && wards.length > 0) {
      logInfo("[Dashboard] Calling calculateBedSummary due to date/ward changes");
      // เปลี่ยนจากการเรียกโดยตรงเป็นการใช้ IIFE เพื่อจัดการกับ Promise
      (async () => {
        try {
          setLoading(true);
          await calculateBedSummary();
          logInfo("[Dashboard] calculateBedSummary completed successfully from date/ward changes");
        } catch (error) {
          logError("[Dashboard] Error in calculateBedSummary from date/ward changes:", error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [calculateBedSummary, selectedDate, selectedWardId, user, wards]);

  // เพิ่ม useEffect เพื่อเรียกใช้ calculateBedSummary เมื่อ summaryDataList เปลี่ยนแปลง
  useEffect(() => {
    if (summaryDataList?.length > 0) {
      logInfo("[Dashboard] Calling calculateBedSummary due to summaryDataList changes");
      // เปลี่ยนจากการเรียกโดยตรงเป็นการใช้ IIFE เพื่อจัดการกับ Promise
      (async () => {
        try {
          setLoading(true);
          await calculateBedSummary();
          logInfo("[Dashboard] calculateBedSummary completed successfully from summaryDataList changes");
        } catch (error) {
          logError("[Dashboard] Error in calculateBedSummary from summaryDataList changes:", error);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      logInfo("[Dashboard] No summaryDataList data available for calculateBedSummary");
    }
  }, [calculateBedSummary, summaryDataList]);

  // เพิ่ม useEffect ใหม่เพื่อดึงข้อมูลสถานะสำหรับปฏิทิน
  useEffect(() => {
    if (!user) return;
    
    const fetchCalendarMarkers = async () => {
      try {
        setLoading(true);
        // ดึงข้อมูลสถานะจาก wardForms ในเดือนปัจจุบัน
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const firstDayOfMonth = format(new Date(currentYear, currentMonth, 1), 'yyyy-MM-dd');
        const lastDayOfMonth = format(endOfMonth(new Date(currentYear, currentMonth, 1)), 'yyyy-MM-dd');
        
        // ดึงข้อมูลจาก collection wardForms
        const formsRef = collection(db, COLLECTION_WARDFORMS);
        const q = query(
          formsRef,
          where('dateString', '>=', firstDayOfMonth),
          where('dateString', '<=', lastDayOfMonth),
          orderBy('dateString', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        
        // จัดกลุ่มข้อมูลตามวันที่และสถานะสูงสุด
        const dateStatusMap = new Map<string, string>();
        
        querySnapshot.forEach(doc => {
          const data = doc.data() as WardForm;
          const dateString = data.dateString;
          const status = data.status;
          
          if (!dateString) return;
          
          // อัปเดตสถานะเฉพาะถ้าเป็นสถานะที่สูงกว่าหรือยังไม่มีข้อมูล
          if (!dateStatusMap.has(dateString)) {
            dateStatusMap.set(dateString, status);
          } else {
            const currentStatus = dateStatusMap.get(dateString);
            // ตรวจสอบและอัปเดตสถานะตามลำดับความสำคัญ
            if (
              (currentStatus === FormStatus.DRAFT && (status === FormStatus.FINAL || status === FormStatus.APPROVED)) ||
              (currentStatus === FormStatus.FINAL && status === FormStatus.APPROVED)
            ) {
              dateStatusMap.set(dateString, status);
            }
          }
        });
        
        // แปลงข้อมูลเป็น markers
        const calendarMarkers: CalendarMarker[] = [];
        
        dateStatusMap.forEach((status, date) => {
          let markerStatus: 'draft' | 'final' | 'approved';
          
          switch(status) {
            case FormStatus.APPROVED:
              markerStatus = 'approved';
              break;
            case FormStatus.FINAL:
              markerStatus = 'final';
              break;
            default:
              markerStatus = 'draft';
          }
          
          calendarMarkers.push({
            date,
            status: markerStatus
          });
        });
        
        setMarkers(calendarMarkers);
        
        // แปลง markers เป็น events สำหรับปฏิทิน
        const events: Event[] = calendarMarkers.map(marker => {
          let color: 'purple' | 'sky' | 'emerald' | 'yellow';
          let title: string;
          
          switch(marker.status) {
            case 'approved':
              color = 'purple';
              title = 'รายงานที่อนุมัติแล้ว';
              break;
            case 'final':
              color = 'emerald';
              title = 'รายงานสมบูรณ์';
              break;
            default:
              color = 'yellow';
              title = 'รายงานฉบับร่าง';
          }
          
          return {
            id: `marker-${marker.date}`,
            title: title,
            description: `สถานะการรายงานประจำวันที่ ${marker.date}`,
            date: marker.date,
            startTime: '00:00',
            endTime: '23:59',
            color: color
          };
        });
        
        setCalendarEvents(events);
      } catch (error) {
        console.error('[fetchCalendarMarkers] Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalendarMarkers();
  }, [user]);

  // แก้ไข useEffect สำหรับการทำงานของ calendarEvents
  useEffect(() => {
    if (markers.length > 0) {
      // แปลง markers เป็น calendarEvents
      const events: Event[] = markers.map(marker => {
        let color: 'purple' | 'sky' | 'emerald' | 'yellow' = 'sky';
        let title = 'รายงาน';
        
        switch(marker.status) {
          case 'approved':
            color = 'purple';
            title = 'รายงานที่อนุมัติแล้ว';
            break;
          case 'final':
            color = 'emerald';
            title = 'รายงานสมบูรณ์';
            break;
          case 'draft':
            color = 'yellow';
            title = 'รายงานฉบับร่าง';
            break;
        }
        
        return {
          id: `marker-${marker.date}`,
          title: title,
          description: `สถานะการรายงานประจำวันที่ ${marker.date}`,
          date: marker.date,
          startTime: '00:00',
          endTime: '23:59',
          color: color
        };
      });
      
      setCalendarEvents(events);
    }
  }, [markers]);

  // ดึงข้อมูลผู้ป่วยรายวันย้อนหลัง
  const fetchDailyPatientData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // กำหนดช่วงวันที่ตามที่เลือก
      let startDateStr: string;
      let endDateStr = format(new Date(), 'yyyy-MM-dd');
      
      switch (dateRangeForDailyChart) {
        case '7days':
          startDateStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');
          break;
        case '30days':
          startDateStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');
          break;
        case 'custom':
          startDateStr = customStartDate;
          endDateStr = customEndDate;
          break;
        default:
          startDateStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      }
      
      const startDate = parseISO(startDateStr);
      const endDate = parseISO(endDateStr);
      
      // กำหนด wardId ตามสิทธิ์การเข้าถึง
      let wardIdToFetch: string | undefined;
      
      if (selectedWardId) {
        // ถ้ามีการเลือก ward ใช้ ward ที่เลือก
        wardIdToFetch = selectedWardId;
      } else if (isRegularUser && user.floor) {
        // ถ้าเป็น User ทั่วไป ใช้ ward ของตัวเอง
        wardIdToFetch = user.floor;
      }
      
      // ดึงข้อมูลแนวโน้ม
      const trendData = await fetchPatientTrends(
        startDate,
        endDate,
        wardIdToFetch,
        false,
        user,
        wards
      );
      
      // แปลงข้อมูลเป็นรูปแบบที่ใช้กับกราฟ
      const dailyData: DailyPatientData[] = [];
      
      if (wardIdToFetch) {
        // กรณีเลือก ward เดียว
        for (const item of trendData) {
          // หาข้อมูล ward ที่ต้องการ
          const wardData = item.wardData && item.wardData[wardIdToFetch.toUpperCase()];
          
          if (wardData) {
            // แปลงรูปแบบวันที่ DD/MM เป็น YYYY-MM-DD
            const dateParts = item.date.split('/');
            const month = parseInt(dateParts[1]);
            const day = parseInt(dateParts[0]);
            const year = new Date().getFullYear();
            
            dailyData.push({
              date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
              displayDate: item.date,
              morningPatientCount: wardData.patientCount,
              nightPatientCount: wardData.patientCount,
              totalPatientCount: wardData.patientCount,
              wardId: wardIdToFetch.toUpperCase(),
              wardName: wardData.wardName
            });
          }
        }
      } else {
        // กรณี admin ดูทุก ward
        for (const item of trendData) {
          // แปลงรูปแบบวันที่ DD/MM เป็น YYYY-MM-DD
          const dateParts = item.date.split('/');
          const month = parseInt(dateParts[1]);
          const day = parseInt(dateParts[0]);
          const year = new Date().getFullYear();
          
          dailyData.push({
            date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            displayDate: item.date,
            morningPatientCount: item.patientCount / 2,
            nightPatientCount: item.patientCount / 2,
            totalPatientCount: item.patientCount,
            wardId: 'ALL',
            wardName: 'ทุกแผนก'
          });
        }
      }
      
      // เรียงข้อมูลตามวันที่
      dailyData.sort((a, b) => a.date.localeCompare(b.date));
      
      setDailyPatientData(dailyData);
    } catch (error) {
      console.error('[fetchDailyPatientData] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [customEndDate, customStartDate, dateRangeForDailyChart, isRegularUser, selectedWardId, user, wards]);

  // ดึงข้อมูลผู้ป่วยรายวันเมื่อมีการเปลี่ยนแปลงตัวแปรที่เกี่ยวข้อง
  useEffect(() => {
    if (user) {
      fetchDailyPatientData();
    }
  }, [fetchDailyPatientData, user, dateRangeForDailyChart, customStartDate, customEndDate, selectedWardId]);

  // State สำหรับ Chart Patient Census (trend per ward)
  const [selectedTrendWards, setSelectedTrendWards] = useState<string[]>([]);
  const wardColors: Record<string, string> = {
    CCU: '#8884d8', ICU: '#82ca9d', LR: '#ffc658', NSY: '#ff7300',
    Ward10B: '#8dd1e1', Ward11: '#d084d0', Ward12: '#ffb347', Ward6: '#67b7dc',
    Ward7: '#a4de6c', Ward8: '#ffc0cb', Ward9: '#87ceeb', WardGI: '#dda0dd'
  };
  // ตั้งค่า default selectedTrendWards เมื่อโหลด wards
  useEffect(() => {
    if (wards.length > 0) {
      const defaults = isRegularUser && user?.floor
        ? [user.floor.toUpperCase()]
        : wards.map(w => w.id?.toUpperCase() || '');
      setSelectedTrendWards(defaults);
    }
  }, [wards, isRegularUser, user]);
  const toggleTrendWard = (wardId: string) => {
    setSelectedTrendWards(prev =>
      prev.includes(wardId)
        ? prev.filter(w => w !== wardId)
        : [...prev, wardId]
    );
  };
  // Prepare data for trend chart
  const trendChartData = useMemo(() => {
    return trendData.map(item => {
      const row: Record<string, any> = { date: item.date };
      selectedTrendWards.forEach(wardId => {
        row[wardId] = item.wardData?.[wardId]?.patientCount ?? null;
      });
      return row;
    });
  }, [trendData, selectedTrendWards]);

  // State สำหรับกำหนดช่วงวันที่ใน Chart Patient Census Trend
  const [trendDateRange, setTrendDateRange] = useState<{ start: number; end: number }>({ start: 1, end: 31 });
  const [customTrendStart, setCustomTrendStart] = useState<string>('1');
  const [customTrendEnd, setCustomTrendEnd] = useState<string>('31');
  const setQuickTrendDateRange = (start: number, end: number) => {
    setTrendDateRange({ start, end });
    setCustomTrendStart(start.toString());
    setCustomTrendEnd(end.toString());
    
    // เพิ่มการโหลดข้อมูล trend ใหม่เมื่อเลือกช่วงวันที่แบบเร็ว
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const startDateObj = startOfDay(new Date(year, month, start));
    const endDateObj = endOfDay(new Date(year, month, end));
    
    // เริ่มโหลดข้อมูลใหม่
    setLoading(true);
    (async () => {
      try {
        const newTrendData = await fetchPatientTrends(
          startDateObj,
          endDateObj,
          undefined,
          false,
          user,
          wards
        );
        setTrendData(newTrendData);
        logInfo(`[QuickTrendDateRange] Successfully loaded trend data for ${format(startDateObj, 'yyyy-MM-dd')} to ${format(endDateObj, 'yyyy-MM-dd')}`);
      } catch (error) {
        logError('[QuickTrendDateRange] Error fetching trend data for chart:', error);
      } finally {
        setLoading(false);
      }
    })();
  };
  const applyCustomTrendDateRange = () => {
    const start = Math.max(1, Math.min(31, parseInt(customTrendStart, 10) || 1));
    const end = Math.max(start, Math.min(31, parseInt(customTrendEnd, 10) || 31));
    setTrendDateRange({ start, end });
    
    // เพิ่มการโหลดข้อมูล trend ใหม่เมื่อกดปุ่ม Apply Range
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const startDateObj = startOfDay(new Date(year, month, start));
    const endDateObj = endOfDay(new Date(year, month, end));
    
    // เริ่มโหลดข้อมูลใหม่
    setLoading(true);
    (async () => {
      try {
        const newTrendData = await fetchPatientTrends(
          startDateObj,
          endDateObj,
          undefined,
          false,
          user,
          wards
        );
        setTrendData(newTrendData);
        logInfo(`[CustomTrendDateRange] Successfully loaded trend data for ${format(startDateObj, 'yyyy-MM-dd')} to ${format(endDateObj, 'yyyy-MM-dd')}`);
      } catch (error) {
        logError('[CustomTrendDateRange] Error fetching trend data for chart:', error);
      } finally {
        setLoading(false);
      }
    })();
  };
  // กรองข้อมูล trendChartData ตามช่วงวันที่ที่เลือก
  const filteredTrendChartData = useMemo(() => {
    return trendChartData.filter(item => {
      const day = parseInt(item.date.split('/')[0], 10);
      return day >= trendDateRange.start && day <= trendDateRange.end;
    });
  }, [trendChartData, trendDateRange]);

  // ดึงข้อมูล trend ใหม่ตามวันที่ที่ผู้ใช้เลือกใน Trend panel
  useEffect(() => {
    if (!user || wards.length === 0) return;
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const startDateObj = startOfDay(new Date(year, month, trendDateRange.start));
    const endDateObj = endOfDay(new Date(year, month, trendDateRange.end));
    (async () => {
      setLoading(true);
      try {
        const newTrendData = await fetchPatientTrends(
          startDateObj,
          endDateObj,
          undefined,
          false,
          user,
          wards
        );
        setTrendData(newTrendData);
      } catch (error) {
        console.error('[DashboardPage] Error fetching trend data for chart:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [trendDateRange, user, wards]);

  // แสดงหน้า Dashboard
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <style dangerouslySetInnerHTML={{ __html: printStyles }} />
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                วันที่ {selectedDate} ({getThaiDayName(selectedDate)})
                {isRegularUser && user?.floor && <span className="ml-2 text-blue-500">[แผนก {wards.find(w => w.id?.toUpperCase() === user.floor?.toUpperCase())?.wardName || user.floor}]</span>}
              </p>
            </div>
            
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
                    onClick={() => {
                      handleDateRangeChange('custom');
                      setCurrentView(ViewType.SUMMARY);
                      
                      // เพิ่มการโหลดข้อมูลอีกครั้งหลังจากตั้งค่าวันที่
                      const loadingTimer = setTimeout(() => setLoading(true), 300);
                      
                      // โหลดข้อมูลทั้งหมดใหม่
                      (async () => {
                        try {
                          const dateStr = format(parseISO(endDate), 'yyyy-MM-dd');
                          logInfo(`[CustomDateRange] Loading data for date range ${startDate} to ${endDate}`);
                          
                          // รวมการเรียก API ทั้งหมดเข้าด้วยกัน
                          const promises = [
                            // โหลดข้อมูล ward forms (ถ้ามีการเลือก ward)
                            selectedWardId ? getWardFormsByDateAndWard(selectedWardId, dateStr) : Promise.resolve(null),
                            
                            // โหลดข้อมูล census
                            fetchAllWardCensus(dateStr),
                            
                            // โหลดข้อมูล stats
                            fetchTotalStats(startDate, endDate, user, selectedWardId || undefined),
                            
                            // โหลดข้อมูล trend
                            fetchPatientTrends(
                              parseISO(startDate),
                              parseISO(endDate),
                              selectedWardId || undefined,
                              false,
                              user,
                              wards
                            ).then(data => {
                              setTrendData(data);
                              return data;
                            })
                          ];
                          
                          // รอให้ทุก promise ทำงานเสร็จ
                          await Promise.all(promises);
                          
                          // โหลดข้อมูลผู้ป่วยรายวันหลังจากข้อมูลอื่นโหลดเสร็จ
                          await fetchDailyPatientData();
                          
                          logInfo("[CustomDateRange] Data loading completed successfully");
                        } catch (error) {
                          logError("[CustomDateRange] Error loading data:", error);
                        } finally {
                          clearTimeout(loadingTimer);
                          setLoading(false);
                        }
                      })();
                    }}
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
                // ตั้งค่า dateRange เป็น 'today' เมื่อเลือกวันที่จาก calendar
                setDateRange('today');
                // ตั้งค่า startDate และ endDate ใหม่
                setStartDate(dateStr);
                setEndDate(dateStr);
                
                // ใช้ timeout สั้นๆ เพื่อป้องกันการกระพริบของ UI
                const loadingTimer = setTimeout(() => setLoading(true), 300);
                
                // โหลดข้อมูลทั้งหมดพร้อมกันโดยใช้ Promise.all
                (async () => {
                  try {
                    logInfo(`[onDateChange] Loading data for date ${dateStr}`);
                    
                    // รวมการเรียก API ทั้งหมดเข้าด้วยกัน
                    const promises = [
                      // โหลดข้อมูล ward forms (ถ้ามีการเลือก ward)
                      selectedWardId ? fetchWardForms(selectedWardId, dateStr) : Promise.resolve(null),
                      
                      // โหลดข้อมูล census
                      fetchAllWardCensus(dateStr),
                      
                      // โหลดข้อมูล stats
                      fetchTotalStats(dateStr, dateStr, user, selectedWardId || undefined),
                      
                      // คำนวณข้อมูลเตียง
                      calculateBedSummary()
                    ];
                    
                    // รอให้ทุก promise ทำงานเสร็จ
                    const [_, censusMap, stats] = await Promise.all(promises);
                    
                    // อัพเดท state เมื่อการทำงานเสร็จสิ้น
                    if (censusMap) setWardCensusMap(censusMap as Map<string, number>);
                    if (stats) setTotalStats(stats as any);
                    
                    logInfo("[onDateChange] Data loading completed successfully");
                  } catch (error) {
                    logError("[onDateChange] Error loading data:", error);
                  } finally {
                    clearTimeout(loadingTimer);
                    setLoading(false);
                  }
                })();
              }}
            />
            
            <div className="flex justify-center p-3 space-x-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">รายงานฉบับร่าง</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">รายงานสมบูรณ์บางเวร</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-purple-500 mr-2"></span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">รายงานที่อนุมัติแล้วทั้ง 2 เวร</span>
              </div>
            </div>
          </div>
          
          {/* Daily Patient Census and Staffing */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
              Daily Patient Census and Staffing
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ข้อมูลวันที่ {selectedDate} ({getThaiDayName(selectedDate)})
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
          {wards.length > 0 && (
            <WardCensusButtons
              wards={isRegularUser && user?.floor 
                ? wards.filter(w => w.id?.toUpperCase() === user.floor?.toUpperCase()) 
                : wards}
              wardCensusMap={wardCensusMap}
              selectedWardId={selectedWardId}
              onWardSelect={handleSelectWard}
              onActionSelect={handleActionSelect}
              isRegularUser={isRegularUser}
            />
          )}
                    {/* Charts Section - แนวนอน (แถวเดียวกัน) */}
          <div className="grid grid-cols-1 gap-6 mb-10 lg:grid-cols-12 overflow-hidden">
            {/* Patient Count by Ward */}
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
                    selectedWardId={selectedWardId || undefined}
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
            
            {/* Bed Status Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm lg:col-span-5 overflow-hidden">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">จำนวนเตียงว่าง</h2>
              {(() => {
                // ใช้ IIFE เพื่อ debug ข้อมูลและตรวจสอบว่ามีเตียงไม่ว่างหรือไม่
                const dataForChart = summaryDataList
                  .map(ward => {
                    // ตรวจสอบข้อมูลเตียงว่างและไม่ว่าง
                    const available = ward.available || 0;
                    // ไม่ใช้ค่าดีฟอลต์ 20 เตียงอีกต่อไป แต่ใช้ค่าจริงที่มีอยู่
                    const unavailable = ward.unavailable || 0;
                    
                    return {
                      ...ward,
                      available: available,
                      unavailable: unavailable
                    };
                  });
                
                logInfo("Enhanced data for BedSummaryPieChart:", JSON.stringify(dataForChart));
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
                            wardName: item.wardName,
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
                    // ไม่มีข้อมูลหรือข้อมูลว่างเปล่า - ส่งข้อมูลดัมมี่เพื่อให้ component แสดงผล
                    <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูล</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 px-4">
                        ไม่พบข้อมูลเตียงสำหรับวันที่ {selectedDate} <br/>
                        กรุณาเลือกวันที่อื่น หรือตรวจสอบการบันทึกข้อมูล
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Patient Census ทุกแผนก หรือเฉพาะแผนกที่เลือก */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
              Chart Patient Census (คงพยาบาล) Trend
            </h2>
            <div className="flex gap-6 h-[calc(100vh/3)]">
              {/* Ward selection panel */}
              <div className="w-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4 overflow-auto">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Ward Selection</h3>
                <div className="space-y-2">
                  {wards.map(w => (
                    <label key={w.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTrendWards.includes(w.id?.toUpperCase() || '')}
                        onChange={() => toggleTrendWard(w.id?.toUpperCase() || '')}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: wardColors[w.id?.toUpperCase() || ''] }} />
                      <span className="text-gray-700 dark:text-gray-200 font-medium">{w.wardName}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                  <p className="mb-2">Selected: {selectedTrendWards.length} wards</p>
                  <button onClick={() => setSelectedTrendWards(wards.map(w => w.id?.toUpperCase() || ''))} className="w-full mb-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                    Select All
                  </button>
                  <button onClick={() => setSelectedTrendWards([])} className="w-full px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
                    Clear All
                  </button>
                </div>
                {/* Date Range Section */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Date Range</h3>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => setQuickTrendDateRange(1, 7)} className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">1-7</button>
                    <button onClick={() => setQuickTrendDateRange(8, 15)} className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">8-15</button>
                    <button onClick={() => setQuickTrendDateRange(16, 23)} className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">16-23</button>
                    <button onClick={() => setQuickTrendDateRange(24, 31)} className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">24-31</button>
                    <button onClick={() => setQuickTrendDateRange(27, 29)} className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600">27-29</button>
                    <button onClick={() => setQuickTrendDateRange(1, 31)} className="px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600">All Days</button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input type="number" min="1" max="31" value={customTrendStart} onChange={e => setCustomTrendStart(e.target.value)} className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-xs" placeholder="Start" />
                    <span className="self-center text-gray-500 dark:text-gray-400">-</span>
                    <input type="number" min="1" max="31" value={customTrendEnd} onChange={e => setCustomTrendEnd(e.target.value)} className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-xs" placeholder="End" />
                  </div>
                  <button onClick={applyCustomTrendDateRange} className="w-full px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600">Apply Range</button>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">Current: Day {trendDateRange.start} - {trendDateRange.end}</div>
                </div>
              </div>
              {/* Trend chart area */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredTrendChartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="date" stroke={theme === 'dark' ? '#d1d5db' : '#4b5563'} tick={{ fontSize: 11, fill: theme === 'dark' ? '#d1d5db' : '#4b5563' }} angle={-45} textAnchor="end" />
                    <YAxis stroke={theme === 'dark' ? '#d1d5db' : '#4b5563'} tick={{ fontSize: 11, fill: theme === 'dark' ? '#d1d5db' : '#4b5563' }} />
                    <Tooltip formatter={(value: number) => `${value} คน`} />
                  <Legend verticalAlign="top" />
                    {selectedTrendWards.map(wardId => (
                      <Line
                        key={wardId}
                        type="monotone"
                        dataKey={wardId}
                        name={wards.find(w => w.id?.toUpperCase() === wardId)?.wardName || wardId}
                        stroke={wardColors[wardId]}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* สลับตำแหน่งการแสดงผล - ให้ "ตารางข้อมูลรวมทั้งหมด" อยู่ด้านบนแยกส่วนกัน - เพิ่ม margin ด้านบน */}
          <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
                สรุปรายหอผู้ป่วย ({format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')})
              </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm overflow-x-auto">
                {summaryDataList.length > 0 ? (
                  <div className="h-full">
                    {/* ใช้ tableData ที่สร้างจาก useEffect แทน async IIFE */}
                    <WardSummaryTable 
                      data={selectedWardId
                        ? tableData.filter(item => item.id.toUpperCase() === selectedWardId.toUpperCase())
                        : isRegularUser && user?.floor
                          ? tableData.filter(item => 
                              item.id.toUpperCase() === user.floor?.toUpperCase() || 
                              item.id === 'GRAND_TOTAL'
                            )
                          : tableData}
                      selectedWardId={selectedWardId}
                      onSelectWard={handleSelectWard}
                      title="ตารางข้อมูลรวมทั้งหมด"
                      isRegularUser={isRegularUser}
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
            
          {/* จำนวนผู้ป่วย (ตามหอผู้ป่วย) - ย้ายมาอยู่ใต้ตารางข้อมูลรวมเป็นส่วนแยกต่างหาก */}
          <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">จำนวนผู้ป่วย (ตามหอผู้ป่วย)</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                {selectedWardId ? (
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
                  <div className="text-center p-8">
                    <div className="mb-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">กรุณาเลือกแผนก</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        คุณต้องเลือกแผนกก่อนเพื่อดูข้อมูลจำนวนผู้ป่วยตามหอผู้ป่วย
                      </p>
                    </div>
                    
                    {!isRegularUser && (
                      <div className="mt-6 max-w-xs mx-auto">
                        <select 
                          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                          onChange={(e) => handleSelectWard(e.target.value)}
                          value=""
                        >
                          <option value="" disabled>-- เลือกแผนก --</option>
                          {wards.map(ward => (
                            <option key={ward.id} value={ward.id || ''}>
                              {ward.wardName}
                            </option>
                          ))}
                        </select>
                  <NoDataMessage
                    message="ไม่พบหอผู้ป่วยที่มีสิทธิ์เข้าถึง"
                    subMessage="คุณอาจไม่มีสิทธิ์ในการเข้าถึงข้อมูลหอผู้ป่วย กรุณาติดต่อผู้ดูแลระบบ"
                    icon="user"
                  />
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
          
          {/* เพิ่มส่วนแสดงข้อมูลจำนวนเตียง */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
              จำนวนเตียง
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ข้อมูลวันที่ {selectedDate} ({getThaiDayName(selectedDate)})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* แสดงแผนภูมิเตียงว่าง/ไม่ว่างสำหรับแต่ละแผนก */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm h-80">
                {selectedWardId && summary ? (
                  <BedSummaryPieChart 
                    data={{
                      wardName: summary.wardName,
                      available: summary.morningForm?.available || summary.nightForm?.available || 0,
                      unavailable: summary.morningForm?.unavailable || summary.nightForm?.unavailable || 0,
                      plannedDischarge: summary.morningForm?.plannedDischarge || summary.nightForm?.plannedDischarge || 0
                    }}
                    isLoading={loading}
                  />
                ) : (
                  <BedSummaryPieChart 
                    data={{
                      // เมื่อไม่มีข้อมูลหรือไม่ได้เลือกแผนก จะส่งข้อมูลเป็น 0 ทั้งหมด
                      // แทนการใช้ค่าดัมมี่ 3, 7, 1 เพื่อป้องกันความเข้าใจผิด
                      wardName: selectedWard?.wardName || "ทุกแผนก",
                      available: 0,
                      unavailable: 0,
                      plannedDischarge: 0
                    }}
                    isLoading={loading}
                  />
                )}
              </div>
              
              {/* แสดงคำอธิบายและข้อมูลเพิ่มเติม */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">สถานะเตียง</h3>
                
                {!loading ? (
                  selectedWardId && summary ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">เตียงว่าง:</span>
                        <span className="text-lg font-semibold text-green-500">
                          {summary.morningForm?.available || summary.nightForm?.available || 0} เตียง
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">เตียงไม่ว่าง:</span>
                        <span className="text-lg font-semibold text-red-500">
                          {summary.morningForm?.unavailable || summary.nightForm?.unavailable || 0} เตียง
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">แผนจำหน่าย:</span>
                        <span className="text-lg font-semibold text-blue-500">
                          {summary.morningForm?.plannedDischarge || summary.nightForm?.plannedDischarge || 0} ราย
                        </span>
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ข้อมูล ณ วันที่ {selectedDate} ({getThaiDayName(selectedDate)})
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        โปรดดูข้อมูลที่แผนภูมิด้านซ้าย
                      </p>
                    </div>
                  )
                ) : (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
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
                  {/* แสดงตัวเลือก Ward เฉพาะกับ Admin เท่านั้น */}
                  {!isRegularUser && (
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
                  )}
                  
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
                <div className="text-center p-8">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">กรุณาเลือกแผนก</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      คุณต้องเลือกแผนกก่อนเพื่อดูข้อมูลเปรียบเทียบเวรเช้า-ดึก
                    </p>
                  </div>
                  
                  {!isRegularUser && (
                    <div className="mt-6 max-w-xs mx-auto">
                      <select 
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        onChange={(e) => handleSelectWard(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>-- เลือกแผนก --</option>
                        {wards.map(ward => (
                          <option key={ward.id} value={ward.id || ''}>
                            {ward.wardName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* กราฟเส้นแสดงจำนวนผู้ป่วยรายวัน */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                ข้อมูลผู้ป่วยรายวัน {selectedWardId && selectedWard ? `แผนก ${selectedWard.wardName}` : isRegularUser && user?.floor ? `แผนก ${wards.find(w => w.id?.toUpperCase() === user.floor?.toUpperCase())?.wardName || user.floor}` : 'ทุกแผนก'}
              </h2>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                <select
                  value={dateRangeForDailyChart}
                  onChange={(e) => setDateRangeForDailyChart(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7days">7 วันล่าสุด</option>
                  <option value="30days">30 วันล่าสุด</option>
                  <option value="custom">กำหนดเอง</option>
                </select>
                
                {dateRangeForDailyChart === 'custom' && (
                  <>
                    <input 
                      type="date" 
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input 
                      type="date" 
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        // แสดง loading indicator
                        setLoading(true);
                        
                        // กำหนดช่วงวันที่ตามที่เลือก
                        const startDateObj = parseISO(customStartDate);
                        const endDateObj = parseISO(customEndDate);
                        
                        // โหลดข้อมูลใหม่
                        (async () => {
                          try {
                            // กำหนด wardId ตามสิทธิ์การเข้าถึง
                            let wardIdToFetch: string | undefined;
                            
                            if (selectedWardId) {
                              // ถ้ามีการเลือก ward ใช้ ward ที่เลือก
                              wardIdToFetch = selectedWardId;
                            } else if (isRegularUser && user?.floor) {
                              // ถ้าเป็น User ทั่วไป ใช้ ward ของตัวเอง
                              wardIdToFetch = user.floor;
                            }
                            
                            // ดึงข้อมูลแนวโน้ม
                            const newTrendData = await fetchPatientTrends(
                              startDateObj,
                              endDateObj,
                              wardIdToFetch,
                              false,
                              user,
                              wards
                            );
                            
                            // แปลงข้อมูลเป็นรูปแบบที่ใช้กับกราฟ
                            const dailyData: DailyPatientData[] = [];
                            
                            if (wardIdToFetch) {
                              // กรณีเลือก ward เดียว
                              for (const item of newTrendData) {
                                // หาข้อมูล ward ที่ต้องการ
                                const wardData = item.wardData && item.wardData[wardIdToFetch.toUpperCase()];
                                
                                if (wardData) {
                                  // แปลงรูปแบบวันที่ DD/MM เป็น YYYY-MM-DD
                                  const dateParts = item.date.split('/');
                                  const month = parseInt(dateParts[1]);
                                  const day = parseInt(dateParts[0]);
                                  const year = new Date().getFullYear();
                                  
                                  dailyData.push({
                                    date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                                    displayDate: item.date,
                                    morningPatientCount: wardData.patientCount,
                                    nightPatientCount: wardData.patientCount,
                                    totalPatientCount: wardData.patientCount,
                                    wardId: wardIdToFetch.toUpperCase(),
                                    wardName: wardData.wardName
                                  });
                                }
                              }
                            } else {
                              // กรณี admin ดูทุก ward
                              for (const item of newTrendData) {
                                // แปลงรูปแบบวันที่ DD/MM เป็น YYYY-MM-DD
                                const dateParts = item.date.split('/');
                                const month = parseInt(dateParts[1]);
                                const day = parseInt(dateParts[0]);
                                const year = new Date().getFullYear();
                                
                                dailyData.push({
                                  date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                                  displayDate: item.date,
                                  morningPatientCount: item.patientCount / 2,
                                  nightPatientCount: item.patientCount / 2,
                                  totalPatientCount: item.patientCount,
                                  wardId: 'ALL',
                                  wardName: 'ทุกแผนก'
                                });
                              }
                            }
                            
                            // เรียงข้อมูลตามวันที่
                            dailyData.sort((a, b) => a.date.localeCompare(b.date));
                            
                            // อัพเดทข้อมูล
                            setDailyPatientData(dailyData);
                            
                            logInfo(`[DailyPatientData] Successfully loaded data from ${format(startDateObj, 'yyyy-MM-dd')} to ${format(endDateObj, 'yyyy-MM-dd')}`);
                          } catch (error) {
                            logError('[DailyPatientData] Error loading data:', error);
                          } finally {
                            setLoading(false);
                          }
                        })();
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      แสดง
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : dailyPatientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyPatientData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fill: theme === 'dark' ? '#d1d5db' : '#4b5563' }}
                      label={{ value: 'วันที่', position: 'bottom', fill: theme === 'dark' ? '#d1d5db' : '#4b5563', dy: 10 }}
                    />
                    <YAxis 
                      tick={{ fill: theme === 'dark' ? '#d1d5db' : '#4b5563' }}
                      label={{ value: 'จำนวนผู้ป่วย', angle: -90, position: 'left', fill: theme === 'dark' ? '#d1d5db' : '#4b5563', dx: -10 }}
                    />
                    <Tooltip formatter={(value: number) => `${value} คน`} />
                    <Legend verticalAlign="top" />
                    <Line type="monotone" dataKey="morningPatientCount" name="คงพยาบาล ทั้งวัน กะเช้า" stroke="#3b82f6" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="nightPatientCount" name="คงพยาบาล ทั้งวัน กะดึก" stroke="#f97316" />
                    <Line type="monotone" dataKey="totalPatientCount" name="คงพยาบาล ทั้งวัน รวมเวรเช้า-ดึก" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูล</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                    ไม่พบข้อมูลผู้ป่วยในช่วงเวลาที่เลือก กรุณาเลือกช่วงเวลาอื่น
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;