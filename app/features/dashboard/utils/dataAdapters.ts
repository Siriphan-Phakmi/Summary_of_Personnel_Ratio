/**
 * Data Adapters
 * 
 * ไฟล์นี้มีฟังก์ชันสำหรับแปลงข้อมูลระหว่าง interface ต่างๆ ที่ใช้ในระบบ
 * เพื่อให้สามารถใช้งานข้อมูลร่วมกันระหว่างคอมโพเนนต์ที่ใช้ interface ต่างกันได้
 */

import { WardSummaryDataWithShifts as NewWardSummaryDataWithShifts } from '../components/types/interface-types';
import { WardSummaryDataWithShifts as OldWardSummaryDataWithShifts, WardFormSummary } from '../components/types';

/**
 * แปลงข้อมูลจาก Old WardSummaryDataWithShifts เป็น New WardSummaryDataWithShifts
 */
export const adaptToNewWardSummaryFormat = (
  oldData: OldWardSummaryDataWithShifts
): NewWardSummaryDataWithShifts => {
  const morningShiftData = oldData.morningShift || {
    patientCensus: 0,
    admitted: 0,
    discharged: 0,
    transferredIn: 0,
    transferredOut: 0,
    deaths: 0,
    availableBeds: 0,
    occupiedBeds: 0
  };
  
  const nightShiftData = oldData.nightShift || {
    patientCensus: 0,
    admitted: 0,
    discharged: 0,
    transferredIn: 0,
    transferredOut: 0,
    deaths: 0,
    availableBeds: 0,
    occupiedBeds: 0
  };

  return {
    wardId: oldData.id,
    wardName: oldData.wardName,
    morningShiftData: {
      patientCensus: morningShiftData.patientCensus,
      admitted: morningShiftData.admitted,
      discharged: morningShiftData.discharged,
      transferredIn: morningShiftData.transferredIn,
      transferredOut: morningShiftData.transferredOut,
      deaths: morningShiftData.deaths
    },
    nightShiftData: {
      patientCensus: nightShiftData.patientCensus,
      admitted: nightShiftData.admitted,
      discharged: nightShiftData.discharged,
      transferredIn: nightShiftData.transferredIn,
      transferredOut: nightShiftData.transferredOut,
      deaths: nightShiftData.deaths
    },
    totalData: {
      patientCensus: oldData.totalData.patientCensus,
      admitted: oldData.totalData.admitted,
      discharged: oldData.totalData.discharged,
      transferredIn: oldData.totalData.transferredIn,
      transferredOut: oldData.totalData.transferredOut,
      deaths: oldData.totalData.deaths
    }
  };
};

/**
 * แปลงข้อมูลจาก New WardSummaryDataWithShifts เป็น Old WardSummaryDataWithShifts
 */
export const adaptToOldWardSummaryFormat = (
  newData: NewWardSummaryDataWithShifts
): OldWardSummaryDataWithShifts => {
  // สร้าง WardFormSummary จาก ShiftSummaryData
  const createWardFormSummary = (shiftData: any): WardFormSummary => ({
    patientCensus: shiftData.patientCensus || 0,
    admitted: shiftData.admitted || 0,
    discharged: shiftData.discharged || 0,
    transferredIn: shiftData.transferredIn || 0,
    transferredOut: shiftData.transferredOut || 0,
    deaths: shiftData.deaths || 0,
    availableBeds: 0, // ไม่มีใน new format
    occupiedBeds: shiftData.patientCensus || 0 // ใช้ค่า patientCensus แทน
  });

  return {
    id: newData.wardId,
    wardName: newData.wardName,
    morningShift: createWardFormSummary(newData.morningShiftData),
    nightShift: createWardFormSummary(newData.nightShiftData),
    totalData: createWardFormSummary(newData.totalData)
  };
};

/**
 * แปลงข้อมูล Array ของ WardSummaryDataWithShifts
 */
export const adaptArrayToNewWardSummaryFormat = (
  oldDataArray: OldWardSummaryDataWithShifts[]
): NewWardSummaryDataWithShifts[] => {
  return oldDataArray.map(item => adaptToNewWardSummaryFormat(item));
};

export const adaptArrayToOldWardSummaryFormat = (
  newDataArray: NewWardSummaryDataWithShifts[]
): OldWardSummaryDataWithShifts[] => {
  return newDataArray.map(item => adaptToOldWardSummaryFormat(item));
}; 