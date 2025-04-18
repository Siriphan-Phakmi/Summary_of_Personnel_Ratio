import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp, 
  limit, 
  setDoc,
  documentId
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, ShiftType, FormStatus, Ward } from '@/app/core/types/ward';
import { User, TimestampField } from '@/app/core/types/user';
import { format, parse } from 'date-fns';
import { toast } from 'react-hot-toast';
import { createServerTimestamp } from '@/app/core/utils/timestampUtils';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { formatDateYMD } from '@/app/core/utils/dateUtils';
import { checkAndCreateDailySummary } from './approvalServices/dailySummary';
import { isEqual } from 'lodash';

/**
 * คอลเลกชันใน Firestore
 */
export const COLLECTION_WARDFORMS = 'wardForms';
export const COLLECTION_WARDS = 'wards';
export const COLLECTION_APPROVALS = 'approvals';
export const COLLECTION_SUMMARIES = 'dailySummaries';

/**
 * แปลงวันที่จากรูปแบบ string เป็น Date object
 * @param dateStr วันที่ในรูปแบบ string (YYYY-MM-DD)
 * @returns Date object
 */
const parseDate = (dateStr: string): Date => {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
};

/**
 * ตรวจสอบความครบถ้วนของข้อมูลแบบฟอร์ม
 * @param formData ข้อมูลแบบฟอร์มที่ต้องการตรวจสอบ
 * @returns ผลการตรวจสอบ {isValid: boolean, missingFields: string[]}
 */
export const validateFormData = (formData: Partial<WardForm>): {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
} => {
  const requiredFields = [
    'wardId',
    'wardName',
    'date',
    'shift',
    'patientCensus',
    'nurseManager',
    'rn',
    'pn',
    'wc',
    'newAdmit',
    'transferIn',
    'referIn',
    'transferOut',
    'referOut',
    'discharge',
    'dead',
    'available',
    'unavailable',
    'plannedDischarge',
    'recorderFirstName',
    'recorderLastName'
  ];
  
  const missingFields: string[] = [];
  const errors: string[] = [];
  
  // ตรวจสอบฟิลด์ที่จำเป็น
  requiredFields.forEach(field => {
    if (formData[field as keyof typeof formData] === undefined || 
        formData[field as keyof typeof formData] === null || 
        formData[field as keyof typeof formData] === '') {
      missingFields.push(field);
    }
  });
  
  // ตรวจสอบค่าตัวเลขต้องไม่ติดลบ
  const numericFields = [
    'patientCensus',
    'nurseManager',
    'rn',
    'pn',
    'wc',
    'newAdmit',
    'transferIn',
    'referIn',
    'transferOut',
    'referOut',
    'discharge',
    'dead',
    'available',
    'unavailable',
    'plannedDischarge'
  ];
  
  numericFields.forEach(field => {
    const value = formData[field as keyof typeof formData];
    if (value !== undefined && typeof value === 'number' && value < 0) {
      errors.push(`ฟิลด์ ${field} ต้องไม่เป็นค่าติดลบ`);
    }
  });
  
  // ตรวจสอบวันที่
  if (formData.date && !(formData.date instanceof Date) && !(formData.date instanceof Timestamp)) {
    errors.push('รูปแบบวันที่ไม่ถูกต้อง');
  }
  
  // ตรวจสอบค่าอื่นๆ ตามความต้องการเพิ่มเติม
  // ...
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  };
};

/**
 * ดึงข้อมูลแบบฟอร์มตามวันที่ กะ และแผนก
 * @param date วันที่
 * @param shift กะ
 * @param wardId รหัสแผนก
 * @returns ข้อมูลแบบฟอร์ม หรือ null ถ้าไม่พบ
 */
