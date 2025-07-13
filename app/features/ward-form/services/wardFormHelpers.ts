import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { Timestamp } from 'firebase/firestore';
import { format, parse } from 'date-fns';

/**
 * แปลงวันที่จากรูปแบบ string เป็น Date object
 * @param dateStr วันที่ในรูปแบบ string (YYYY-MM-DD)
 * @returns Date object
 */
export const parseDate = (dateStr: string): Date => {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
};

/**
 * ตรวจสอบความครบถ้วนของข้อมูลแบบฟอร์ม
 * @param formData ข้อมูลแบบฟอร์มที่ต้องการตรวจสอบ
 * @returns ผลการตรวจสอบ {isValid: boolean, missingFields: string[], errors: Record<string, string>}
 */
export const validateFormData = (formData: Partial<WardForm>): {
  isValid: boolean;
  missingFields: string[];
  errors: Record<string, string>;
} => {
  // Define required fields based on current WardForm interface
  const requiredNumericFields: (keyof WardForm)[] = [
    'patientCensus', 'admitted', 'discharged', 
    'transferredIn', 'transferredOut', 'deaths',
    'onLeave', 'absconded', 'totalBeds',
    'availableBeds', 'occupiedBeds'
  ];

  const requiredStringFields: (keyof WardForm)[] = [
    'recorderFirstName', 'recorderLastName'
  ];

  // Fields that are always required (part of basic structure)
  const alwaysRequired: (keyof WardForm)[] = [
      'wardId', 'wardName', 'date', 'shift'
  ];

  let isValid = true;
  const missingFields: string[] = [];
  const errors: Record<string, string> = {}; 

  // Check always required fields first
  alwaysRequired.forEach(field => {
      if (formData[field] === undefined || formData[field] === null || formData[field] === '') {
          isValid = false;
          missingFields.push(field);
          errors[field] = 'ข้อมูลพื้นฐาน (เช่น วอร์ด, วันที่, กะ) ไม่ควรว่าง'; 
      }
  });

  // Check required numeric fields with stricter validation
  requiredNumericFields.forEach(field => {
    const value = formData[field];
    
    // Check if value is undefined, null, or not a number
    if (value === undefined || value === null) {
      isValid = false;
      missingFields.push(field);
      errors[field] = 'กรุณากรอกตัวเลขให้ถูกต้อง (ต้องไม่ว่างและไม่ติดลบ)';
      return;
    }
    
    // Convert to number for validation
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number
    if (isNaN(Number(numValue))) {
      isValid = false;
      missingFields.push(field);
      errors[field] = 'กรุณากรอกตัวเลขให้ถูกต้อง (ต้องเป็นตัวเลขเท่านั้น)';
      return;
    }
    
    // Check if it's negative
    if (Number(numValue) < 0) {
      isValid = false;
      missingFields.push(field);
      errors[field] = 'กรุณากรอกตัวเลขให้ถูกต้อง (ต้องไม่ติดลบ)';
      return;
    }
    
    // Additional validation for specific fields
    if (field === 'patientCensus' && Number(numValue) === 0) {
      // Add a warning but don't invalidate - some wards might truly have 0 patients
      errors[field] = 'คงพยาบาลมีค่าเป็น 0 โปรดตรวจสอบว่าถูกต้อง';
    }
  });

  // Check required string fields with better validation
  requiredStringFields.forEach(field => {
    const value = formData[field];
    
    // Check if exists
    if (!value || typeof value !== 'string') {
      isValid = false;
      missingFields.push(field);
      errors[field] = 'กรุณากรอกข้อมูลให้ถูกต้อง';
      return;
    }
    
    // Check if it contains only whitespace
    if (value.trim() === '') {
      isValid = false;
      missingFields.push(field);
      errors[field] = 'กรุณากรอกข้อมูลให้ถูกต้อง (ไม่ควรเป็นช่องว่างเท่านั้น)';
      return;
    }
    
    // Check for minimum length
    if (value.trim().length < 2) {
      isValid = false;
      missingFields.push(field);
      errors[field] = 'กรุณากรอกข้อมูลให้ถูกต้อง (ต้องมีความยาวอย่างน้อย 2 ตัวอักษร)';
      return;
    }
  });

  // Check if rejectionReason is too long (optional field)
  if (formData.rejectionReason && typeof formData.rejectionReason === 'string' && formData.rejectionReason.length > 500) {
    isValid = false;
    errors['rejectionReason'] = 'ความยาวของหมายเหตุไม่ควรเกิน 500 ตัวอักษร';
  }

  // Return validation result
  return {
    isValid,
    missingFields,
    errors
  };
};

