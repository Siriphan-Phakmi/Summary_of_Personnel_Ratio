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
  wardIdInput: string
): Promise<WardForm | null> => {
  // <<< แปลงเป็นตัวพิมพ์ใหญ่ทันที >>>
  const wardId = wardIdInput.toUpperCase();
  
  const callContext = new Error().stack?.split('\n')[2]?.trim() || 'unknown caller'; 
  console.log(`[getWardForm ENTRY] Called by: ${callContext}`);
  console.log(`[getWardForm PARAMS] date=${date?.toDate().toISOString()}, shift=${shift}, originalWardId=${wardIdInput}, usedWardId=${wardId}`); // <<< Log ทั้ง original และ used
  
  try {
    const dateString = format(date.toDate(), 'yyyy-MM-dd');

    // *** ใช้ wardId (ตัวพิมพ์ใหญ่) ในการสร้าง ID เสมอ ***
    const draftDocId = generateWardFormId(wardId, shift, FormStatus.DRAFT, date);
    const finalDocId = generateWardFormId(wardId, shift, FormStatus.FINAL, date);
    const approvedDocId = generateWardFormId(wardId, shift, FormStatus.APPROVED, date);
    
    console.log(`[getWardForm ${wardId}/${shift}] Checking document IDs:\n- Draft: ${draftDocId}\n- Final: ${finalDocId}\n- Approved: ${approvedDocId}`);
    
    // Check documents directly by ID instead of querying
    // Try approved first, then final, then draft
    try {
      const approvedDocRef = doc(db, COLLECTION_WARDFORMS, approvedDocId);
      const approvedDocSnap = await getDoc(approvedDocRef);
      console.log(`[getWardForm ${wardId}/${shift}] Direct ID Lookup (Approved: ${approvedDocId}): Exists = ${approvedDocSnap.exists()}`); // <<< Log ผล ID Lookup
      if (approvedDocSnap.exists()) {
        const approvedDoc = { id: approvedDocSnap.id, ...approvedDocSnap.data() } as WardForm;
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found APPROVED by direct ID: ${approvedDocId}`);
        return approvedDoc;
      }
      
      const finalDocRef = doc(db, COLLECTION_WARDFORMS, finalDocId);
      const finalDocSnap = await getDoc(finalDocRef);
      console.log(`[getWardForm ${wardId}/${shift}] Direct ID Lookup (Final: ${finalDocId}): Exists = ${finalDocSnap.exists()}`); // <<< Log ผล ID Lookup
      if (finalDocSnap.exists()) {
        const finalDoc = { id: finalDocSnap.id, ...finalDocSnap.data() } as WardForm;
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found FINAL by direct ID: ${finalDocId}`);
        return finalDoc;
      }
      
      const draftDocRef = doc(db, COLLECTION_WARDFORMS, draftDocId);
      const draftDocSnap = await getDoc(draftDocRef);
      console.log(`[getWardForm ${wardId}/${shift}] Direct ID Lookup (Draft: ${draftDocId}): Exists = ${draftDocSnap.exists()}`); // <<< Log ผล ID Lookup
      if (draftDocSnap.exists()) {
        const draftDoc = { id: draftDocSnap.id, ...draftDocSnap.data() } as WardForm;
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found DRAFT by direct ID: ${draftDocId}`);
        return draftDoc;
      }
      
      console.log(`[getWardForm ${wardId}/${shift}] No documents found by direct ID lookup, proceeding to query.`);
    } catch (idLookupError) {
      console.error(`[getWardForm ${wardId}/${shift}] Error during direct ID lookup:`, idLookupError);
      // Continue to query-based approach
    }
    
    // Query ข้อมูลแบบตรง (ทั้ง date+shift+wardId)
    const q = query(
      collection(db, 'wardForms'),
      where('dateString', '==', dateString),
      where('shift', '==', shift),
      where('wardId', '==', wardId) // <<< ใช้ wardId ตัวพิมพ์ใหญ่
    );
    
    console.log(`[getWardForm ${wardId}/${shift}] Query parameters: dateString=${dateString}, shift=${shift}, wardId=${wardId}`);
    const querySnapshot = await getDocs(q);
    console.log(`[getWardForm ${wardId}/${shift}] Query snapshot size for direct query: ${querySnapshot.size}`); // <<< Log ผล Query

    // ถ้าพบข้อมูลจาก Query หลัก
    if (!querySnapshot.empty) {
      // ... (ส่วนที่เหลือของการจัดการผล Query) ...
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardForm));
      console.log(`[getWardForm ${wardId}/${shift}] Found ${docs.length} documents from direct query.`);
      // ค้นหาตามลำดับความสำคัญ: APPROVED > FINAL > DRAFT
      const approvedDoc = docs.find(doc => doc.status === FormStatus.APPROVED);
      if (approvedDoc) {
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found APPROVED by query: ${approvedDoc.id}`);
        return approvedDoc;
      }
      const finalDoc = docs.find(doc => doc.status === FormStatus.FINAL);
      if (finalDoc) {
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found FINAL by query: ${finalDoc.id}`);
        return finalDoc;
      }
      const draftDoc = docs.find(doc => doc.status === FormStatus.DRAFT);
      if (draftDoc) {
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found DRAFT by query: ${draftDoc.id}`);
        return draftDoc;
      }
      // Fallback: return the first doc if specific statuses aren't found
      console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found first document by query (no specific status match): ${docs[0].id}`);
      return docs[0];
    } 
    
    // ถ้าไม่พบข้อมูลจาก Query หลัก ให้ลองค้นหาเพิ่มเติมโดยไม่กรอง shift
    console.log(`[getWardForm ${wardId}/${shift}] No direct hits from primary query, trying secondary query for date=${dateString}, wardId=${wardId}`);
    
    try {
      // Query โดยไม่ระบุ shift เพื่อดึงข้อมูลทั้งหมดของวันและ ward นั้น
      const secondaryQuery = query(
        collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('wardId', '==', wardId) // <<< ใช้ wardId ตัวพิมพ์ใหญ่
      );
      
      const secondarySnapshot = await getDocs(secondaryQuery);
      console.log(`[getWardForm ${wardId}/${shift}] Query snapshot size for secondary query: ${secondarySnapshot.size}`); // <<< Log ผล Query รอง
      
      // ... (ส่วนที่เหลือของการจัดการผล Query รอง) ...
      if (!secondarySnapshot.empty) {
        const secondaryDocs = secondarySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardForm));
        console.log(`[getWardForm ${wardId}/${shift}] Found ${secondaryDocs.length} documents from secondary query.`);
        const matchingShiftDocs = secondaryDocs.filter(doc => doc.shift === shift);
        if (matchingShiftDocs.length > 0) {
          console.log(`[getWardForm ${wardId}/${shift}] Found ${matchingShiftDocs.length} matching shift documents from secondary query.`);
          const approvedDoc = matchingShiftDocs.find(doc => doc.status === FormStatus.APPROVED);
          if (approvedDoc) {
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found APPROVED by secondary query: ${approvedDoc.id}`);
            return approvedDoc;
          }
          const finalDoc = matchingShiftDocs.find(doc => doc.status === FormStatus.FINAL);
          if (finalDoc) {
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found FINAL by secondary query: ${finalDoc.id}`);
            return finalDoc;
          }
          const draftDoc = matchingShiftDocs.find(doc => doc.status === FormStatus.DRAFT);
          if (draftDoc) {
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found DRAFT by secondary query: ${draftDoc.id}`);
            return draftDoc;
          }
          console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found first matching shift document by secondary query: ${matchingShiftDocs[0].id}`);
          return matchingShiftDocs[0];
        }
      }
    } catch (secondaryQueryError) {
      console.error(`[getWardForm ${wardId}/${shift}] Error in secondary query:`, secondaryQueryError);
      // Continue to return null if both methods fail
    }
    
    console.log(`[getWardForm ${wardId}/${shift}] RETURN: No data found after all checks.`);
    return null;
    
  } catch (error) {
    console.error(`[getWardForm ${wardId}/${shift}] Global Error retrieving form:`, error);
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
     dateObj = new Date(dateInput.seconds * 1000);
  } else {
    console.warn('Unrecognizable date format for ID generation, using current date as fallback.');
    dateObj = new Date(); 
  }

  // Format date part (YearMonthDay)
  const datePart = format(dateObj, 'yyMMdd');
  
  // Simplify status for ID (approved/final are treated the same for ID uniqueness for a given day/shift)
  const simpleStatus = status === FormStatus.FINAL || status === FormStatus.APPROVED ? 'final' : 'draft';
  
  // Construct ID without time part
  return `${wardId}_${shift}_${simpleStatus}_d${datePart}`;
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
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }
    const wardId = formData.wardId.toUpperCase();

    let dataForValidation: Partial<WardForm> = { ...formData, wardId: wardId };
    if (!dataForValidation.wardName) {
      try {
        const wardDocRef = query(collection(db, COLLECTION_WARDS), where("wardId", "==", wardId));
        const wardQuerySnap = await getDocs(wardDocRef);
        if (!wardQuerySnap.empty) {
          dataForValidation.wardName = wardQuerySnap.docs[0].data().wardName as string;
        }
      } catch (err) {
        console.warn('Cannot fetch wardName for validation:', err);
      }
    }
    const validationResult = validateFormData(dataForValidation);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.missingFields.join(', ')}`);
    }

    let dateObjForId: Date;
    if (formData.date instanceof Timestamp) {
      dateObjForId = formData.date.toDate();
    } else if (formData.date instanceof Date) {
      dateObjForId = formData.date;
    } else if (typeof formData.date === 'string') {
      dateObjForId = new Date(formData.date + 'T00:00:00Z');
      if (isNaN(dateObjForId.getTime())) {
        throw new Error('Invalid date string format in formData for ID generation');
      }
    } else {
      throw new Error('Invalid or missing date in formData for ID generation');
    }
    const dateStr = formatDateYMD(dateObjForId);

    // --- Logic to determine the document ID to use --- 
    let documentIdToUse: string;
    let isUpdatingDraft = false;

    // 1. Check if formData already has an ID (likely from loaded draft)
    if (formData.id && formData.id.includes('_draft_')) { // Check if the passed ID looks like a draft ID
      documentIdToUse = formData.id;
      isUpdatingDraft = true;
      console.log(`[finalizeMorning] Using existing draft ID from formData: ${documentIdToUse}`);
    } else {
      // 2. If no ID in formData, generate potential Draft ID and check Firestore
      const potentialDraftId = generateWardFormId(wardId, ShiftType.MORNING, FormStatus.DRAFT, Timestamp.fromDate(dateObjForId));
      const draftDocRef = doc(db, COLLECTION_WARDFORMS, potentialDraftId);
      const draftDocSnap = await getDoc(draftDocRef);

      if (draftDocSnap.exists() && draftDocSnap.data().status === FormStatus.DRAFT) {
        // Found an existing Draft document in Firestore
        documentIdToUse = potentialDraftId;
        isUpdatingDraft = true;
        console.log(`[finalizeMorning] Found existing draft document in Firestore: ${documentIdToUse}`);
      } else {
        // 3. No existing draft found, generate a new FINAL ID
        documentIdToUse = generateWardFormId(wardId, ShiftType.MORNING, FormStatus.FINAL, Timestamp.fromDate(dateObjForId));
        isUpdatingDraft = false;
        console.log(`[finalizeMorning] No draft found, creating new document with FINAL ID: ${documentIdToUse}`);
      }
    }
    // --- End of ID determination logic --- 

    // Prepare data to save
    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: documentIdToUse, // Ensure the determined ID is in the data
      wardId: wardId,
      wardName: dataForValidation.wardName || '', // dataForValidation should be populated earlier
      status: FormStatus.FINAL,
      isDraft: false,
      date: Timestamp.fromDate(dateObjForId),
      dateString: dateStr,
      createdBy: formData.createdBy || user.uid, // Keep original creator if updating draft
      updatedBy: user.uid, // Always set updatedBy
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };

    // Add createdAt only if creating a new document (not updating a draft)
    if (!isUpdatingDraft) {
      dataToSave.createdAt = createServerTimestamp();
    }

    // Get reference to the document (either existing draft or new final)
    const docRef = doc(db, COLLECTION_WARDFORMS, documentIdToUse);
    
    // Check current status before overwriting (allow overwriting DRAFT or FINAL)
    const currentDocSnap = await getDoc(docRef);
    if (currentDocSnap.exists() && ![FormStatus.DRAFT, FormStatus.FINAL].includes(currentDocSnap.data().status)) {
      const currentStatus = currentDocSnap.data().status;
      throw new Error(`Cannot overwrite form with status ${currentStatus}.`);
    }

    // Save the data using setDoc with merge: true
    await setDoc(docRef, dataToSave, { merge: true });
    console.log(`[finalizeMorning] Successfully saved document: ${documentIdToUse}`);

    try {
      await checkAndCreateDailySummary(dateObjForId, wardId, dataToSave.wardName || '');
      console.log('Daily summary checked/created for morning form');
    } catch (summaryError) {
      console.error('Error checking/creating daily summary:', summaryError);
    }

    return documentIdToUse;

  } catch (error) {
    console.error('Error finalizing morning shift form:', error);
    throw error;
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
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }
    if (formData.shift !== ShiftType.MORNING && formData.shift !== ShiftType.NIGHT) {
        throw new Error('Invalid shift type provided for saving draft.');
    }

    const wardId = formData.wardId.toUpperCase();
    
    let dateObj: Date;
    if (formData.date instanceof Timestamp) {
      dateObj = formData.date.toDate();
    } else if (formData.date instanceof Date) {
        dateObj = formData.date;
    } else if (typeof formData.date === 'string') {
      dateObj = new Date(formData.date + 'T00:00:00Z');
      if (isNaN(dateObj.getTime())) {
             throw new Error('Invalid date string format in formData');
        }
    } else {
        throw new Error('Invalid date type in formData');
    }
    const dateString = formatDateYMD(dateObj);

    let customDocId: string;
    if (formData.id && formData.id.trim() !== '') {
      customDocId = formData.id;
      console.log(`Using existing document ID: ${customDocId}`);
    } else {
      customDocId = generateWardFormId(wardId, formData.shift, FormStatus.DRAFT, Timestamp.fromDate(dateObj));
      console.log(`Generated new document ID: ${customDocId}`);
    }

    console.log(`Saving ${formData.shift} shift draft with ID: ${customDocId}, WardID: ${wardId}, DateString: ${dateString}`);

    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: customDocId,
      wardId: wardId,
      date: Timestamp.fromDate(dateObj),
      dateString: dateString,
      status: FormStatus.DRAFT,
      isDraft: true,
      createdBy: formData.createdBy || user?.uid || 'unknown',
      updatedAt: createServerTimestamp()
    };

    if (!formData.id) {
      dataToSave.createdAt = createServerTimestamp();
    }

    if (formData.shift === ShiftType.NIGHT) {
      const morningStatus = await checkMorningShiftFormStatus(dateObj, wardId);
    if (!morningStatus.exists || (morningStatus.status !== FormStatus.FINAL && morningStatus.status !== FormStatus.APPROVED)) {
      throw new Error('ไม่สามารถบันทึกร่างกะดึกได้ เนื่องจากกะเช้ายังไม่ได้ถูกบันทึกสมบูรณ์หรืออนุมัติ');
      }
    }

    const docRef = doc(db, COLLECTION_WARDFORMS, customDocId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().status !== FormStatus.DRAFT) {
      const currentStatus = docSnap.data().status;
      throw new Error(`ไม่สามารถบันทึกร่างทับได้เนื่องจากแบบฟอร์มมีสถานะ ${currentStatus} แล้ว`);
    }

    await setDoc(docRef, dataToSave, { merge: true });
    return customDocId;

  } catch (error) {
    console.error(`Error saving ${formData.shift || 'unknown'} shift form draft:`, error);
    throw error;
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
    // Initial Checks
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }
    if (formData.shift !== ShiftType.NIGHT) {
        throw new Error('Attempting to finalize night shift with incorrect shift type.');
    }
    const wardId = formData.wardId.toUpperCase();

    // Date Handling
    let dateObjForCheck: Date;
    if (formData.date instanceof Timestamp) {
      dateObjForCheck = formData.date.toDate();
    } else if (formData.date instanceof Date) {
        dateObjForCheck = formData.date;
    } else if (typeof formData.date === 'string') {
        dateObjForCheck = new Date(formData.date + 'T00:00:00Z');
       if (isNaN(dateObjForCheck.getTime())) {
        throw new Error('Invalid date string format in formData for ID generation');
      }
    } else {
      throw new Error('Invalid date type in formData for ID generation');
    }
    const dateStr = formatDateYMD(dateObjForCheck);
    const dateTimestamp = Timestamp.fromDate(dateObjForCheck);

    // Validation (Fetch wardName if needed)
    let dataForValidation: Partial<WardForm> = { ...formData, wardId: wardId, date: dateTimestamp, dateString: dateStr }; // Add required fields
    if (!dataForValidation.wardName) {
      try {
        const wardDocRef = query(collection(db, COLLECTION_WARDS), where("wardId", "==", wardId));
        const wardQuerySnap = await getDocs(wardDocRef);
        if (!wardQuerySnap.empty) {
          dataForValidation.wardName = wardQuerySnap.docs[0].data().wardName as string;
        }
      } catch (err) {
        console.warn('Cannot fetch wardName for night validation:', err);
      }
    }
    const validationResult = validateFormData(dataForValidation);
    if (!validationResult.isValid) {
      // Include specific field errors in the message
      const errorDetails = Object.entries(validationResult.errors).map(([field, msg]) => `${field}: ${msg}`).join('; ');
      throw new Error(`Validation failed: ${errorDetails || validationResult.missingFields.join(', ')}`);
    }

    // Check Morning Status
    const morningStatus = await checkMorningShiftFormStatus(dateObjForCheck, wardId);
    if (!morningStatus.exists || ![FormStatus.FINAL, FormStatus.APPROVED].includes(morningStatus.status!)) {
      throw new Error('ไม่สามารถบันทึกกะดึกได้ เนื่องจากกะเช้ายังไม่ได้ถูกบันทึกสมบูรณ์หรืออนุมัติ');
    }

    // Determine Document ID
    let documentIdToUse: string;
    let isUpdatingDraft = false;
    if (formData.id && formData.id.includes('_draft_')) {
      documentIdToUse = formData.id;
      isUpdatingDraft = true;
      console.log(`[finalizeNight] Using existing draft ID from formData: ${documentIdToUse}`);
    } else {
      const potentialDraftId = generateWardFormId(wardId, ShiftType.NIGHT, FormStatus.DRAFT, dateTimestamp);
      const draftDocRef = doc(db, COLLECTION_WARDFORMS, potentialDraftId);
      const draftDocSnap = await getDoc(draftDocRef);
      if (draftDocSnap.exists() && draftDocSnap.data().status === FormStatus.DRAFT) {
        documentIdToUse = potentialDraftId;
        isUpdatingDraft = true;
        console.log(`[finalizeNight] Found existing draft document in Firestore: ${documentIdToUse}`);
      } else {
        documentIdToUse = generateWardFormId(wardId, ShiftType.NIGHT, FormStatus.FINAL, dateTimestamp);
        isUpdatingDraft = false;
        console.log(`[finalizeNight] No draft found, creating new document with FINAL ID: ${documentIdToUse}`);
      }
    }

    // Prepare Data for Saving
    const dataToSave: Partial<WardForm> = {
      ...dataForValidation, // Use the validated data which includes wardName etc.
      id: documentIdToUse,
      status: FormStatus.FINAL,
      isDraft: false,
      updatedBy: user.uid,
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };
    // Add createdBy only if it wasn't set before (e.g., from draft)
    if (!dataToSave.createdBy) {
        dataToSave.createdBy = user.uid;
    }
    if (!isUpdatingDraft) {
      dataToSave.createdAt = createServerTimestamp();
    }

    // Check Before Overwriting
    const docRef = doc(db, COLLECTION_WARDFORMS, documentIdToUse);
    const currentDocSnap = await getDoc(docRef);
    if (currentDocSnap.exists() && ![FormStatus.DRAFT, FormStatus.FINAL].includes(currentDocSnap.data().status)) {
      const currentStatus = currentDocSnap.data().status;
      throw new Error(`Cannot overwrite form with status ${currentStatus}.`);
    }

    // Save Document
    await setDoc(docRef, dataToSave, { merge: true });
    console.log(`[finalizeNight] Successfully saved document: ${documentIdToUse}`);
    
    // Update Daily Summary
    try {
      const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, wardId);
      if (morningForm) {
        await checkAndCreateDailySummary(dateObjForCheck, wardId, morningForm.wardName || '');
        await updateDailySummary(dateObjForCheck, wardId, morningForm, dataToSave as WardForm, user, undefined);
        console.log('Daily summary updated with night shift data');
      } else {
        console.error('Cannot find morning form for creating daily summary');
      }
    } catch (summaryError) {
      console.error('Error updating daily summary:', summaryError);
    }

    return documentIdToUse;

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
  wardIdInput: string
): Promise<{ morningStatus: FormStatus | null; nightStatus: FormStatus | null }> => {
  let morningStatus: FormStatus | null = null;
  let nightStatus: FormStatus | null = null;

    const dateTimestamp = Timestamp.fromDate(date);
  const dateString = format(date, 'yyyy-MM-dd');
  const wardId = wardIdInput.toUpperCase();

  console.log(`[getShiftStatusesForDay] Fetching statuses for ward: ${wardId}, date: ${dateString} (Original: ${wardIdInput})`);

  try {
    // ใช้ getWardForm โดยส่ง wardId ตัวพิมพ์ใหญ่
    const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, wardId);
    morningStatus = morningForm?.status ?? null;
    console.log(`[getShiftStatusesForDay] Morning form found: ${morningForm ? morningForm.id : 'null'}, Status: ${morningStatus}`); 

    // ดึงสถานะกะดึก โดยส่ง wardId ตัวพิมพ์ใหญ่
    const nightForm = await getWardForm(dateTimestamp, ShiftType.NIGHT, wardId);
    nightStatus = nightForm?.status ?? null;
    console.log(`[getShiftStatusesForDay] Night form found: ${nightForm ? nightForm.id : 'null'}, Status: ${nightStatus}`); 

  } catch (error) {
    // ตรวจสอบว่าเป็น Error object ก่อนส่ง
    const logError = error instanceof Error ? error : new Error(`Unknown error in getShiftStatusesForDay: ${error}`);
    // แปลง context object เป็น string
    const contextString = `Date: ${dateString}, WardID: ${wardId}`;
    logSystemError(logError, 'Error in getShiftStatusesForDay', contextString);
    morningStatus = null; 
    nightStatus = null;
  }

  return { morningStatus, nightStatus };
}; 
