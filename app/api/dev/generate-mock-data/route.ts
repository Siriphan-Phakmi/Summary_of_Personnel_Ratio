import { NextRequest, NextResponse } from 'next/server';
import { 
  addDoc, 
  collection, 
  doc, 
  getDoc,
  getDocs,
  query, 
  serverTimestamp, 
  updateDoc, 
  where,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { FormStatus, ShiftType, WardForm } from '@/app/core/types/ward';
import { getWardById } from '@/app/features/ward-form/services/wardService';
import { format, parse, addDays } from 'date-fns';
import {
  checkAndCreateDailySummary,
  getSummaryById
} from '@/app/features/ward-form/services/approvalServices/dailySummary';

const COLLECTION_WARDFORMS = 'wardForms';
const COLLECTION_SUMMARIES = 'dailySummaries';

/**
 * สร้างข้อมูล WardForm จำลองสำหรับการทดสอบ
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, days, statusToGenerate, targetShift, wardIds } = body;

    if (!startDate || !days || !statusToGenerate || !targetShift || !wardIds || !wardIds.length) {
      return NextResponse.json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน กรุณาระบุวันที่เริ่มต้น จำนวนวัน สถานะ กะ และรายการ Ward',
      }, { status: 400 });
    }

    const results: any[] = [];
    const errors: string[] = [];

    // ดึงข้อมูล ward
    const wardsData: Record<string, any> = {};
    for (const wardId of wardIds) {
      try {
        const ward = await getWardById(wardId);
        if (ward) {
          wardsData[wardId] = ward;
        } else {
          errors.push(`ไม่พบข้อมูล Ward ID: ${wardId}`);
        }
      } catch (err) {
        console.error(`Error fetching ward ${wardId}:`, err);
        errors.push(`เกิดข้อผิดพลาดในการดึงข้อมูล Ward ID: ${wardId}`);
      }
    }

    const startDateObj = parse(startDate, 'yyyy-MM-dd', new Date());

    // สร้างข้อมูลสำหรับแต่ละวันและแต่ละ ward
    for (let day = 0; day < days; day++) {
      const currentDate = addDays(startDateObj, day);
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const timestamp = Timestamp.fromDate(currentDate);

      for (const wardId of wardIds) {
        if (!wardsData[wardId]) continue;

        try {
          const ward = wardsData[wardId];

          // สุ่มค่าสำหรับแบบฟอร์ม
          // ใช้ค่าที่สมเหตุสมผลสำหรับแต่ละฟิลด์
          const patientCensus = Math.floor(Math.random() * 100) + 1; // 1-100 คน
          
          // ดึงข้อมูลเก่าจากวันก่อนหน้าถ้ามี
          let previousPatientCensus = patientCensus;
          if (day > 0) {
            try {
              const prevDate = addDays(startDateObj, day - 1);
              const prevDateString = format(prevDate, 'yyyy-MM-dd');

              // ค้นหาแบบฟอร์มของวันก่อนหน้า (กะดึก)
              const prevQuery = query(
                collection(db, COLLECTION_WARDFORMS),
                where('dateString', '==', prevDateString),
                where('wardId', '==', wardId),
                where('shift', '==', ShiftType.NIGHT)
              );
              
              const prevSnapshot = await getDocs(prevQuery);
              if (!prevSnapshot.empty) {
                const prevForm = prevSnapshot.docs[0].data() as WardForm;
                previousPatientCensus = prevForm.patientCensus;
              }
            } catch (err) {
              console.error('Error fetching previous form:', err);
            }
          }
          
          // สร้างข้อมูลสำหรับกะเช้า (ถ้าต้องการ)
          if (targetShift === ShiftType.MORNING || targetShift === 'both') {
            const morningFormData = generateMockFormData({
              wardId: ward.id,
              wardName: ward.wardName,
              dateString,
              date: timestamp,
              shift: ShiftType.MORNING,
              status: statusToGenerate as FormStatus,
              previousPatientCensus
            });
            
            try {
              // ตรวจสอบว่ามีข้อมูลนี้อยู่แล้วหรือไม่
              const existingQuery = query(
                collection(db, COLLECTION_WARDFORMS),
                where('dateString', '==', dateString),
                where('wardId', '==', wardId),
                where('shift', '==', ShiftType.MORNING)
              );
              
              const existingSnapshot = await getDocs(existingQuery);
              let formId: string;
              
              if (!existingSnapshot.empty) {
                // อัปเดตข้อมูลเดิม
                const existingDoc = existingSnapshot.docs[0];
                formId = existingDoc.id;
                await updateDoc(doc(db, COLLECTION_WARDFORMS, formId), {
                  ...morningFormData,
                  updatedAt: serverTimestamp()
                });
              } else {
                // สร้างข้อมูลใหม่
                const docRef = await addDoc(collection(db, COLLECTION_WARDFORMS), morningFormData);
                formId = docRef.id;
                
                // อัปเดต ID ของเอกสาร
                await updateDoc(docRef, { id: formId });
              }
              
              results.push({
                date: dateString,
                ward: ward.wardName,
                shift: ShiftType.MORNING,
                status: statusToGenerate,
                formId
              });

              // อัปเดตข้อมูลสรุปประจำวัน
              await updateDailySummaryForMockData(dateString, wardId, ward.wardName, ShiftType.MORNING);

              // อัปเดตค่า previousPatientCensus สำหรับกะดึก
              previousPatientCensus = morningFormData.patientCensus;
            } catch (err) {
              console.error(`Error creating morning form for ${dateString}, ${wardId}:`, err);
              errors.push(`เกิดข้อผิดพลาดในการสร้างข้อมูลกะเช้า วันที่ ${dateString} ward ${ward.wardName}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          
          // สร้างข้อมูลสำหรับกะดึก (ถ้าต้องการ)
          if (targetShift === ShiftType.NIGHT || targetShift === 'both') {
            const nightFormData = generateMockFormData({
              wardId: ward.id,
              wardName: ward.wardName,
              dateString,
              date: timestamp,
              shift: ShiftType.NIGHT,
              status: statusToGenerate as FormStatus,
              previousPatientCensus
            });
            
            try {
              // ตรวจสอบว่ามีข้อมูลนี้อยู่แล้วหรือไม่
              const existingQuery = query(
                collection(db, COLLECTION_WARDFORMS),
                where('dateString', '==', dateString),
                where('wardId', '==', wardId),
                where('shift', '==', ShiftType.NIGHT)
              );
              
              const existingSnapshot = await getDocs(existingQuery);
              let formId: string;
              
              if (!existingSnapshot.empty) {
                // อัปเดตข้อมูลเดิม
                const existingDoc = existingSnapshot.docs[0];
                formId = existingDoc.id;
                await updateDoc(doc(db, COLLECTION_WARDFORMS, formId), {
                  ...nightFormData,
                  updatedAt: serverTimestamp()
                });
              } else {
                // สร้างข้อมูลใหม่
                const docRef = await addDoc(collection(db, COLLECTION_WARDFORMS), nightFormData);
                formId = docRef.id;
                
                // อัปเดต ID ของเอกสาร
                await updateDoc(docRef, { id: formId });
              }
              
              results.push({
                date: dateString,
                ward: ward.wardName,
                shift: ShiftType.NIGHT,
                status: statusToGenerate,
                formId
              });

              // อัปเดตข้อมูลสรุปประจำวัน
              await updateDailySummaryForMockData(dateString, wardId, ward.wardName, ShiftType.NIGHT);
            } catch (err) {
              console.error(`Error creating night form for ${dateString}, ${wardId}:`, err);
              errors.push(`เกิดข้อผิดพลาดในการสร้างข้อมูลกะดึก วันที่ ${dateString} ward ${ward.wardName}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        } catch (err) {
          console.error(`Error processing ward ${wardId} for day ${day}:`, err);
          errors.push(`เกิดข้อผิดพลาดในการประมวลผล Ward ID: ${wardId} วันที่ ${dateString}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // หลังจากสร้าง/อัปเดตฟอร์มทั้งหมดแล้ว ให้เรียก checkAndCreateDailySummary เพื่ออัปเดต dailySummaries
    for (let day = 0; day < days; day++) {
      const currentDate = addDays(startDateObj, day);
      const dateString = format(currentDate, 'yyyy-MM-dd');
      for (const wardId of wardIds) {
        if (!wardsData[wardId]) continue;
        try {
          await checkAndCreateDailySummary(Timestamp.fromDate(currentDate), wardId, wardsData[wardId].wardName);
        } catch (err) {
          console.error(`Error calling checkAndCreateDailySummary for ${wardId} on ${dateString}:`, err);
          errors.push(`เกิดข้อผิดพลาดในการอัปเดตข้อมูลสรุปรายวัน วันที่ ${dateString} ward ${wardsData[wardId].wardName}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `สร้างข้อมูลจำลองสำเร็จ ${results.length} รายการ`,
      generatedCount: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in generate-mock-data API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    }, { status: 500 });
  }
}

/**
 * อัปเดตข้อมูลสรุปประจำวัน (dailySummaries)
 */
async function updateDailySummaryForMockData(
  dateString: string,
  wardId: string,
  wardName: string,
  shift: ShiftType
) {
  try {
    const date = parse(dateString, 'yyyy-MM-dd', new Date());
    
    // ตรวจสอบว่ามีข้อมูลสรุปประจำวันนี้หรือไม่
    const summaryQuery = query(
      collection(db, 'dailySummaries'),
      where('dateString', '==', dateString),
      where('wardId', '==', wardId)
    );
    
    const summarySnapshot = await getDocs(summaryQuery);
    
    if (summarySnapshot.empty) {
      // สร้างข้อมูลสรุปใหม่
      await addDoc(collection(db, 'dailySummaries'), {
        date: Timestamp.fromDate(date),
        dateString,
        wardId,
        wardName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        morningFormId: shift === ShiftType.MORNING ? 'pending' : null,
        nightFormId: shift === ShiftType.NIGHT ? 'pending' : null,
        totalPatientCensus: 0, // จะอัปเดตหลังจากดึงข้อมูลแบบฟอร์ม
      });
    } else {
      // อัปเดตข้อมูลสรุปเดิม
      const summaryDoc = summarySnapshot.docs[0];
      const summaryData = summaryDoc.data();
      
      await updateDoc(doc(db, 'dailySummaries', summaryDoc.id), {
        ...(shift === ShiftType.MORNING && { morningFormId: 'pending' }),
        ...(shift === ShiftType.NIGHT && { nightFormId: 'pending' }),
        updatedAt: serverTimestamp(),
      });
    }

    // อัปเดตข้อมูล totalPatientCensus โดยค้นหาและคำนวณจากข้อมูล ward form ล่าสุด
    try {
      // ค้นหาข้อมูลล่าสุดของกะดึก (เพราะเป็นข้อมูลล่าสุดของวัน)
      const nightFormQuery = query(
        collection(db, COLLECTION_WARDFORMS),
        where('dateString', '==', dateString),
        where('wardId', '==', wardId),
        where('shift', '==', ShiftType.NIGHT)
      );
      
      const nightFormSnapshot = await getDocs(nightFormQuery);
      
      // ถ้ามีข้อมูลกะดึก ใช้ค่า patientCensus จากกะดึก
      if (!nightFormSnapshot.empty) {
        const nightForm = nightFormSnapshot.docs[0].data() as WardForm;
        
        // อัปเดต totalPatientCensus ใน dailySummaries
        if (!summarySnapshot.empty) {
          await updateDoc(doc(db, 'dailySummaries', summarySnapshot.docs[0].id), {
            totalPatientCensus: nightForm.patientCensus || 0
          });
        }
      } 
      // ถ้าไม่มีข้อมูลกะดึก ลองค้นหาข้อมูลกะเช้า
      else {
        const morningFormQuery = query(
          collection(db, COLLECTION_WARDFORMS),
          where('dateString', '==', dateString),
          where('wardId', '==', wardId),
          where('shift', '==', ShiftType.MORNING)
        );
        
        const morningFormSnapshot = await getDocs(morningFormQuery);
        
        if (!morningFormSnapshot.empty) {
          const morningForm = morningFormSnapshot.docs[0].data() as WardForm;
          
          // อัปเดต totalPatientCensus ใน dailySummaries
          if (!summarySnapshot.empty) {
            await updateDoc(doc(db, 'dailySummaries', summarySnapshot.docs[0].id), {
              totalPatientCensus: morningForm.patientCensus || 0
            });
          }
        }
      }
    } catch (err) {
      console.error('Error updating totalPatientCensus:', err);
    }
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
}

/**
 * สร้างข้อมูลจำลองสำหรับแบบฟอร์ม
 */
function generateMockFormData({
  wardId,
  wardName,
  dateString,
  date,
  shift,
  status,
  previousPatientCensus
}: {
  wardId: string;
  wardName: string;
  dateString: string;
  date: Timestamp;
  shift: ShiftType;
  status: FormStatus;
  previousPatientCensus: number;
}): Omit<WardForm, 'id'> {
  // สุ่มค่าสำหรับ admission และ discharge
  const newAdmit = Math.floor(Math.random() * 10);
  const transferIn = Math.floor(Math.random() * 5);
  const referIn = Math.floor(Math.random() * 3);
  
  const discharge = Math.floor(Math.random() * 8);
  const transferOut = Math.floor(Math.random() * 4);
  const referOut = Math.floor(Math.random() * 2);
  const dead = Math.floor(Math.random() * 2);
  
  // คำนวณค่า patientCensus ตามหลักเกณฑ์
  const admissionTotal = newAdmit + transferIn + referIn;
  const dischargeTotal = discharge + transferOut + referOut + dead;
  
  // คำนวณ census จากค่าเดิม
  const calculatedCensus = previousPatientCensus + admissionTotal - dischargeTotal;
  const patientCensus = Math.max(0, calculatedCensus); // ต้องไม่ต่ำกว่า 0
  
  // สุ่มค่า staffing ให้สมเหตุสมผลกับจำนวนผู้ป่วย
  const nurseManager = 1;
  const staffMultiplier = patientCensus <= 30 ? 0.1 : patientCensus <= 60 ? 0.15 : 0.2;
  const rn = Math.max(1, Math.floor(patientCensus * staffMultiplier));
  const pn = Math.max(1, Math.floor(patientCensus * staffMultiplier * 0.7));
  const wc = Math.max(1, Math.floor(patientCensus * staffMultiplier * 0.5));

  // ข้อมูล bed status
  const totalBeds = patientCensus + Math.floor(Math.random() * 20) + 5;
  const available = totalBeds - patientCensus;
  const unavailable = Math.floor(Math.random() * 5);
  const plannedDischarge = Math.floor(Math.random() * (discharge + 2));

  // สร้างข้อมูลแบบฟอร์ม
  return {
    wardId,
    wardName,
    date,
    dateString,
    shift,
    patientCensus,
    initialPatientCensus: previousPatientCensus,
    calculatedCensus,
    nurseManager,
    rn,
    pn,
    wc,
    newAdmit,
    transferIn,
    referIn,
    transferOut,
    referOut,
    discharge,
    dead,
    available,
    unavailable,
    plannedDischarge,
    comment: `ข้อมูลจำลองสำหรับวันที่ ${dateString} กะ ${shift}`,
    recorderFirstName: 'Auto',
    recorderLastName: 'Generator',
    createdBy: 'mock_data_generator',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status,
    isDraft: status === FormStatus.DRAFT,
    finalizedAt: status !== FormStatus.DRAFT ? serverTimestamp() : undefined,
    
    // สำหรับสถานะ APPROVED
    ...(status === FormStatus.APPROVED && {
      approvedBy: 'mock_data_generator',
      approverFirstName: 'System',
      approverLastName: 'Approver',
      approvedAt: serverTimestamp(),
      supervisorFirstName: 'System',
      supervisorLastName: 'Supervisor',
    }),

    // สำหรับสถานะ REJECTED
    ...(status === FormStatus.REJECTED && {
      rejectedBy: 'mock_data_generator',
      rejectionReason: 'ข้อมูลถูก reject โดยระบบสร้างข้อมูลจำลอง',
      rejectedAt: serverTimestamp(),
    }),

    // ข้อมูล OPD
    opd24hr: Math.floor(Math.random() * 20),
    oldPatient: Math.floor(Math.random() * 15),
    newPatient: Math.floor(Math.random() * 5),
    admit24hr: Math.floor(Math.random() * 8)
  };
} 