export const getWardForm = async (
  date: Date | Timestamp | string, 
  shift: ShiftType, 
  wardId: string
): Promise<WardForm | null> => {
  try {
    // ตรวจสอบและแปลงพารามิเตอร์ date ให้เป็น Date object
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'object' && date && 'toDate' in date && typeof date.toDate === 'function') {
      // Timestamp object จาก Firestore
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      // พยายามแปลงจาก ISO string หรือรูปแบบอื่นๆ
      dateObj = new Date(date);
    } else {
      throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
    }
    
    // แปลงวันที่เป็น string ในรูปแบบ YYYY-MM-DD เพื่อใช้ในการค้นหา
    const dateString = format(dateObj, 'yyyy-MM-dd');
    
    console.log(`กำลังค้นหาแบบฟอร์ม ${shift} ของวันที่ ${dateString} สำหรับแผนก ${wardId}`);
    
    // สร้าง query ใช้ index ที่เหมาะสม (dateString + shift + wardId)
    const wardFormsRef = collection(db, COLLECTION_WARDFORMS);
    const q = query(
      wardFormsRef,
      where('dateString', '==', dateString),
      where('shift', '==', shift),
      where('wardId', '==', wardId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`ไม่พบแบบฟอร์ม ${shift} ของวันที่ ${dateString} สำหรับแผนก ${wardId}`);
      return null;
    }
    
    // ใช้เอกสารแรกที่พบ
    const docSnapshot = querySnapshot.docs[0];
    const formData = docSnapshot.data() as WardForm;
    
    console.log(`พบแบบฟอร์ม ${shift} ของวันที่ ${dateString} สำหรับแผนก ${wardId} (ID: ${docSnapshot.id})`);
    
    return {
      ...formData,
      id: docSnapshot.id
    };
  } catch (error) {
    console.error('Error getting ward form:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแบบฟอร์มกะดึกล่าสุดของวันก่อนหน้า
 * @param date วันที่ปัจจุบัน
 * @param wardId รหัสแผนก
 * @returns ข้อมูลแบบฟอร์มกะดึกล่าสุด หรือ null ถ้าไม่พบ
 */
export const getPreviousNightShiftForm = async (
  date: Date | Timestamp | string, 
  wardId: string
): Promise<WardForm | null> => {
  try {
    // ตรวจสอบและแปลงพารามิเตอร์ date ให้เป็น Date object
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'object' && date && 'toDate' in date && typeof date.toDate === 'function') {
      // Timestamp object จาก Firestore
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      // พยายามแปลงจาก ISO string หรือรูปแบบอื่นๆ
      dateObj = new Date(date);
    } else {
      throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
    }

    // คำนวณวันก่อนหน้า
    const previousDate = subDays(dateObj, 1);
    
    // แปลงวันที่เป็น string ในรูปแบบ YYYY-MM-DD
    const dateString = format(previousDate, 'yyyy-MM-dd');
    
    console.log(`กำลังค้นหาแบบฟอร์มกะดึกของวันที่ ${dateString} สำหรับแผนก ${wardId}`);
    
    // สร้าง query ใช้ index ที่เหมาะสม (wardId + dateString + shift + status + finalizedAt)
    const wardFormsRef = collection(db, COLLECTION_WARDFORMS);
    const q = query(
      wardFormsRef,
      where('wardId', '==', wardId),
      where('dateString', '==', dateString),
      where('shift', '==', ShiftType.NIGHT),
      where('status', '==', FormStatus.APPROVED), // เฉพาะที่อนุมัติแล้วเท่านั้น
      orderBy('finalizedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`ไม่พบแบบฟอร์มกะดึกของวันที่ ${dateString} สำหรับแผนก ${wardId}`);
      return null;
    }
    
    const docSnapshot = querySnapshot.docs[0];
    const formData = docSnapshot.data() as WardForm;
    
    console.log(`พบแบบฟอร์มกะดึกของวันที่ ${dateString} สำหรับแผนก ${wardId} (ID: ${docSnapshot.id})`);
    
    return {
      ...formData,
      id: docSnapshot.id
    };
  } catch (error) {
    console.error('Error getting previous night shift form:', error);
    throw error;
  }
};

/**
 * ตรวจสอบว่ามีแบบฟอร์มกะเช้าที่บันทึกแล้วสำหรับวันที่และแผนกนี้หรือไม่
 * @param date วันที่
 * @param wardId รหัสแผนก
 * @returns สถานะและรายละเอียดของแบบฟอร์มกะเช้า
 */
export const checkMorningShiftFormStatus = async (
  date: Date, 
  wardId: string
): Promise<{
  exists: boolean;
  formId?: string;
  status?: FormStatus;
  isDraft?: boolean;
}> => {
  try {
    const morningForm = await getWardForm(date, ShiftType.MORNING, wardId);
    
    if (!morningForm) {
      return { exists: false };
    }
    
    return {
      exists: true,
      formId: morningForm.id,
      status: morningForm.status,
      isDraft: morningForm.isDraft
    };
  } catch (error) {
    console.error('Error checking morning shift form status:', error);
    throw error;
  }
};

/**
 * คำนวณ Patient Census สำหรับกะเช้าโดยอัตโนมัติจากข้อมูลกะดึกของวันก่อนหน้า
 * @param previousNightForm แบบฟอร์มกะดึกของวันก่อนหน้า (ถ้ามี)
 * @param inputData ข้อมูลที่ป้อนเข้ามาสำหรับกะเช้า
 * @returns จำนวนผู้ป่วยที่คำนวณแล้ว
 */
export const calculateMorningCensus = (
  previousNightForm: WardForm | null,
  inputData: {
    patientCensus?: number;
    newAdmit: number;
    transferIn: number;
    referIn: number;
    discharge: number;
    transferOut: number;
    referOut: number;
    dead: number;
  }
): number => {
  // กรณีไม่มีข้อมูลกะดึกของวันก่อนหน้า ใช้ค่าที่ผู้ใช้ป้อนโดยตรง
  if (!previousNightForm || previousNightForm.patientCensus === undefined) {
    if (inputData.patientCensus !== undefined) {
      return inputData.patientCensus;
    }
    return 0; // กรณีไม่มีข้อมูลใดๆ เลย
  }
  
  // ถ้ามีข้อมูลกะดึกของวันก่อนหน้า ให้ใช้ค่า patientCensus จากกะดึกของวันก่อนหน้า
  // เป็นค่าเริ่มต้น และไม่ต้องคำนวณ (จะถูกล็อคไม่ให้แก้ไขตามที่ต้องการในธุรกิจ)
  return previousNightForm.patientCensus;
};

/**
 * คำนวณ Patient Census สำหรับกะดึกโดยอัตโนมัติจากข้อมูลกะเช้า
 * @param morningForm แบบฟอร์มกะเช้า
 * @param nightShiftData ข้อมูลกะดึกที่ป้อนเพิ่มเติม
 * @returns จำนวนผู้ป่วยที่คำนวณแล้ว
 */
export const calculateNightShiftCensus = (
  morningForm: WardForm,
  nightShiftData: {
    newAdmit: number;
    transferIn: number;
    referIn: number;
    discharge: number;
    transferOut: number;
    referOut: number;
    dead: number;
  }
): number => {
  // ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วนหรือไม่
  if (morningForm.patientCensus === undefined) {
    console.error('Missing required data for calculation: morningForm.patientCensus');
    return 0;
  }
  
  // ยอดผู้ป่วยกะเช้า
  const morningCensus = morningForm.patientCensus;
  
  // ผู้ป่วยเข้ากะดึก (รับใหม่ + ย้ายเข้า + ส่งตัวเข้า)
  const nightAdmissions = 
    (nightShiftData.newAdmit || 0) + 
    (nightShiftData.transferIn || 0) + 
    (nightShiftData.referIn || 0);
  
  // ผู้ป่วยออกกะดึก (จำหน่าย + ย้ายออก + ส่งตัวออก + เสียชีวิต)
  const nightDischarges = 
    (nightShiftData.discharge || 0) + 
    (nightShiftData.transferOut || 0) + 
    (nightShiftData.referOut || 0) + 
    (nightShiftData.dead || 0);
  
  // คำนวณยอดผู้ป่วยกะดึก
  // สูตร: ยอดผู้ป่วยกะเช้า + ผู้ป่วยเข้ากะดึก - ผู้ป่วยออกกะดึก
  const calculatedCensus = morningCensus + nightAdmissions - nightDischarges;
  
  // ป้องกันการคำนวณที่ทำให้ค่าติดลบ
  return Math.max(0, calculatedCensus);
};

/**
 * บันทึกแบบฟอร์มกะเช้า (ฉบับร่าง)
 * @param formData ข้อมูลแบบฟอร์ม
 * @param user ข้อมูลผู้ใช้ที่บันทึก
 * @returns รหัสของแบบฟอร์มที่บันทึกแล้ว
 */
export const saveMorningShiftFormDraft = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    const now = new Date();
    const dateString = format(now, 'yyyy-MM-dd');
    
    // ตรวจสอบว่ามีแบบฟอร์มนี้อยู่แล้วหรือไม่
    const existingForm = await getWardForm(
      formData.date instanceof Timestamp ? new Date(formData.date.toDate()) : 
      formData.date instanceof Date ? formData.date : 
      new Date(formData.date as string),
      ShiftType.MORNING,
      formData.wardId as string
    );
    
    // สร้างข้อมูลพื้นฐานของแบบฟอร์ม
    const wardFormData: Partial<WardForm> = {
      ...formData,
      dateString,
      shift: ShiftType.MORNING,
      status: FormStatus.DRAFT,
      isDraft: true,
      createdBy: user.uid,
      recorderFirstName: user.firstName || '',
      recorderLastName: user.lastName || '',
      updatedAt: createServerTimestamp()
    };
    
    let formId: string;
    
    if (existingForm) {
      // อัพเดทแบบฟอร์มที่มีอยู่แล้ว
      formId = existingForm.id as string;
      await updateDoc(doc(db, COLLECTION_WARDFORMS, formId), {
        ...wardFormData,
        createdAt: existingForm.createdAt // คงค่าเดิมไว้
      });
    } else {
      // สร้างแบบฟอร์มใหม่
      const docRef = await addDoc(collection(db, COLLECTION_WARDFORMS), {
        ...wardFormData,
        createdAt: createServerTimestamp()
      });
      formId = docRef.id;
    }
    
    return formId;
  } catch (error) {
    console.error('Error saving morning shift form draft:', error);
    throw error;
  }
};

