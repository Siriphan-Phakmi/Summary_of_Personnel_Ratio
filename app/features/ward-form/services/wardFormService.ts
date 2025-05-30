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
import { 
  COLLECTION_WARDFORMS, 
  COLLECTION_WARDS, 
  COLLECTION_APPROVALS, 
  COLLECTION_SUMMARIES 
} from './constants';
import { checkAndCreateDailySummary, updateDailySummary } from './approvalServices/dailySummary';
import { isEqual } from 'lodash';
import { logSystemError } from '@/app/core/utils/logUtils';
import { updateDailySummaryApprovalStatus } from './approvalServices/approvalForms';

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
  console.log(`[getWardForm PARAMS] date=${date?.toDate().toISOString()}, shift=${shift}, originalWardId=${wardIdInput}, usedWardId=${wardId}`);
  
  try {
    const dateString = format(date.toDate(), 'yyyy-MM-dd');
    const shiftPrefix = shift === ShiftType.MORNING ? 'm' : 'n';

    // *** ใช้ shiftPrefix ในการสร้าง ID ตามรูปแบบใหม่ ***
    const draftDocIdPattern = `${wardId}_${shiftPrefix}_draft_d`;
    const finalDocIdPattern = `${wardId}_${shiftPrefix}_final_d`;
    const approvedDocIdPattern = `${wardId}_${shiftPrefix}_approved_d`;
    
    console.log(`[getWardForm ${wardId}/${shift}] Checking document ID patterns:\n- Draft: ${draftDocIdPattern}\n- Final: ${finalDocIdPattern}\n- Approved: ${approvedDocIdPattern}`);
    
    // Query ข้อมูลตามรูปแบบใหม่ (ใช้ dateString และ wardId ตามปกติ)
    const q = query(
      collection(db, 'wardForms'),
      where('dateString', '==', dateString),
      where('shift', '==', shift),
      where('wardId', '==', wardId)
    );
    
    console.log(`[getWardForm ${wardId}/${shift}] Query parameters: dateString=${dateString}, shift=${shift}, wardId=${wardId}`);
    const querySnapshot = await getDocs(q);
    console.log(`[getWardForm ${wardId}/${shift}] Query snapshot size for direct query: ${querySnapshot.size}`);

    // ถ้าพบข้อมูลจาก Query หลัก
    if (!querySnapshot.empty) {
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardForm));
      
      // เพิ่มการตรวจสอบเพื่อให้แน่ใจว่าเราเลือกเอกสารที่ถูกต้องตามรูปแบบ ID ใหม่
      // กรองเฉพาะเอกสารที่มี ID ตามรูปแบบใหม่
      const filteredDocs = docs.filter(doc => {
        const docId = doc.id || '';
        return docId.includes(`${wardId}_${shiftPrefix}_`) && docId.includes(`_d${dateString.replace(/-/g, '')}`);
      });

      // ถ้าพบเอกสารตามรูปแบบใหม่
      if (filteredDocs.length > 0) {
        console.log(`[getWardForm ${wardId}/${shift}] Found ${filteredDocs.length} documents matching new ID pattern.`);
        
        // ค้นหาตามลำดับความสำคัญ: APPROVED > FINAL > DRAFT
        const approvedDoc = filteredDocs.find(doc => doc.status === FormStatus.APPROVED);
        if (approvedDoc) {
          console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found APPROVED by new pattern: ${approvedDoc.id}`);
          return approvedDoc;
        }
        const finalDoc = filteredDocs.find(doc => doc.status === FormStatus.FINAL);
        if (finalDoc) {
          console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found FINAL by new pattern: ID=${finalDoc.id}, Status=${finalDoc.status}`);
          return finalDoc;
        }
        const draftDoc = filteredDocs.find(doc => doc.status === FormStatus.DRAFT);
        if (draftDoc) {
          console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found DRAFT by new pattern: ID=${draftDoc.id}, Status=${draftDoc.status}`);
          return draftDoc;
        }
      }
      
      // ถ้าไม่พบตามรูปแบบใหม่ ให้ใช้รูปแบบเดิมเป็น fallback
      console.log(`[getWardForm ${wardId}/${shift}] Falling back to original pattern search.`);
      
      // ค้นหาตามลำดับความสำคัญ: APPROVED > FINAL > DRAFT
      const approvedDoc = docs.find(doc => doc.status === FormStatus.APPROVED);
      if (approvedDoc) {
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found APPROVED by query: ${approvedDoc.id}`);
        return approvedDoc;
      }
      const finalDoc = docs.find(doc => doc.status === FormStatus.FINAL);
      if (finalDoc) {
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found FINAL by query: ID=${finalDoc.id}, Status=${finalDoc.status}`);
        return finalDoc;
      }
      const draftDoc = docs.find(doc => doc.status === FormStatus.DRAFT);
      if (draftDoc) {
        console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found DRAFT by query: ID=${draftDoc.id}, Status=${draftDoc.status}`);
        return draftDoc;
      }
      // Fallback: return the first doc if specific statuses aren't found
      console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found first document by query (no specific status match): ID=${docs[0].id}, Status=${docs[0].status}`);
      return docs[0];
    } 
    
    // หากไม่พบข้อมูลหลัก ลองค้นหาเพิ่มเติม (ไม่จำเป็นต้องปรับส่วนนี้มากนัก เพราะเป็น fallback)
    console.log(`[getWardForm ${wardId}/${shift}] No direct hits from primary query, trying secondary query for date=${dateString}, wardId=${wardId}`);
    
    try {
      // Query โดยไม่ระบุ shift เพื่อดึงข้อมูลทั้งหมดของวันและ ward นั้น
      const secondaryQuery = query(
        collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('wardId', '==', wardId)
      );
      
      const secondarySnapshot = await getDocs(secondaryQuery);
      console.log(`[getWardForm ${wardId}/${shift}] Query snapshot size for secondary query: ${secondarySnapshot.size}`);
      
      if (!secondarySnapshot.empty) {
        const secondaryDocs = secondarySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardForm));
        console.log(`[getWardForm ${wardId}/${shift}] Found ${secondaryDocs.length} documents from secondary query.`);
        
        // กรองเอกสารที่ตรงกับ shift ที่ต้องการและมีรูปแบบ ID ใหม่
        const matchingShiftWithPattern = secondaryDocs.filter(doc => {
          return doc.shift === shift && (doc.id || '').includes(`${wardId}_${shiftPrefix}_`);
        });
        
        if (matchingShiftWithPattern.length > 0) {
          console.log(`[getWardForm ${wardId}/${shift}] Found ${matchingShiftWithPattern.length} matching documents with new ID pattern from secondary query.`);
          const approvedDoc = matchingShiftWithPattern.find(doc => doc.status === FormStatus.APPROVED);
          if (approvedDoc) {
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found APPROVED with new pattern by secondary query: ${approvedDoc.id}`);
            return approvedDoc;
          }
          const finalDoc = matchingShiftWithPattern.find(doc => doc.status === FormStatus.FINAL);
          if (finalDoc) {
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found FINAL with new pattern by secondary query: ID=${finalDoc.id}, Status=${finalDoc.status}`);
            return finalDoc;
          }
          const draftDoc = matchingShiftWithPattern.find(doc => doc.status === FormStatus.DRAFT);
          if (draftDoc) {
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found DRAFT with new pattern by secondary query: ID=${draftDoc.id}, Status=${draftDoc.status}`);
            return draftDoc;
          }
        }
        
        // Fallback to original pattern (ถ้าไม่พบรูปแบบใหม่)
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
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found FINAL by secondary query: ID=${finalDoc.id}, Status=${finalDoc.status}`);
            return finalDoc;
          }
          const draftDoc = matchingShiftDocs.find(doc => doc.status === FormStatus.DRAFT);
          if (draftDoc) {
            console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found DRAFT by secondary query: ID=${draftDoc.id}, Status=${draftDoc.status}`);
            return draftDoc;
          }
          console.log(`[getWardForm ${wardId}/${shift}] RETURN: Found first matching shift document by secondary query: ID=${matchingShiftDocs[0].id}, Status=${matchingShiftDocs[0].status}`);
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
 * @param previousNightForm แบบฟอร์มกะดึกของวันก่อนหน้า
 * @param inputData ข้อมูลกะเช้าที่ป้อน
 * @returns จำนวนผู้ป่วยที่คำนวณแล้ว
 */
