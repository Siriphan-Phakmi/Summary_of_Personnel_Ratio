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
  setDoc
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DailySummary } from '@/app/core/types/approval';
import { COLLECTION_WARDFORMS, COLLECTION_SUMMARIES } from './index';
import { createServerTimestamp } from '@/app/core/utils/dateUtils';

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
        dailyNurseRatio: 0, // จะคำนวณอีกครั้งเมื่อผู้อนุมัติกรอกข้อมูลเพิ่มเติม
        
        // ข้อมูลอื่นๆ
        availableBeds: nightForm?.available || morningForm?.available || 0,
        unavailableBeds: nightForm?.unavailable || morningForm?.unavailable || 0,
        plannedDischarge: nightForm?.plannedDischarge || morningForm?.plannedDischarge || 0,
        
        // สถานะการอนุมัติแบบฟอร์ม
        allFormsApproved: !!(morningForm?.id && nightForm?.id),
        
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
          
          // อัพเดทสถานะ allFormsApproved เป็น true
          allFormsApproved: true,
          
          updatedAt: Timestamp.now()
        };
    
    // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
        if ((updatedSummary.morningPatientCensus || 0) + (updatedSummary.nightPatientCensus || 0) > 0) {
          totalUpdates.dailyNurseRatio = (totalUpdates.dailyNurseTotal || 0) / (((updatedSummary.morningPatientCensus || 0) + (updatedSummary.nightPatientCensus || 0)) / 2);
    }
    
        await updateDoc(summaryRef, totalUpdates);
        console.log(`[checkAndCreateDailySummary] Updated totals and set allFormsApproved=true`);
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
      updatedAt: createServerTimestamp()
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
        createdAt: createServerTimestamp(),
        lastUpdatedBy: approver.uid,
        lastUpdaterFirstName: approver.firstName || '',
        lastUpdaterLastName: approver.lastName || '',
        updatedAt: createServerTimestamp(),
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
 * ดึงข้อมูลสรุปประจำวันตามช่วงวันที่
 * @param wardId รหัสหอผู้ป่วย
 * @param startDate วันที่เริ่มต้น
 * @param endDate วันที่สิ้นสุด
 * @returns รายการข้อมูลสรุปประจำวันในช่วงเวลาที่กำหนด
 */