/**
 * บันทึกแบบฟอร์มกะเช้า (ฉบับสมบูรณ์)
 * @param formData ข้อมูลแบบฟอร์ม
 * @param user ข้อมูลผู้ใช้ที่บันทึก
 * @returns รหัสของแบบฟอร์มที่บันทึกแล้ว
 */
export const finalizeMorningShiftForm = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบความครบถ้วนของข้อมูล
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      const errorMessage = validation.missingFields.length > 0 
        ? `กรุณากรอกข้อมูลให้ครบถ้วน: ${validation.missingFields.join(', ')}` 
        : validation.errors.join(', ');
      throw new Error(errorMessage);
    }
    
    const now = new Date();
    const dateString = format(now, 'yyyy-MM-dd');
    
    // ตรวจสอบว่ามีแบบฟอร์มนี้อยู่แล้วหรือไม่
    const existingForm = await getWardForm(
      formData.date instanceof Timestamp ? new Date(formData.date.toDate()) : 
      formData.date instanceof Date ? formData.date : 
      new Date(formData.date as string),
      ShiftType.MORNING,
      formData.wardId as string
    );
    
    // สร้างข้อมูลสำหรับบันทึกแบบฟอร์มฉบับสมบูรณ์
    const wardFormData: Partial<WardForm> = {
      ...formData,
      dateString,
      shift: ShiftType.MORNING,
      status: FormStatus.FINAL,
      isDraft: false,
      createdBy: user.uid,
      recorderFirstName: user.firstName || '',
      recorderLastName: user.lastName || '',
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };
    
    let formId: string;
    
    if (existingForm) {
      // อัพเดทแบบฟอร์มที่มีอยู่แล้ว
      formId = existingForm.id as string;
      await updateDoc(doc(db, COLLECTION_WARDFORMS, formId), {
        ...wardFormData,
        createdAt: existingForm.createdAt // คงค่าเดิมไว้
      });
    } else {
      // สร้างแบบฟอร์มใหม่
      const docRef = await addDoc(collection(db, COLLECTION_WARDFORMS), {
        ...wardFormData,
        createdAt: createServerTimestamp()
      });
      formId = docRef.id;
    }
    
    return formId;
  } catch (error) {
    console.error('Error finalizing morning shift form:', error);
    throw error;
  }
};

