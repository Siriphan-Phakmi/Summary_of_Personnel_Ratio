import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  query,
  where,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { toast } from 'react-hot-toast';
import { FormStatus, ShiftType, User, UserRole } from '@/app/core/types/user';

// คอลเลกชันทั้งหมดที่ต้องสร้าง
const COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  CURRENT_SESSIONS: 'currentSessions',
  WARD_FORMS: 'wardForms',
  APPROVALS: 'approvals',
  DAILY_SUMMARIES: 'dailySummaries',
  WARDS: 'wards',
  SYSTEM_LOGS: 'systemLogs'
};

/**
 * สร้างโครงสร้างฐานข้อมูล Firebase ทั้งหมดตามที่กำหนด
 * @returns Promise<boolean> สถานะการสร้างฐานข้อมูล
 */
export const setupDatabaseSchema = async (): Promise<boolean> => {
  try {
    // สร้างคอลเลกชันทั้งหมด
    await Promise.all([
      createUsersCollection(),
      createSessionsCollection(),
      createCurrentSessionsCollection(),
      createWardFormsCollection(),
      createApprovalsCollection(),
      createDailySummariesCollection(),
      createWardsCollection(),
      createSystemLogsCollection()
    ]);

    toast.success('สร้างโครงสร้างฐานข้อมูลสำเร็จ');
    return true;
  } catch (error) {
    console.error('Error setting up database schema:', error);
    toast.error('เกิดข้อผิดพลาดในการสร้างโครงสร้างฐานข้อมูล');
    return false;
  }
};

/**
 * สร้างคอลเลกชัน users
 * @returns Promise<void>
 */
