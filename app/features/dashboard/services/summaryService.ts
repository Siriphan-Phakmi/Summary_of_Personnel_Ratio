'use client';

import { db } from '@/app/core/firebase/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { COLLECTION_SUMMARIES } from '@/app/features/ward-form/services/constants';
import { getApprovedSummariesByDateRange } from '@/app/features/ward-form/services/approvalServices/dailySummary';
import { User } from '@/app/core/types/user';
import { Ward } from '@/app/core/types/ward';
import { logError, logInfo } from '../utils/loggingUtils';

/**
 * ดึงข้อมูลจาก dailySummaries collection
 * @param wardId รหัสแผนก
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @returns ข้อมูลสรุปกะเช้าและกะดึก
 */
export const getDailySummary = async (wardId: string, dateString: string) => {
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
      const morningForm = summary.morningFormId ? {
        id: summary.morningFormId || '',
        patientCensus: summary.morningPatientCensus || 0,
        calculatedCensus: summary.morningCalculatedCensus || 0,
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
      
      const nightForm = summary.nightFormId ? {
        id: summary.nightFormId || '',
        patientCensus: summary.nightPatientCensus || 0,
        calculatedCensus: summary.nightCalculatedCensus || 0,
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

/**
 * ดึงข้อมูลสถิติรวมในช่วงวันที่กำหนด
 * @param startDateString วันที่เริ่มต้นในรูปแบบ YYYY-MM-DD
 * @param endDateString วันที่สิ้นสุดในรูปแบบ YYYY-MM-DD
 * @param user ข้อมูลผู้ใช้
 * @param wardId รหัสแผนก (ถ้ามี)
 * @returns ข้อมูลสถิติรวม
 */
export const fetchTotalStats = async (startDateString: string, endDateString: string, user?: User | null, wardId?: string) => {
  try {
    // สร้าง query เพื่อดึงข้อมูลจาก dailySummaries
    let statsQuery;
    
    if (wardId) {
      // กรณีระบุ wardId ให้ดึงเฉพาะ ward ที่ต้องการ
      statsQuery = query(
        collection(db, 'summaries'), // แก้ไข collection name
        where('wardId', '==', wardId.toUpperCase()),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    } else if (user?.floor) {
      // กรณีไม่ได้ระบุ wardId แต่ user มี floor ให้ดึงเฉพาะ floor ของ user
      statsQuery = query(
        collection(db, 'summaries'), // แก้ไข collection name
        where('wardId', '==', user.floor.toUpperCase()),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    } else {
      // กรณีไม่ได้ระบุ wardId และ user ไม่มี floor ให้ดึงทั้งหมด
      statsQuery = query(
        collection(db, 'summaries'), // แก้ไข collection name
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    }
    
    const querySnapshot = await getDocs(statsQuery);
    
    let totalOpd = 0;
    let totalOldPatient = 0;
    let totalNewPatient = 0;
    let totalAdmit = 0;
    const processedDays = new Set<string>();

    querySnapshot.forEach(doc => {
      const data = doc.data();
      const dateString = data.dateString;

      if(dateString && !processedDays.has(dateString)){
        // คำนวณ oldPatient จาก dailyPatientCensus - (morningNewAdmit + nightNewAdmit)
        const morningNewAdmit = data.morningNewAdmit || 0;
        const nightNewAdmit = data.nightNewAdmit || 0;
        const dailyCensus = data.dailyPatientCensus || 0;
        const oldPatientForDay = Math.max(0, dailyCensus - (morningNewAdmit + nightNewAdmit));
        totalOldPatient += oldPatientForDay;

        // newPatient คือผลรวมของกะเช้าและดึก
        totalNewPatient += morningNewAdmit + nightNewAdmit;

        // admit24hr คือผลรวมทั้งหมด
        totalAdmit += (data.morningAdmitTotal || 0) + (data.nightAdmitTotal || 0);

        // opd24hr - ยังไม่มีข้อมูลตรงนี้ใน dailySummaries, อาจจะต้องใช้ค่า admit แทนชั่วคราว
        totalOpd += (data.morningAdmitTotal || 0) + (data.nightAdmitTotal || 0);
        
        processedDays.add(dateString);
      }
    });
    
    return {
      opd24hr: totalOpd,
      oldPatient: totalOldPatient,
      newPatient: totalNewPatient,
      admit24hr: totalAdmit
    };

  } catch (error) {
    logError('[fetchTotalStats] Error fetching total stats:', error);
    return {
      opd24hr: 0,
      oldPatient: 0,
      newPatient: 0,
      admit24hr: 0
    };
  }
}; 