/**
 * บันทึกแบบฟอร์มกะดึก (ฉบับร่าง)
 * @param formData ข้อมูลแบบฟอร์ม
 * @param user ข้อมูลผู้ใช้ที่บันทึก
 * @returns รหัสของแบบฟอร์มที่บันทึกแล้ว
 */
export const saveNightShiftFormDraft = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบว่ามีการบันทึกและอนุมัติแบบฟอร์มกะเช้าแล้วหรือไม่
    const morningFormStatus = await checkMorningShiftFormStatus(
      formData.date instanceof Timestamp ? new Date(formData.date.toDate()) : 
      formData.date instanceof Date ? formData.date : 
      new Date(formData.date as string),
      formData.wardId as string
    );
    
    if (!morningFormStatus.exists || morningFormStatus.status !== FormStatus.APPROVED) {
      throw new Error('ไม่สามารถบันทึกข้อมูลกะดึกได้ เนื่องจากยังไม่มีการอนุมัติข้อมูลกะเช้า');
    }
    
    const now = new Date();
    const dateString = format(now, 'yyyy-MM-dd');
    
    // ตรวจสอบว่ามีแบบฟอร์มนี้อยู่แล้วหรือไม่
    const existingForm = await getWardForm(
      formData.date instanceof Timestamp ? new Date(formData.date.toDate()) : 
      formData.date instanceof Date ? formData.date : 
      new Date(formData.date as string),
      ShiftType.NIGHT,
      formData.wardId as string
    );
    
    // สร้างข้อมูลพื้นฐานของแบบฟอร์ม
    const wardFormData: Partial<WardForm> = {
      ...formData,
      dateString,
      shift: ShiftType.NIGHT,
      status: FormStatus.DRAFT,
      isDraft: true,
      createdBy: user.uid,
      recorderFirstName: user.firstName || '',
      recorderLastName: user.lastName || '',
      updatedAt: createServerTimestamp()
    };
    
    let formId: string;
    
    if (existingForm) {
      // อัพเดทแบบฟอร์มที่มีอยู่แล้ว
      formId = existingForm.id as string;
      await updateDoc(doc(db, COLLECTION_WARDFORMS, formId), {
        ...wardFormData,
        createdAt: existingForm.createdAt // คงค่าเดิมไว้
      });
    } else {
      // สร้างแบบฟอร์มใหม่
      const docRef = await addDoc(collection(db, COLLECTION_WARDFORMS), {
        ...wardFormData,
        createdAt: createServerTimestamp()
      });
      formId = docRef.id;
    }
    
    return formId;
  } catch (error) {
    console.error('Error saving night shift form draft:', error);
    throw error;
  }
};

