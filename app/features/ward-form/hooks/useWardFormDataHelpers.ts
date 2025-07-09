import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

// ✅ **FIREBASE-SAFE INITIAL FORM STRUCTURE** - No undefined values
// Firebase ไม่รับค่า undefined ใน setDoc operations
export const initialFormStructure: Partial<WardForm> = {
  // 🔢 **Numeric Fields** - ใช้ 0 แทน undefined เพื่อความปลอดภัยกับ Firebase
  patientCensus: 0,
  admitted: 0,
  discharged: 0,
  transferredIn: 0,
  transferredOut: 0,
  deaths: 0,
  onLeave: 0,
  absconded: 0,
  totalBeds: 0,
  availableBeds: 0,
  occupiedBeds: 0,
  specialCareBeds: 0,
  isolationBeds: 0,
  
  // 📝 **Text Fields** - ใช้ empty string
  recorderFirstName: '',
  recorderLastName: '',
  rejectionReason: '',
  
  // 🏥 **Status Fields** - ใช้ default values ที่ชัดเจน
  status: FormStatus.DRAFT,
  isDraft: true,
};

/**
 * แปลงข้อมูลจาก Firebase เป็นรูปแบบที่ใช้ในฟอร์ม
 * ✅ **Firebase-Safe Conversion** - แปลง string เป็น number และไม่มี undefined values
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
    
    // ✅ **Numeric Fields** - แปลง string จาก Firebase เป็น number ด้วย safeNumber
    patientCensus: safeNumber(existingForm.patientCensus),
    admitted: safeNumber(existingForm.admitted ?? existingForm.newAdmit),
    discharged: safeNumber(existingForm.discharged),
    transferredIn: safeNumber(existingForm.transferredIn ?? existingForm.transferIn),
    transferredOut: safeNumber(existingForm.transferredOut ?? existingForm.transferOut),
    deaths: safeNumber(existingForm.deaths ?? existingForm.dead),
    onLeave: safeNumber(existingForm.onLeave),
    absconded: safeNumber(existingForm.absconded),
    totalBeds: safeNumber(existingForm.totalBeds),
    availableBeds: safeNumber(existingForm.availableBeds ?? existingForm.available),
    occupiedBeds: safeNumber(existingForm.occupiedBeds),
    specialCareBeds: safeNumber(existingForm.specialCareBeds),
    isolationBeds: safeNumber(existingForm.isolationBeds),
    
    // ✅ **Text Fields** - รักษาเป็น string
    recorderFirstName: existingForm.recorderFirstName || '',
    recorderLastName: existingForm.recorderLastName || '',
    comment: existingForm.comment || '',
    rejectionReason: existingForm.rejectionReason || '',
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