export const createUsersCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const usersRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getDocs(usersRef);
    
    if (snapshot.empty) {
      // สร้างเอกสารตัวอย่าง - Admin user
      const adminUserRef = doc(db, COLLECTIONS.USERS, 'admin_example');
      await setDoc(adminUserRef, {
        uid: 'admin_example',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        location: ['ALL'],
        active: true,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      
      // สร้างเอกสารตัวอย่าง - Normal user
      const normalUserRef = doc(db, COLLECTIONS.USERS, 'user_example');
      await setDoc(normalUserRef, {
        uid: 'user_example',
        username: 'user',
        firstName: 'Normal',
        lastName: 'User',
        role: 'user',
        location: ['WARD1', 'WARD2'],
        active: true,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      
      // สร้างเอกสารตัวอย่าง - Approver user
      const approverUserRef = doc(db, COLLECTIONS.USERS, 'approver_example');
      await setDoc(approverUserRef, {
        uid: 'approver_example',
        username: 'approver',
        firstName: 'Approver',
        lastName: 'User',
        role: 'approver',
        location: ['ALL'],
        active: true,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      
      console.log('Created users collection with example documents');
    } else {
      console.log('Users collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating users collection:', error);
    throw error;
  }
};

/**
 * สร้างคอลเลกชัน sessions
 * @returns Promise<void>
 */
export const createSessionsCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const sessionsRef = collection(db, COLLECTIONS.SESSIONS);
    const snapshot = await getDocs(sessionsRef);
    
    if (snapshot.empty) {
      // สร้างเอกสารตัวอย่าง
      const sessionRef = doc(db, COLLECTIONS.SESSIONS, 'session_example');
      await setDoc(sessionRef, {
        userId: 'user_example',
        sessionId: 'session123',
        deviceInfo: {
          browser: 'Chrome',
          os: 'Windows',
          deviceType: 'Desktop'
        },
        ipAddress: '192.168.1.1',
        startTime: serverTimestamp(),
        lastActiveTime: serverTimestamp(),
        isActive: true
      });
      
      console.log('Created sessions collection with example document');
    } else {
      console.log('Sessions collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating sessions collection:', error);
    throw error;
  }
};

/**
 * สร้างคอลเลกชัน currentSessions
 * @returns Promise<void>
 */
export const createCurrentSessionsCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const currentSessionsRef = collection(db, COLLECTIONS.CURRENT_SESSIONS);
    const snapshot = await getDocs(currentSessionsRef);
    
    if (snapshot.empty) {
      // สร้างเอกสารตัวอย่าง
      const currentSessionRef = doc(db, COLLECTIONS.CURRENT_SESSIONS, 'user_example');
      await setDoc(currentSessionRef, {
        sessionId: 'session123',
        startTime: serverTimestamp(),
        deviceInfo: {
          browser: 'Chrome',
          os: 'Windows',
          deviceType: 'Desktop'
        }
      });
      
      console.log('Created currentSessions collection with example document');
    } else {
      console.log('CurrentSessions collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating currentSessions collection:', error);
    throw error;
  }
};

/**
 * สร้างคอลเลกชัน wardForms
 * @returns Promise<void>
 */
export const createWardFormsCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const wardFormsRef = collection(db, COLLECTIONS.WARD_FORMS);
    const snapshot = await getDocs(wardFormsRef);
    
    if (snapshot.empty) {
      // สร้างเอกสารตัวอย่างสำหรับกะเช้า
      const morningFormRef = doc(db, COLLECTIONS.WARD_FORMS, 'morning_form_example');
      await setDoc(morningFormRef, {
        wardId: 'WARD1',
        wardName: 'อายุรกรรมชาย',
        date: serverTimestamp(),
        dateString: '2023-04-10',
        shift: ShiftType.MORNING,
        patientCensus: 30,
        nurseManager: 1,
        rn: 5,
        pn: 2,
        wc: 3,
        newAdmit: 2,
        transferIn: 1,
        referIn: 0,
        transferOut: 1,
        referOut: 0,
        discharge: 3,
        dead: 0,
        available: 5,
        unavailable: 0,
        plannedDischarge: 2,
        comment: 'ตัวอย่างแบบฟอร์ม',
        createdBy: 'user_example',
        recorderFirstName: 'Normal',
        recorderLastName: 'User',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: FormStatus.FINAL,
        isDraft: false,
        finalizedAt: serverTimestamp()
      });
      
      // สร้างเอกสารตัวอย่างสำหรับกะดึก
      const nightFormRef = doc(db, COLLECTIONS.WARD_FORMS, 'night_form_example');
      await setDoc(nightFormRef, {
        wardId: 'WARD1',
        wardName: 'อายุรกรรมชาย',
        date: serverTimestamp(),
        dateString: '2023-04-10',
        shift: ShiftType.NIGHT,
        patientCensus: 28,
        nurseManager: 1,
        rn: 3,
        pn: 1,
        wc: 2,
        newAdmit: 1,
        transferIn: 0,
        referIn: 0,
        transferOut: 0,
        referOut: 0,
        discharge: 1,
        dead: 0,
        available: 7,
        unavailable: 0,
        plannedDischarge: 3,
        comment: 'ตัวอย่างแบบฟอร์มกะดึก',
        createdBy: 'user_example',
        recorderFirstName: 'Normal',
        recorderLastName: 'User',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: FormStatus.FINAL,
        isDraft: false,
        finalizedAt: serverTimestamp()
      });
      
      console.log('Created wardForms collection with example documents');
    } else {
      console.log('WardForms collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating wardForms collection:', error);
    throw error;
  }
};

/**
 * สร้างคอลเลกชัน approvals
 * @returns Promise<void>
 */
export const createApprovalsCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const approvalsRef = collection(db, COLLECTIONS.APPROVALS);
    const snapshot = await getDocs(approvalsRef);
    
    if (snapshot.empty) {
      // สร้างเอกสารตัวอย่าง
      const approvalRef = doc(db, COLLECTIONS.APPROVALS, 'approval_example');
      await setDoc(approvalRef, {
        formId: 'morning_form_example',
        wardId: 'WARD1',
        wardName: 'อายุรกรรมชาย',
        date: serverTimestamp(),
        shift: ShiftType.MORNING,
        approvedBy: 'approver_example',
        approverFirstName: 'Approver',
        approverLastName: 'User',
        approvedAt: serverTimestamp(),
        status: 'approved',
        editedBeforeApproval: false
      });
      
      console.log('Created approvals collection with example document');
    } else {
      console.log('Approvals collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating approvals collection:', error);
    throw error;
  }
};

/**
 * สร้างคอลเลกชัน dailySummaries
 * @returns Promise<void>
 */
export const createDailySummariesCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const dailySummariesRef = collection(db, COLLECTIONS.DAILY_SUMMARIES);
    const snapshot = await getDocs(dailySummariesRef);
    
    if (snapshot.empty) {
      // สร้างเอกสารตัวอย่าง
      const summaryRef = doc(db, COLLECTIONS.DAILY_SUMMARIES, 'daily_summary_example');
      await setDoc(summaryRef, {
        date: serverTimestamp(),
        dateString: '2023-04-10',
        wardId: 'WARD1',
        wardName: 'อายุรกรรมชาย',
        morningFormId: 'morning_form_example',
        nightFormId: 'night_form_example',
        opd24hr: 15,
        oldPatient: 20,
        newPatient: 5,
        admit24hr: 3,
        supervisorFirstName: 'Approver',
        supervisorLastName: 'User',
        supervisorId: 'approver_example',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalPatientCensus: 28,
        allFormsApproved: true
      });
      
      console.log('Created dailySummaries collection with example document');
    } else {
      console.log('DailySummaries collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating dailySummaries collection:', error);
    throw error;
  }
};