/**
 * ✅ **Firebase-Safe Number Conversion**
 * แปลงค่าเป็นตัวเลขอย่างปลอดภัย ไม่ return undefined
 */
const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.max(0, parsed); // ป้องกันค่าติดลบ
  }
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : Math.max(0, value); // ป้องกันค่าติดลบ
  }
  return 0;
};

/**
 * คำนวณจำนวนผู้ป่วยกะเช้าจากข้อมูลกะดึกของวันก่อน
 * ✅ **Firebase-Safe Return Values** - ไม่ return undefined
 */
export const calculateMorningCensus = (
  previousNightForm: WardForm | null,
  inputData: {
    patientCensus?: number;
    admitted: number;
    discharged: number;
    transferredIn: number;
    transferredOut: number;
    deaths: number;
  }
): {initialPatientCensus: number, calculatedCensus: number, patientCensus: number} => {
  
  // ใช้จำนวนผู้ป่วยคงเหลือจากกะดึกวันก่อน หรือ 0 ถ้าไม่มีข้อมูล
  const initialPatientCensus = previousNightForm ? safeNumber(previousNightForm.patientCensus) : 0;
  
  // คำนวณจำนวนผู้ป่วยโดยใช้สูตร: 
  // คงเหลือ = จำนวนเริ่มต้น + รับเข้า - จำหน่าย
  const totalAdmissions = safeNumber(inputData.admitted) + safeNumber(inputData.transferredIn);
  const totalDischarges = safeNumber(inputData.discharged) + safeNumber(inputData.transferredOut) + safeNumber(inputData.deaths);
  const calculatedCensus = initialPatientCensus + totalAdmissions - totalDischarges;

  // ให้ความสำคัญกับค่าที่ผู้ใช้กรอก ถ้ามี
  const finalPatientCensus = inputData.patientCensus !== undefined && inputData.patientCensus !== null 
    ? safeNumber(inputData.patientCensus) 
    : calculatedCensus;

  return {
    initialPatientCensus: Math.max(0, initialPatientCensus), // ✅ Firebase-safe
    calculatedCensus: Math.max(0, calculatedCensus), // ✅ Firebase-safe
    patientCensus: Math.max(0, finalPatientCensus) // ✅ Firebase-safe
  };
};

/**
 * คำนวณจำนวนผู้ป่วยกะดึก
 * ✅ **Firebase-Safe Return Values** - ไม่ return undefined
 */
export const calculateNightShiftCensus = (
  morningForm: WardForm,
  nightShiftData: {
    admitted: number;
    discharged: number;
    transferredIn: number;
    transferredOut: number;
    deaths: number;
  }
): {initialPatientCensus: number, calculatedCensus: number, patientCensus: number} => {
  
  // ใช้จำนวนผู้ป่วยคงเหลือจากกะเช้า
  const initialPatientCensus = safeNumber(morningForm.patientCensus);
  
  // คำนวณจำนวนผู้ป่วยโดยใช้สูตร: 
  // คงเหลือ = จำนวนเริ่มต้น + รับเข้า - จำหน่าย
  const totalAdmissions = safeNumber(nightShiftData.admitted) + safeNumber(nightShiftData.transferredIn);
  const totalDischarges = safeNumber(nightShiftData.discharged) + safeNumber(nightShiftData.transferredOut) + safeNumber(nightShiftData.deaths);
  const calculatedCensus = initialPatientCensus + totalAdmissions - totalDischarges;

  return {
    initialPatientCensus: Math.max(0, initialPatientCensus), // ✅ Firebase-safe
    calculatedCensus: Math.max(0, calculatedCensus), // ✅ Firebase-safe
    patientCensus: Math.max(0, calculatedCensus) // ✅ Firebase-safe
  };
};

/**
 * สร้าง ID สำหรับแบบฟอร์ม
 */
