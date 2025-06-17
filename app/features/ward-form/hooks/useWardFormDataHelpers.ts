import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

// Initial form structure, aligned with the new WardForm interface
export const initialFormStructure: Partial<WardForm> = {
  patientCensus: undefined,
  admitted: undefined,
  discharged: undefined,
  transferredIn: undefined,
  transferredOut: undefined,
  deaths: undefined,
  onLeave: undefined,
  absconded: undefined,
  totalBeds: undefined,
  availableBeds: undefined,
  occupiedBeds: undefined,
  specialCareBeds: undefined,
  isolationBeds: undefined,
  recorderFirstName: '',
  recorderLastName: '',
  rejectionReason: '',
  status: FormStatus.DRAFT,
  isDraft: true,
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
    // Map old field names to new field names if necessary for backward compatibility,
    // but the primary goal is to align with the new WardForm interface.
    patientCensus: existingForm.patientCensus ?? undefined,
    admitted: existingForm.admitted ?? existingForm.newAdmit ?? undefined,
    discharged: existingForm.discharged ?? undefined,
    transferredIn: existingForm.transferredIn ?? existingForm.transferIn ?? undefined,
    transferredOut: existingForm.transferredOut ?? existingForm.transferOut ?? undefined,
    deaths: existingForm.deaths ?? existingForm.dead ?? undefined,
    onLeave: existingForm.onLeave ?? undefined,
    absconded: existingForm.absconded ?? undefined,
    totalBeds: existingForm.totalBeds ?? undefined,
    availableBeds: existingForm.availableBeds ?? existingForm.available ?? undefined,
    occupiedBeds: existingForm.occupiedBeds ?? undefined,
    specialCareBeds: existingForm.specialCareBeds ?? undefined,
    isolationBeds: existingForm.isolationBeds ?? undefined,
  };
};

/**
 * คำนวณจำนวนผู้ป่วยสำหรับกะเช้า
 */
export const calculateMorningPatientCensus = (
  previousNightCensus: number | null,
  admitted: number = 0,
  transferredIn: number = 0,
  discharged: number = 0,
  transferredOut: number = 0,
  deaths: number = 0
): number => {
  if (previousNightCensus === null) return 0;
  
  const totalIn = admitted + transferredIn;
  const totalOut = discharged + transferredOut + deaths;
  
  return Math.max(0, previousNightCensus + totalIn - totalOut);
};

/**
 * คำนวณจำนวนผู้ป่วยสำหรับกะดึก
 */
export const calculateNightPatientCensus = (
  morningCensus: number,
  admitted: number = 0,
  transferredIn: number = 0,
  discharged: number = 0,
  transferredOut: number = 0,
  deaths: number = 0
): number => {
  const totalIn = admitted + transferredIn;
  const totalOut = discharged + transferredOut + deaths;
  
  return Math.max(0, morningCensus + totalIn - totalOut);
};

/**
 * ตรวจสอบค่าที่เป็น 0 ในฟอร์ม
 */
export const getFieldsWithZeroValue = (data: Partial<WardForm>): string[] => {
  const zeroFields: string[] = [];
  const numericFields: (keyof WardForm)[] = [
    'patientCensus', 'admitted', 'discharged', 'transferredIn', 
    'transferredOut', 'deaths', 'onLeave', 'absconded', 'totalBeds', 
    'availableBeds', 'occupiedBeds', 'specialCareBeds', 'isolationBeds'
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

  if (!saveData.id) { // If it's a new form
    saveData.createdAt = Timestamp.now();
    saveData.createdBy = user.uid;
  }

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
  const numericFields: (keyof WardForm)[] = [
    'patientCensus', 'admitted', 'discharged', 'transferredIn', 
    'transferredOut', 'deaths', 'onLeave', 'absconded', 'totalBeds', 
    'availableBeds', 'occupiedBeds', 'specialCareBeds', 'isolationBeds'
  ];

  if (numericFields.includes(fieldName)) {
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
  if (['recorderFirstName', 'recorderLastName'].includes(fieldName as string)) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return 'กรุณากรอกข้อมูล';
    }
    
    if (value.trim().length < 2) {
      return 'ต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
    }
  }

  // Rejection reason validation
  if (fieldName === 'rejectionReason') {
    if (value && typeof value === 'string' && value.length > 500) {
      return 'ความยาวของเหตุผลไม่ควรเกิน 500 ตัวอักษร';
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
    patientCensus: morningCensus, // The starting census for the night is the closing census of the morning.
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
    patientCensus: previousNightCensus || undefined, // The starting census for the morning is the closing census of the previous night.
    recorderFirstName: user.firstName || '',
    recorderLastName: user.lastName || '',
    status: FormStatus.DRAFT,
    isDraft: true,
  };
}; 