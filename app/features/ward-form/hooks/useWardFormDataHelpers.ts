import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

// Initial form structure
export const initialFormStructure: Partial<WardForm> = {
  patientCensus: undefined,
  initialPatientCensus: undefined,
  calculatedCensus: undefined,
  nurseManager: undefined,
  rn: undefined,
  pn: undefined,
  wc: undefined,
  newAdmit: undefined,
  transferIn: undefined,
  referIn: undefined,
  transferOut: undefined,
  referOut: undefined,
  discharge: undefined,
  dead: undefined,
  available: undefined,
  unavailable: undefined,
  plannedDischarge: undefined,
  comment: '',
  recorderFirstName: '',
  recorderLastName: '',
  status: FormStatus.DRAFT,
  isDraft: true
};

/**
 * แปลงข้อมูลจาก Firebase เป็นรูปแบบที่ใช้ในฟอร์ม
 */
export const convertFormDataFromFirebase = (
  existingForm: any,
  selectedDate: string
): Partial<WardForm> => {
  return {
    ...existingForm,
    date: existingForm.date instanceof Timestamp 
      ? format(existingForm.date.toDate(), 'yyyy-MM-dd') 
      : typeof existingForm.date === 'string' ? existingForm.date : selectedDate,
    patientCensus: existingForm.patientCensus ?? undefined,
    nurseManager: existingForm.nurseManager ?? undefined,
    rn: existingForm.rn ?? undefined,
    pn: existingForm.pn ?? undefined,
    wc: existingForm.wc ?? undefined,
    newAdmit: existingForm.newAdmit ?? undefined,
    transferIn: existingForm.transferIn ?? undefined,
    referIn: existingForm.referIn ?? undefined,
    transferOut: existingForm.transferOut ?? undefined,
    referOut: existingForm.referOut ?? undefined,
    discharge: existingForm.discharge ?? undefined,
    dead: existingForm.dead ?? undefined,
    available: existingForm.available ?? undefined,
    unavailable: existingForm.unavailable ?? undefined,
    plannedDischarge: existingForm.plannedDischarge ?? undefined,
  };
};

/**
 * คำนวณจำนวนผู้ป่วยสำหรับกะเช้า
 */
export const calculateMorningPatientCensus = (
  previousNightCensus: number | null,
  newAdmit: number = 0,
  transferIn: number = 0,
  referIn: number = 0,
  discharge: number = 0,
  transferOut: number = 0,
  referOut: number = 0,
  dead: number = 0
): number => {
  if (previousNightCensus === null) return 0;
  
  const totalIn = newAdmit + transferIn + referIn;
  const totalOut = discharge + transferOut + referOut + dead;
  
  return Math.max(0, previousNightCensus + totalIn - totalOut);
};

/**
 * คำนวณจำนวนผู้ป่วยสำหรับกะดึก
 */
export const calculateNightPatientCensus = (
  morningCensus: number,
  newAdmit: number = 0,
  transferIn: number = 0,
  referIn: number = 0,
  discharge: number = 0,
  transferOut: number = 0,
  referOut: number = 0,
  dead: number = 0
): number => {
  const totalIn = newAdmit + transferIn + referIn;
  const totalOut = discharge + transferOut + referOut + dead;
  
  return Math.max(0, morningCensus + totalIn - totalOut);
};

/**
 * ตรวจสอบค่าที่เป็น 0 ในฟอร์ม
 */
export const getFieldsWithZeroValue = (data: Partial<WardForm>): string[] => {
  const zeroFields: string[] = [];
  const numericFields = [
    'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
    'newAdmit', 'transferIn', 'referIn', 'discharge', 
    'transferOut', 'referOut', 'dead', 'available', 
    'unavailable', 'plannedDischarge'
  ];

  numericFields.forEach(field => {
    const value = data[field as keyof WardForm];
    if (value === 0) {
      zeroFields.push(field);
    }
  });

  return zeroFields;
};

