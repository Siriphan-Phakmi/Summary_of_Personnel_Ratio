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
import { checkAndCreateDailySummary, updateDailySummary } from './approvalServices/dailySummary';
import { isEqual } from 'lodash';
import { logSystemError } from '@/app/core/utils/logUtils';

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
 * @returns ผลการตรวจสอบ {isValid: boolean, missingFields: string[], errors: Record<string, string>}
 */
export const validateFormData = (formData: Partial<WardForm>): {
  isValid: boolean;
  missingFields: string[];
  errors: Record<string, string>;
} => {
  // Define required fields (excluding comment)
  const requiredNumericFields: (keyof WardForm)[] = [
    'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
    'newAdmit', 'transferIn', 'referIn',
    'transferOut', 'referOut', 'discharge', 'dead',
    'available', 'unavailable', 'plannedDischarge'
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

  // Check if comment is too long (optional field)
  if (formData.comment && typeof formData.comment === 'string' && formData.comment.length > 500) {
    isValid = false;
    errors['comment'] = 'ความยาวของหมายเหตุไม่ควรเกิน 500 ตัวอักษร';
  }

  // Return validation result
  return {
    isValid,
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
  date: Timestamp,
  shift: ShiftType,
  wardId: string
): Promise<WardForm | null> => {
  try {
    // Use wardId directly for querying without normalization

    // Refined log for parameters
    const dateString = format(date.toDate(), 'yyyy-MM-dd');
    console.log(`[getWardForm] Loading form: date=${dateString}, shift=${shift}, wardId=${wardId}`);

    // *** IMPORTANT: First try to find by document ID pattern for more precise querying ***
    const draftDocId = generateWardFormId(wardId, shift, FormStatus.DRAFT, date);
    const finalDocId = generateWardFormId(wardId, shift, FormStatus.FINAL, date);
    const approvedDocId = generateWardFormId(wardId, shift, FormStatus.APPROVED, date);
    
    console.log(`[getWardForm] Checking document IDs:\n- Draft: ${draftDocId}\n- Final: ${finalDocId}\n- Approved: ${approvedDocId}`);
    
    // Check documents directly by ID instead of querying
    // Try approved first, then final, then draft
    try {
      const approvedDocRef = doc(db, COLLECTION_WARDFORMS, approvedDocId);
      const approvedDocSnap = await getDoc(approvedDocRef);
      
      if (approvedDocSnap.exists()) {
        const approvedDoc = { id: approvedDocSnap.id, ...approvedDocSnap.data() } as WardForm;
        console.log(`[getWardForm] Found APPROVED document by direct ID lookup: ${approvedDocId}`);
        return approvedDoc;
      }
      
      const finalDocRef = doc(db, COLLECTION_WARDFORMS, finalDocId);
      const finalDocSnap = await getDoc(finalDocRef);
      
      if (finalDocSnap.exists()) {
        const finalDoc = { id: finalDocSnap.id, ...finalDocSnap.data() } as WardForm;
        console.log(`[getWardForm] Found FINAL document by direct ID lookup: ${finalDocId}`);
        return finalDoc;
      }
      
      const draftDocRef = doc(db, COLLECTION_WARDFORMS, draftDocId);
      const draftDocSnap = await getDoc(draftDocRef);
      
      if (draftDocSnap.exists()) {
        const draftDoc = { id: draftDocSnap.id, ...draftDocSnap.data() } as WardForm;
        console.log(`[getWardForm] Found DRAFT document by direct ID lookup: ${draftDocId}`);
        return draftDoc;
      }
      
      console.log('[getWardForm] No documents found by direct ID lookup, trying query');
    } catch (idLookupError) {
      console.error('[getWardForm] Error during direct ID lookup:', idLookupError);
      // Continue to query-based approach
    }
    
    // Query ข้อมูลแบบตรง (ทั้ง date+shift+wardId)
    const q = query(
      collection(db, 'wardForms'),
      where('dateString', '==', dateString),
      where('shift', '==', shift),
      where('wardId', '==', wardId)
    );
    
    console.log(`[getWardForm] Query parameters: dateString=${dateString}, shift=${shift}, wardId=${wardId}`);
    const querySnapshot = await getDocs(q);
    console.log(`[getWardForm] Query snapshot size for direct query: ${querySnapshot.size}`);

    // ถ้าพบข้อมูลจาก Query หลัก
    if (!querySnapshot.empty) {
      // เรียงลำดับเอกสารตามสถานะที่สำคัญ (APPROVED > FINAL > DRAFT)
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WardForm));
      
      console.log(`[getWardForm] พบเอกสาร ${docs.length} รายการจาก query หลัก`);
      
      // ค้นหาเอกสารที่เป็น APPROVED ก่อน
      const approvedDoc = docs.find(doc => doc.status === FormStatus.APPROVED);
      if (approvedDoc) {
        console.log(`[getWardForm] คืนค่าเอกสาร APPROVED ID=${approvedDoc.id}`);
        return approvedDoc as WardForm;
      }
      
      // ถ้าไม่พบ APPROVED ให้ค้นหา FINAL
      const finalDoc = docs.find(doc => doc.status === FormStatus.FINAL);
      if (finalDoc) {
        console.log(`[getWardForm] คืนค่าเอกสาร FINAL ID=${finalDoc.id}`);
        return finalDoc as WardForm;
      }
      
      // ถ้าไม่พบ FINAL ให้ค้นหา DRAFT
      const draftDoc = docs.find(doc => doc.status === FormStatus.DRAFT);
      if (draftDoc) {
        console.log(`[getWardForm] คืนค่าเอกสาร DRAFT ID=${draftDoc.id}`);
        return draftDoc as WardForm;
      }
      
      // หากไม่พบเอกสารที่มีสถานะที่ระบุ ให้คืนเอกสารแรกที่พบ
      console.log(`[getWardForm] คืนค่าเอกสารแรกที่พบ ID=${docs[0].id}`);
      return docs[0] as WardForm;
    } 
    
    // ถ้าไม่พบข้อมูลจาก Query หลัก ให้ลองค้นหาเพิ่มเติมโดยไม่กรอง shift
    console.log(`[getWardForm] No direct hits, trying secondary query for date=${dateString}, wardId=${wardId}`);
    
    try {
      // Query โดยไม่ระบุ shift เพื่อดึงข้อมูลทั้งหมดของวันและ ward นั้น
      const secondaryQuery = query(
        collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('wardId', '==', wardId)
      );
      
      const secondarySnapshot = await getDocs(secondaryQuery);
      console.log(`[getWardForm] Query snapshot size for secondary query: ${secondarySnapshot.size}`);
      
      if (!secondarySnapshot.empty) {
        // เรียงลำดับเอกสารตามสถานะที่สำคัญเหมือนเดิม
        const secondaryDocs = secondarySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as WardForm));
        
        console.log(`[getWardForm] พบเอกสาร ${secondaryDocs.length} รายการจาก query รอง`);
        
        // กรองเอกสารเฉพาะที่มี shift ตรงกับที่ต้องการ (เผื่อมีปัญหากับ where condition)
        const matchingShiftDocs = secondaryDocs.filter(doc => doc.shift === shift);
        
        if (matchingShiftDocs.length > 0) {
          console.log(`[getWardForm] พบ ${matchingShiftDocs.length} เอกสารที่มี shift ตรงกับที่ต้องการจาก query รอง`);
          
          // ค้นหาเอกสารตามลำดับความสำคัญเหมือนเดิม
          const approvedDoc = matchingShiftDocs.find(doc => doc.status === FormStatus.APPROVED);
          if (approvedDoc) {
            console.log(`[getWardForm] คืนค่าเอกสาร APPROVED ID=${approvedDoc.id} จาก query รอง`);
            return approvedDoc;
          }
          
          const finalDoc = matchingShiftDocs.find(doc => doc.status === FormStatus.FINAL);
          if (finalDoc) {
            console.log(`[getWardForm] คืนค่าเอกสาร FINAL ID=${finalDoc.id} จาก query รอง`);
            return finalDoc;
          }
          
          const draftDoc = matchingShiftDocs.find(doc => doc.status === FormStatus.DRAFT);
          if (draftDoc) {
            console.log(`[getWardForm] คืนค่าเอกสาร DRAFT ID=${draftDoc.id} จาก query รอง`);
            return draftDoc;
          }
          
          // หากไม่พบตามสถานะ แต่มีเอกสารที่ shift ตรงกัน ให้คืนเอกสารแรก
          console.log(`[getWardForm] คืนค่าเอกสารแรกที่พบที่มี shift ตรงกัน ID=${matchingShiftDocs[0].id}`);
          return matchingShiftDocs[0];
        }
      }
    } catch (secondaryQueryError) {
      console.error("[getWardForm] Error in secondary query:", secondaryQueryError);
      // Continue to return null if both methods fail
    }
    
    console.log('[getWardForm] ไม่พบข้อมูลจากทั้ง query หลักและ query รอง');
    return null;
    
  } catch (error) {
    console.error("[getWardForm] Error retrieving form:", error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแบบฟอร์มกะดึกล่าสุดของวันก่อนหน้า (ไม่ว่าสถานะจะเป็นอะไร)
 * @param date วันที่ปัจจุบัน (Date object)
 * @param wardId รหัสแผนก
 * @returns ข้อมูลแบบฟอร์มกะดึกล่าสุด หรือ null ถ้าไม่พบ
 */
export const getLatestPreviousNightForm = async (
  date: Date, 
  wardId: string
): Promise<WardForm | null> => {
  if (!date || !wardId) {
    console.error("getLatestPreviousNightForm: Missing required parameters", { date, wardId });
    return null;
  }
  
  try {
    const previousDate = subDays(date, 1);
    const previousDateString = formatDateYMD(previousDate);
    const normalizedWardId = wardId.toUpperCase();

    console.log(`[getLatestPrevNight] Querying for latest previous night: wardId=${normalizedWardId}, dateString=${previousDateString}`);

    const q = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', normalizedWardId),
      where('dateString', '==', previousDateString),
      where('shift', '==', ShiftType.NIGHT),
      orderBy('updatedAt', 'desc'), // Order by last update time
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data() as WardForm;
      console.log(`[getLatestPrevNight] Found form: ID=${doc.id}, Status=${data.status}`);
      
      // Convert Timestamps
      const convertTimestamp = (tsField: any): Date | null => {
         if (!tsField) return null;
         if (tsField instanceof Date) return tsField;
         if (tsField instanceof Timestamp) return tsField.toDate();
          if (tsField && typeof tsField.seconds === 'number') {
           return new Timestamp(tsField.seconds, tsField.nanoseconds ?? 0).toDate();
         }
         if (typeof tsField === 'object' && '_seconds' in tsField) {
             return new Timestamp((tsField as any)._seconds, (tsField as any)._nanoseconds).toDate();
         }
         try { return new Date(tsField); } catch { return null;}
      };

      return {
        ...data,
        id: doc.id,
        date: convertTimestamp(data.date),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        finalizedAt: convertTimestamp(data.finalizedAt),
        approvedAt: convertTimestamp(data.approvedAt),
      };
    } else {
      console.log(`[getLatestPrevNight] No form found for previous night.`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching latest previous night shift form:', error);
    logSystemError(error as Error, 'getLatestPreviousNightForm', undefined, `wardId: ${wardId}, date: ${formatDateYMD(date)}`);
    return null;
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
    const morningForm = await getWardForm(Timestamp.fromDate(date), ShiftType.MORNING, wardId);
    
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
 * Helper function to generate custom document ID
 * @param wardId รหัสแผนก
 * @param shift กะ
 * @param status สถานะของแบบฟอร์ม
 * @param date วันที่
 * @returns รหัสแบบฟอร์มที่สร้างขึ้นมา
 */
const generateWardFormId = (wardId: string, shift: ShiftType, status: FormStatus, dateInput: TimestampField): string => {
  let dateObj: Date;
  if (dateInput instanceof Timestamp) {
    dateObj = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else if (typeof dateInput === 'string') {
    dateObj = new Date(dateInput);
  } else if (dateInput && 'seconds' in dateInput && typeof dateInput.seconds === 'number') {
     // Handle Firestore Timestamp-like object (e.g., from serverTimestamp() resolution)
     dateObj = new Date(dateInput.seconds * 1000);
  } else {
    // Fallback or throw error if date is unrecognizable
    console.warn('Unrecognizable date format for ID generation, using current date as fallback.');
    dateObj = new Date(); 
  }

  const datePart = format(dateObj, 'yyMMdd');
  const timePart = format(dateObj, 'HHmmss'); // Use HHmmss for more uniqueness
  const simpleStatus = status === FormStatus.FINAL || status === FormStatus.APPROVED ? 'final' : 'draft'; // Simplify status for ID
  return `${wardId}_${shift}_${simpleStatus}_d${datePart}_t${timePart}`;
};

/**
 * Finalizes the morning shift form.
 * Uses setDoc with a custom ID.
 */
export const finalizeMorningShiftForm = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }
    // เตรียมข้อมูลสำหรับตรวจสอบ: รวม wardName ให้ครบถ้วน
    let dataForValidation: Partial<WardForm> = { ...formData };
    if (!dataForValidation.wardName && formData.wardId) {
      try {
        const wardRef = doc(db, COLLECTION_WARDS, formData.wardId);
        const wardSnap = await getDoc(wardRef);
        if (wardSnap.exists()) {
          dataForValidation.wardName = wardSnap.data().wardName as string;
        }
      } catch (err) {
        console.warn('Cannot fetch wardName for validation:', err);
      }
    }
    // ตรวจสอบว่าข้อมูลครบถ้วนด้วย validateFormData
    const validationResult = validateFormData(dataForValidation);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.missingFields.join(', ')}`);
    }

    // สร้าง Date object สำหรับใช้ในการ query และสร้าง ID
    let dateObjForId: Date;
    if (formData.date instanceof Timestamp) {
      dateObjForId = formData.date.toDate();
    } else if (formData.date instanceof Date) {
      dateObjForId = formData.date;
    } else if (typeof formData.date === 'string') {
      try {
        dateObjForId = new Date(formData.date + 'T00:00:00Z'); // Assume date string is YYYY-MM-DD
        if (isNaN(dateObjForId.getTime())) throw new Error(); 
      } catch {
        throw new Error('Invalid date string format in formData for ID generation');
      }
    } else {
      throw new Error('Invalid or missing date in formData for ID generation');
    }
    const dateStr = formatDateYMD(dateObjForId); // ใช้ Date object ที่แปลงแล้ว

    // 1. พยายามดึง ID ของ Draft ที่มีอยู่ก่อน (ถ้ามี)
    let documentIdToUse: string | undefined = formData.id; // ใช้ ID จาก formData ถ้ามี (เช่น มาจากการโหลด Draft)
    if (!documentIdToUse) {
      // ถ้าไม่มี ID ใน formData, ลองสร้าง ID สำหรับสถานะ DRAFT เพื่อหา draft เดิม
      const draftDocId = generateWardFormId(
          formData.wardId, 
      ShiftType.MORNING, 
          FormStatus.DRAFT, // <<< ใช้ DRAFT status
          Timestamp.fromDate(dateObjForId) 
      );
      // ตรวจสอบว่า draft document ด้วย ID นี้มีอยู่จริงหรือไม่
      const draftDocRef = doc(db, COLLECTION_WARDFORMS, draftDocId);
      const draftDocSnap = await getDoc(draftDocRef);
      if (draftDocSnap.exists() && draftDocSnap.data().status === FormStatus.DRAFT) {
          documentIdToUse = draftDocId; // <<< ถ้าเจอ Draft ให้ใช้ ID นี้
          console.log(`Found existing draft with ID ${draftDocId}, will update.`);
      }
    }

    // 2. ถ้ายังไม่มี ID (ไม่เจอ Draft เดิม) ให้สร้าง ID ใหม่สำหรับสถานะ FINAL
    if (!documentIdToUse) {
        documentIdToUse = generateWardFormId(
      formData.wardId, 
      ShiftType.MORNING, 
            FormStatus.FINAL, // <<< ใช้ FINAL status สำหรับเอกสารใหม่
            Timestamp.fromDate(dateObjForId)
    );
        console.log(`No existing draft found or ID provided, creating new document with FINAL ID: ${documentIdToUse}`);
    } else {
        console.log(`Using existing document ID for finalization: ${documentIdToUse}`);
    }

    // เตรียมข้อมูลสำหรับบันทึก
    const dataToSave: Partial<WardForm> = {
      ...formData,
      wardName: dataForValidation.wardName || '', // Use wardName derived during validation
      status: FormStatus.FINAL,
      isDraft: false,
      date: Timestamp.fromDate(dateObjForId), // *** Store as Timestamp ***
      dateString: dateStr, // *** Use formatted string ***
      createdBy: formData.createdBy || user.uid,
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };

    // ถ้าเป็นการสร้างใหม่ (ไม่มี formData.id ตอนเริ่ม และไม่เจอ draft) ให้เพิ่ม createdAt
    if (!formData.id && documentIdToUse.includes('final')) { // Check if it's a new final doc ID
      dataToSave.createdAt = createServerTimestamp();
    }

    // ใช้ Transaction หรือ write ตรงๆ โดยใช้ documentIdToUse ที่ได้มา
    const docRef = doc(db, COLLECTION_WARDFORMS, documentIdToUse);
    
    // ตรวจสอบสถานะปัจจุบันก่อนบันทึก (ป้องกันการเขียนทับสถานะที่ไม่ใช่ DRAFT)
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().status !== FormStatus.DRAFT && docSnap.data().status !== FormStatus.FINAL /* Allow overwriting FINAL for idempotency if needed, but maybe safer to prevent */) {
      const currentStatus = docSnap.data().status;
      throw new Error(`ไม่สามารถบันทึกได้เนื่องจากแบบฟอร์มมีสถานะ ${currentStatus} แล้ว`);
    }

    // บันทึกข้อมูล (ใช้ setDoc + merge:true เพื่ออัพเดทหรือสร้างใหม่)
    await setDoc(docRef, dataToSave, { merge: true });
    
    // สร้างหรืออัพเดท daily summary
    try {
      await checkAndCreateDailySummary(
        new Date(dateStr), 
        formData.wardId, 
        formData.wardName || ''
      );
      console.log('Daily summary checked/created for morning form');
    } catch (summaryError) {
      console.error('Error checking/creating daily summary:', summaryError);
      // ไม่ throw error เพื่อให้ flow การบันทึกสำเร็จ แม้ว่า summary จะไม่สำเร็จ
    }

    // คืนค่า ID ของเอกสาร
    return documentIdToUse;
  } catch (error) {
    console.error('Error finalizing morning shift form:', error);
    throw error; // ส่งต่อ error ไปให้ผู้เรียกใช้จัดการเอง
  }
};

/**
 * บันทึกแบบฟอร์มเป็นฉบับร่าง
 * @param formData ข้อมูลที่ต้องการบันทึก
 * @param user ข้อมูลผู้ใช้
 * @returns รหัสเอกสารที่บันทึก
 */
export const saveDraftWardForm = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }
    
    // Validate the shift type explicitly
    if (formData.shift !== ShiftType.MORNING && formData.shift !== ShiftType.NIGHT) {
        throw new Error('Invalid shift type provided for saving draft.');
    }

    // *** Normalize wardId to uppercase ***
    const normalizedWardId = formData.wardId.toUpperCase();
    
    // *** Generate dateString (Handle different date types safely) ***
    let dateObj: Date;
    if (formData.date instanceof Timestamp) {
      dateObj = formData.date.toDate();
    } else if (formData.date instanceof Date) {
        dateObj = formData.date;
    } else if (typeof formData.date === 'string') {
        // Assume 'yyyy-MM-dd' or ISO format from input
        dateObj = new Date(formData.date);
        if (isNaN(dateObj.getTime())) { // Add check for invalid date string
             throw new Error('Invalid date string format in formData');
        }
    } else {
        throw new Error('Invalid date type in formData');
    }
    const dateString = formatDateYMD(dateObj);

    // *** IMPORTANT FIX: Ensure we're using the existing document ID if it exists ***
    let customDocId: string;
    
    if (formData.id && formData.id.trim() !== '') {
      // If we have an existing document ID and it's not empty, use it
      customDocId = formData.id;
      console.log(`Using existing document ID: ${customDocId}`);
    } else {
      // Otherwise, generate a new ID
      customDocId = generateWardFormId(
        normalizedWardId, // Use normalized ID
        formData.shift,   // Use shift from formData
        FormStatus.DRAFT, 
        Timestamp.fromDate(dateObj) // Pass Timestamp based on validated dateObj
      );
      console.log(`Generated new document ID: ${customDocId}`);
    }

    console.log(`Saving ${formData.shift} shift draft with ID: ${customDocId}, WardID: ${normalizedWardId}, DateString: ${dateString}`);

    // เตรียมข้อมูลสำหรับบันทึก (เพิ่ม wardId และ dateString ที่แปลงแล้ว)
    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: customDocId, // *** IMPORTANT FIX: Ensure ID is included in the data ***
      wardId: normalizedWardId, // *** Store normalized ID ***
      date: Timestamp.fromDate(dateObj), // Ensure date is stored as Firestore Timestamp
      dateString: dateString,   // *** Store dateString ***
      status: FormStatus.DRAFT,
      isDraft: true,
      createdBy: formData.createdBy || user?.uid || 'unknown', // Added null check for user
      updatedAt: createServerTimestamp()
    };

    // ถ้าเป็นการสร้างใหม่ ให้เพิ่ม createdAt
    if (!formData.id) {
      dataToSave.createdAt = createServerTimestamp();
    }

    // If saving a night shift draft, check if the morning shift is finalized/approved
    if (formData.shift === ShiftType.NIGHT) {
    const morningStatus = await checkMorningShiftFormStatus(dateObj, normalizedWardId); // Use normalized ID
    if (!morningStatus.exists || (morningStatus.status !== FormStatus.FINAL && morningStatus.status !== FormStatus.APPROVED)) {
      throw new Error('ไม่สามารถบันทึกร่างกะดึกได้ เนื่องจากกะเช้ายังไม่ได้ถูกบันทึกสมบูรณ์หรืออนุมัติ');
      }
    }

    // ใช้ Transaction หรือ write ตรงๆ
    const docRef = doc(db, COLLECTION_WARDFORMS, customDocId);
    
    // ตรวจสอบสถานะปัจจุบันของเอกสาร
    const docSnap = await getDoc(docRef);
    
    // ถ้าเอกสารมีอยู่แล้ว และสถานะไม่ใช่ DRAFT
    if (docSnap.exists() && docSnap.data().status !== FormStatus.DRAFT) {
      const currentStatus = docSnap.data().status;
      throw new Error(`ไม่สามารถบันทึกร่างทับได้เนื่องจากแบบฟอร์มมีสถานะ ${currentStatus} แล้ว`);
    }

    // *** IMPORTANT DEBUG LOGS ***
    console.log(`[DEBUG] Saving form data to Firestore with ID: ${customDocId}`);
    console.log(`[DEBUG] Data being saved:`, JSON.stringify({
      id: dataToSave.id,
      wardId: dataToSave.wardId,
      dateString: dataToSave.dateString,
      shift: dataToSave.shift,
      status: dataToSave.status,
      isDraft: dataToSave.isDraft,
    }, null, 2));

    // บันทึกข้อมูล - ใช้ setDoc เพื่อให้สามารถกำหนด Document ID เองได้
    // merge: true เพื่อให้อัปเดทเฉพาะฟิลด์ที่ส่งมา ไม่ลบฟิลด์อื่นที่มีอยู่แล้ว
    await setDoc(docRef, dataToSave, { merge: true });

    // คืนค่า ID ของเอกสาร
    return customDocId;
  } catch (error) {
    console.error(`Error saving ${formData.shift || 'unknown'} shift form draft:`, error);
    throw error; // ส่งต่อ error ไปให้ผู้เรียกใช้จัดการเอง
  }
};

/**
 * Finalizes the night shift form.
 * Uses setDoc with a custom ID.
 */
export const finalizeNightShiftForm = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }

    // ตรวจสอบว่าข้อมูลครบถ้วน
    const validationResult = validateFormData(formData);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.missingFields.join(', ')}`);
    }

    // ตรวจสอบว่ามี morning form ที่ FINAL หรือ APPROVED หรือไม่
    let dateObjForCheck: Date;
    if (formData.date instanceof Timestamp) {
      dateObjForCheck = formData.date.toDate();
    } else if (formData.date instanceof Date) {
        dateObjForCheck = formData.date;
    } else if (typeof formData.date === 'string') {
        dateObjForCheck = new Date(formData.date + 'T00:00:00Z');
    } else {
        throw new Error('Invalid date type in formData for morning status check');
    }
    const morningStatus = await checkMorningShiftFormStatus(dateObjForCheck, formData.wardId);
    
    if (!morningStatus.exists || (morningStatus.status !== FormStatus.FINAL && morningStatus.status !== FormStatus.APPROVED)) {
      throw new Error('ไม่สามารถบันทึกกะดึกได้ เนื่องจากกะเช้ายังไม่ได้ถูกบันทึกสมบูรณ์หรืออนุมัติ');
    }

    // สร้าง Date object สำหรับใช้ในการ query และสร้าง ID (เหมือนกับ morning)
    const dateObjForId = dateObjForCheck; // Use the same validated Date object
    const dateStr = formatDateYMD(dateObjForId);

    // 1. พยายามดึง ID ของ Draft ที่มีอยู่ก่อน (ถ้ามี)
    let documentIdToUse: string | undefined = formData.id;
    if (!documentIdToUse) {
      const draftDocId = generateWardFormId(
      formData.wardId, 
      ShiftType.NIGHT, 
          FormStatus.DRAFT, // <<< ใช้ DRAFT status
          Timestamp.fromDate(dateObjForId)
      );
      const draftDocRef = doc(db, COLLECTION_WARDFORMS, draftDocId);
      const draftDocSnap = await getDoc(draftDocRef);
      if (draftDocSnap.exists() && draftDocSnap.data().status === FormStatus.DRAFT) {
          documentIdToUse = draftDocId;
          console.log(`Found existing night draft with ID ${draftDocId}, will update.`);
      }
    }

    // 2. ถ้ายังไม่มี ID (ไม่เจอ Draft เดิม) ให้สร้าง ID ใหม่สำหรับสถานะ FINAL
    if (!documentIdToUse) {
        documentIdToUse = generateWardFormId(
            formData.wardId,
            ShiftType.NIGHT,
            FormStatus.FINAL, // <<< ใช้ FINAL status สำหรับเอกสารใหม่
            Timestamp.fromDate(dateObjForId)
        );
        console.log(`No existing night draft found or ID provided, creating new document with FINAL ID: ${documentIdToUse}`);
    } else {
        console.log(`Using existing document ID for night finalization: ${documentIdToUse}`);
    }

    // เตรียมข้อมูลสำหรับบันทึก
    const dataToSave: Partial<WardForm> = {
      ...formData,
      wardName: formData.wardName || '', // Include wardName
      status: FormStatus.FINAL,
      isDraft: false,
      date: Timestamp.fromDate(dateObjForId), // Store as Timestamp
      dateString: dateStr,
      createdBy: formData.createdBy || user.uid,
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };

    // ถ้าเป็นการสร้างใหม่ (ไม่มี formData.id ตอนเริ่ม และไม่เจอ draft) ให้เพิ่ม createdAt
    if (!formData.id && documentIdToUse.includes('final')) { // Check if it's a new final doc ID
      dataToSave.createdAt = createServerTimestamp();
    }

    // ใช้ Transaction หรือ write ตรงๆ โดยใช้ documentIdToUse ที่ได้มา
    const docRef = doc(db, COLLECTION_WARDFORMS, documentIdToUse);
    
    // ตรวจสอบสถานะปัจจุบันก่อนบันทึก (ป้องกันการเขียนทับสถานะที่ไม่ใช่ DRAFT)
    const docSnap = await getDoc(docRef);
    
    // ถ้าเอกสารมีอยู่แล้ว และสถานะไม่ใช่ DRAFT
    if (docSnap.exists() && docSnap.data().status !== FormStatus.DRAFT) {
      const currentStatus = docSnap.data().status;
      throw new Error(`ไม่สามารถบันทึกได้เนื่องจากแบบฟอร์มมีสถานะ ${currentStatus} แล้ว`);
    }

    // บันทึกข้อมูล (ใช้ setDoc + merge:true เพื่ออัพเดทหรือสร้างใหม่)
    await setDoc(docRef, dataToSave, { merge: true });
    
    // ดึงข้อมูล morning form เพื่อสร้าง/อัพเดท daily summary
    try {
      // ดึงข้อมูล morning form
      const morningForm = await getWardForm(Timestamp.fromDate(dateObjForCheck), ShiftType.MORNING, formData.wardId); // Convert Date to Timestamp
      
      if (morningForm) {
        // สร้างหรืออัพเดท daily summary
        await checkAndCreateDailySummary(
          dateObjForCheck,
          formData.wardId,
          formData.wardName || ''
        );
        
        // อัพเดท daily summary ด้วยข้อมูลจาก morning form และ night form
        await updateDailySummary(
          dateObjForCheck,
          formData.wardId,
          morningForm,
          dataToSave as WardForm,
          user,
          undefined
        );
        
        console.log('Daily summary updated with night shift data');
      } else {
        console.error('Cannot find morning form for creating daily summary');
      }
    } catch (summaryError) {
      console.error('Error updating daily summary:', summaryError);
      // ไม่ throw error เพื่อให้ flow การบันทึกสำเร็จ แม้ว่า summary จะไม่สำเร็จ
    }

    // คืนค่า ID ของเอกสาร
    return documentIdToUse;
  } catch (error) {
    console.error('Error finalizing night shift form:', error);
    throw error; // ส่งต่อ error ไปให้ผู้เรียกใช้จัดการเอง
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
    // Normalize wardId to uppercase
    const normalizedWardId = wardId.toUpperCase();
    
    console.log(`[getLatestDraftForm] Querying for latest draft for ward ${normalizedWardId} by user ${user.uid}`);

    // สร้าง query
    const wardFormsRef = collection(db, COLLECTION_WARDFORMS);
    const q = query(
      wardFormsRef,
      where('wardId', '==', normalizedWardId), // Use normalized ID
      where('createdBy', '==', user.uid),
      where('isDraft', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
       console.log(`[getLatestDraftForm] No draft found for ward ${normalizedWardId} by user ${user.uid}`);
      return null;
    }
    
    const docSnapshot = querySnapshot.docs[0];
    const formData = docSnapshot.data() as WardForm;
    
     console.log(`[getLatestDraftForm] Found draft form ID: ${docSnapshot.id}`);

    return {
      ...formData,
      id: docSnapshot.id
      // Convert timestamp fields if necessary for the consumer
      // date: formData.date instanceof Timestamp ? formData.date.toDate() : formData.date,
      // createdAt: formData.createdAt instanceof Timestamp ? formData.createdAt.toDate() : formData.createdAt,
      // updatedAt: formData.updatedAt instanceof Timestamp ? formData.updatedAt.toDate() : formData.updatedAt,
    };
  } catch (error) {
    console.error('Error getting latest draft form:', error);
    throw error; // Re-throw error for handling in the hook
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

// แก้ไขการเรียกใช้ getWardForm ใน getSummaryForWard
export const getSummaryForWard = async (date: Date, wardId: string): Promise<{
  morningForm: WardForm | null;
  nightForm: WardForm | null;
}> => {
  try {
    const timestamp = Timestamp.fromDate(date);
    const morningForm = await getWardForm(timestamp, ShiftType.MORNING, wardId);
    
    if (!morningForm) {
      console.log(`[getSummaryForWard] No morning form found for ward ${wardId} on ${format(date, 'yyyy-MM-dd')}`);
    }
    
    const nightForm = await getWardForm(timestamp, ShiftType.NIGHT, wardId);
    
    if (!nightForm) {
      console.log(`[getSummaryForWard] No night form found for ward ${wardId} on ${format(date, 'yyyy-MM-dd')}`);
    }
    
    return { morningForm, nightForm };
  } catch (error) {
    console.error(`[getSummaryForWard] Error getting summary for ward ${wardId}:`, error);
    throw error;
  }
};

/**
 * NEW FUNCTION: ดึงสถานะของทั้งสองกะสำหรับวันที่และวอร์ดที่ระบุ
 * @param date วันที่ (Date object)
 * @param wardId รหัสแผนก (Business Ward ID)
 * @returns ออบเจ็กต์ที่มีสถานะของกะเช้าและกะดึก
 */
export const getShiftStatusesForDay = async (
  date: Date,
  wardId: string
): Promise<{ morningStatus: FormStatus | null; nightStatus: FormStatus | null }> => {
  if (!date || !wardId) {
    console.error("[getShiftStatusesForDay] Missing required parameters", { date, wardId });
    return { morningStatus: null, nightStatus: null };
  }

  let morningStatus: FormStatus | null = null;
  let nightStatus: FormStatus | null = null;

  try {
    const dateTimestamp = Timestamp.fromDate(date);
    const normalizedWardId = wardId.toUpperCase();
    const dateString = formatDateYMD(date);

    console.log(`[getShiftStatusesForDay] Fetching statuses for ward: ${normalizedWardId}, date: ${dateString}`);

    // ใช้ getWardForm ที่ปรับปรุงแล้ว (ซึ่งลองหาด้วย ID ก่อน) เพื่อประสิทธิภาพ
    const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, normalizedWardId);
    morningStatus = morningForm?.status ?? null; // <<< ตรวจสอบว่ากำหนดค่าถูกต้อง
    console.log(`[getShiftStatusesForDay] Morning form found: ${morningForm ? morningForm.id : 'null'}, Status: ${morningStatus}`); // <<< แก้ไข log

    // ดึงสถานะกะดึก
    const nightForm = await getWardForm(dateTimestamp, ShiftType.NIGHT, normalizedWardId);
    nightStatus = nightForm?.status ?? null; // <<< ตรวจสอบว่ากำหนดค่าถูกต้อง
    console.log(`[getShiftStatusesForDay] Night form found: ${nightForm ? nightForm.id : 'null'}, Status: ${nightStatus}`); // <<< แก้ไข log

  } catch (error) {
    console.error(`[getShiftStatusesForDay] Error fetching statuses for ward ${wardId} on ${format(date, 'yyyy-MM-dd')}:`, error); // แก้ไข template literal
    // ไม่ throw error แต่คืนค่า null เพื่อให้ UI จัดการได้
  }

  return { morningStatus, nightStatus }; // <<< เพิ่ม return statement ที่ขาดไป
};
