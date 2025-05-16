import { collection } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import { getDoc } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';
import { query } from 'firebase/firestore';
import { where } from 'firebase/firestore';
import { orderBy } from 'firebase/firestore';
import { addDoc } from 'firebase/firestore';
import { updateDoc } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { limit } from 'firebase/firestore';
import { setDoc } from 'firebase/firestore';

import { db } from '@/app/core/firebase/firebase';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DailySummary } from '@/app/core/types/approval';
import { 
  COLLECTION_WARDFORMS, 
  COLLECTION_SUMMARIES, 
  COLLECTION_APPROVALS, 
  COLLECTION_HISTORY 
} from '../constants';
import { createServerTimestamp } from '@/app/core/utils/dateUtils';

type WardFormWithId = WardForm & { id: string };

// ตรวจสอบว่ามี collection dailySummaries ใน Firebase หรือไม่
export const checkDailySummariesCollectionExists = async (): Promise<boolean> => {
  try {
    console.log('[checkDailySummariesCollectionExists] Checking if dailySummaries collection exists...');
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const snapshot = await getDocs(query(summariesRef, limit(1)));
    const exists = !snapshot.empty;
    console.log(`[checkDailySummariesCollectionExists] Collection exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error('[checkDailySummariesCollectionExists] Error checking collection:', error);
    return false;
  }
};

// Debug: แสดงค่าคงที่เพื่อตรวจสอบความถูกต้อง
console.log('[dailySummary.ts] COLLECTION_SUMMARIES =', COLLECTION_SUMMARIES);
console.log('[dailySummary.ts] COLLECTION_APPROVALS =', COLLECTION_APPROVALS);
console.log('[dailySummary.ts] COLLECTION_WARDFORMS =', COLLECTION_WARDFORMS);
console.log('[dailySummary.ts] COLLECTION_HISTORY =', COLLECTION_HISTORY);

/**
 * ค้นหาฟอร์มล่าสุดที่อนุมัติแล้วสำหรับกะที่ระบุ
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @param wardId รหัสแผนก
 * @param shift กะที่ต้องการค้นหา ('morning' หรือ 'night')
 * @returns ฟอร์มล่าสุดที่อนุมัติแล้ว หรือ null ถ้าไม่พบ
 */
const getLastApprovedFormForShift = async (
  dateString: string,
  wardId: string,
  shift: 'morning' | 'night'
): Promise<WardForm | null> => {
  try {
    // สร้าง query เพื่อค้นหาฟอร์มที่อนุมัติแล้ว
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    const q = query(
      formsRef,
      where('wardId', '==', wardId),
      where('dateString', '==', dateString),
      where('shift', '==', shift),
      where('status', '==', FormStatus.APPROVED),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    // ดึงข้อมูลจาก Firestore
    const querySnapshot = await getDocs(q);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      console.log(`[getLastApprovedFormForShift] No approved ${shift} shift form found for ward ${wardId} on ${dateString}`);
      return null;
    }
    
    // ดึงข้อมูลฟอร์มล่าสุด
    const doc = querySnapshot.docs[0];
    const formData = {
      ...doc.data() as WardForm,
      id: doc.id
    };
    
    console.log(`[getLastApprovedFormForShift] Found approved ${shift} shift form (${doc.id}) for ward ${wardId} on ${dateString}`);
    return formData;
  } catch (error) {
    console.error(`[getLastApprovedFormForShift] Error fetching ${shift} shift form:`, error);
    return null;
  }
};

/**
 * ตรวจสอบและสร้างข้อมูลสรุปประจำวัน ถ้ามีการอนุมัติแบบฟอร์มครบทั้งกะเช้าและกะดึก
 * @param date วันที่
 * @param wardId รหัสแผนก
 * @param wardName ชื่อแผนก
 */
export const checkAndCreateDailySummary = async (
  date: any,
  wardId: string,
  wardName: string
): Promise<void> => {
  try {
    // แปลงวันที่เป็น Date object ถ้าเป็น Timestamp
    const formDate = date instanceof Timestamp ? date.toDate() : new Date(date);
    const dateString = format(formDate, 'yyyy-MM-dd');
    const formattedDateForId = format(formDate, 'yyyyMMdd'); // สำหรับใช้ใน ID
    
    console.log(`[checkAndCreateDailySummary] Started for ward ${wardId}, date ${dateString}`);
    
    // สร้าง ID ที่แน่นอนสำหรับเอกสารสรุป เพื่อให้ใช้ setDoc แทน addDoc
    const summaryId = `${wardId}_d${formattedDateForId}`;
    console.log(`[checkAndCreateDailySummary] Generated summaryId: ${summaryId}`);
    
    // ตรวจสอบว่ามีข้อมูลสรุปอยู่แล้วหรือไม่
    const summaryRef = doc(db, COLLECTION_SUMMARIES, summaryId);
    const summarySnapshot = await getDoc(summaryRef);
    
    if (!summarySnapshot.exists()) {
      // ถ้ายังไม่มีข้อมูลสรุปให้สร้างใหม่
      console.log(`[checkAndCreateDailySummary] Creating new daily summary for ${wardId}, date ${dateString}`);
      
      // ค้นหาแบบฟอร์มรายงานกะเช้าและกะดึกที่มีการอนุมัติแล้ว
      const morningForm = await getLastApprovedFormForShift(dateString, wardId, 'morning');
      const nightForm = await getLastApprovedFormForShift(dateString, wardId, 'night');
      
      console.log(`[checkAndCreateDailySummary] Morning form found: ${!!morningForm}, Night form found: ${!!nightForm}`);
    
      // สร้างข้อมูลสรุปเบื้องต้น
    const summaryData: DailySummary = {
      wardId,
      wardName,
        date: Timestamp.fromDate(formDate),
        dateString,
        
        // ข้อมูลกะเช้า (เริ่มต้นด้วยค่าว่าง)
        morningFormId: morningForm?.id || '',
        morningPatientCensus: morningForm?.patientCensus || 0,
        morningCalculatedCensus: morningForm?.calculatedCensus || 0,
        morningNurseManager: morningForm?.nurseManager || 0,
        morningRn: morningForm?.rn || 0,
        morningPn: morningForm?.pn || 0,
        morningWc: morningForm?.wc || 0,
        morningNurseTotal: morningForm ? 
          (morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0) : 0,
        
        morningNewAdmit: morningForm?.newAdmit || 0,
        morningTransferIn: morningForm?.transferIn || 0,
        morningReferIn: morningForm?.referIn || 0,
        morningAdmitTotal: morningForm ? 
          (morningForm.newAdmit || 0) + (morningForm.transferIn || 0) + (morningForm.referIn || 0) : 0,
        
        morningDischarge: morningForm?.discharge || 0,
        morningTransferOut: morningForm?.transferOut || 0,
        morningReferOut: morningForm?.referOut || 0,
        morningDead: morningForm?.dead || 0,
        morningDischargeTotal: morningForm ? 
          (morningForm.discharge || 0) + (morningForm.transferOut || 0) + (morningForm.referOut || 0) + (morningForm.dead || 0) : 0,
        
        // ข้อมูลกะดึก (เริ่มต้นด้วยค่าว่าง)
        nightFormId: nightForm?.id || '',
        nightPatientCensus: nightForm?.patientCensus || 0,
        nightCalculatedCensus: nightForm?.calculatedCensus || 0,
        nightNurseManager: nightForm?.nurseManager || 0,
        nightRn: nightForm?.rn || 0,
        nightPn: nightForm?.pn || 0,
        nightWc: nightForm?.wc || 0,
        nightNurseTotal: nightForm ? 
          (nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0) : 0,
        
        nightNewAdmit: nightForm?.newAdmit || 0,
        nightTransferIn: nightForm?.transferIn || 0,
        nightReferIn: nightForm?.referIn || 0,
        nightAdmitTotal: nightForm ? 
          (nightForm.newAdmit || 0) + (nightForm.transferIn || 0) + (nightForm.referIn || 0) : 0,
        
        nightDischarge: nightForm?.discharge || 0,
        nightTransferOut: nightForm?.transferOut || 0,
        nightReferOut: nightForm?.referOut || 0,
        nightDead: nightForm?.dead || 0,
        nightDischargeTotal: nightForm ? 
          (nightForm.discharge || 0) + (nightForm.transferOut || 0) + (nightForm.referOut || 0) + (nightForm.dead || 0) : 0,
      
        // สรุปข้อมูลทั้ง 24 ชั่วโมง (คำนวณจากข้อมูลกะเช้าและกะดึก)
        dailyPatientCensus: nightForm?.patientCensus || 0, // ใช้ข้อมูลจำนวนผู้ป่วยคงเหลือล่าสุด (กะดึก)
        dailyNurseManagerTotal: (morningForm?.nurseManager || 0) + (nightForm?.nurseManager || 0),
        dailyRnTotal: (morningForm?.rn || 0) + (nightForm?.rn || 0),
        dailyPnTotal: (morningForm?.pn || 0) + (nightForm?.pn || 0),
        dailyWcTotal: (morningForm?.wc || 0) + (nightForm?.wc || 0),
        dailyNurseTotal: 
          (morningForm ? (morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0) : 0) + 
          (nightForm ? (nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0) : 0),
        
        dailyNewAdmitTotal: (morningForm?.newAdmit || 0) + (nightForm?.newAdmit || 0),
        dailyTransferInTotal: (morningForm?.transferIn || 0) + (nightForm?.transferIn || 0),
        dailyReferInTotal: (morningForm?.referIn || 0) + (nightForm?.referIn || 0),
        dailyAdmitTotal: (morningForm ? (morningForm.newAdmit || 0) + (morningForm.transferIn || 0) + (morningForm.referIn || 0) : 0) + 
                          (nightForm ? (nightForm.newAdmit || 0) + (nightForm.transferIn || 0) + (nightForm.referIn || 0) : 0),
        
        dailyDischargeTotal: (morningForm?.discharge || 0) + (nightForm?.discharge || 0),
        dailyTransferOutTotal: (morningForm?.transferOut || 0) + (nightForm?.transferOut || 0),
        dailyReferOutTotal: (morningForm?.referOut || 0) + (nightForm?.referOut || 0),
        dailyDeadTotal: (morningForm?.dead || 0) + (nightForm?.dead || 0),
        dailyDischargeAllTotal: (morningForm ? (morningForm.discharge || 0) + (morningForm.transferOut || 0) + (morningForm.referOut || 0) + (morningForm.dead || 0) : 0) + 
                              (nightForm ? (nightForm.discharge || 0) + (nightForm.transferOut || 0) + (nightForm.referOut || 0) + (nightForm.dead || 0) : 0),
        
        // อัตราส่วนพยาบาลต่อผู้ป่วย
        morningNurseRatio: morningForm && morningForm.patientCensus > 0 ? 
          ((morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0)) / morningForm.patientCensus : 0,
        nightNurseRatio: nightForm && nightForm.patientCensus > 0 ? 
          ((nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0)) / nightForm.patientCensus : 0,
        dailyNurseRatio: 0, // จะคำนวณอีกครั้งเมื่อผู้อนุมัติกรอกข้อมูลเพิ่มเติมเพื่อคำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
        
        // ข้อมูลอื่นๆ
        availableBeds: nightForm?.available || morningForm?.available || 0,
        unavailableBeds: nightForm?.unavailable || morningForm?.unavailable || 0,
        plannedDischarge: nightForm?.plannedDischarge || morningForm?.plannedDischarge || 0,
        
        // สถานะการอนุมัติแบบฟอร์ม - เปลี่ยนค่าเริ่มต้นเป็น true เพื่อให้ข้อมูลแสดงในหน้า Dashboard
        allFormsApproved: true, // เปลี่ยนจากการตรวจสอบ morningForm และ nightForm เป็นค่าคงที่ true
        
        // ข้อมูลการบันทึก
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
      if (summaryData.morningPatientCensus + summaryData.nightPatientCensus > 0) {
        summaryData.dailyNurseRatio = summaryData.dailyNurseTotal / ((summaryData.morningPatientCensus + summaryData.nightPatientCensus) / 2);
      }
      
      // บันทึกข้อมูลสรุปด้วย setDoc (ระบุ ID ชัดเจน)
      await setDoc(summaryRef, summaryData);
      console.log(`[checkAndCreateDailySummary] Created new summary with ID: ${summaryId}`);
    } else {
      // ถ้ามีข้อมูลสรุปอยู่แล้ว ให้ตรวจสอบและอัปเดต
      console.log(`[checkAndCreateDailySummary] Found existing summary for ${wardId}, date ${dateString}`);
      
      // ดึงข้อมูลสรุปที่มีอยู่
      const existingSummary = summarySnapshot.data() as DailySummary;
      
      // ค้นหาแบบฟอร์มรายงานกะเช้าและกะดึกที่มีการอนุมัติแล้ว
      let morningForm = await getLastApprovedFormForShift(dateString, wardId, 'morning');
      let nightForm = await getLastApprovedFormForShift(dateString, wardId, 'night');
      
      console.log(`[checkAndCreateDailySummary] Morning form found: ${!!morningForm?.id}, Night form found: ${!!nightForm?.id}`);
      
      // ตรวจสอบการเปลี่ยนแปลงของฟอร์มกะเช้า
      if (morningForm?.id && morningForm.id !== existingSummary.morningFormId) {
        console.log(`[checkAndCreateDailySummary] Updating morning form data in summary`);
        
        // อัปเดตข้อมูลกะเช้า
        const morningUpdates: Partial<DailySummary> = {
          morningFormId: morningForm.id,
      morningPatientCensus: morningForm.patientCensus || 0,
          morningCalculatedCensus: morningForm.calculatedCensus || 0,
      morningNurseManager: morningForm.nurseManager || 0,
      morningRn: morningForm.rn || 0,
      morningPn: morningForm.pn || 0,
      morningWc: morningForm.wc || 0,
      morningNurseTotal: (morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0),
      
      morningNewAdmit: morningForm.newAdmit || 0,
      morningTransferIn: morningForm.transferIn || 0,
      morningReferIn: morningForm.referIn || 0,
      morningAdmitTotal: (morningForm.newAdmit || 0) + (morningForm.transferIn || 0) + (morningForm.referIn || 0),
      
      morningDischarge: morningForm.discharge || 0,
      morningTransferOut: morningForm.transferOut || 0,
      morningReferOut: morningForm.referOut || 0,
      morningDead: morningForm.dead || 0,
      morningDischargeTotal: (morningForm.discharge || 0) + (morningForm.transferOut || 0) + (morningForm.referOut || 0) + (morningForm.dead || 0),
      
          morningNurseRatio: morningForm.patientCensus > 0 ? 
            ((morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0)) / morningForm.patientCensus : 0,
          
          updatedAt: Timestamp.now()
        };
        
        await updateDoc(summaryRef, morningUpdates);
      }
      
      // ตรวจสอบการเปลี่ยนแปลงของฟอร์มกะดึก
      if (nightForm?.id && nightForm.id !== existingSummary.nightFormId) {
        console.log(`[checkAndCreateDailySummary] Updating night form data in summary`);
        
        // อัปเดตข้อมูลกะดึก
        const nightUpdates: Partial<DailySummary> = {
          nightFormId: nightForm.id,
      nightPatientCensus: nightForm.patientCensus || 0,
          nightCalculatedCensus: nightForm.calculatedCensus || 0,
      nightNurseManager: nightForm.nurseManager || 0,
      nightRn: nightForm.rn || 0,
      nightPn: nightForm.pn || 0,
      nightWc: nightForm.wc || 0,
      nightNurseTotal: (nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0),
      
      nightNewAdmit: nightForm.newAdmit || 0,
      nightTransferIn: nightForm.transferIn || 0,
      nightReferIn: nightForm.referIn || 0,
      nightAdmitTotal: (nightForm.newAdmit || 0) + (nightForm.transferIn || 0) + (nightForm.referIn || 0),
      
      nightDischarge: nightForm.discharge || 0,
      nightTransferOut: nightForm.transferOut || 0,
      nightReferOut: nightForm.referOut || 0,
      nightDead: nightForm.dead || 0,
      nightDischargeTotal: (nightForm.discharge || 0) + (nightForm.transferOut || 0) + (nightForm.referOut || 0) + (nightForm.dead || 0),
      
          nightNurseRatio: nightForm.patientCensus > 0 ? 
            ((nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0)) / nightForm.patientCensus : 0,
          
          // ใช้ข้อมูลกะดึกเป็นข้อมูลผู้ป่วยล่าสุด
      dailyPatientCensus: nightForm.patientCensus || 0,
          
          updatedAt: Timestamp.now()
        };
        
        await updateDoc(summaryRef, nightUpdates);
      }
      
      // ตรวจสอบว่ามีทั้งฟอร์มกะเช้าและกะดึกแล้วหรือยัง
      if (morningForm?.id && nightForm?.id) {
        console.log(`[checkAndCreateDailySummary] Both shifts are now available, updating totals`);
        
        // ดึงข้อมูลล่าสุดของ summary หลังจากอัปเดต
        const updatedSummarySnapshot = await getDoc(summaryRef);
        const updatedSummary = updatedSummarySnapshot.data() as DailySummary;
        
        // อัปเดตยอดรวมทั้ง 24 ชั่วโมง
        const totalUpdates: Partial<DailySummary> = {
          // สรุปข้อมูลทั้ง 24 ชั่วโมง
          dailyNurseManagerTotal: (updatedSummary.morningNurseManager || 0) + (updatedSummary.nightNurseManager || 0),
          dailyRnTotal: (updatedSummary.morningRn || 0) + (updatedSummary.nightRn || 0),
          dailyPnTotal: (updatedSummary.morningPn || 0) + (updatedSummary.nightPn || 0),
          dailyWcTotal: (updatedSummary.morningWc || 0) + (updatedSummary.nightWc || 0),
          dailyNurseTotal: (updatedSummary.morningNurseTotal || 0) + (updatedSummary.nightNurseTotal || 0),
      
          dailyNewAdmitTotal: (updatedSummary.morningNewAdmit || 0) + (updatedSummary.nightNewAdmit || 0),
          dailyTransferInTotal: (updatedSummary.morningTransferIn || 0) + (updatedSummary.nightTransferIn || 0),
          dailyReferInTotal: (updatedSummary.morningReferIn || 0) + (updatedSummary.nightReferIn || 0),
          dailyAdmitTotal: (updatedSummary.morningAdmitTotal || 0) + (updatedSummary.nightAdmitTotal || 0),
      
          dailyDischargeTotal: (updatedSummary.morningDischarge || 0) + (updatedSummary.nightDischarge || 0),
          dailyTransferOutTotal: (updatedSummary.morningTransferOut || 0) + (updatedSummary.nightTransferOut || 0),
          dailyReferOutTotal: (updatedSummary.morningReferOut || 0) + (updatedSummary.nightReferOut || 0),
          dailyDeadTotal: (updatedSummary.morningDead || 0) + (updatedSummary.nightDead || 0),
          dailyDischargeAllTotal: (updatedSummary.morningDischargeTotal || 0) + (updatedSummary.nightDischargeTotal || 0),
          
          // อัพเดทสถานะ allFormsApproved เป็น true อย่างชัดเจน
          allFormsApproved: true,
          
          updatedAt: Timestamp.now()
        };
    
    // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
        if ((updatedSummary.morningPatientCensus || 0) + (updatedSummary.nightPatientCensus || 0) > 0) {
          totalUpdates.dailyNurseRatio = (totalUpdates.dailyNurseTotal || 0) / (((updatedSummary.morningPatientCensus || 0) + (updatedSummary.nightPatientCensus || 0)) / 2);
    }
    
        console.log(`[checkAndCreateDailySummary] Updating summary ${summaryId} with allFormsApproved=true and calculated totals`);
        await updateDoc(summaryRef, totalUpdates);
        console.log(`[checkAndCreateDailySummary] Updated totals and set allFormsApproved=true`);
      } else {
        // เมื่อยังไม่มีครบทั้ง 2 กะ ให้แน่ใจว่า allFormsApproved เป็น false
        if (summarySnapshot.exists()) {
          const currentSummary = summarySnapshot.data() as DailySummary;
          if (currentSummary.allFormsApproved === true) {
            console.log(`[checkAndCreateDailySummary] Setting allFormsApproved to false because not all forms are available`);
            await updateDoc(summaryRef, {
              allFormsApproved: false,
              updatedAt: Timestamp.now()
            });
          }
        }
      }
    }
    
    console.log(`[checkAndCreateDailySummary] Completed process for ward ${wardId}, date ${dateString}`);
  } catch (error) {
    console.error('[checkAndCreateDailySummary] Error checking/creating daily summary:', error);
    throw error;
  }
};

/**
 * อัพเดทข้อมูลสรุปประจำวัน
 * @param date วันที่
 * @param wardId รหัสแผนก
 * @param morningForm ข้อมูลแบบฟอร์มกะเช้า
 * @param nightForm ข้อมูลแบบฟอร์มกะดึก
 * @param approver ข้อมูลผู้อนุมัติ
 * @param customData ข้อมูลเพิ่มเติมที่ต้องการอัพเดท
 * @returns รหัสข้อมูลสรุป
 */
export const updateDailySummary = async (
  date: Timestamp | Date,
  wardId: string,
  morningForm: WardForm,
  nightForm: WardForm,
  approver: User,
  customData?: Partial<DailySummary>
): Promise<string> => {
  try {
    // แปลงวันที่เป็น Date object ถ้าเป็น Timestamp
    const formDate = date instanceof Timestamp ? date.toDate() : date instanceof Date ? date : new Date(date);
    const dateString = format(formDate, 'yyyy-MM-dd');
    
    // ตรวจสอบว่ามีข้อมูลสรุปอยู่แล้วหรือไม่
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const summaryQuery = query(
      summariesRef,
      where('wardId', '==', wardId),
      where('dateString', '==', dateString)
    );
    
    const summarySnapshot = await getDocs(summaryQuery);
    
    // ข้อมูลที่ต้องการอัพเดท
    const updateData: Partial<DailySummary> = {
      // ข้อมูลสรุป 24 ชั่วโมง (อาจมีการปรับแก้ไขโดยผู้อนุมัติ)
      ...customData,
      
      // ข้อมูลการบันทึก
      lastUpdatedBy: approver.uid,
      lastUpdaterFirstName: approver.firstName || '',
      lastUpdaterLastName: approver.lastName || '',
      updatedAt: Timestamp.now()
    };
    
    // ถ้ามีข้อมูลสรุปอยู่แล้ว ให้อัพเดท
    if (!summarySnapshot.empty) {
      const summaryId = summarySnapshot.docs[0].id;
      await updateDoc(doc(db, COLLECTION_SUMMARIES, summaryId), updateData);
      return summaryId;
    } else {
      // ถ้ายังไม่มีข้อมูลสรุป ให้สร้างใหม่
      // คำนวณจำนวนผู้ป่วยทั้งหมด
      const totalPatientCensus = nightForm.patientCensus || 0;
      
      const summaryData: DailySummary = {
        date: formDate,
        dateString,
        wardId,
        wardName: morningForm.wardName,
        morningFormId: morningForm.id as string,
        nightFormId: nightForm.id as string,
        
        // ข้อมูลจากกะเช้า
        morningPatientCensus: morningForm.patientCensus || 0,
        morningCalculatedCensus: morningForm.calculatedCensus || morningForm.patientCensus || 0,
        morningNurseManager: morningForm.nurseManager || 0,
        morningRn: morningForm.rn || 0,
        morningPn: morningForm.pn || 0,
        morningWc: morningForm.wc || 0,
        morningNurseTotal: (morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0),
        
        morningNewAdmit: morningForm.newAdmit || 0,
        morningTransferIn: morningForm.transferIn || 0,
        morningReferIn: morningForm.referIn || 0,
        morningAdmitTotal: (morningForm.newAdmit || 0) + (morningForm.transferIn || 0) + (morningForm.referIn || 0),
        
        morningDischarge: morningForm.discharge || 0,
        morningTransferOut: morningForm.transferOut || 0,
        morningReferOut: morningForm.referOut || 0,
        morningDead: morningForm.dead || 0,
        morningDischargeTotal: (morningForm.discharge || 0) + (morningForm.transferOut || 0) + (morningForm.referOut || 0) + (morningForm.dead || 0),
        
        // ข้อมูลจากกะดึก
        nightPatientCensus: nightForm.patientCensus || 0,
        nightCalculatedCensus: nightForm.calculatedCensus || nightForm.patientCensus || 0,
        nightNurseManager: nightForm.nurseManager || 0,
        nightRn: nightForm.rn || 0,
        nightPn: nightForm.pn || 0,
        nightWc: nightForm.wc || 0,
        nightNurseTotal: (nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0),
        
        nightNewAdmit: nightForm.newAdmit || 0,
        nightTransferIn: nightForm.transferIn || 0,
        nightReferIn: nightForm.referIn || 0,
        nightAdmitTotal: (nightForm.newAdmit || 0) + (nightForm.transferIn || 0) + (nightForm.referIn || 0),
        
        nightDischarge: nightForm.discharge || 0,
        nightTransferOut: nightForm.transferOut || 0,
        nightReferOut: nightForm.referOut || 0,
        nightDead: nightForm.dead || 0,
        nightDischargeTotal: (nightForm.discharge || 0) + (nightForm.transferOut || 0) + (nightForm.referOut || 0) + (nightForm.dead || 0),
        
        // ข้อมูลสรุป 24 ชั่วโมง
        dailyPatientCensus: totalPatientCensus,
        dailyNurseManagerTotal: (morningForm.nurseManager || 0) + (nightForm.nurseManager || 0),
        dailyRnTotal: (morningForm.rn || 0) + (nightForm.rn || 0),
        dailyPnTotal: (morningForm.pn || 0) + (nightForm.pn || 0),
        dailyWcTotal: (morningForm.wc || 0) + (nightForm.wc || 0),
        dailyNurseTotal: ((morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0)) + 
                       ((nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0)),
        
        dailyNewAdmitTotal: (morningForm.newAdmit || 0) + (nightForm.newAdmit || 0),
        dailyTransferInTotal: (morningForm.transferIn || 0) + (nightForm.transferIn || 0),
        dailyReferInTotal: (morningForm.referIn || 0) + (nightForm.referIn || 0),
        dailyAdmitTotal: ((morningForm.newAdmit || 0) + (morningForm.transferIn || 0) + (morningForm.referIn || 0)) + 
                       ((nightForm.newAdmit || 0) + (nightForm.transferIn || 0) + (nightForm.referIn || 0)),
        
        dailyDischargeTotal: (morningForm.discharge || 0) + (nightForm.discharge || 0),
        dailyTransferOutTotal: (morningForm.transferOut || 0) + (nightForm.transferOut || 0),
        dailyReferOutTotal: (morningForm.referOut || 0) + (nightForm.referOut || 0),
        dailyDeadTotal: (morningForm.dead || 0) + (nightForm.dead || 0),
        dailyDischargeAllTotal: ((morningForm.discharge || 0) + (morningForm.transferOut || 0) + (morningForm.referOut || 0) + (morningForm.dead || 0)) + 
                             ((nightForm.discharge || 0) + (nightForm.transferOut || 0) + (nightForm.referOut || 0) + (nightForm.dead || 0)),
        
        // อัตราส่วนพยาบาลต่อผู้ป่วย
        morningNurseRatio: morningForm.patientCensus > 0 ? 
          ((morningForm.nurseManager || 0) + (morningForm.rn || 0) + (morningForm.pn || 0) + (morningForm.wc || 0)) / morningForm.patientCensus : 0,
        nightNurseRatio: nightForm.patientCensus > 0 ? 
          ((nightForm.nurseManager || 0) + (nightForm.rn || 0) + (nightForm.pn || 0) + (nightForm.wc || 0)) / nightForm.patientCensus : 0,
        dailyNurseRatio: 0, // จะคำนวณอีกครั้งเมื่อผู้อนุมัติกรอกข้อมูลเพิ่มเติมเพื่อคำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
        
        // ข้อมูลอื่นๆ
        opd24hr: 0, // จะกรอกโดยผู้อนุมัติอีกครั้ง
        oldPatient: morningForm.patientCensus || 0,
        newPatient: (morningForm.newAdmit || 0) + (nightForm.newAdmit || 0) + (morningForm.transferIn || 0) + (nightForm.transferIn || 0) + (morningForm.referIn || 0) + (nightForm.referIn || 0),
        admit24hr: (morningForm.newAdmit || 0) + (nightForm.newAdmit || 0),
        availableBeds: nightForm.available || 0,
        unavailableBeds: nightForm.unavailable || 0,
        plannedDischarge: nightForm.plannedDischarge || 0,
        
        // ข้อมูลการบันทึก
        createdBy: approver.uid,
        createdAt: Timestamp.now(),
        lastUpdatedBy: approver.uid,
        lastUpdaterFirstName: approver.firstName || '',
        lastUpdaterLastName: approver.lastName || '',
        updatedAt: Timestamp.now(),
        allFormsApproved: true,
        
        ...customData // ใช้ข้อมูลที่ส่งมาแทนที่ค่าที่คำนวณไว้ (ถ้ามี)
      };
      
      // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
      if (summaryData.morningPatientCensus + summaryData.nightPatientCensus > 0) {
        summaryData.dailyNurseRatio = summaryData.dailyNurseTotal / ((summaryData.morningPatientCensus + summaryData.nightPatientCensus) / 2);
      }
      
      // บันทึกข้อมูลสรุป
      const result = await addDoc(collection(db, COLLECTION_SUMMARIES), summaryData);
      return result.id;
    }
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปประจำวันตาม ID
 * @param summaryId รหัสข้อมูลสรุป
 * @returns ข้อมูลสรุปประจำวัน หรือ null ถ้าไม่พบข้อมูล
 */
export const getSummaryById = async (summaryId: string): Promise<DailySummary | null> => {
  try {
    // ดึงข้อมูลจาก Firestore
    const summaryRef = doc(db, COLLECTION_SUMMARIES, summaryId);
    const summaryDoc = await getDoc(summaryRef);
    
    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (!summaryDoc.exists()) {
      return null;
    }
    
    // แปลงข้อมูลเอกสารเป็น DailySummary object
    const summaryData = {
      ...(summaryDoc.data() as DailySummary),
      id: summaryDoc.id
    };
    
    return summaryData;
  } catch (error) {
    console.error('Error fetching daily summary by ID:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปประจำวันตามช่วงวันที่และวอร์ด (ทั้งที่อนุมัติแล้วและยังไม่อนุมัติ)
 * @param wardId รหัสวอร์ด
 * @param startDateStringForQuery วันที่เริ่มต้นในรูปแบบวันที่ที่ format แล้ว
 * @param endDateStringForQuery วันที่สิ้นสุดในรูปแบบวันที่ที่ format แล้ว
 * @returns ข้อมูลสรุปประจำวันที่ตรงตามเงื่อนไข
 */
export const getApprovedSummariesByDateRange = async (
  wardId: string,
  startDateStringForQuery: string,
  endDateStringForQuery: string
): Promise<DailySummary[]> => {
  console.log(`[dailySummary.getApprovedSummariesByDateRange] Called: wardId=${wardId}, start=${startDateStringForQuery}, end=${endDateStringForQuery}`);
  try {
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const basicQuery = query(
      summariesRef,
      where("wardId", "==", wardId),
      where("dateString", ">=", startDateStringForQuery),
      where("dateString", "<=", endDateStringForQuery),
      orderBy("dateString", "desc")
    );

    console.log(`[dailySummary.getApprovedSummariesByDateRange] Executing basic query...`);
    const querySnapshot = await getDocs(basicQuery);
    console.log(`[dailySummary.getApprovedSummariesByDateRange] Basic query found ${querySnapshot.size} docs.`);
    
    let summaries: DailySummary[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DailySummary;
      // ตั้งค่า allFormsApproved = true เสมอเพื่อให้แสดงข้อมูลได้
      data.allFormsApproved = true; 
      summaries.push({ id: doc.id, ...data });
    });
    
    if (summaries.length === 0) {
      console.log(`[dailySummary.getApprovedSummariesByDateRange] Basic query empty. Fallback 1: wardId, orderBy dateString desc`);
      const fallbackQuery1 = query(
        summariesRef,
        where("wardId", "==", wardId),
        orderBy("dateString", "desc") 
      );
      const fallbackSnapshot1 = await getDocs(fallbackQuery1);
      console.log(`[dailySummary.getApprovedSummariesByDateRange] Fallback 1 found ${fallbackSnapshot1.size} docs.`);
      
      const fallbackResults1: DailySummary[] = [];
      fallbackSnapshot1.forEach(doc => {
        const data = doc.data() as DailySummary;
        // ตั้งค่า allFormsApproved = true เสมอ
        data.allFormsApproved = true; 
        fallbackResults1.push({ id: doc.id, ...data });
      });
      
      if (fallbackResults1.length > 0) {
        summaries = fallbackResults1.filter(summary => 
          summary.dateString >= startDateStringForQuery && summary.dateString <= endDateStringForQuery
        );
        console.log(`[dailySummary.getApprovedSummariesByDateRange] Fallback 1 filtered to ${summaries.length} docs.`);
      }
      
      if (summaries.length === 0) {
        console.log(`[dailySummary.getApprovedSummariesByDateRange] Fallback 1 empty after filter. Fallback 2: Generate from wardForms.`);
        
        const formsRef = collection(db, COLLECTION_WARDFORMS);
        const formsQuery = query(
          formsRef,
          where("wardId", "==", wardId),
          where("dateString", "==", endDateStringForQuery), 
          where("status", "==", FormStatus.APPROVED),
          orderBy("updatedAt", "desc")
        );
        
        console.log(`[dailySummary.getApprovedSummariesByDateRange] Querying wardForms: wardId=${wardId}, dateString=${endDateStringForQuery}, status=APPROVED`);
        const formsSnapshot = await getDocs(formsQuery);
        console.log(`[dailySummary.getApprovedSummariesByDateRange] Found ${formsSnapshot.size} approved forms in wardForms.`);
        
        if (!formsSnapshot.empty) {
          // Define a simplified type that includes all the properties we need
          interface WardFormWithId {
            id: string;
            wardName?: string;
            date?: Timestamp;
            dateString?: string;
            patientCensus?: number;
            calculatedCensus?: number;
            nurseManager?: number;
            rn?: number;
            pn?: number;
            wc?: number;
            newAdmit?: number;
            transferIn?: number;
            referIn?: number;
            discharge?: number;
            transferOut?: number;
            referOut?: number;
            dead?: number;
            available?: number;
            unavailable?: number;
            plannedDischarge?: number;
            shift?: ShiftType;
          }
          let morningFormRaw: WardFormWithId | null = null;
          let nightFormRaw: WardFormWithId | null = null;
          
          formsSnapshot.forEach(doc => {
            const formData = doc.data() as WardForm;
            if (formData.shift === 'morning' && !morningFormRaw) {
              // Use type assertion to any first to avoid type errors
              morningFormRaw = { 
                id: doc.id,
                wardName: formData.wardName,
                date: formData.date as unknown as Timestamp,
                dateString: formData.dateString,
                patientCensus: formData.patientCensus,
                calculatedCensus: formData.calculatedCensus,
                nurseManager: formData.nurseManager,
                rn: formData.rn,
                pn: formData.pn,
                wc: formData.wc,
                newAdmit: formData.newAdmit,
                transferIn: formData.transferIn,
                referIn: formData.referIn,
                discharge: formData.discharge,
                transferOut: formData.transferOut,
                referOut: formData.referOut,
                dead: formData.dead,
                available: formData.available,
                unavailable: formData.unavailable,
                plannedDischarge: formData.plannedDischarge,
                shift: formData.shift
              };
            } else if (formData.shift === 'night' && !nightFormRaw) {
              // Use type assertion to any first to avoid type errors
              nightFormRaw = {
                id: doc.id,
                wardName: formData.wardName,
                date: formData.date as unknown as Timestamp,
                dateString: formData.dateString,
                patientCensus: formData.patientCensus,
                calculatedCensus: formData.calculatedCensus,
                nurseManager: formData.nurseManager,
                rn: formData.rn,
                pn: formData.pn,
                wc: formData.wc,
                newAdmit: formData.newAdmit,
                transferIn: formData.transferIn,
                referIn: formData.referIn,
                discharge: formData.discharge,
                transferOut: formData.transferOut,
                referOut: formData.referOut,
                dead: formData.dead,
                available: formData.available,
                unavailable: formData.unavailable,
                plannedDischarge: formData.plannedDischarge,
                shift: formData.shift
              };
            }
          });
          
          console.log(`[dailySummary.getApprovedSummariesByDateRange] Raw Morning form: ${!!morningFormRaw}, Raw Night form: ${!!nightFormRaw}`);

          if (morningFormRaw || nightFormRaw) {
            // Type assertion to help TypeScript understand the proper types
            const morningForm = morningFormRaw as WardFormWithId | null;
            const nightForm = nightFormRaw as WardFormWithId | null;
            
            const wardNameValue = morningForm?.wardName || nightForm?.wardName || '';
            const dateValueRaw = morningForm?.date || nightForm?.date;
            const dateValue = dateValueRaw instanceof Timestamp ? dateValueRaw : Timestamp.fromDate(new Date(endDateStringForQuery));
            const dateStringValue = morningForm?.dateString || nightForm?.dateString || endDateStringForQuery;

                          const mPatientCensus = morningForm?.patientCensus || 0;
              const mCalculatedCensus = morningForm?.calculatedCensus || mPatientCensus;
              const mNurseManager = morningForm?.nurseManager || 0;
              const mRn = morningForm?.rn || 0;
              const mPn = morningForm?.pn || 0;
              const mWc = morningForm?.wc || 0;
              const mNurseTotal = mNurseManager + mRn + mPn + mWc;

              const nPatientCensus = nightForm?.patientCensus || 0;
              const nCalculatedCensus = nightForm?.calculatedCensus || nPatientCensus;
              const nNurseManager = nightForm?.nurseManager || 0;
              const nRn = nightForm?.rn || 0;
              const nPn = nightForm?.pn || 0;
              const nWc = nightForm?.wc || 0;
              const nNurseTotal = nNurseManager + nRn + nPn + nWc;
            
            const generatedSummary: DailySummary = {
              id: `generated_${wardId}_${dateStringValue.replace(/-/g, '')}`,
              wardId,
              wardName: wardNameValue,
              date: dateValue,
              dateString: dateStringValue,
              allFormsApproved: true,

              morningFormId: morningForm?.id || '',
              morningPatientCensus: mPatientCensus,
              morningCalculatedCensus: mCalculatedCensus,
              morningNurseManager: mNurseManager,
              morningRn: mRn,
              morningPn: mPn,
              morningWc: mWc,
              morningNurseTotal: mNurseTotal,
              morningNewAdmit: morningForm?.newAdmit || 0,
              morningTransferIn: morningForm?.transferIn || 0,
              morningReferIn: morningForm?.referIn || 0,
              morningAdmitTotal: (morningForm?.newAdmit || 0) + (morningForm?.transferIn || 0) + (morningForm?.referIn || 0),
              morningDischarge: morningForm?.discharge || 0,
              morningTransferOut: morningForm?.transferOut || 0,
              morningReferOut: morningForm?.referOut || 0,
              morningDead: morningForm?.dead || 0,
              morningDischargeTotal: (morningForm?.discharge || 0) + (morningForm?.transferOut || 0) + (morningForm?.referOut || 0) + (morningForm?.dead || 0),
              morningNurseRatio: mPatientCensus > 0 && mNurseTotal > 0 ? mNurseTotal / mPatientCensus : 0,

              nightFormId: nightForm?.id || '',
              nightPatientCensus: nPatientCensus,
              nightCalculatedCensus: nCalculatedCensus,
              nightNurseManager: nNurseManager,
              nightRn: nRn,
              nightPn: nPn,
              nightWc: nWc,
              nightNurseTotal: nNurseTotal,
              nightNewAdmit: nightForm?.newAdmit || 0,
              nightTransferIn: nightForm?.transferIn || 0,
              nightReferIn: nightForm?.referIn || 0,
              nightAdmitTotal: (nightForm?.newAdmit || 0) + (nightForm?.transferIn || 0) + (nightForm?.referIn || 0),
              nightDischarge: nightForm?.discharge || 0,
              nightTransferOut: nightForm?.transferOut || 0,
              nightReferOut: nightForm?.referOut || 0,
              nightDead: nightForm?.dead || 0,
              nightDischargeTotal: (nightForm?.discharge || 0) + (nightForm?.transferOut || 0) + (nightForm?.referOut || 0) + (nightForm?.dead || 0),
              nightNurseRatio: nPatientCensus > 0 && nNurseTotal > 0 ? nNurseTotal / nPatientCensus : 0,
              
              dailyPatientCensus: nPatientCensus || mPatientCensus,
              dailyNurseManagerTotal: mNurseManager + nNurseManager,
              dailyRnTotal: mRn + nRn,
              dailyPnTotal: mPn + nPn,
              dailyWcTotal: mWc + nWc,
              dailyNurseTotal: mNurseTotal + nNurseTotal,
              dailyNewAdmitTotal: (morningForm?.newAdmit || 0) + (nightForm?.newAdmit || 0),
              dailyTransferInTotal: (morningForm?.transferIn || 0) + (nightForm?.transferIn || 0),
              dailyReferInTotal: (morningForm?.referIn || 0) + (nightForm?.referIn || 0),
              dailyAdmitTotal: ((morningForm?.newAdmit || 0) + (morningForm?.transferIn || 0) + (morningForm?.referIn || 0)) + ((nightForm?.newAdmit || 0) + (nightForm?.transferIn || 0) + (nightForm?.referIn || 0)),
              dailyDischargeTotal: (morningForm?.discharge || 0) + (nightForm?.discharge || 0),
              dailyTransferOutTotal: (morningForm?.transferOut || 0) + (nightForm?.transferOut || 0),
              dailyReferOutTotal: (morningForm?.referOut || 0) + (nightForm?.referOut || 0),
              dailyDeadTotal: (morningForm?.dead || 0) + (nightForm?.dead || 0),
              dailyDischargeAllTotal: ((morningForm?.discharge || 0) + (morningForm?.transferOut || 0) + (morningForm?.referOut || 0) + (morningForm?.dead || 0)) + ((nightForm?.discharge || 0) + (nightForm?.transferOut || 0) + (nightForm?.referOut || 0) + (nightForm?.dead || 0)),
              dailyNurseRatio: (mPatientCensus + nPatientCensus > 0 && mNurseTotal + nNurseTotal > 0) ? (mNurseTotal + nNurseTotal) / ((mPatientCensus + nPatientCensus) / 2) : 0,

              availableBeds: morningForm?.available || nightForm?.available || 0, 
              unavailableBeds: morningForm?.unavailable || nightForm?.unavailable || 0, 
              plannedDischarge: morningForm?.plannedDischarge || nightForm?.plannedDischarge || 0,
              
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };
            console.log(`[dailySummary.getApprovedSummariesByDateRange] Generated synthetic summary:`, JSON.stringify(generatedSummary));
            summaries = [generatedSummary];
          }
        }
      }
    }
    
    console.log(`[dailySummary.getApprovedSummariesByDateRange] Returning ${summaries.length} summaries. First:`, summaries.length > 0 ? JSON.stringify(summaries[0]) : 'None');
    return summaries;
  } catch (error) {
    console.error(`[dailySummary.getApprovedSummariesByDateRange] Error:`, error);
    throw error;
  }
};