/**
 * สร้างข้อมูลสำหรับบันทึก
 */
export const prepareDataForSave = (
  formData: Partial<WardForm>,
  user: User,
  selectedShift: ShiftType,
  selectedBusinessWardId: string,
  selectedDate: string,
  finalSave: boolean = false
): Partial<WardForm> => {
  const targetDate = new Date(selectedDate + 'T00:00:00');
  const timestamp = Timestamp.fromDate(targetDate);

  const saveData: Partial<WardForm> = {
    ...formData,
    wardId: selectedBusinessWardId,
    date: timestamp,
    shift: selectedShift,
    status: finalSave ? FormStatus.FINAL : FormStatus.DRAFT,
    isDraft: !finalSave,
    updatedAt: Timestamp.now(),
    updatedBy: user.uid,
  };

  // Convert undefined values to null for Firestore
  Object.keys(saveData).forEach(key => {
    if (saveData[key as keyof WardForm] === undefined) {
      (saveData as any)[key] = null;
    }
  });

  return saveData;
};

/**
 * แปลงค่าเป็นตัวเลขอย่างปลอดภัย
 */
export const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : Math.max(0, Math.floor(num));
};

/**
 * ตรวจสอบความถูกต้องของฟิลด์
 */
export const validateField = (fieldName: keyof WardForm, value: any): string | null => {
  // Numeric fields validation
  if (['patientCensus', 'nurseManager', 'rn', 'pn', 'wc', 
       'newAdmit', 'transferIn', 'referIn', 'discharge', 
       'transferOut', 'referOut', 'dead', 'available', 
       'unavailable', 'plannedDischarge'].includes(fieldName)) {
    if (value === null || value === undefined || value === '') {
      return 'กรุณากรอกข้อมูล';
    }
    
    const num = Number(value);
    if (isNaN(num)) {
      return 'กรุณากรอกตัวเลขเท่านั้น';
    }
    
    if (num < 0) {
      return 'ค่าต้องไม่ติดลบ';
    }
  }

  // String fields validation
  if (['recorderFirstName', 'recorderLastName'].includes(fieldName)) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return 'กรุณากรอกข้อมูล';
    }
    
    if (value.trim().length < 2) {
      return 'ต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
    }
  }

  // Comment validation
  if (fieldName === 'comment') {
    if (value && typeof value === 'string' && value.length > 500) {
      return 'ความยาวของหมายเหตุไม่ควรเกิน 500 ตัวอักษร';
    }
  }

  return null;
};

/**
 * สร้างข้อมูลเริ่มต้นสำหรับกะดึก
 */
export const createNightShiftInitialData = (
  selectedBusinessWardId: string,
  selectedDate: string,
  user: User,
  morningCensus: number
): Partial<WardForm> => {
  return {
    ...initialFormStructure,
    wardId: selectedBusinessWardId,
    shift: ShiftType.NIGHT,
    date: selectedDate,
    initialPatientCensus: morningCensus,
    patientCensus: morningCensus,
    recorderFirstName: user.firstName || '',
    recorderLastName: user.lastName || '',
    status: FormStatus.DRAFT,
    isDraft: true,
  };
};

/**
 * สร้างข้อมูลเริ่มต้นสำหรับกะเช้า
 */
export const createMorningShiftInitialData = (
  selectedBusinessWardId: string,
  selectedDate: string,
  user: User,
  previousNightCensus?: number
): Partial<WardForm> => {
  return {
    ...initialFormStructure,
    wardId: selectedBusinessWardId,
    shift: ShiftType.MORNING,
    date: selectedDate,
    initialPatientCensus: previousNightCensus || undefined,
    patientCensus: previousNightCensus || undefined,
    recorderFirstName: user.firstName || '',
    recorderLastName: user.lastName || '',
    status: FormStatus.DRAFT,
    isDraft: true,
  };
}; 