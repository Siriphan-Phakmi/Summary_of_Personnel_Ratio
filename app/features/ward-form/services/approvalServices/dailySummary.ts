import { collection, doc, addDoc, updateDoc, serverTimestamp, Timestamp, setDoc, getDocs, query, where, orderBy, limit, getDoc } from 'firebase/firestore';
import { safeGetDoc } from '@/app/core/firebase/firestoreUtils';

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
    
    console.log(`[checkAndCreateDailySummary] Started for ward ${wardId}, date ${dateString}`);
    
    // สร้าง ID ที่แน่นอนสำหรับเอกสารสรุป เพื่อให้ใช้ setDoc แทน addDoc
    const formattedDateForId = format(formDate, 'yyyyMMdd'); // สำหรับใช้ใน ID
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
        
        // ข้อมูลอื่นๆ - แก้ไขเพื่อให้ค่าเตียงที่มีในแบบฟอร์มถูกส่งไปยัง DailySummary
        // เลือกค่าที่ไม่เป็น 0 ก่อน โดยเช็คค่ากะดึกและกะเช้าตามลำดับ
        availableBeds: (nightForm?.available || 0) || (morningForm?.available || 0),
        unavailableBeds: (nightForm?.unavailable || 0) || (morningForm?.unavailable || 0),
        plannedDischarge: (nightForm?.plannedDischarge || 0) || (morningForm?.plannedDischarge || 0),
        
        // ตรวจสอบว่าข้อมูลนี้มาจาก mock data หรือไม่
        isDummyData: morningForm?.createdBy === 'mock_data_generator' || nightForm?.createdBy === 'mock_data_generator',
        
        // สถานะการอนุมัติแบบฟอร์ม - อัปเดตให้เป็น true เมื่อฟอร์มทั้งสองกะถูกอนุมัติแล้ว
        allFormsApproved: morningForm?.status === FormStatus.APPROVED && nightForm?.status === FormStatus.APPROVED,
        
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
      
      // ค้นหาแบบฟอร์มรายงานกะเช้าและกะดึกที่มีการอนุมัติแล้ว (ใช้ฟังก์ชันที่ดึงเฉพาะ approved)
      let morningForm = await getLastApprovedFormForShift(dateString, wardId, 'morning');
      let nightForm = await getLastApprovedFormForShift(dateString, wardId, 'night');
      
      console.log(`[checkAndCreateDailySummary] Morning form found: ${!!morningForm?.id}, Night form found: ${!!nightForm?.id}`);
      
      // Object สำหรับเก็บการอัปเดต
      const updates: Partial<DailySummary> = {
        updatedAt: Timestamp.now()
      };
      
      // ตรวจสอบการเปลี่ยนแปลงของฟอร์มกะเช้า
      if (morningForm?.id && morningForm.id !== existingSummary.morningFormId) {
        console.log(`[checkAndCreateDailySummary] Updating morning form data in summary`);
        Object.assign(updates, {
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
        });
          
          // อัพเดทข้อมูลเตียง - เลือกค่าที่ไม่เป็น 0 ก่อน โดยเช็คค่าทั้งกะเช้าและกะดึก
        updates.availableBeds = (morningForm.available || 0) || existingSummary.availableBeds || 0;
        updates.unavailableBeds = (morningForm.unavailable || 0) || existingSummary.unavailableBeds || 0;
        updates.plannedDischarge = (morningForm.plannedDischarge || 0) || existingSummary.plannedDischarge || 0;
      }
      
      // ตรวจสอบการเปลี่ยนแปลงของฟอร์มกะดึก
      if (nightForm?.id && nightForm.id !== existingSummary.nightFormId) {
        console.log(`[checkAndCreateDailySummary] Updating night form data in summary`);
        Object.assign(updates, {
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
          dailyPatientCensus: nightForm.patientCensus || 0, // ใช้ข้อมูลกะดึกเป็นข้อมูลผู้ป่วยล่าสุด
        });
          
          // อัพเดทข้อมูลเตียง - เลือกค่าที่ไม่เป็น 0 ก่อน โดยเช็คค่าทั้งกะดึกและกะเช้า
        updates.availableBeds = (nightForm.available || 0) || existingSummary.availableBeds || 0;
        updates.unavailableBeds = (nightForm.unavailable || 0) || existingSummary.unavailableBeds || 0;
        updates.plannedDischarge = (nightForm.plannedDischarge || 0) || existingSummary.plannedDischarge || 0;
      }
      
      // อัปเดตสถานะ allFormsApproved และ isDummyData
      updates.allFormsApproved = (morningForm?.status === FormStatus.APPROVED && nightForm?.status === FormStatus.APPROVED);
      updates.isDummyData = (morningForm?.createdBy === 'mock_data_generator' || nightForm?.createdBy === 'mock_data_generator');
      
      // หากมีการเปลี่ยนแปลงใดๆ ให้อัปเดตเอกสาร
      if (Object.keys(updates).length > 1) { // 1 คือ updatedAt
        await updateDoc(summaryRef, updates);
        console.log(`[checkAndCreateDailySummary] Updated existing summary with ID: ${summaryId}`);
      }
      
      // ตรวจสอบว่ามีทั้งฟอร์มกะเช้าและกะดึกแล้วหรือยัง (สำหรับอัปเดตยอดรวม 24 ชั่วโมง)
      if (morningForm?.id && nightForm?.id) {
        console.log(`[checkAndCreateDailySummary] Both shifts are now available, updating totals`);
        
        // ดึงข้อมูลล่าสุดของ summary หลังจากอัปเดต
        const updatedSummarySnapshot = await getDoc(summaryRef);
        const updatedSummary = updatedSummarySnapshot.data() as DailySummary;
        
        // อัปเดตยอดรวมทั้ง 24 ชั่วโมง
        const totalUpdates: Partial<DailySummary> = {
          dailyNurseManagerTotal: (updatedSummary.morningNurseManager || 0) + (updatedSummary.nightNurseManager || 0),
          dailyRnTotal: (updatedSummary.morningRn || 0) + (updatedSummary.nightRn || 0),
          dailyPnTotal: (updatedSummary.morningPn || 0) + (updatedSummary.nightPn || 0),
          dailyWcTotal: (updatedSummary.morningWc || 0) + (updatedSummary.nightWc || 0),
          dailyNurseTotal: 
            (updatedSummary.morningNurseTotal || 0) + 
            (updatedSummary.nightNurseTotal || 0),
          dailyNewAdmitTotal: (updatedSummary.morningNewAdmit || 0) + (updatedSummary.nightNewAdmit || 0),
          dailyTransferInTotal: (updatedSummary.morningTransferIn || 0) + (updatedSummary.nightTransferIn || 0),
          dailyReferInTotal: (updatedSummary.morningReferIn || 0) + (updatedSummary.nightReferIn || 0),
          dailyAdmitTotal: (updatedSummary.morningAdmitTotal || 0) + (updatedSummary.nightAdmitTotal || 0),
          dailyDischargeTotal: (updatedSummary.morningDischarge || 0) + (updatedSummary.nightDischarge || 0),
          dailyTransferOutTotal: (updatedSummary.morningTransferOut || 0) + (updatedSummary.nightTransferOut || 0),
          dailyReferOutTotal: (updatedSummary.morningReferOut || 0) + (updatedSummary.nightReferOut || 0),
          dailyDeadTotal: (updatedSummary.morningDead || 0) + (updatedSummary.nightDead || 0),
          dailyDischargeAllTotal: (updatedSummary.morningDischargeTotal || 0) + 
                                (updatedSummary.nightDischargeTotal || 0),
          
          // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
          dailyNurseRatio: (updatedSummary.morningPatientCensus || 0) + (updatedSummary.nightPatientCensus || 0) > 0 ? 
            updatedSummary.dailyNurseTotal / (((updatedSummary.morningPatientCensus || 0) + (updatedSummary.nightPatientCensus || 0)) / 2) : 0,
          
          updatedAt: Timestamp.now()
        };
    
        await updateDoc(summaryRef, totalUpdates);
        console.log(`[checkAndCreateDailySummary] Updated total summary with ID: ${summaryId}`);
      }
    }
    
    console.log(`[checkAndCreateDailySummary] Completed process for ward ${wardId}, date ${dateString}`);
  } catch (error) {
    console.error(`[checkAndCreateDailySummary] Error for ward ${wardId}, date:`, error);
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
        dailyDischargeAllTotal: ((morningForm.discharge || 0) + (morningForm.transferOut || 0) + (morningForm.referOut || 0) + (morningForm.dead || 0)) + ((nightForm.discharge || 0) + (nightForm.transferOut || 0) + (nightForm.referOut || 0) + (nightForm.dead || 0)),
        
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
        // แก้ไขให้ใช้ข้อมูลจากทั้งกะเช้าและกะดึก โดยเลือกค่าที่ไม่เป็น 0 เพื่อบันทึกข้อมูลให้ถูกต้อง
        availableBeds: (nightForm.available || 0) || (morningForm.available || 0),
        unavailableBeds: (nightForm.unavailable || 0) || (morningForm.unavailable || 0),
        plannedDischarge: (nightForm.plannedDischarge || 0) || (morningForm.plannedDischarge || 0),
        
        // ตรวจสอบว่าข้อมูลนี้มาจาก mock data หรือไม่
        isDummyData: morningForm?.createdBy === 'mock_data_generator' || nightForm?.createdBy === 'mock_data_generator',
        
        // สถานะการอนุมัติแบบฟอร์ม - อัปเดตให้เป็น true เมื่อฟอร์มทั้งสองกะถูกอนุมัติแล้ว
        allFormsApproved: morningForm?.status === FormStatus.APPROVED && nightForm?.status === FormStatus.APPROVED,
        
        // ข้อมูลการบันทึก
        createdBy: approver.uid,
        createdAt: Timestamp.now(),
        lastUpdatedBy: approver.uid,
        lastUpdaterFirstName: approver.firstName || '',
        lastUpdaterLastName: approver.lastName || '',
        updatedAt: Timestamp.now(),
        
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
  console.log(`[getApprovedSummariesByDateRange] Fetching approved summaries for wardId=${wardId}, startDate=${startDateStringForQuery}, endDate=${endDateStringForQuery}`);
  
  try {
    const summariesRef = collection(db, COLLECTION_SUMMARIES);

    // Query 1: For actual approved forms
    const qApproved = query(
      summariesRef,
      where('wardId', '==', wardId.toUpperCase()),
      where('dateString', '>=', startDateStringForQuery),
      where('dateString', '<=', endDateStringForQuery),
      where('allFormsApproved', '==', true),
      orderBy('dateString', 'desc')
    );
    const snapshotApproved = await getDocs(qApproved);

    // Query 2: For mock data forms
    const qMockData = query(
      summariesRef,
      where('wardId', '==', wardId.toUpperCase()),
      where('dateString', '>=', startDateStringForQuery),
      where('dateString', '<=', endDateStringForQuery),
      where('isDummyData', '==', true),
      orderBy('dateString', 'desc')
    );
    const snapshotMockData = await getDocs(qMockData);

    const combinedSummariesMap = new Map<string, DailySummary>();

    snapshotApproved.forEach(doc => {
      const data = { ...doc.data() as DailySummary, id: doc.id };
      combinedSummariesMap.set(doc.id, data);
    });

    snapshotMockData.forEach(doc => {
      const data = { ...doc.data() as DailySummary, id: doc.id };
      // Add if not already present from approved forms (prioritize approved)
      if (!combinedSummariesMap.has(doc.id)) {
        combinedSummariesMap.set(doc.id, data);
      }
    });

    const results = Array.from(combinedSummariesMap.values());

    console.log(`[getApprovedSummariesByDateRange] Found ${results.length} combined summaries for ward ${wardId}`);
    return results.sort((a, b) => b.dateString.localeCompare(a.dateString)); // Sort by date descending

  } catch (error) {
    console.error(`[getApprovedSummariesByDateRange] Error fetching summaries for ward ${wardId}:`, error);
    throw error;
  }
};