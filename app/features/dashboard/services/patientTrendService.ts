'use client';

import { db } from '@/app/lib/firebase/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { COLLECTION_SUMMARIES } from '@/app/features/ward-form/services/constants';
import { format, parseISO, isEqual } from 'date-fns';
import { User, UserRole } from '@/app/features/auth/types/user';
import { Ward } from '@/app/features/ward-form/types/ward';
import { logError, logInfo } from '../utils/loggingUtils';
import { getAllWards } from './wardDataService';
import { DailyPatientData } from '../components/types';
import { subDays } from 'date-fns';

/**
 * ดึงข้อมูลแนวโน้มจำนวนผู้ป่วยในช่วงวันที่กำหนด
 * @param startDate วันที่เริ่มต้น
 * @param endDate วันที่สิ้นสุด
 * @param wardId รหัสแผนก (ถ้ามี)
 * @param fetchAllTimeData ดึงข้อมูลทั้งหมดหรือไม่
 * @param user ข้อมูลผู้ใช้
 * @param currentWards รายการแผนก (ถ้ามี)
 * @returns ข้อมูลแนวโน้มจำนวนผู้ป่วย
 */
export const fetchPatientTrends = async (
  startDate: Date, 
  endDate: Date, 
  wardId?: string, 
  fetchAllTimeData: boolean = false, 
  user?: User | null, 
  currentWards?: Ward[]
) => {
  try {
    const startDateString = format(startDate, 'yyyy-MM-dd');
    const endDateString = format(endDate, 'yyyy-MM-dd');
    
    logInfo(`[fetchPatientTrends] Fetching trends from ${startDateString} to ${endDateString}, wardId=${wardId || 'all'}`);
    
    // ดึงข้อมูล Ward ทั้งหมด (ถ้ายังไม่มี)
    const wards = currentWards || await getAllWards();
    
    // สร้าง query เพื่อดึงข้อมูลจาก dailySummaries
    let trendsQuery;
    
    if (wardId) {
      // กรณีระบุ wardId ให้ดึงเฉพาะ ward ที่ต้องการ
      trendsQuery = query(
        collection(db, COLLECTION_SUMMARIES),
        where('wardId', '==', wardId.toUpperCase()),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    } else if (user?.floor && !fetchAllTimeData) {
      // กรณีไม่ได้ระบุ wardId แต่ user มี floor และไม่ได้ต้องการดึงข้อมูลทั้งหมด
      trendsQuery = query(
        collection(db, COLLECTION_SUMMARIES),
        where('wardId', '==', user.floor.toUpperCase()),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    } else {
      // กรณีไม่ได้ระบุ wardId และ user ไม่มี floor หรือต้องการดึงข้อมูลทั้งหมด
      trendsQuery = query(
        collection(db, COLLECTION_SUMMARIES),
        where('dateString', '>=', startDateString),
        where('dateString', '<=', endDateString)
      );
    }
    
    const querySnapshot = await getDocs(trendsQuery);
    logInfo(`[fetchPatientTrends] Found ${querySnapshot.size} records`);
    
    // กรณีไม่มีข้อมูล
    if (querySnapshot.empty) {
      return [];
    }
    
    // จัดเตรียมข้อมูลแนวโน้ม
    const trendData = new Map();
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const { dateString, wardId: dataWardId, morningPatientCensus, nightPatientCensus } = data;
      
      if (!dateString) return;
      
      // ใช้ dateString เป็น key
      if (!trendData.has(dateString)) {
        trendData.set(dateString, {
          date: dateString,
          patientCount: 0,
          admitCount: 0,
          dischargeCount: 0,
          wardData: {}
        });
      }
      
      const dateEntry = trendData.get(dateString);
      
      // หาชื่อ ward
      const ward = wards.find(w => w.id?.toUpperCase() === dataWardId?.toUpperCase());
      const wardName = ward?.name || dataWardId || 'Unknown';
      
      // สร้างหรืออัปเดตข้อมูลของ ward
      if (!dateEntry.wardData[dataWardId]) {
        dateEntry.wardData[dataWardId] = {
          wardName,
          patientCount: 0,
          admitCount: 0,
          dischargeCount: 0
        };
      }
      
      // คำนวณจำนวนผู้ป่วยและการรับเข้า/จำหน่าย
      const patientCensus = Math.max(nightPatientCensus || 0, morningPatientCensus || 0);
      const admitCount = (
        (data.morningNewAdmit || 0) + 
        (data.morningTransferIn || 0) + 
        (data.morningReferIn || 0) + 
        (data.nightNewAdmit || 0) + 
        (data.nightTransferIn || 0) + 
        (data.nightReferIn || 0)
      );
      const dischargeCount = (
        (data.morningDischarge || 0) + 
        (data.morningTransferOut || 0) + 
        (data.morningReferOut || 0) + 
        (data.morningDead || 0) + 
        (data.nightDischarge || 0) + 
        (data.nightTransferOut || 0) + 
        (data.nightReferOut || 0) + 
        (data.nightDead || 0)
      );
      
      // อัปเดตข้อมูลรวม
      dateEntry.patientCount += patientCensus;
      dateEntry.admitCount += admitCount;
      dateEntry.dischargeCount += dischargeCount;
      
      // อัปเดตข้อมูล ward
      dateEntry.wardData[dataWardId].patientCount += patientCensus;
      dateEntry.wardData[dataWardId].admitCount += admitCount;
      dateEntry.wardData[dataWardId].dischargeCount += dischargeCount;
    });
    
    // แปลงจาก Map เป็น Array และเรียงตามวันที่
    const result = Array.from(trendData.values()).sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    logInfo(`[fetchPatientTrends] Processed ${result.length} trend data points`);
    return result;
  } catch (error) {
    logError('[fetchPatientTrends] Error fetching patient trends:', error);
    return [];
  }
};

/**
 * ดึงข้อมูลผู้ป่วยรายวันย้อนหลัง
 * @param startDate วันที่เริ่มต้น
 * @param endDate วันที่สิ้นสุด
 * @param wardIdToFetch รหัสแผนกที่ต้องการ (optional)
 * @param user ข้อมูลผู้ใช้
 * @param wards ข้อมูลแผนกทั้งหมด
 * @returns ข้อมูลผู้ป่วยรายวัน
 */
export const fetchDailyPatientData = async (
  startDate: Date,
  endDate: Date,
  wardIdToFetch?: string,
  user?: User | null,
  wards?: Ward[]
): Promise<DailyPatientData[]> => {
  try {
    // กำหนด flag สำหรับตรวจสอบว่าเป็นผู้ใช้ทั่วไปหรือไม่
    const isRegularUser = user?.role !== UserRole.ADMIN && 
                          user?.role !== UserRole.DEVELOPER;

    // ถ้าไม่มี wardIdToFetch แต่เป็นผู้ใช้ทั่วไป ให้ใช้ ward ของตัวเอง
    if (!wardIdToFetch && isRegularUser && user?.floor) {
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
    
    return dailyData;
  } catch (error) {
    logError('[fetchDailyPatientData] Error:', error);
    return [];
  }
}; 