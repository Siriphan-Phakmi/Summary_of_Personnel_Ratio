import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp, 
  limit, 
  setDoc,
  documentId,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { safeQuery, safeGetDoc } from '@/app/core/firebase/firestoreUtils';
import { WardForm, ShiftType, FormStatus, Ward } from '@/app/core/types/ward';
import { User, TimestampField } from '@/app/core/types/user';
import { format, parse } from 'date-fns';
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
import { Logger, logSystemError } from '@/app/core/utils/logger';
import { updateDailySummaryApprovalStatus } from './approvalServices/approvalForms';
// Import the new query function with offline handling
import { 
  getWardFormWithRetry,
  getLatestPreviousNightFormWithRetry,
  checkMorningShiftFormStatusWithRetry,
  getShiftStatusesForDayWithRetry,
  getLatestDraftFormWithRetry,
  getWardFormsByWardAndDateWithRetry
} from './wardFormQueries';
import { 
  fetchAllWardCensusWithOfflineHandling 
} from './wardFormServiceQueries';
// Import helper functions
import {
  parseDate,
  validateFormData,
  calculateMorningCensus,
  calculateNightShiftCensus,
  generateWardFormId,
  normalizeDateOrThrow
} from './wardFormHelpers';

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
  // Use the new retry-enabled function
  return await getWardFormWithRetry(date, shift, wardIdInput);
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
  // Use the new retry-enabled function
  return await getLatestPreviousNightFormWithRetry(date, wardId);
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
    Logger.error('Error checking morning shift form status:', error);
    throw error;
  }
};

// calculateMorningCensus is now imported from wardFormHelpers.ts

// calculateNightShiftCensus is now imported from wardFormHelpers.ts

// generateWardFormId and normalizeDateOrThrow are now imported from wardFormHelpers.ts

/**
 * Finalizes the morning shift form.
 * Uses setDoc with a custom ID.
 */