export const getSummariesByDateRange = async (
  wardId: string,
  startDate: Date,
  endDate: Date
): Promise<DailySummary[]> => {
  try {
    // สร้าง Timestamp สำหรับการค้นหา
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    
    // สร้าง query เพื่อดึงข้อมูล
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const q = query(
      summariesRef,
      where("wardId", "==", wardId),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp),
      orderBy("date", "asc")
    );
    
    // ดึงข้อมูลจาก Firestore
    const querySnapshot = await getDocs(q);
    
    // แปลงข้อมูลเอกสารเป็น DailySummary[]
    const summaries: DailySummary[] = querySnapshot.docs.map(doc => ({
      ...(doc.data() as DailySummary),
      id: doc.id
    }));
    
    return summaries;
  } catch (error) {
    console.error('Error fetching daily summaries by date range:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปประจำวันที่ได้รับการอนุมัติแล้วตามช่วงวันที่
 * @param wardId รหัสหอผู้ป่วย
 * @param startDate วันที่เริ่มต้น
 * @param endDate วันที่สิ้นสุด
 * @returns รายการข้อมูลสรุปประจำวันที่อนุมัติแล้วในช่วงวันที่กำหนด
 */
export const getApprovedSummariesByDateRange = async (
  wardId: string,
  startDate: Date,
  endDate: Date
): Promise<DailySummary[]> => {
  try {
    // ปรับวันให้เป็นวันที่ 00:00:00 และ 23:59:59 ตามลำดับ
    const startDateTimestamp = startOfDay(startDate);
    const endDateTimestamp = endOfDay(endDate);
    
    console.log(`Fetching approved summaries for ward ${wardId} from ${format(startDateTimestamp, 'yyyy-MM-dd')} to ${format(endDateTimestamp, 'yyyy-MM-dd')}`);
    
    // สร้างเงื่อนไขสำหรับการค้นหา
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    
    // สร้าง query ที่ดึงเฉพาะรายการที่อนุมัติแล้ว (allFormsApproved = true)
    const q = query(
      summariesRef,
      where('wardId', '==', wardId),
      where('date', '>=', startDateTimestamp),
      where('date', '<=', endDateTimestamp),
      where('allFormsApproved', '==', true),
      orderBy('date', 'desc')
    );
    
    // ดึงข้อมูลจาก Firestore
    const querySnapshot = await getDocs(q);
    console.log(`getApprovedSummariesByDateRange: Found ${querySnapshot.size} approved documents for the date range`);
      
    // แปลงข้อมูลเอกสารเป็น DailySummary[]
    const approvedSummaries = querySnapshot.docs.map(doc => ({
      ...doc.data() as DailySummary,
      id: doc.id
    }));
    
    // เรียงลำดับตามวันที่
    return approvedSummaries.sort((a, b) => {
      const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
      const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

  } catch (error) {
    console.error('Error fetching approved summaries by date range:', error);
    
    // ถ้าเกิดข้อผิดพลาดที่เกี่ยวข้องกับ index ใน Firestore
    if (error instanceof Error && error.message.includes('index')) {
      console.error('Index error detected. Please create the following composite index:');
      console.error('Collection: dailySummaries, Fields: wardId (asc), allFormsApproved (asc), date (desc)');
      // ให้ลองใหม่โดยไม่ใช้เงื่อนไข allFormsApproved ใน query
      try {
        console.log('Retrying without allFormsApproved filter...');
        const summariesRef = collection(db, COLLECTION_SUMMARIES);
        
        // สร้าง timestamp ใหม่สำหรับการ query ครั้งที่สอง
        const altStartDate = startOfDay(startDate);
        const altEndDate = endOfDay(endDate);
        
        const altQuery = query(
          summariesRef,
          where('wardId', '==', wardId),
          where('date', '>=', altStartDate),
          where('date', '<=', altEndDate),
          orderBy('date', 'desc')
        );
        
        const altSnapshot = await getDocs(altQuery);
        console.log(`Alternative query found ${altSnapshot.size} documents`);
        
        // กรองเฉพาะรายการที่มี allFormsApproved = true ในหน่วยความจำ
        const filteredSummaries = altSnapshot.docs
          .map(doc => {
            const data = doc.data() as DailySummary;
            return {
              ...data,
              id: doc.id
            };
          })
          .filter(summary => summary.allFormsApproved === true);
        
        console.log(`Filtered to ${filteredSummaries.length} approved documents`);
        
        // เรียงลำดับตามวันที่
        return filteredSummaries.sort((a, b) => {
          const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
          const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
      } catch (innerError) {
        console.error('Alternative query also failed:', innerError);
        return [];
      }
    }
    
    return [];
  }
};

/**
 * ดึงข้อมูลรายงานอัตรากำลังรายวันที่ได้รับการอนุมัติแล้วตาม wardId
 * @param wardId - รหัสหอผู้ป่วย
 * @param maxLimit - จำนวนข้อมูลที่ต้องการดึง (ค่าเริ่มต้น: 20)
 * @returns Promise<DailySummary[]> - ข้อมูลรายงานอัตรากำลังที่ได้รับการอนุมัติแล้ว
 */
export const getApprovedSummaries = async (
  wardId: string,
  maxLimit: number = 20
): Promise<DailySummary[]> => {
  try {
    // ดึงข้อมูลรายงานที่ผ่านการอนุมัติแล้วจาก wardId ที่ระบุ
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const q = query(
      summariesRef,
      where("wardId", "==", wardId),
      where("approvalStatus", "==", "approved"),
      orderBy("date", "desc"),
      limit(maxLimit)
    );
    
    const querySnapshot = await getDocs(q);
    
    // แปลงข้อมูล Firestore เป็น DailySummary[]
    const approvedSummaries = querySnapshot.docs.map((doc) => {
      // ใช้ Type Assertion แบบ as DailySummary เพื่อแก้ปัญหา Type
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        date: data.date.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as DailySummary;
    });
    
    return approvedSummaries;
  } catch (error) {
    console.error("Error getting approved summaries: ", error);
    throw error;
  }
} 