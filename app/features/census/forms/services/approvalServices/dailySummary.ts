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
  limit
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DailySummary } from '@/app/core/types/approval';
import { COLLECTION_WARDFORMS, COLLECTION_SUMMARIES } from './index';
import { createServerTimestamp } from '@/app/core/utils/dateUtils';

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
    
    // ตรวจสอบว่ามีแบบฟอร์มที่อนุมัติแล้วของทั้งกะเช้าและกะดึกหรือไม่
    const wardFormsRef = collection(db, COLLECTION_WARDFORMS);
    const morningQuery = query(
      wardFormsRef,
      where('wardId', '==', wardId),
      where('dateString', '==', dateString),
      where('shift', '==', ShiftType.MORNING),
      where('status', '==', FormStatus.APPROVED)
    );
    
    const nightQuery = query(
      wardFormsRef,
      where('wardId', '==', wardId),
      where('dateString', '==', dateString),
      where('shift', '==', ShiftType.NIGHT),
      where('status', '==', FormStatus.APPROVED)
    );
    
    // ดึงข้อมูลทั้งสองกะ
    const [morningSnapshot, nightSnapshot] = await Promise.all([
      getDocs(morningQuery),
      getDocs(nightQuery)
    ]);
    
    // ตรวจสอบว่ามีข้อมูลครบทั้งสองกะหรือไม่
    if (morningSnapshot.empty || nightSnapshot.empty) {
      // ยังไม่ครบ ไม่ต้องทำอะไร
      return;
    }
    
    // ดึงข้อมูลแบบฟอร์มทั้งสองกะ
    const morningForm = {
      ...morningSnapshot.docs[0].data() as WardForm,
      id: morningSnapshot.docs[0].id
    };
    
    const nightForm = {
      ...nightSnapshot.docs[0].data() as WardForm,
      id: nightSnapshot.docs[0].id
    };
    
    // ตรวจสอบว่ามีข้อมูลสรุปอยู่แล้วหรือไม่
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const summaryQuery = query(
      summariesRef,
      where('wardId', '==', wardId),
      where('dateString', '==', dateString)
    );
    
    const summarySnapshot = await getDocs(summaryQuery);
    
    // ถ้ามีข้อมูลสรุปอยู่แล้ว ให้อัพเดท status
    if (!summarySnapshot.empty) {
      const summaryId = summarySnapshot.docs[0].id;
      await updateDoc(doc(db, COLLECTION_SUMMARIES, summaryId), {
        allFormsApproved: true,
        updatedAt: createServerTimestamp()
      });
      return;
    }
    
    // ถ้ายังไม่มีข้อมูลสรุป ให้สร้างใหม่
    // คำนวณจำนวนผู้ป่วยทั้งหมด
    const totalPatientCensus = nightForm.patientCensus || 0;
    
    // สร้างข้อมูลสรุปเบื้องต้น (จะมีการอัพเดทข้อมูลเพิ่มเติมโดยผู้อนุมัติอีกครั้ง)
    const summaryData: DailySummary = {
      date: formDate,
      dateString,
      wardId,
      wardName,
      morningFormId: morningForm.id as string,
      nightFormId: nightForm.id as string,
      
      // ข้อมูลจากกะเช้า
      morningPatientCensus: morningForm.patientCensus || 0,
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
      dailyPatientCensus: nightForm.patientCensus || 0,
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
      dailyNurseRatio: 0, // จะคำนวณอีกครั้งเมื่อผู้อนุมัติกรอกข้อมูลเพิ่มเติม
      
      // ข้อมูลอื่นๆ
      opd24hr: 0, // จะกรอกโดยผู้อนุมัติอีกครั้ง
      oldPatient: morningForm.patientCensus || 0,
      newPatient: (morningForm.newAdmit || 0) + (nightForm.newAdmit || 0) + (morningForm.transferIn || 0) + (nightForm.transferIn || 0) + (morningForm.referIn || 0) + (nightForm.referIn || 0),
      admit24hr: (morningForm.newAdmit || 0) + (nightForm.newAdmit || 0),
      availableBeds: nightForm.available || 0,
      unavailableBeds: nightForm.unavailable || 0,
      plannedDischarge: nightForm.plannedDischarge || 0,
      
      // ข้อมูลการบันทึก
      createdAt: createServerTimestamp(),
      allFormsApproved: true
    } as any;
    
    // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
    if (summaryData.morningPatientCensus + summaryData.nightPatientCensus > 0) {
      summaryData.dailyNurseRatio = summaryData.dailyNurseTotal / ((summaryData.morningPatientCensus + summaryData.nightPatientCensus) / 2);
    }
    
    // บันทึกข้อมูลสรุป
    await addDoc(collection(db, COLLECTION_SUMMARIES), summaryData);
  } catch (error) {
    console.error('Error checking and creating daily summary:', error);
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
        dailyNurseRatio: 0, // จะคำนวณข้างล่าง
        
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
    
    console.log(`Fetching approved summaries for ward ${wardId} from ${startDateTimestamp} to ${endDateTimestamp}`);
    
    // สร้างเงื่อนไขสำหรับการค้นหา
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    const q = query(
      summariesRef,
      where('wardId', '==', wardId),
      where('allFormsApproved', '==', true),
      where('date', '>=', startDateTimestamp),
      where('date', '<=', endDateTimestamp),
      orderBy('date', 'desc')
    );
    
    // ดึงข้อมูลจาก Firestore
    const querySnapshot = await getDocs(q);
    
    // แปลงข้อมูลใน Snapshot เป็น Array ของ DailySummary
    const summaries: DailySummary[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DailySummary;
      
      // ตรวจสอบรูปแบบของ date และแปลงให้เป็น Timestamp ที่ถูกต้อง
      let dateField = data.date;
      if (dateField && !(dateField instanceof Timestamp)) {
        // แปลงเป็น timestamp อย่างปลอดภัย
        try {
          // กรณีเป็น object ที่มี seconds และ nanoseconds
          if (typeof dateField === 'object' && 'seconds' in dateField && 'nanoseconds' in dateField) {
            dateField = new Timestamp(dateField.seconds as number, dateField.nanoseconds as number);
          } 
          // กรณีเป็น Date object
          else if (dateField instanceof Date) {
            dateField = Timestamp.fromDate(dateField);
          }
          // กรณีเป็น string (ISO format)
          else if (typeof dateField === 'string') {
            dateField = Timestamp.fromDate(new Date(dateField));
          }
        } catch (e) {
          console.warn('Failed to convert date to Timestamp:', e);
          // ถ้าแปลงไม่ได้ให้ใช้วันที่ปัจจุบัน
          dateField = Timestamp.fromDate(new Date());
        }
      }
      
      summaries.push({
        ...data,
        id: doc.id,
        date: dateField
      });
    });
    
    console.log(`Found ${summaries.length} approved summaries`);
    
    // ถ้าไม่มีผลลัพธ์ให้โหลดด้วยการใช้ dateString แทน
    if (summaries.length === 0) {
      // แปลงวันที่เป็น string ในรูปแบบ YYYY-MM-DD
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      console.log(`Trying alternative query with dateString from ${startDateStr} to ${endDateStr}`);
      
      // สร้างเงื่อนไขสำหรับการค้นหาด้วย dateString
      const altQuery = query(
        summariesRef,
        where('wardId', '==', wardId),
        where('allFormsApproved', '==', true),
        where('dateString', '>=', startDateStr),
        where('dateString', '<=', endDateStr),
        orderBy('dateString', 'desc')
      );
      
      // ดึงข้อมูลจาก Firestore
      const altQuerySnapshot = await getDocs(altQuery);
      
      // แปลงข้อมูลใน Snapshot เป็น Array ของ DailySummary
      altQuerySnapshot.forEach((doc) => {
        const data = doc.data() as DailySummary;
        
        // ตรวจสอบรูปแบบของ date และแปลงให้เป็น Timestamp ที่ถูกต้อง
        let dateField = data.date;
        if (dateField && !(dateField instanceof Timestamp)) {
          // แปลงเป็น timestamp อย่างปลอดภัย
          try {
            // กรณีเป็น object ที่มี seconds และ nanoseconds
            if (typeof dateField === 'object' && 'seconds' in dateField && 'nanoseconds' in dateField) {
              dateField = new Timestamp(dateField.seconds as number, dateField.nanoseconds as number);
            } 
            // กรณีเป็น Date object
            else if (dateField instanceof Date) {
              dateField = Timestamp.fromDate(dateField);
            }
            // กรณีเป็น string (ISO format)
            else if (typeof dateField === 'string') {
              dateField = Timestamp.fromDate(new Date(dateField));
            }
          } catch (e) {
            console.warn('Failed to convert date to Timestamp:', e);
            // ถ้าแปลงไม่ได้ให้ใช้วันที่ปัจจุบัน
            dateField = Timestamp.fromDate(new Date());
          }
        }
        
        summaries.push({
          ...data,
          id: doc.id,
          date: dateField
        });
      });
      
      console.log(`Found ${summaries.length} approved summaries with alternative query`);
    }
    
    // เรียงลำดับตามวันที่
    return summaries.sort((a, b) => {
      const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
      const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Error fetching approved summaries by date range:', error);
    
    // ตรวจสอบว่าเป็น error จาก index หรือไม่
    if (error instanceof Error && error.message.includes('index')) {
      console.error('Index error detected, may need to create an index for this query');
    }
    
    throw error;
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