export const finalizeMorningShiftForm = async (
  formData: Partial<WardForm>,
  user: User
): Promise<string> => {
  try {
    // Basic validation
    if (!formData.wardId || !formData.shift || !formData.date) {
      throw new Error('Ward ID, shift, and date are required to finalize the form.');
    }
    const wardId = formData.wardId.toUpperCase();

    // Normalize date and get date string
    const dateObj = normalizeDateOrThrow(formData.date);
    const dateStr = formatDateYMD(dateObj);
    
    // We need the previous night's form to calculate the initial census
    const prevDate = subDays(dateObj, 1);
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

    let dataForValidation: Partial<WardForm> = { 
      ...formData, 
      wardId: wardId,
      patientCensus: censusValues.patientCensus,
      initialPatientCensus: censusValues.initialPatientCensus,
      calculatedCensus: censusValues.calculatedCensus
    };
    
    if (!dataForValidation.wardName) {
      try {
        const wardDocRef = query(collection(db, COLLECTION_WARDFORMS), where("wardId", "==", wardId));
        const wardQuerySnap = await getDocs(wardDocRef);
        if (!wardQuerySnap.empty) {
          dataForValidation.wardName = wardQuerySnap.docs[0].data().wardName as string;
        }
      } catch (err) {
        Logger.info('Cannot fetch wardName for validation:', err);
      }
    }
    const validationResult = validateFormData(dataForValidation);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors ? JSON.stringify(validationResult.errors) : validationResult.missingFields.join(', ')}`);
    }

    // Final check on census values
    if (formData.shift === ShiftType.MORNING && censusValues.calculatedCensus !== formData.patientCensus) {
        Logger.info(`Census mismatch for morning shift. User input: ${formData.patientCensus}, Calculated: ${censusValues.calculatedCensus}. Overriding with calculated value.`);
        formData.patientCensus = censusValues.calculatedCensus;
    }

    // Generate new FINAL document ID with timestamp
    const baseFinalId = generateWardFormId(
      wardId,
      ShiftType.MORNING, 
      FormStatus.FINAL,
      Timestamp.fromDate(dateObj) 
      );
    const timeStrFinal = format(new Date(), 'HHmmss');
    const documentIdToUse = `${baseFinalId}_t${timeStrFinal}`;
    Logger.info(`[finalizeMorning] Creating new FINAL document with ID: ${documentIdToUse}`);

    // Prepare data to save
    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: documentIdToUse,
      wardId: wardId,
      wardName: dataForValidation.wardName,
      status: FormStatus.FINAL,
      isDraft: false,
      date: Timestamp.fromDate(dateObj),
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
    Logger.info(`[finalizeMorning] Successfully saved document: ${documentIdToUse}`);

    try {
      await checkAndCreateDailySummary(dateObj, wardId, dataToSave.wardName || '');
      Logger.info(`[finalizeMorning] Daily summary checked/created for ${documentIdToUse}`);
    } catch (summaryError) {
      Logger.error(`[finalizeMorning] Failed to create/update daily summary:`, summaryError);
      // ไม่ต้อง throw error ออกไป ให้ process เดินต่อได้
    }

    return documentIdToUse;
  } catch (error) {
    const message = (error instanceof Error && error.message.startsWith('Validation failed:'))
      ? `ข้อมูลไม่สมบูรณ์: ${error.message.replace('Validation failed: ', '')}`
      : 'เกิดข้อผิดพลาดในการสรุปผลกะเช้า';
    Logger.error(message, error, { showToast: true });
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
    const wardId = formData.wardId.toUpperCase();
    
    const dateObj = normalizeDateOrThrow(formData.date);
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
    Logger.info(`Draft saved with ID: ${docId}, shift: ${formData.shift}, date: ${dateStr}`);

    return docId;
  } catch (error) {
    Logger.error('เกิดข้อผิดพลาดในการบันทึกฉบับร่าง', error, { showToast: true });
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
    const dateObj = normalizeDateOrThrow(formData.date);
    const dateStr = formatDateYMD(dateObj);

    // Fetch the morning shift form to get starting census
    const morningFormTimestamp = Timestamp.fromDate(dateObj);
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
        Logger.info('Cannot fetch wardName for validation:', err);
      }
    }
    const validationResult = validateFormData(dataForValidation);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors ? JSON.stringify(validationResult.errors) : validationResult.missingFields.join(', ')}`);
    }

      // Generate new FINAL document ID with timestamp
    const baseFinalId = generateWardFormId(
      wardId,
      ShiftType.NIGHT, 
      FormStatus.FINAL,
      Timestamp.fromDate(dateObj) 
    );
    const timeStrFinal = format(new Date(), 'HHmmss');
    const documentIdToUse = `${baseFinalId}_t${timeStrFinal}`;
    Logger.info(`[finalizeNight] Creating new FINAL document with ID: ${documentIdToUse}`);

    // Prepare data to save
    const dataToSave: Partial<WardForm> = {
      ...formData,
      id: documentIdToUse,
      wardId: wardId,
      wardName: dataForValidation.wardName || '',
      status: FormStatus.FINAL,
      isDraft: false,
      date: Timestamp.fromDate(dateObj),
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
    Logger.info(`[finalizeNight] Successfully saved document: ${documentIdToUse}`);
    
    // Delete the original draft form if it exists
    if (formData.id && formData.id.includes('_draft_')) {
      try {
        const draftDocRef = doc(db, COLLECTION_WARDFORMS, formData.id);
        await deleteDoc(draftDocRef);
        Logger.info(`[finalizeNight] Successfully deleted draft form: ${formData.id}`);
      } catch (deleteError) {
        Logger.error(`[finalizeNight] Failed to delete original draft form ${formData.id}:`, deleteError);
      }
    }
    
    try {
      // ตรวจสอบและสร้าง/อัปเดตข้อมูลสรุปประจำวัน
      await checkAndCreateDailySummary(dateObj, wardId, dataToSave.wardName || '');
      Logger.info(`[finalizeNight] Daily summary checked/created for ${documentIdToUse}`);
      
      // ตรวจสอบสถานะการอนุมัติของทั้งสองกะ
      const morningShiftInfo = await checkMorningShiftFormStatus(dateObj, wardId);
      const morningFormStatus = morningShiftInfo?.status;
      Logger.info(`[finalizeNight] Morning form status: ${morningFormStatus}`);
      
      // ถ้ากะเช้าได้รับการอนุมัติแล้ว ให้อัปเดตสถานะการอนุมัติทั้งหมดเป็น true
      if (morningFormStatus === FormStatus.APPROVED) {
        await updateDailySummaryApprovalStatus(dateObj, wardId, true);
        Logger.info(`[finalizeNight] Both forms are approved, updated daily summary approval status`);
      }
    } catch (summaryError) {
      Logger.error('[finalizeNight] Failed to update daily summary:', summaryError);
    }

    return documentIdToUse;
  } catch (error) {
    const message = (error instanceof Error && error.message.startsWith('Validation failed:'))
      ? `ข้อมูลไม่สมบูรณ์: ${error.message.replace('Validation failed: ', '')}`
      : 'เกิดข้อผิดพลาดในการสรุปผลกะดึก';
    Logger.error(message, error, { showToast: true });
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
    
    Logger.info(`[getLatestDraftForm] Querying for latest draft for ward ${normalizedWardId} by user ${user.uid}`);

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
       Logger.info(`[getLatestDraftForm] No draft found for ward ${normalizedWardId} by user ${user.uid}`);
      return null;
    }
    
    const docSnapshot = querySnapshot.docs[0];
    const formData = docSnapshot.data() as WardForm;
    
     Logger.info(`[getLatestDraftForm] Found draft form ID: ${docSnapshot.id}`);

    return {
      ...formData,
      id: docSnapshot.id
      // Convert timestamp fields if necessary for the consumer
      // date: formData.date instanceof Timestamp ? formData.date.toDate() : formData.date,
      // createdAt: formData.createdAt instanceof Timestamp ? formData.createdAt.toDate() : formData.createdAt,
      // updatedAt: formData.updatedAt instanceof Timestamp ? formData.updatedAt.toDate() : formData.updatedAt,
    };
  } catch (error) {
    Logger.error('เกิดข้อผิดพลาดในการดึงข้อมูลฉบับร่างล่าสุด', error, { showToast: true });
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
    Logger.error('เกิดข้อผิดพลาดในการดึงข้อมูลแบบฟอร์ม', error, { showToast: true });
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
    Logger.error('เกิดข้อผิดพลาดในการดึงข้อมูลฟอร์มของวันก่อนหน้า', error, { showToast: true });
    return null;
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
      Logger.info(`[getSummaryForWard] No morning form found for ward ${wardId} on ${format(date, 'yyyy-MM-dd')}`);
    }
    
    const nightForm = await getWardForm(timestamp, ShiftType.NIGHT, wardId);
    
    if (!nightForm) {
      Logger.info(`[getSummaryForWard] No night form found for ward ${wardId} on ${format(date, 'yyyy-MM-dd')}`);
    }
    
    return { morningForm, nightForm };
  } catch (error) {
    Logger.error(`[getSummaryForWard] Error getting summary for ward ${wardId}:`, error);
    return { morningForm: null, nightForm: null };
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

  Logger.info(`[getShiftStatusesForDay] Checking statuses for ward ${wardId} on ${dateString}`);

  try {
    // ค้นหาข้อมูลแบบฟอร์มกะเช้า
    const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, wardId);
    morningStatus = morningForm?.status ?? null;
    Logger.info(`[getShiftStatusesForDay] Morning form found: ${morningForm ? morningForm.id : 'null'}, Status: ${morningStatus}, Pattern: ${wardId}_${morningShiftPrefix}_`);

    // ค้นหาข้อมูลแบบฟอร์มกะดึก
    const nightForm = await getWardForm(dateTimestamp, ShiftType.NIGHT, wardId);
    nightStatus = nightForm?.status ?? null;
    Logger.info(`[getShiftStatusesForDay] Night form found: ${nightForm ? nightForm.id : 'null'}, Status: ${nightStatus}, Pattern: ${wardId}_${nightShiftPrefix}_`);

    // ถ้ายังไม่พบแบบฟอร์ม ลองค้นหาโดยตรงด้วย query เพื่อครอบคลุมทั้งรูปแบบเก่าและใหม่
    if (!morningStatus && !nightStatus) {
      Logger.info(`[getShiftStatusesForDay] No forms found with getWardForm, trying direct query`);
      
      const formsQuery = query(
        collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('wardId', '==', wardId)
      );
      
      const querySnapshot = await getDocs(formsQuery);
      if (!querySnapshot.empty) {
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id || '', ...doc.data() } as WardForm));
        Logger.info(`[getShiftStatusesForDay] Direct query found ${docs.length} documents`);
        
        // กรองเฉพาะฟอร์มกะเช้า
        const morningDocs = docs.filter(doc => doc.shift === ShiftType.MORNING);
        if (morningDocs.length > 0) {
          // เลือกตามลำดับความสำคัญ: APPROVED > FINAL > DRAFT
          const approved = morningDocs.find(doc => doc.status === FormStatus.APPROVED);
          const final = morningDocs.find(doc => doc.status === FormStatus.FINAL);
          const draft = morningDocs.find(doc => doc.status === FormStatus.DRAFT);
          morningStatus = approved?.status || final?.status || draft?.status || null;
          Logger.info(`[getShiftStatusesForDay] Morning status from direct query: ${morningStatus}`);
        }
        
        // กรองเฉพาะฟอร์มกะดึก
        const nightDocs = docs.filter(doc => doc.shift === ShiftType.NIGHT);
        if (nightDocs.length > 0) {
          // เลือกตามลำดับความสำคัญ: APPROVED > FINAL > DRAFT
          const approved = nightDocs.find(doc => doc.status === FormStatus.APPROVED);
          const final = nightDocs.find(doc => doc.status === FormStatus.FINAL);
          const draft = nightDocs.find(doc => doc.status === FormStatus.DRAFT);
          nightStatus = approved?.status || final?.status || draft?.status || null;
          Logger.info(`[getShiftStatusesForDay] Night status from direct query: ${nightStatus}`);
        }
      }
    }
  } catch (error) {
    const logError = error instanceof Error ? error : new Error(`Unknown error in getShiftStatusesForDay: ${String(error)}`);
    logSystemError(logError, 'getShiftStatusesForDay', { wardId: wardId, date: dateString });
    morningStatus = null; 
    nightStatus = null;
  }

  Logger.info(`[getShiftStatusesForDay] Final statuses - Morning: ${morningStatus}, Night: ${nightStatus}`);
  return { morningStatus, nightStatus };
};