export const generateWardFormId = (wardId: string, shift: ShiftType, status: FormStatus, dateInput: Date | Timestamp | string): string => {
  try {
    // Handle null/undefined case
    if (!dateInput) {
      const timestamp = Date.now();
      return `${wardId}_${shift}_${status}_${timestamp}`;
    }
    
    const date = dateInput instanceof Timestamp ? dateInput.toDate() : 
                 dateInput instanceof Date ? dateInput : new Date(dateInput as string);
    const formattedDate = format(date, 'yyyyMMdd');
    const shiftCode = shift === 'morning' ? 'M' : 'N';
    const statusCode = status === FormStatus.DRAFT ? 'D' : status === FormStatus.FINAL ? 'F' : 'A';
    const timestamp = Date.now().toString().slice(-4); // ใช้ 4 หลักสุดท้ายของ timestamp
    
    return `${wardId}_${formattedDate}_${shiftCode}${statusCode}_${timestamp}`;
  } catch (error) {
    console.error('[generateWardFormId] Error:', error);
    // Fallback ID
    const timestamp = Date.now();
    return `${wardId}_${shift}_${status}_${timestamp}`;
  }
};

/**
 * แปลงวันที่เป็น Date object หรือ throw error
 */
export const normalizeDateOrThrow = (dateInput: Date | Timestamp | string | undefined): Date => {
  if (!dateInput) {
    throw new Error('วันที่ไม่ถูกต้อง: ไม่ได้ระบุวันที่');
  }

  try {
    if (dateInput instanceof Timestamp) {
      return dateInput.toDate();
    }
    
    if (typeof dateInput === 'string') {
      const parsedDate = new Date(dateInput);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`วันที่ไม่ถูกต้อง: ${dateInput}`);
      }
      return parsedDate;
    }
    
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) {
        throw new Error('วันที่ไม่ถูกต้อง: วันที่เป็น Invalid Date');
      }
      return dateInput;
    }
    
    throw new Error(`วันที่ไม่ถูกต้อง: ประเภทข้อมูลไม่รองรับ (${typeof dateInput})`);
  } catch (error) {
    console.error('[normalizeDateOrThrow] Error normalizing date:', error);
    throw error;
  }
};

/**
 * คำนวณ Patient Census อัตโนมัติจากข้อมูลคงเหลือในภาพรวมการคำนวณ
 * @param formData ข้อมูลฟอร์มปัจจุบัน
 * @returns Patient Census ที่คำนวณได้
 */
export const calculatePatientCensusFromOverview = (formData: Partial<WardForm>): number => {
  const startingCensus = safeNumber(formData.patientCensus);
  const admissions = safeNumber(formData.admitted) + 
                   safeNumber(formData.transferredIn) + 
                   safeNumber(formData.referIn);
  const discharges = safeNumber(formData.discharged) + 
                    safeNumber(formData.transferredOut) + 
                    safeNumber(formData.referOut) + 
                    safeNumber(formData.deaths);
  
  const calculatedCensus = startingCensus + admissions - discharges;
  return Math.max(0, calculatedCensus);
};

/**
 * คำนวณ Unavailable Beds อัตโนมัติ (รวม New Admit + Transfer In + Refer In)
 * @param formData ข้อมูลฟอร์มปัจจุบัน
 * @returns จำนวนเตียงที่ไม่ว่าง
 */
export const calculateUnavailableBeds = (formData: Partial<WardForm>): number => {
  const newAdmit = safeNumber(formData.admitted);
  const transferIn = safeNumber(formData.transferredIn);
  const referIn = safeNumber(formData.referIn);
  
  const totalUnavailable = newAdmit + transferIn + referIn;
  return Math.max(0, totalUnavailable);
};

/**
 * คำนวณ Available Beds อัตโนมัติ (รวม Transfer Out + Refer Out + Discharge + Dead)
 * @param formData ข้อมูลฟอร์มปัจจุบัน
 * @returns จำนวนเตียงที่ว่าง
 */
export const calculateAvailableBeds = (formData: Partial<WardForm>): number => {
  const transferOut = safeNumber(formData.transferredOut);
  const referOut = safeNumber(formData.referOut);
  const discharge = safeNumber(formData.discharged);
  const dead = safeNumber(formData.deaths);
  
  const totalAvailable = transferOut + referOut + discharge + dead;
  return Math.max(0, totalAvailable);
};

/**
 * คำนวณ Planned Discharge อัตโนมัติ (เหมือนกับ Available Beds)
 * @param formData ข้อมูลฟอร์มปัจจุบัน
 * @returns จำนวนแผนการจำหน่าย
 */
export const calculatePlannedDischarge = (formData: Partial<WardForm>): number => {
  // ใช้สูตรเดียวกับ Available Beds
  return calculateAvailableBeds(formData);
}; 