/**
 * บันทึกแบบฟอร์มกะดึก (ฉบับสมบูรณ์)
 * @param formData ข้อมูลแบบฟอร์ม
 * @param user ข้อมูลผู้ใช้ที่บันทึก
 * @returns รหัสของแบบฟอร์มที่บันทึกแล้ว
 */
export const finalizeNightShiftForm = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบความครบถ้วนของข้อมูล
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      const errorMessage = validation.missingFields.length > 0 
        ? `กรุณากรอกข้อมูลให้ครบถ้วน: ${validation.missingFields.join(', ')}` 
        : validation.errors.join(', ');
      throw new Error(errorMessage);
    }
    
    // ตรวจสอบว่ามีการบันทึกและอนุมัติแบบฟอร์มกะเช้าแล้วหรือไม่
    const morningFormStatus = await checkMorningShiftFormStatus(
      formData.date instanceof Timestamp ? new Date(formData.date.toDate()) : 
      formData.date instanceof Date ? formData.date : 
      new Date(formData.date as string),
      formData.wardId as string
    );
    
    if (!morningFormStatus.exists || morningFormStatus.status !== FormStatus.APPROVED) {
      throw new Error('ไม่สามารถบันทึกข้อมูลกะดึกได้ เนื่องจากยังไม่มีการอนุมัติข้อมูลกะเช้า');
    }
    
    const now = new Date();
    const dateString = format(now, 'yyyy-MM-dd');
    
    // ตรวจสอบว่ามีแบบฟอร์มนี้อยู่แล้วหรือไม่
    const existingForm = await getWardForm(
      formData.date instanceof Timestamp ? new Date(formData.date.toDate()) : 
      formData.date instanceof Date ? formData.date : 
      new Date(formData.date as string),
      ShiftType.NIGHT,
      formData.wardId as string
    );
    
    // สร้างข้อมูลสำหรับบันทึกแบบฟอร์มฉบับสมบูรณ์
    const wardFormData: Partial<WardForm> = {
      ...formData,
      dateString,
      shift: ShiftType.NIGHT,
      status: FormStatus.FINAL,
      isDraft: false,
      createdBy: user.uid,
      recorderFirstName: user.firstName || '',
      recorderLastName: user.lastName || '',
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };
    
    let formId: string;
    
    if (existingForm) {
      // อัพเดทแบบฟอร์มที่มีอยู่แล้ว
      formId = existingForm.id as string;
      await updateDoc(doc(db, COLLECTION_WARDFORMS, formId), {
        ...wardFormData,
        createdAt: existingForm.createdAt // คงค่าเดิมไว้
      });
    } else {
      // สร้างแบบฟอร์มใหม่
      const docRef = await addDoc(collection(db, COLLECTION_WARDFORMS), {
        ...wardFormData,
        createdAt: createServerTimestamp()
      });
      formId = docRef.id;
    }
    
    return formId;
  } catch (error) {
    console.error('Error finalizing night shift form:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแบบฟอร์มล่าสุดที่ยังไม่ได้บันทึกฉบับสมบูรณ์
 * @param wardId รหัสแผนก
 * @param user ข้อมูลผู้ใช้
 * @returns ข้อมูลแบบฟอร์มล่าสุด หรือ null ถ้าไม่พบ
 */
export const getLatestDraftForm = async (
  wardId: string,
  user: User
): Promise<WardForm | null> => {
  try {
    // สร้าง query
    const wardFormsRef = collection(db, COLLECTION_WARDFORMS);
    const q = query(
      wardFormsRef,
      where('wardId', '==', wardId),
      where('createdBy', '==', user.uid),
      where('isDraft', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnapshot = querySnapshot.docs[0];
    const formData = docSnapshot.data() as WardForm;
    
    return {
      ...formData,
      id: docSnapshot.id
    };
  } catch (error) {
    console.error('Error getting latest draft form:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแบบฟอร์มทั้งหมดของแผนกในวันที่กำหนด
 * @param wardId รหัสแผนก
 * @param date วันที่ในรูปแบบ YYYY-MM-DD
 * @returns รายการแบบฟอร์มทั้งหมด
 */
export const getWardFormsByWardAndDate = async (
  wardId: string,
  date: string
): Promise<WardForm[]> => {
  try {
    const dateObj = parseDate(date);
    const startDate = startOfDay(dateObj);
    const endDate = endOfDay(dateObj);
    
    const formsQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', wardId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'asc'),
      orderBy('shift', 'asc')
    );
    
    const querySnapshot = await getDocs(formsQuery);
    const forms: WardForm[] = [];
    
    querySnapshot.forEach((doc) => {
      const formData = doc.data() as WardForm;
      
      // ตรวจสอบและจัดการกับ createdAt และ updatedAt เพื่อหลีกเลี่ยงการใช้ undefined
      let createdAtField: TimestampField | null = null;
      let updatedAtField: TimestampField | null = null;
      
      if (formData.createdAt) {
        if (typeof formData.createdAt === 'object' && 'toDate' in formData.createdAt && typeof formData.createdAt.toDate === 'function') {
          createdAtField = formData.createdAt;
        } else {
          createdAtField = createServerTimestamp();
        }
      }
      
      if (formData.updatedAt) {
        if (typeof formData.updatedAt === 'object' && 'toDate' in formData.updatedAt && typeof formData.updatedAt.toDate === 'function') {
          updatedAtField = formData.updatedAt;
        } else {
          updatedAtField = createServerTimestamp();
        }
      }
      
      forms.push({
        ...formData,
        id: doc.id,
        // แปลง Timestamp เป็น string ด้วยการตรวจสอบประเภทข้อมูลก่อน
        date: formData.date ? (
          typeof formData.date === 'object' && 'toDate' in formData.date && typeof formData.date.toDate === 'function' 
            ? format(formData.date.toDate(), 'yyyy-MM-dd') 
            : typeof formData.date === 'string' 
              ? formData.date 
              : format(new Date(formData.date as any), 'yyyy-MM-dd')
        ) : '',
        createdAt: createdAtField,
        updatedAt: updatedAtField
      });
    });
    
    return forms;
  } catch (error) {
    console.error('Error getting ward forms:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแบบฟอร์มของวันก่อนหน้า เพื่อนำมาใช้คำนวณยอดยกมา
 * @param wardId รหัสแผนก
 * @param date วันที่ในรูปแบบ YYYY-MM-DD
 * @returns แบบฟอร์มล่าสุดของวันก่อนหน้า หรือ null ถ้าไม่พบ
 */
export const getPreviousDayLastForm = async (
  wardId: string,
  date: string
): Promise<WardForm | null> => {
  try {
    const dateObj = parseDate(date);
    const previousDate = subDays(dateObj, 1);
    const startDate = startOfDay(previousDate);
    const endDate = endOfDay(previousDate);
    
    // ดึงแบบฟอร์มของวันก่อนหน้า โดยเรียงตามเวลาที่อัพเดทล่าสุด
    const formsQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', wardId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc'),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(formsQuery);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const formData = doc.data() as WardForm;
    
    // ตรวจสอบและจัดการกับ createdAt และ updatedAt เพื่อหลีกเลี่ยงการใช้ undefined
    let createdAtField: TimestampField | null = null;
    let updatedAtField: TimestampField | null = null;
    
    if (formData.createdAt) {
      if (typeof formData.createdAt === 'object' && 'toDate' in formData.createdAt && typeof formData.createdAt.toDate === 'function') {
        createdAtField = formData.createdAt;
      } else {
        createdAtField = createServerTimestamp();
      }
    }
    
    if (formData.updatedAt) {
      if (typeof formData.updatedAt === 'object' && 'toDate' in formData.updatedAt && typeof formData.updatedAt.toDate === 'function') {
        updatedAtField = formData.updatedAt;
      } else {
        updatedAtField = createServerTimestamp();
      }
    }
    
    return {
      ...formData,
      id: doc.id,
      // แปลง Timestamp เป็น string ด้วยการตรวจสอบประเภทข้อมูลก่อน
      date: formData.date ? (
        typeof formData.date === 'object' && 'toDate' in formData.date && typeof formData.date.toDate === 'function' 
          ? format(formData.date.toDate(), 'yyyy-MM-dd') 
          : typeof formData.date === 'string' 
            ? formData.date 
            : format(new Date(formData.date as any), 'yyyy-MM-dd')
      ) : '',
      createdAt: createdAtField,
      updatedAt: updatedAtField
    };
  } catch (error) {
    console.error('Error getting previous day form:', error);
    throw error;
  }
}; 