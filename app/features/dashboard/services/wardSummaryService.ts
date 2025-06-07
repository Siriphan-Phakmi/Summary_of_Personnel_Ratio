'use client';

import { db } from '@/app/core/firebase/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { COLLECTION_SUMMARIES } from '@/app/features/ward-form/services/constants';
import { format, parseISO, isBefore, isEqual, endOfDay } from 'date-fns';
import { User } from '@/app/core/types/user';
import { Ward } from '@/app/core/types/ward';
import { logError, logInfo, hasAccessToWard } from '../utils/loggingUtils';

/**
 * ดึงข้อมูลสรุปของทุกแผนกในช่วงวันที่กำหนด
 * @param startDateString วันที่เริ่มต้นในรูปแบบ YYYY-MM-DD
 * @param endDateString วันที่สิ้นสุดในรูปแบบ YYYY-MM-DD
 * @param allAppWards รายการแผนกทั้งหมดในระบบ
 * @param fetchAllTimeData ดึงข้อมูลทั้งหมดหรือไม่
 * @param user ข้อมูลผู้ใช้
 * @returns ข้อมูลสรุปของทุกแผนก
 */
export const fetchAllWardSummaryData = async (
  startDateString: string, 
  endDateString: string, 
  allAppWards: Ward[], 
  fetchAllTimeData: boolean = false, 
  user: User | null
) => {
  try {
    logInfo(`[fetchAllWardSummaryData] Fetching ward summary data from ${startDateString} to ${endDateString}`);
    
    // กรณีไม่มีข้อมูล ward
    if (!allAppWards || allAppWards.length === 0) {
      logInfo('[fetchAllWardSummaryData] No wards available');
      return [];
    }
    
    const isRegularUser = user && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'developer';
    
    // สร้าง query เพื่อดึงข้อมูลจาก dailySummaries
    let summaryQuery;
    
    if (isRegularUser && user?.floor && !fetchAllTimeData) {
      // กรณีเป็น user ทั่วไปและมี floor ให้ดึงเฉพาะ floor ของ user
      summaryQuery = query(
        collection(db, COLLECTION_SUMMARIES),
        where('wardId', '==', user.floor.toUpperCase()),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    } else {
      // กรณีเป็น admin หรือต้องการดึงข้อมูลทั้งหมด
      summaryQuery = query(
        collection(db, COLLECTION_SUMMARIES),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    }
    
    const querySnapshot = await getDocs(summaryQuery);
    logInfo(`[fetchAllWardSummaryData] Found ${querySnapshot.size} summary records`);
    
    // จัดเตรียมข้อมูลสรุป
    const wardSummaries = new Map();
    
    // กรณีไม่มีข้อมูล
    if (querySnapshot.empty) {
      return [];
    }
    
    // ประมวลผลข้อมูลสรุป
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const { wardId, dateString } = data;
      
      if (!wardId) return;
      
      // ตรวจสอบสิทธิ์การเข้าถึงข้อมูล ward
      if (isRegularUser && !hasAccessToWard(wardId, allAppWards)) {
        return;
      }
      
      // หาข้อมูล ward จาก allAppWards
      const ward = allAppWards.find(w => w.id?.toUpperCase() === wardId?.toUpperCase());
      
      if (!ward) {
        logInfo(`[fetchAllWardSummaryData] Ward not found: ${wardId}`);
        return;
      }
      
      const wardKey = ward.id?.toUpperCase() || wardId.toUpperCase();
      
      if (!wardSummaries.has(wardKey)) {
        wardSummaries.set(wardKey, {
          id: ward.id || wardId,
          wardName: ward.wardName || wardId,
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
          daysWithData: 0,
          
          // ข้อมูลกะเช้า
          morningShift: {
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
          },
          
          // ข้อมูลกะดึก
          nightShift: {
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
          },
          
          // ข้อมูลรวม
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
        });
      }
      
      const wardSummary = wardSummaries.get(wardKey);
      
      // นับจำนวนวันที่มีข้อมูล
      wardSummary.daysWithData++;
      
      // ข้อมูลกะเช้า
      wardSummary.morningShift.patientCensus += data.morningPatientCensus || 0;
      wardSummary.morningShift.nurseManager += data.morningNurseManager || 0;
      wardSummary.morningShift.rn += data.morningRn || 0;
      wardSummary.morningShift.pn += data.morningPn || 0;
      wardSummary.morningShift.wc += data.morningWc || 0;
      wardSummary.morningShift.newAdmit += data.morningNewAdmit || 0;
      wardSummary.morningShift.transferIn += data.morningTransferIn || 0;
      wardSummary.morningShift.referIn += data.morningReferIn || 0;
      wardSummary.morningShift.discharge += data.morningDischarge || 0;
      wardSummary.morningShift.transferOut += data.morningTransferOut || 0;
      wardSummary.morningShift.referOut += data.morningReferOut || 0;
      wardSummary.morningShift.dead += data.morningDead || 0;
      
      // ข้อมูลกะดึก
      wardSummary.nightShift.patientCensus += data.nightPatientCensus || 0;
      wardSummary.nightShift.nurseManager += data.nightNurseManager || 0;
      wardSummary.nightShift.rn += data.nightRn || 0;
      wardSummary.nightShift.pn += data.nightPn || 0;
      wardSummary.nightShift.wc += data.nightWc || 0;
      wardSummary.nightShift.newAdmit += data.nightNewAdmit || 0;
      wardSummary.nightShift.transferIn += data.nightTransferIn || 0;
      wardSummary.nightShift.referIn += data.nightReferIn || 0;
      wardSummary.nightShift.discharge += data.nightDischarge || 0;
      wardSummary.nightShift.transferOut += data.nightTransferOut || 0;
      wardSummary.nightShift.referOut += data.nightReferOut || 0;
      wardSummary.nightShift.dead += data.nightDead || 0;
      
      // ข้อมูลเตียง (ใช้ข้อมูลล่าสุด)
      if (data.availableBeds !== undefined) {
        wardSummary.available = data.availableBeds || 0;
        wardSummary.morningShift.available = data.availableBeds || 0;
        wardSummary.nightShift.available = data.availableBeds || 0;
      }
      
      if (data.unavailableBeds !== undefined) {
        wardSummary.unavailable = data.unavailableBeds || 0;
        wardSummary.morningShift.unavailable = data.unavailableBeds || 0;
        wardSummary.nightShift.unavailable = data.unavailableBeds || 0;
      }
      
      if (data.plannedDischarge !== undefined) {
        wardSummary.plannedDischarge = data.plannedDischarge || 0;
        wardSummary.morningShift.plannedDischarge = data.plannedDischarge || 0;
        wardSummary.nightShift.plannedDischarge = data.plannedDischarge || 0;
      }
    });
    
    // คำนวณค่าเฉลี่ยและข้อมูลรวม
    wardSummaries.forEach(summary => {
      const daysWithData = Math.max(1, summary.daysWithData);
      
      // คำนวณค่าเฉลี่ย
      summary.patientCensus = Math.round(
        (summary.morningShift.patientCensus + summary.nightShift.patientCensus) / (daysWithData * 2)
      );
      summary.nurseManager = Math.round(
        (summary.morningShift.nurseManager + summary.nightShift.nurseManager) / (daysWithData * 2)
      );
      summary.rn = Math.round(
        (summary.morningShift.rn + summary.nightShift.rn) / (daysWithData * 2)
      );
      summary.pn = Math.round(
        (summary.morningShift.pn + summary.nightShift.pn) / (daysWithData * 2)
      );
      summary.wc = Math.round(
        (summary.morningShift.wc + summary.nightShift.wc) / (daysWithData * 2)
      );
      
      // รวมจำนวนรับเข้าและจำหน่าย
      summary.newAdmit = summary.morningShift.newAdmit + summary.nightShift.newAdmit;
      summary.transferIn = summary.morningShift.transferIn + summary.nightShift.transferIn;
      summary.referIn = summary.morningShift.referIn + summary.nightShift.referIn;
      summary.discharge = summary.morningShift.discharge + summary.nightShift.discharge;
      summary.transferOut = summary.morningShift.transferOut + summary.nightShift.transferOut;
      summary.referOut = summary.morningShift.referOut + summary.nightShift.referOut;
      summary.dead = summary.morningShift.dead + summary.nightShift.dead;
      
      // คำนวณค่าเฉลี่ยกะเช้า
      summary.morningShift.patientCensus = Math.round(summary.morningShift.patientCensus / daysWithData);
      summary.morningShift.nurseManager = Math.round(summary.morningShift.nurseManager / daysWithData);
      summary.morningShift.rn = Math.round(summary.morningShift.rn / daysWithData);
      summary.morningShift.pn = Math.round(summary.morningShift.pn / daysWithData);
      summary.morningShift.wc = Math.round(summary.morningShift.wc / daysWithData);
      
      // คำนวณค่าเฉลี่ยกะดึก
      summary.nightShift.patientCensus = Math.round(summary.nightShift.patientCensus / daysWithData);
      summary.nightShift.nurseManager = Math.round(summary.nightShift.nurseManager / daysWithData);
      summary.nightShift.rn = Math.round(summary.nightShift.rn / daysWithData);
      summary.nightShift.pn = Math.round(summary.nightShift.pn / daysWithData);
      summary.nightShift.wc = Math.round(summary.nightShift.wc / daysWithData);
      
      // สร้างข้อมูลรวม
      summary.totalData = {
        patientCensus: summary.patientCensus,
        nurseManager: summary.nurseManager,
        rn: summary.rn,
        pn: summary.pn,
        wc: summary.wc,
        newAdmit: summary.newAdmit,
        transferIn: summary.transferIn,
        referIn: summary.referIn,
        discharge: summary.discharge,
        transferOut: summary.transferOut,
        referOut: summary.referOut,
        dead: summary.dead,
        available: summary.available,
        unavailable: summary.unavailable,
        plannedDischarge: summary.plannedDischarge
      };
    });
    
    // แปลงจาก Map เป็น Array
    return Array.from(wardSummaries.values());
  } catch (error) {
    logError('[fetchAllWardSummaryData] Error fetching ward summary data:', error);
    return [];
  }
}; 