/**
 * ดึงข้อมูลแบบฟอร์มตามวันที่และแผนก สำหรับใช้ใน Dashboard
 * @param wardId รหัสแผนก
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @returns ข้อมูลแบบฟอร์มกะเช้าและกะดึก
 */
export const getWardFormsByDateAndWardForDashboard = async (
  wardId: string, 
  dateString: string
): Promise<{ morning: any | null, night: any | null }> => {
  try {
    if (!wardId || !dateString) {
      return { morning: null, night: null };
    }

    // ดึงข้อมูลกะเช้า - เจาะจงกะเช้าและสถานะ FINAL หรือ APPROVED
    const morningQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', wardId),
      where('date', '==', dateString),
      where('shift', '==', ShiftType.MORNING),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    // ดึงข้อมูลกะดึก - เจาะจงกะดึกและสถานะ FINAL หรือ APPROVED
    const nightQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', wardId),
      where('date', '==', dateString),
      where('shift', '==', ShiftType.NIGHT),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    // ดึงข้อมูลพร้อมกันทั้งสองกะ
    const [morningSnapshot, nightSnapshot] = await Promise.all([
      getDocs(morningQuery),
      getDocs(nightQuery)
    ]);

    // แปลงข้อมูลจาก Firestore เป็น Object
    const morningForm = !morningSnapshot.empty ? {
      id: morningSnapshot.docs[0].id,
      ...morningSnapshot.docs[0].data()
    } : null;

    const nightForm = !nightSnapshot.empty ? {
      id: nightSnapshot.docs[0].id,
      ...nightSnapshot.docs[0].data()
    } : null;

    return { morning: morningForm, night: nightForm };
  } catch (error) {
    Logger.error(`[getWardFormsByDateAndWardForDashboard] Error fetching ward forms for ward ${wardId} on date ${dateString}:`, error);
    return { morning: null, night: null };
  }
};

/**
 * ดึงข้อมูล Census ของทุกแผนก (พร้อม offline handling)
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @returns Map ของจำนวนผู้ป่วยแยกตามแผนก
 */
export const fetchAllWardCensus = async (dateString: string): Promise<Map<string, number>> => {
  // ใช้ function ที่มี offline handling แทน
  return await fetchAllWardCensusWithOfflineHandling(dateString);
}; 