/**
 * สร้างคอลเลกชัน wards
 * @returns Promise<void>
 */
export const createWardsCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const wardsRef = collection(db, COLLECTIONS.WARDS);
    const snapshot = await getDocs(wardsRef);
    
    if (snapshot.empty) {
      // สร้างข้อมูลตัวอย่างหลายแผนก
      const batch = writeBatch(db);
      
      const wards = [
        {
          id: 'ward1',
          wardId: 'WARD1',
          wardName: 'อายุรกรรมชาย',
          description: 'แผนกอายุรกรรมชาย',
          active: true
        },
        {
          id: 'ward2',
          wardId: 'WARD2',
          wardName: 'อายุรกรรมหญิง',
          description: 'แผนกอายุรกรรมหญิง',
          active: true
        },
        {
          id: 'ward3',
          wardId: 'WARD3',
          wardName: 'ศัลยกรรมชาย',
          description: 'แผนกศัลยกรรมชาย',
          active: true
        },
        {
          id: 'ward4',
          wardId: 'WARD4',
          wardName: 'ศัลยกรรมหญิง',
          description: 'แผนกศัลยกรรมหญิง',
          active: true
        },
        {
          id: 'ward5',
          wardId: 'WARD5',
          wardName: 'กุมารเวชกรรม',
          description: 'แผนกกุมารเวชกรรม',
          active: true
        }
      ];
      
      wards.forEach(ward => {
        const wardRef = doc(db, COLLECTIONS.WARDS, ward.id);
        batch.set(wardRef, {
          ...ward,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('Created wards collection with example documents');
    } else {
      console.log('Wards collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating wards collection:', error);
    throw error;
  }
};

/**
 * สร้างคอลเลกชัน systemLogs
 * @returns Promise<void>
 */
export const createSystemLogsCollection = async (): Promise<void> => {
  try {
    // ตรวจสอบว่ามีเอกสารอยู่แล้วหรือไม่
    const systemLogsRef = collection(db, COLLECTIONS.SYSTEM_LOGS);
    const snapshot = await getDocs(systemLogsRef);
    
    if (snapshot.empty) {
      // สร้างเอกสารตัวอย่าง
      const logRef = doc(db, COLLECTIONS.SYSTEM_LOGS, 'log_example');
      await setDoc(logRef, {
        type: 'login',
        userId: 'user_example',
        username: 'user',
        details: {
          success: true,
          browser: 'Chrome',
          os: 'Windows'
        },
        createdAt: serverTimestamp(),
        ipAddress: '192.168.1.1',
        deviceInfo: {
          browser: 'Chrome',
          os: 'Windows',
          deviceType: 'Desktop'
        }
      });
      
      console.log('Created systemLogs collection with example document');
    } else {
      console.log('SystemLogs collection already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating systemLogs collection:', error);
    throw error;
  }
};

/**
 * สร้าง indexes ที่จำเป็นสำหรับการค้นหา
 * หมายเหตุ: การสร้าง indexes ไม่สามารถทำได้โดยตรงจาก client SDK
 * ต้องสร้างผ่าน Firebase Console หรือ Firebase CLI
 * ฟังก์ชันนี้จึงเป็นเพียงการตรวจสอบและแสดงข้อมูล indexes ที่ควรสร้าง
 */
export const checkRequiredIndexes = (): void => {
  console.log('Required indexes that should be created in Firebase Console:');
  
  console.log('\n1. wardForms - Composite Indexes:');
  console.log('   - wardId (ASC), dateString (ASC), shift (ASC), status (ASC), finalizedAt (DESC)');
  console.log('   - dateString (ASC), shift (ASC), wardId (ASC)');
  console.log('   - date (ASC), shift (ASC), wardId (ASC)');
  console.log('   - date (DESC), shift (ASC), wardId (ASC)');
  console.log('   - status (ASC), date (ASC), shift (ASC)');
  console.log('   - status (ASC), date (DESC), wardId (ASC)');
  console.log('   - wardId (ASC), date (DESC), shift (ASC)');
  console.log('   - wardId (ASC), date (ASC), shift (ASC)');
  console.log('   - wardId (ASC), date (DESC), updatedAt (DESC)');
  console.log('   - createdBy (ASC), date (DESC), status (ASC)');
  console.log('   - wardId (ASC), createdBy (ASC), isDraft (ASC), updatedAt (DESC)');
  
  console.log('\n2. wards - Composite Index:');
  console.log('   - active (ASC), wardOrder (ASC), __name__ (ASC)');
  
  console.log('\n3. approvals - Composite Indexes:');
  console.log('   - wardId (ASC), date (DESC)');
  console.log('   - approvedBy (ASC), date (DESC)');
  console.log('   - formId (ASC), approvedAt (DESC)');
  
  console.log('\n4. dailySummaries - Composite Indexes:');
  console.log('   - wardId (ASC), date (DESC)');
  console.log('   - wardId (ASC), dateString (DESC)');
  console.log('   - allFormsApproved (ASC), date (DESC)');
  
  console.log('\n5. systemLogs - Composite Indexes:');
  console.log('   - type (ASC), createdAt (DESC)');
  console.log('   - userId (ASC), createdAt (DESC)');
  
  toast.success('ต้องสร้าง indexes เพิ่มเติมผ่าน Firebase Console หรือ Firebase CLI', {
    duration: 8000
  });
};

/**
 * ตรวจสอบและกลับมาแก้ไขสถานะแบบฟอร์มหากมีปัญหา
 */
export const fixFormStatus = async (): Promise<void> => {
  try {
    const wardFormsRef = collection(db, COLLECTIONS.WARD_FORMS);
    const snapshot = await getDocs(wardFormsRef);
    
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      let updateCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'final' && !data.isDraft) {
          batch.update(doc.ref, {
            status: FormStatus.FINAL,
            updatedAt: serverTimestamp()
          });
          updateCount++;
        }
      });
      
      if (updateCount > 0) {
        await batch.commit();
        console.log(`Fixed status for ${updateCount} forms`);
        toast.success(`แก้ไขสถานะแบบฟอร์ม ${updateCount} รายการสำเร็จ`);
      } else {
        console.log('No forms need status fixing');
      }
    }
  } catch (error) {
    console.error('Error fixing form status:', error);
    toast.error('เกิดข้อผิดพลาดในการแก้ไขสถานะแบบฟอร์ม');
  }
}; 