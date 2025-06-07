'use client';

import { db } from '@/app/core/firebase/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';
import { format, subMonths, addMonths } from 'date-fns';
import { FormStatus, ShiftType, WardForm } from '@/app/core/types/ward';
import { logError, logInfo } from '../utils/loggingUtils';

/**
 * ประเภทของ CalendarMarker
 */
export type CalendarMarker = { 
  date: string; 
  status: 'draft' | 'final' | 'approved' 
};

/**
 * ดึงข้อมูลเครื่องหมายปฏิทินสำหรับแสดงสถานะของฟอร์มในแต่ละวัน
 * @param currentDate วันที่ปัจจุบัน
 * @param wardId รหัสแผนก (ถ้ามี)
 * @returns สถานะของฟอร์มในแต่ละวัน
 */
export const fetchCalendarMarkers = async (currentDate: Date, wardId: string): Promise<CalendarMarker[]> => {
  try {
    // ดึงข้อมูลสถานะจาก wardForms ในเดือนปัจจุบัน
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    const firstDayString = firstDayOfMonth.toISOString().split('T')[0];
    const lastDayString = lastDayOfMonth.toISOString().split('T')[0];
    
    // ดึงข้อมูลจาก collection wardForms
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    let q = query(
      formsRef,
      where('dateString', '>=', firstDayString),
      where('dateString', '<=', lastDayString),
      orderBy('dateString', 'asc')
    );
    
    // ถ้ามีการระบุ wardId ให้กรองเฉพาะ ward ที่ต้องการ
    if (wardId) {
      q = query(
        formsRef,
        where('dateString', '>=', firstDayString),
        where('dateString', '<=', lastDayString),
        where('wardId', '==', wardId),
        orderBy('dateString', 'asc')
      );
    }
    
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
    
    return calendarMarkers;
  } catch (error) {
    logError('[fetchCalendarMarkers] Error:', error);
    return [];
  }
}; 