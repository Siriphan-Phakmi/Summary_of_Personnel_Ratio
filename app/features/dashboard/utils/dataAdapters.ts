/**
 * Data Adapters
 * 
 * ไฟล์นี้มีฟังก์ชันสำหรับแปลงข้อมูลระหว่าง interface ต่างๆ ที่ใช้ในระบบ
 * เพื่อให้สามารถใช้งานข้อมูลร่วมกันระหว่างคอมโพเนนต์ที่ใช้ interface ต่างกันได้
 */

import { WardSummaryDataWithShifts as NewWardSummaryDataWithShifts, ShiftSummaryData, WardFormSummary } from '../components/types/interface-types';

// This is the legacy data structure that some parts of the app might still use.
// We define it here to make the adapter functions explicit and stable.
interface OldWardSummaryDataWithShifts {
  id: string;
  wardName: string;
  morningShift?: WardFormSummary;
  nightShift?: WardFormSummary;
  totalData: WardFormSummary;
}

/**
 * แปลงข้อมูลจาก Old WardSummaryDataWithShifts เป็น New WardSummaryDataWithShifts
 */
export const adaptToNewWardSummaryFormat = (
  oldData: OldWardSummaryDataWithShifts
): NewWardSummaryDataWithShifts => {
  const morningShiftData: ShiftSummaryData = oldData.morningShift ? {
    patientCensus: oldData.morningShift.patientCensus,
    admitted: oldData.morningShift.admitted,
    discharged: oldData.morningShift.discharged,
    transferredIn: oldData.morningShift.transferredIn,
    transferredOut: oldData.morningShift.transferredOut,
    deaths: oldData.morningShift.deaths,
  } : { patientCensus: 0, admitted: 0, discharged: 0, transferredIn: 0, transferredOut: 0, deaths: 0 };
  
  const nightShiftData: ShiftSummaryData = oldData.nightShift ? {
    patientCensus: oldData.nightShift.patientCensus,
    admitted: oldData.nightShift.admitted,
    discharged: oldData.nightShift.discharged,
    transferredIn: oldData.nightShift.transferredIn,
    transferredOut: oldData.nightShift.transferredOut,
    deaths: oldData.nightShift.deaths,
  } : { patientCensus: 0, admitted: 0, discharged: 0, transferredIn: 0, transferredOut: 0, deaths: 0 };

  return {
    wardId: oldData.id,
    wardName: oldData.wardName,
    morningShiftData: morningShiftData,
    nightShiftData: nightShiftData,
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
  const createWardFormSummary = (shiftData: ShiftSummaryData): WardFormSummary => ({
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