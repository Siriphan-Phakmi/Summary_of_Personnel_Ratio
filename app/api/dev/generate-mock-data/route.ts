import { NextResponse } from 'next/server';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { addDays, format, startOfDay, parseISO } from 'date-fns';
import { WardForm, FormStatus, Ward, ShiftType } from '@/app/core/types/ward';
import { db } from '@/app/core/firebase/firebase';

// Helper function to generate random integer between min and max (inclusive)
const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Define a mock getActiveWards function locally for now
const mockGetActiveWards = async (): Promise<Ward[]> => {
  console.warn('[API Mock Data] Using mock getActiveWards function!');
  const now = new Date().toISOString();
  // Provide more mock ward data matching the Ward type
  return [
    {
      id: 'WARD6',
      wardId: 'WARD6',
      wardName: 'Ward 6',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'CCU',
      wardId: 'CCU',
      wardName: 'CCU',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'WARD7', // Added WARD7
      wardId: 'WARD7',
      wardName: 'Ward 7',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
     {
      id: 'WARD11', // Added WARD11
      wardId: 'WARD11',
      wardName: 'Ward 11',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
     {
      id: 'INACTIVE', // Example inactive ward
      wardId: 'INACTIVE',
      wardName: 'Inactive Ward',
      active: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

/**
 * API Route สำหรับสร้างข้อมูลจำลอง (Mock Data)
 * *** ทำงานเฉพาะใน Development Mode เท่านั้น ***
 */
export async function POST(request: Request) {
  // 1. ตรวจสอบ Environment: ห้ามทำงานใน Production เด็ดขาด!
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[API Mock Data] Attempted to run mock data generation outside of development mode.');
    return NextResponse.json(
      { success: false, error: 'This API is only available in development mode.' },
      { status: 403 } // Forbidden
    );
  }

  console.log('[API Mock Data] Received request to generate mock data.');

  try {
    const {
      startDate: startDateStr,
      days,
      wardIds: targetWardIds, // Optional array of specific ward IDs
      statusToGenerate,
      targetShift, // <-- Add targetShift from request body
    } = await request.json();

    // Validate input
    if (!startDateStr || !days || days < 1 || !statusToGenerate || !targetShift) { // <-- Validate targetShift
       return NextResponse.json({ success: false, error: 'Missing or invalid parameters: startDate, days, statusToGenerate, targetShift are required.' }, { status: 400 });
    }
     // Check if status is valid (for now, only FINAL is implicitly supported by the frontend, but let's allow generating it)
    if (!Object.values(FormStatus).includes(statusToGenerate as FormStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid statusToGenerate value.' }, { status: 400 });
    }

    const startDate = startOfDay(parseISO(startDateStr)); // Ensure we start at the beginning of the day
    const firestore = db; // Use the imported, initialized db instance
    const batch = writeBatch(firestore);
    let generatedCount = 0;
    const errors: string[] = [];

    // Fetch active wards using the local mock function
    let wardsToProcess: Ward[];
    try {
       const allMockWards = await mockGetActiveWards(); // Use local mock function
       // Filter only active wards first
       const allActiveWards = allMockWards.filter(w => w.active);

        if (targetWardIds && targetWardIds.length > 0) {
            // Normalize targetWardIds to uppercase for case-insensitive comparison
            const upperCaseTargetIds = targetWardIds.map((id: string) => id.toUpperCase()); 
            // Filter active wards based on targetWardIds (case-insensitive)
            wardsToProcess = allActiveWards.filter((ward: Ward) => upperCaseTargetIds.includes(ward.id.toUpperCase()));
            console.log(`[API Mock Data] Processing specific wards (case-insensitive): ${wardsToProcess.map(w => w.id).join(', ')}`);
        } else {
            // If no specific ward IDs are provided, use all *active* wards from mockGetActiveWards
            wardsToProcess = allActiveWards;
            console.log(`[API Mock Data] Processing all active wards (${wardsToProcess.length}).`);
        }
    } catch (fetchError) {
        console.error('[API Mock Data] Failed to fetch wards:', fetchError);
        return NextResponse.json({ success: false, error: 'Failed to fetch ward data.' }, { status: 500 });
    }


    if (wardsToProcess.length === 0) {
        return NextResponse.json({ success: false, error: 'No active wards found matching the criteria.' }, { status: 404 });
    }


    // Loop through dates and wards
    for (let i = 0; i < days; i++) {
      const currentDate = addDays(startDate, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd'); // Format for document ID and data

      for (const ward of wardsToProcess) {
        // Determine which shifts to generate based on targetShift
        let shiftsToGenerate: ShiftType[];
        if (targetShift === 'both') {
          shiftsToGenerate = [ShiftType.MORNING, ShiftType.NIGHT];
        } else if (targetShift === ShiftType.MORNING) {
          shiftsToGenerate = [ShiftType.MORNING];
        } else if (targetShift === ShiftType.NIGHT) {
          shiftsToGenerate = [ShiftType.NIGHT];
        } else {
          // Should not happen due to frontend validation, but handle defensively
          shiftsToGenerate = [];
          console.warn(`[API Mock Data] Invalid targetShift value: ${targetShift}. Skipping generation for ${dateStr}, ward ${ward.id}`);
          errors.push(`Invalid targetShift value: ${targetShift} for ward ${ward.id} on ${dateStr}.`);
          continue; // Skip to next ward
        }

        for (const shift of shiftsToGenerate) { // <-- Loop through determined shifts
          // Construct Doc ID using date string, ward ID, and shift
          // Example: WARD6_2024-01-15_morning or CCU_2024-01-16_night
          // const docId = `${ward.id}_${dateStr}_${shift}`;
          // --- New Doc ID Format --- 
          const statusSuffix = statusToGenerate.toLowerCase(); // Ensure lowercase (e.g., 'final', 'draft')
          const docId = `${ward.id}_${dateStr}_${shift}_${statusSuffix}`;
          const formRef = doc(firestore, 'wardForms', docId);

          // Generate mock data for one form
          const mockFormData: Partial<WardForm> = {
            id: docId, // Store the ID within the document as well
            wardId: ward.id,
            wardName: ward.id, // Assuming Ward type only has id
            date: Timestamp.fromDate(currentDate), // Save as Firestore Timestamp
            dateString: dateStr, // Add dateString for querying
            shift: shift,
            status: statusToGenerate as FormStatus,
            // Determine isDraft based on status
            isDraft: statusToGenerate === FormStatus.DRAFT,
            patientCensus: getRandomInt(15, 30), // Using 30 as default totalBeds
            nurseManager: getRandomInt(0, 1),
            rn: getRandomInt(2, 5),
            pn: getRandomInt(3, 6),
            wc: getRandomInt(4, 8),
            newAdmit: getRandomInt(0, 5),
            transferIn: getRandomInt(0, 3),
            referIn: getRandomInt(0, 2),
            transferOut: getRandomInt(0, 4),
            referOut: getRandomInt(0, 2),
            discharge: getRandomInt(0, 5),
            dead: getRandomInt(0, 1),
            available: getRandomInt(0, Math.max(0, 30 - 20)),
            unavailable: getRandomInt(0, 5),
            plannedDischarge: getRandomInt(0, 3),
            // Add missing required properties
            comment: `ข้อมูลจำลองสำหรับ ${ward.id} วันที่ ${dateStr} กะ ${shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'} (สถานะ: ${statusToGenerate})`,
            recorderFirstName: 'ระบบ', // Added missing field
            recorderLastName: 'ข้อมูลจำลอง', // Added missing field
            createdBy: 'system-mock-generator', // Added missing field
            createdAt: Timestamp.fromDate(currentDate), // Use consistent timestamp
            updatedAt: Timestamp.fromDate(currentDate), // Use consistent timestamp
          };

          // Add finalizedAt only if the status is FINAL or APPROVED
          if (statusToGenerate === FormStatus.FINAL || statusToGenerate === FormStatus.APPROVED) {
            mockFormData.finalizedAt = Timestamp.fromDate(currentDate); // Add finalizedAt timestamp
          }

           // Basic consistency checks (optional, can be more complex)
           const totalOccupiedApprox = mockFormData.patientCensus;
           // Ensure available is calculated correctly, avoiding undefined
           if (typeof totalOccupiedApprox === 'number' && typeof mockFormData.unavailable === 'number') {
             mockFormData.available = Math.max(0, 30 - totalOccupiedApprox - mockFormData.unavailable);
           } else {
             mockFormData.available = 0; // Default if census or unavailable is not set
           }


          batch.set(formRef, mockFormData);
          generatedCount++;
        }
      }
    }

    // Commit the batch
    try {
        await batch.commit();
        console.log(`[API Mock Data] Successfully committed batch of ${generatedCount} mock forms.`);
        const message = `Successfully generated ${generatedCount} mock forms for ${days} days, starting from ${startDateStr} with status ${statusToGenerate}.`;
         return NextResponse.json({ success: true, message: message, generatedCount: generatedCount, errors: errors }, { status: 200 });
    } catch (commitError) {
         console.error('[API Mock Data] Error committing batch:', commitError);
         // It's hard to know exactly which ones failed without more complex logic
         errors.push(`Failed to commit some or all generated forms. Error: ${commitError instanceof Error ? commitError.message : 'Unknown commit error'}`);
         return NextResponse.json({ success: false, error: 'Failed to save some or all mock data.', details: errors }, { status: 500 });
    }

  } catch (error) {
    console.error('[API Mock Data] Unexpected error during mock data generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to generate mock data: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Optional: Add GET handler for simple testing or info
export async function GET() {
   if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }
  return NextResponse.json({
    message: 'Mock data generation endpoint. Use POST method to generate data.',
    usage: 'POST /api/dev/generate-mock-data with body { startDate: \'YYYY-MM-DD\', days: number, wardIds?: string[], statusToGenerate: \'DRAFT\' | \'FINAL\', targetShift: \'morning\' | \'night\' | \'both\' }'
  });
} 