export const calculateMorningCensus = (
  previousNightForm: WardForm | null,
  inputData: {
    patientCensus?: number;
    initialPatientCensus?: number;
    newAdmit: number;
    transferIn: number;
    referIn: number;
    discharge: number;
    transferOut: number;
    referOut: number;
    dead: number;
  }
): {initialPatientCensus: number, calculatedCensus: number, patientCensus: number} => {
  // ฟังก์ชันช่วยในการแปลงค่าให้เป็นตัวเลขที่ถูกต้อง
  const safeNumber = (value: any): number => {
    if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
      return 0;
    }
    return Number(value);
  };

  let initialValue: number;
  
  // กรณีไม่มีข้อมูลกะดึกของวันก่อนหน้า ใช้ค่าที่ผู้ใช้ป้อนโดยตรง
  if (!previousNightForm || previousNightForm.patientCensus === undefined) {
    // ลำดับการพิจารณา: initialPatientCensus (ถ้ามี) > patientCensus > 0
    initialValue = inputData.initialPatientCensus !== undefined ? safeNumber(inputData.initialPatientCensus) : 
                  (inputData.patientCensus !== undefined ? safeNumber(inputData.patientCensus) : 0);
  } else {
  // ถ้ามีข้อมูลกะดึกของวันก่อนหน้า ให้ใช้ค่า patientCensus จากกะดึกของวันก่อนหน้า
    initialValue = safeNumber(previousNightForm.patientCensus);
  }
  
  // คำนวณยอดผู้ป่วยจากการรับเข้า-จำหน่าย
  const admissions = safeNumber(inputData.newAdmit) + safeNumber(inputData.transferIn) + safeNumber(inputData.referIn);
  const discharges = safeNumber(inputData.discharge) + safeNumber(inputData.transferOut) + safeNumber(inputData.referOut) + safeNumber(inputData.dead);
  const calculatedCensus = Math.max(0, initialValue + admissions - discharges);

  console.log(`[calculateMorningCensus] initialValue=${initialValue}, admissions=${admissions}, discharges=${discharges}, result=${calculatedCensus}`);
  
  return {
    initialPatientCensus: initialValue, // ค่าเริ่มต้นจากกะดึกของวันก่อนหน้า
    calculatedCensus: calculatedCensus, // ค่าที่คำนวณได้จากการรับเข้า-จำหน่าย
    patientCensus: calculatedCensus // ค่าสุดท้ายที่ใช้แสดงผล (เท่ากับค่าที่คำนวณได้)
  };
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
): {initialPatientCensus: number, calculatedCensus: number, patientCensus: number} => {
  // ฟังก์ชันช่วยในการแปลงค่าให้เป็นตัวเลขที่ถูกต้อง
  const safeNumber = (value: any): number => {
    if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
      return 0;
    }
    return Number(value);
  };

  // ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วนหรือไม่
  if (morningForm.patientCensus === undefined && morningForm.calculatedCensus === undefined) {
    console.error('Missing required data for calculation: morningForm.patientCensus or morningForm.calculatedCensus');
    return {initialPatientCensus: 0, calculatedCensus: 0, patientCensus: 0};
  }
  
  // ใช้ค่าที่คำนวณได้จากกะเช้าหากมี หรือใช้ค่า patientCensus จากกะเช้า
  const initialValue = morningForm.calculatedCensus !== undefined ? safeNumber(morningForm.calculatedCensus) : safeNumber(morningForm.patientCensus);
  
  // ผู้ป่วยเข้ากะดึก (รับใหม่ + ย้ายเข้า + ส่งตัวเข้า)
  const nightAdmissions = 
    safeNumber(nightShiftData.newAdmit) + 
    safeNumber(nightShiftData.transferIn) + 
    safeNumber(nightShiftData.referIn);
  
  // ผู้ป่วยออกกะดึก (จำหน่าย + ย้ายออก + ส่งตัวออก + เสียชีวิต)
  const nightDischarges = 
    safeNumber(nightShiftData.discharge) + 
    safeNumber(nightShiftData.transferOut) + 
    safeNumber(nightShiftData.referOut) + 
    safeNumber(nightShiftData.dead);
  
  // คำนวณจำนวนผู้ป่วยที่คงเหลือในกะดึก
  const calculatedCensus = Math.max(0, initialValue + nightAdmissions - nightDischarges);

  console.log(`[calculateNightShiftCensus] initialValue=${initialValue}, nightAdmissions=${nightAdmissions}, nightDischarges=${nightDischarges}, result=${calculatedCensus}`);
  
  return {
    initialPatientCensus: initialValue, // ค่าเริ่มต้นจากกะเช้า
    calculatedCensus: calculatedCensus, // ค่าที่คำนวณได้
    patientCensus: calculatedCensus // ค่าสุดท้ายที่ใช้แสดงผล (เท่ากับค่าที่คำนวณได้)
  };
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
  // Convert timestamp object to date
  let dateObj: Date;
  if (dateInput instanceof Timestamp) {
    dateObj = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    throw new Error('Invalid timestamp format for ID generation');
  }

  // Format date as YYYYMMDD
  const dateStr = formatDateYMD(dateObj);
  
  // Use shift as prefix for distinctions ('m' for morning, 'n' for night)
  const shiftPrefix = shift === ShiftType.MORNING ? 'm' : 'n';
  
  // Create different ID structures for draft vs. final/approved
  if (status === FormStatus.DRAFT) {
    return `${wardId}_${shiftPrefix}_draft_d${dateStr}`;
  } else {
    // Final, Approved, or Rejected forms
    return `${wardId}_${shiftPrefix}_${status.toLowerCase()}_d${dateStr}`;
  }
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

    // Generate new FINAL document ID with timestamp
    const baseFinalId = generateWardFormId(
      wardId,
      ShiftType.MORNING, 
      FormStatus.FINAL,
          Timestamp.fromDate(dateObjForId) 
      );
    const timeStrFinal = format(new Date(), 'HHmmss');
    const documentIdToUse = `${baseFinalId}_t${timeStrFinal}`;
    console.log(`[finalizeMorning] Creating new FINAL document with ID: ${documentIdToUse}`);

    // Try to fetch previous night shift form to calculate census
    const prevDate = subDays(dateObjForId, 1);
    const previousNightForm = await getLatestPreviousNightForm(prevDate, wardId);
    
    // Calculate census values
    const inputData = {
      patientCensus: formData.patientCensus,
      initialPatientCensus: formData.initialPatientCensus,
      newAdmit: formData.newAdmit || 0,
      transferIn: formData.transferIn || 0,
      referIn: formData.referIn || 0,
      discharge: formData.discharge || 0,
      transferOut: formData.transferOut || 0,
      referOut: formData.referOut || 0,
      dead: formData.dead || 0
    };
    
    const censusValues = calculateMorningCensus(previousNightForm, inputData);

    // Prepare data to save
    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: documentIdToUse,
      wardId: wardId,
      wardName: dataForValidation.wardName || '',
      status: FormStatus.FINAL,
      isDraft: false,
      date: Timestamp.fromDate(dateObjForId),
      dateString: dateStr,
      initialPatientCensus: censusValues.initialPatientCensus,
      calculatedCensus: censusValues.calculatedCensus,
      patientCensus: censusValues.patientCensus,
      createdBy: formData.createdBy || user.uid,
      updatedBy: user.uid,
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };

    // Get reference to the document
    const docRef = doc(db, COLLECTION_WARDFORMS, documentIdToUse);
    
    // Check current status before overwriting (allow overwriting DRAFT or FINAL)
    const currentDocSnap = await getDoc(docRef);
    if (currentDocSnap.exists() && ![FormStatus.DRAFT, FormStatus.FINAL, FormStatus.REJECTED].includes(currentDocSnap.data().status)) {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[finalizeMorningShiftForm] Error:', errorMessage, error);
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
    // Basic validations
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }
    const wardId = formData.wardId.toUpperCase();
    
    // Convert date to appropriate format
    let dateObj: Date;
    if (formData.date instanceof Timestamp) {
      dateObj = formData.date.toDate();
    } else if (formData.date instanceof Date) {
        dateObj = formData.date;
    } else if (typeof formData.date === 'string') {
      dateObj = new Date(formData.date + 'T00:00:00Z');
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date string format');
        }
    } else {
      throw new Error('Invalid date format');
    }
    const dateStr = formatDateYMD(dateObj);

    // คำนวณ Patient Census ตามช่วงเวลาของวัน
    let calculatedCensus: number | undefined;
    
    if (formData.shift === ShiftType.MORNING) {
      // คำนวณ Patient Census สำหรับกะเช้า
      const prevDate = subDays(dateObj, 1);
      const previousNightForm = await getLatestPreviousNightForm(prevDate, wardId);
      
      const inputData = {
        patientCensus: formData.patientCensus,
        initialPatientCensus: formData.initialPatientCensus,
        newAdmit: formData.newAdmit || 0,
        transferIn: formData.transferIn || 0,
        referIn: formData.referIn || 0,
        discharge: formData.discharge || 0,
        transferOut: formData.transferOut || 0,
        referOut: formData.referOut || 0,
        dead: formData.dead || 0
      };
      
      const censusValues = calculateMorningCensus(previousNightForm, inputData);
      calculatedCensus = censusValues.calculatedCensus;
    } else {
      // คำนวณ Patient Census สำหรับกะดึก
      const morningFormTimestamp = Timestamp.fromDate(dateObj);
      const morningForm = await getWardForm(morningFormTimestamp, ShiftType.MORNING, wardId);
      
      if (morningForm) {
        const nightShiftData = {
          newAdmit: formData.newAdmit || 0,
          transferIn: formData.transferIn || 0,
          referIn: formData.referIn || 0,
          discharge: formData.discharge || 0,
          transferOut: formData.transferOut || 0,
          referOut: formData.referOut || 0,
          dead: formData.dead || 0
        };
        
        const censusValues = calculateNightShiftCensus(morningForm, nightShiftData);
        calculatedCensus = censusValues.calculatedCensus;
      }
    }

    // Determine or create document ID
    let docId = '';
    if (formData.id && formData.id.includes('_draft_')) {
      docId = formData.id;
    } else {
      // Generate a unique document ID for the draft
      docId = generateWardFormId(wardId, formData.shift, FormStatus.DRAFT, formData.date);
      const currTimestamp = format(new Date(), 'HHmmss');
      docId = `${docId}_t${currTimestamp}`;
    }

    // Prepare data to save
    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: docId,
      wardId: wardId, // always uppercase
      date: Timestamp.fromDate(dateObj),
      dateString: dateStr,
      status: FormStatus.DRAFT,
      isDraft: true,
      calculatedCensus: calculatedCensus, // บันทึกค่าที่คำนวณได้
      updatedBy: user.uid,
      updatedAt: createServerTimestamp(),
    };

    // If this is a new draft (not an update), add createdBy and createdAt
    if (!formData.id) {
      dataToSave.createdBy = user.uid;
      dataToSave.createdAt = createServerTimestamp();
    }

    // Save to Firestore
    const docRef = doc(db, COLLECTION_WARDFORMS, docId);
    await setDoc(docRef, dataToSave, { merge: true });
    console.log(`Draft saved with ID: ${docId}, shift: ${formData.shift}, date: ${dateStr}`);

    return docId;
  } catch (error) {
    console.error('Error saving draft form:', error);
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
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูล wardId, shift และ date');
    }
    const wardId = formData.wardId.toUpperCase();

    // We need to fetch morning form first for census calculation
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

    // Fetch the morning shift form to get starting census
    const morningFormTimestamp = Timestamp.fromDate(dateObjForId);
    const morningForm = await getWardForm(morningFormTimestamp, ShiftType.MORNING, wardId);
    if (!morningForm) {
      throw new Error(`Morning shift form not found for this date (${dateStr}). Please complete morning shift first.`);
    }
    if (morningForm.status !== FormStatus.FINAL && morningForm.status !== FormStatus.APPROVED) {
      throw new Error(`Morning shift form needs to be finalized first. Current status: ${morningForm.status}`);
    }

    // Calculate census values using the morning form
    const censusValues = calculateNightShiftCensus(morningForm, {
      newAdmit: formData.newAdmit || 0,
      transferIn: formData.transferIn || 0,
      referIn: formData.referIn || 0,
      discharge: formData.discharge || 0,
      transferOut: formData.transferOut || 0,
      referOut: formData.referOut || 0,
      dead: formData.dead || 0
    });
    
    let dataForValidation: Partial<WardForm> = { 
      ...formData, 
      wardId: wardId,
      patientCensus: censusValues.patientCensus,
      initialPatientCensus: censusValues.initialPatientCensus,
      calculatedCensus: censusValues.calculatedCensus
    };
    
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

      // Generate new FINAL document ID with timestamp
    const baseFinalId = generateWardFormId(
      wardId,
      ShiftType.NIGHT, 
      FormStatus.FINAL,
      Timestamp.fromDate(dateObjForId) 
    );
    const timeStrFinal = format(new Date(), 'HHmmss');
    const documentIdToUse = `${baseFinalId}_t${timeStrFinal}`;
    console.log(`[finalizeNight] Creating new FINAL document with ID: ${documentIdToUse}`);

    // Prepare data to save
    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: documentIdToUse,
      wardId: wardId,
      wardName: dataForValidation.wardName || '',
      status: FormStatus.FINAL,
      isDraft: false,
      date: Timestamp.fromDate(dateObjForId),
      dateString: dateStr,
      initialPatientCensus: censusValues.initialPatientCensus,
      calculatedCensus: censusValues.calculatedCensus,
      patientCensus: censusValues.patientCensus,
      createdBy: formData.createdBy || user.uid,
      updatedBy: user.uid,
      updatedAt: createServerTimestamp(),
      finalizedAt: createServerTimestamp()
    };

    // Get reference to the document and save
    const docRef = doc(db, COLLECTION_WARDFORMS, documentIdToUse);
    
    // Check if the document already exists (status check for safety)
    const currentDocSnap = await getDoc(docRef);
    if (currentDocSnap.exists() && ![FormStatus.DRAFT, FormStatus.FINAL, FormStatus.REJECTED].includes(currentDocSnap.data().status)) {
      const currentStatus = currentDocSnap.data().status;
      throw new Error(`Cannot overwrite form with status ${currentStatus}.`);
    }

    // Save the data using setDoc
    await setDoc(docRef, dataToSave, { merge: true });
    console.log(`[finalizeNight] Successfully saved document: ${documentIdToUse}`);
    
    try {
      // ตรวจสอบและสร้าง/อัปเดตข้อมูลสรุปประจำวัน
      await checkAndCreateDailySummary(dateObjForId, wardId, dataToSave.wardName || '');
      console.log(`[finalizeNight] Daily summary checked/created for ${documentIdToUse}`);
      
      // ตรวจสอบสถานะการอนุมัติของทั้งสองกะ
      const morningShiftInfo = await checkMorningShiftFormStatus(dateObjForId, wardId);
      const morningFormStatus = morningShiftInfo?.status;
      console.log(`[finalizeNight] Morning form status: ${morningFormStatus}`);
      
      // ถ้ากะเช้าได้รับการอนุมัติแล้ว ให้อัปเดตสถานะการอนุมัติทั้งหมดเป็น true
      if (morningFormStatus === FormStatus.APPROVED) {
        await updateDailySummaryApprovalStatus(dateObjForId, wardId, true);
        console.log(`[finalizeNight] Both forms are approved, updated daily summary approval status`);
      }
    } catch (summaryError) {
      console.error('[finalizeNight] Error checking/creating daily summary:', summaryError);
      // ไม่ทำ throw เพื่อให้การบันทึกหลักสำเร็จไปก่อน
    }

    return documentIdToUse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[finalizeNightShiftForm] Error:', errorMessage, error);
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
  const morningShiftPrefix = 'm'; // รูปแบบใหม่ใช้ 'm' แทน 'morning'
  const nightShiftPrefix = 'n';   // รูปแบบใหม่ใช้ 'n' แทน 'night'

  console.log(`[getShiftStatusesForDay] Fetching statuses for ward: ${wardId}, date: ${dateString} (Original: ${wardIdInput})`);

  try {
    // ค้นหาข้อมูลแบบฟอร์มกะเช้า
    const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, wardId);
    morningStatus = morningForm?.status ?? null;
    console.log(`[getShiftStatusesForDay] Morning form found: ${morningForm ? morningForm.id : 'null'}, Status: ${morningStatus}, Pattern: ${wardId}_${morningShiftPrefix}_`);

    // ค้นหาข้อมูลแบบฟอร์มกะดึก
    const nightForm = await getWardForm(dateTimestamp, ShiftType.NIGHT, wardId);
    nightStatus = nightForm?.status ?? null;
    console.log(`[getShiftStatusesForDay] Night form found: ${nightForm ? nightForm.id : 'null'}, Status: ${nightStatus}, Pattern: ${wardId}_${nightShiftPrefix}_`);

    // ถ้ายังไม่พบแบบฟอร์ม ลองค้นหาโดยตรงด้วย query เพื่อครอบคลุมทั้งรูปแบบเก่าและใหม่
    if (!morningStatus && !nightStatus) {
      console.log(`[getShiftStatusesForDay] No forms found with getWardForm, trying direct query`);
      
      const formsQuery = query(
        collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('wardId', '==', wardId)
      );
      
      const querySnapshot = await getDocs(formsQuery);
      if (!querySnapshot.empty) {
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id || '', ...doc.data() } as WardForm));
        console.log(`[getShiftStatusesForDay] Direct query found ${docs.length} documents`);
        
        // กรองเฉพาะฟอร์มกะเช้า
        const morningDocs = docs.filter(doc => doc.shift === ShiftType.MORNING);
        if (morningDocs.length > 0) {
          // เลือกตามลำดับความสำคัญ: APPROVED > FINAL > DRAFT
          const approved = morningDocs.find(doc => doc.status === FormStatus.APPROVED);
          const final = morningDocs.find(doc => doc.status === FormStatus.FINAL);
          const draft = morningDocs.find(doc => doc.status === FormStatus.DRAFT);
          morningStatus = approved?.status || final?.status || draft?.status || null;
          console.log(`[getShiftStatusesForDay] Morning status from direct query: ${morningStatus}`);
        }
        
        // กรองเฉพาะฟอร์มกะดึก
        const nightDocs = docs.filter(doc => doc.shift === ShiftType.NIGHT);
        if (nightDocs.length > 0) {
          // เลือกตามลำดับความสำคัญ: APPROVED > FINAL > DRAFT
          const approved = nightDocs.find(doc => doc.status === FormStatus.APPROVED);
          const final = nightDocs.find(doc => doc.status === FormStatus.FINAL);
          const draft = nightDocs.find(doc => doc.status === FormStatus.DRAFT);
          nightStatus = approved?.status || final?.status || draft?.status || null;
          console.log(`[getShiftStatusesForDay] Night status from direct query: ${nightStatus}`);
        }
      }
    }
  } catch (error) {
    // ตรวจสอบว่าเป็น Error object ก่อนส่ง
    const logError = error instanceof Error ? error : new Error(`Unknown error in getShiftStatusesForDay: ${error}`);
    // แปลง context object เป็น string
    const contextString = `Date: ${dateString}, WardID: ${wardId}`;
    logSystemError(logError, 'Error in getShiftStatusesForDay', contextString);
    morningStatus = null; 
    nightStatus = null;
  }

  console.log(`[getShiftStatusesForDay] Final statuses - Morning: ${morningStatus}, Night: ${nightStatus}`);
  return { morningStatus, nightStatus };
}; 
