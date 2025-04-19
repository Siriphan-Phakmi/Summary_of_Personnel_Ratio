import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, deleteField, query, where, onSnapshot, writeBatch, limit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { toast } from 'react-hot-toast';

// Types
export interface Ward {
  id: string;
  wardId: string;
  wardName: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionData {
  id: string;
  path: string;
  name?: string;
  documentCount?: number;
  lastUpdated?: Date | null;
  isRecent?: boolean;
}

export interface DocumentData {
  id: string;
  path: string;
  data: any;
}

export interface FieldData {
  name: string;
  type: string;
  value: any;
}

export interface CollectionTemplateField {
  name: string;
  type: string;
  defaultValue: any;
  options?: string[];
}

export interface CollectionTemplate {
  fields: CollectionTemplateField[];
  initialDocuments?: Array<{id?: string; [key: string]: any}>;
}

// Database structure templates
export const collectionTemplates: Record<string, CollectionTemplate> = {
  users: {
    fields: [
      { name: 'uid', type: 'string', defaultValue: '' },
      { name: 'username', type: 'string', defaultValue: '' },
      { name: 'firstName', type: 'string', defaultValue: '' },
      { name: 'lastName', type: 'string', defaultValue: '' },
      { name: 'role', type: 'string', defaultValue: 'user', options: ['admin', 'user', 'approver', 'developer'] },
      { name: 'location', type: 'array', defaultValue: [] },
      { name: 'active', type: 'boolean', defaultValue: true },
      { name: 'createdAt', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'lastUpdated', type: 'timestamp', defaultValue: serverTimestamp() }
    ],
  },
  sessions: {
    fields: [
      { name: 'userId', type: 'string', defaultValue: '' },
      { name: 'sessionId', type: 'string', defaultValue: '' },
      { name: 'deviceInfo', type: 'object', defaultValue: {} },
      { name: 'ipAddress', type: 'string', defaultValue: '' },
      { name: 'startTime', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'lastActiveTime', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'isActive', type: 'boolean', defaultValue: true }
    ],
  },
  currentSessions: {
    fields: [
      { name: 'sessionId', type: 'string', defaultValue: '' },
      { name: 'startTime', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'deviceInfo', type: 'object', defaultValue: {} }
    ],
  },
  wards: {
    fields: [
      { name: 'wardId', type: 'string', defaultValue: '' },
      { name: 'wardName', type: 'string', defaultValue: '' },
      { name: 'description', type: 'string', defaultValue: '' },
      { name: 'active', type: 'boolean', defaultValue: true },
      { name: 'createdAt', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'updatedAt', type: 'timestamp', defaultValue: serverTimestamp() }
    ],
  },
  wardForms: {
    fields: [
      { name: 'wardId', type: 'string', defaultValue: '' },
      { name: 'wardName', type: 'string', defaultValue: '' },
      { name: 'date', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'dateString', type: 'string', defaultValue: '' },
      { name: 'shift', type: 'string', defaultValue: 'morning', options: ['morning', 'night'] },
      { name: 'patientCensus', type: 'number', defaultValue: 0 },
      { name: 'nurseManager', type: 'number', defaultValue: 0 },
      { name: 'rn', type: 'number', defaultValue: 0 },
      { name: 'pn', type: 'number', defaultValue: 0 },
      { name: 'wc', type: 'number', defaultValue: 0 },
      { name: 'newAdmit', type: 'number', defaultValue: 0 },
      { name: 'transferIn', type: 'number', defaultValue: 0 },
      { name: 'referIn', type: 'number', defaultValue: 0 },
      { name: 'transferOut', type: 'number', defaultValue: 0 },
      { name: 'referOut', type: 'number', defaultValue: 0 },
      { name: 'discharge', type: 'number', defaultValue: 0 },
      { name: 'dead', type: 'number', defaultValue: 0 },
      { name: 'available', type: 'number', defaultValue: 0 },
      { name: 'unavailable', type: 'number', defaultValue: 0 },
      { name: 'plannedDischarge', type: 'number', defaultValue: 0 },
      { name: 'comment', type: 'string', defaultValue: '' },
      { name: 'createdBy', type: 'string', defaultValue: '' },
      { name: 'recorderFirstName', type: 'string', defaultValue: '' },
      { name: 'recorderLastName', type: 'string', defaultValue: '' },
      { name: 'status', type: 'string', defaultValue: 'draft', options: ['draft', 'final', 'approved', 'rejected'] },
      { name: 'isDraft', type: 'boolean', defaultValue: true },
      { name: 'createdAt', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'updatedAt', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'finalizedAt', type: 'timestamp', defaultValue: null }
    ]
  },
  approvals: {
    fields: [
      { name: 'formId', type: 'string', defaultValue: '' },
      { name: 'wardId', type: 'string', defaultValue: '' },
      { name: 'wardName', type: 'string', defaultValue: '' },
      { name: 'date', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'shift', type: 'string', defaultValue: 'morning', options: ['morning', 'night'] },
      { name: 'approvedBy', type: 'string', defaultValue: '' },
      { name: 'approverFirstName', type: 'string', defaultValue: '' },
      { name: 'approverLastName', type: 'string', defaultValue: '' },
      { name: 'approvedAt', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'status', type: 'string', defaultValue: 'approved', options: ['approved', 'rejected'] },
      { name: 'editedBeforeApproval', type: 'boolean', defaultValue: false },
      { name: 'rejectionReason', type: 'string', defaultValue: '' },
      { name: 'modifiedData', type: 'object', defaultValue: {} }
    ]
  },
  dailySummaries: {
    fields: [
      { name: 'date', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'dateString', type: 'string', defaultValue: '' },
      { name: 'wardId', type: 'string', defaultValue: '' },
      { name: 'wardName', type: 'string', defaultValue: '' },
      { name: 'morningFormId', type: 'string', defaultValue: '' },
      { name: 'nightFormId', type: 'string', defaultValue: '' },
      { name: 'opd24hr', type: 'number', defaultValue: 0 },
      { name: 'oldPatient', type: 'number', defaultValue: 0 },
      { name: 'newPatient', type: 'number', defaultValue: 0 },
      { name: 'admit24hr', type: 'number', defaultValue: 0 },
      { name: 'supervisorFirstName', type: 'string', defaultValue: '' },
      { name: 'supervisorLastName', type: 'string', defaultValue: '' },
      { name: 'supervisorId', type: 'string', defaultValue: '' },
      { name: 'createdAt', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'updatedAt', type: 'timestamp', defaultValue: null },
      { name: 'totalPatientCensus', type: 'number', defaultValue: 0 },
      { name: 'allFormsApproved', type: 'boolean', defaultValue: false }
    ]
  },
  systemLogs: {
    fields: [
      { name: 'type', type: 'string', defaultValue: '', options: ['login', 'logout', 'form_create', 'form_update', 'approval'] },
      { name: 'userId', type: 'string', defaultValue: '' },
      { name: 'username', type: 'string', defaultValue: '' },
      { name: 'details', type: 'object', defaultValue: {} },
      { name: 'createdAt', type: 'timestamp', defaultValue: serverTimestamp() },
      { name: 'ipAddress', type: 'string', defaultValue: '' },
      { name: 'deviceInfo', type: 'object', defaultValue: {} }
    ]
  }
}

// ====== Ward Management ======

// ดึงข้อมูล wards ทั้งหมด
export const fetchWards = async (): Promise<Ward[]> => {
  try {
    const wardsRef = collection(db, 'wards');
    const snapshot = await getDocs(wardsRef);
    
    const wardsData: Ward[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Omit<Ward, 'id'>;
      wardsData.push({
        ...data,
        id: doc.id
      });
    });
    
    return wardsData;
  } catch (error) {
    console.error('Error fetching wards:', error);
    toast.error('ไม่สามารถโหลดข้อมูลวอร์ดได้');
    throw error;
  }
}

// สร้างวอร์ดใหม่
export const createWard = async (wardData: Omit<Ward, 'id'>): Promise<Ward> => {
  try {
    const now = new Date().toISOString();
    const newWardData = {
      ...wardData,
      createdAt: now,
      updatedAt: now,
    }
    
    const newWardRef = doc(collection(db, 'wards'));
    await setDoc(newWardRef, newWardData);
    
    toast.success(`สร้างวอร์ด ${wardData.wardName} สำเร็จ`);
    
    return { 
      ...newWardData, 
      id: newWardRef.id 
    }
  } catch (error) {
    console.error('Error creating ward:', error);
    toast.error('ไม่สามารถสร้างวอร์ดได้');
    throw error;
  }
}

// อัปเดตวอร์ด
export const updateWard = async (id: string, wardData: Partial<Omit<Ward, 'id'>>): Promise<void> => {
  try {
    const wardRef = doc(db, 'wards', id);
    const updateData = {
      ...wardData,
      updatedAt: new Date().toISOString()
    }
    
    await updateDoc(wardRef, updateData);
    toast.success(`อัปเดตวอร์ด ${wardData.wardName || ''} สำเร็จ`);
  } catch (error) {
    console.error('Error updating ward:', error);
    toast.error('ไม่สามารถอัปเดตวอร์ดได้');
    throw error;
  }
}

// ลบวอร์ด
export const deleteWard = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'wards', id));
    toast.success('ลบวอร์ดสำเร็จ');
  } catch (error) {
    console.error('Error deleting ward:', error);
    toast.error('ไม่สามารถลบวอร์ดได้');
    throw error;
  }
}

// ====== Collection Management ======

// ดึงข้อมูลคอลเลกชันทั้งหมด
export const fetchCollections = async (): Promise<CollectionData[]> => {
  try {
    const existingCollections: CollectionData[] = [];
    
    // 1. ดึงรายการคอลเลกชันที่เคยเข้าถึงล่าสุดจาก localStorage
    const recentCollections = getRecentCollections();
    
    // 2. กำหนดคอลเลกชันพื้นฐานที่สำคัญ
    const baseCollections = [
      'users', 'systemLogs', 'sessions', 'wards', 'wardForms',
      'approvals', 'dailySummaries', 'currentSessions'
    ];
    
    // รวมรายการคอลเลกชันที่จะตรวจสอบ และจำกัดไม่เกิน 10 รายการเพื่อลด API calls
    const collectionIds = Array.from(new Set([...recentCollections, ...baseCollections])).slice(0, 10);
    
    // ตรวจสอบคอลเลกชันว่ามีอยู่จริงหรือไม่ โดยตรวจสอบแบบทีละรายการ
    for (const collectionId of collectionIds) {
      try {
        // ใช้ limit(1) เพื่อลดปริมาณข้อมูลที่ต้องดึง
        const collectionRef = collection(db, collectionId);
        const q = query(collectionRef, limit(1));
        const snapshot = await getDocs(q);
        
        // นับจำนวนเอกสารในคอลเลกชัน
        const docCount = snapshot.size;
        
        // หา timestamp ล่าสุดในเอกสาร
        let lastUpdated: Date | null = null;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data._updated && (!lastUpdated || data._updated.toDate() > lastUpdated)) {
            lastUpdated = data._updated.toDate();
          } else if (data.updatedAt && (!lastUpdated || data.updatedAt.toDate() > lastUpdated)) {
            lastUpdated = data.updatedAt.toDate();
          } else if (data.createdAt && (!lastUpdated || data.createdAt.toDate() > lastUpdated)) {
            lastUpdated = data.createdAt.toDate();
          }
        });
        
        // เพิ่มคอลเลกชันเข้าไปในรายการ (แม้ว่าจะไม่มีเอกสารใดๆ)
        existingCollections.push({
          id: collectionId,
          path: collectionRef.path,
          name: formatCollectionName ? formatCollectionName(collectionId) : collectionId,
          documentCount: docCount,
          lastUpdated: lastUpdated || null,
          isRecent: recentCollections.includes(collectionId)
        });
        
        // บันทึกคอลเลกชันที่พบลงในรายการล่าสุด
        if (!recentCollections.includes(collectionId)) {
          addRecentCollection(collectionId);
        }
      } catch (error) {
        console.log(`Collection ${collectionId} is not accessible:`, error);
        // ข้ามคอลเลกชันที่ไม่สามารถเข้าถึงได้
      }
    }
    
    return existingCollections;
  } catch (error) {
    console.error('Error fetching collections:', error);
    toast.error('ไม่สามารถดึงข้อมูลคอลเลกชันได้');
    return [];
  }
};

// Helper function to format collection name
const formatCollectionName = (collectionId: string): string => {
  // Capitalize first letter and replace underscores with spaces
  return collectionId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

// เพิ่มคอลเลกชันใหม่เข้าไปในรายการล่าสุด
export const addRecentCollection = (collectionId: string) => {
  try {
    // ดึงรายการคอลเลกชันที่เข้าถึงล่าสุด
    const recentCollections = getRecentCollections();
    
    // เพิ่มคอลเลกชันปัจจุบันไว้ด้านบนสุด (ถ้ามีอยู่แล้วให้ลบออกก่อนเพื่อป้องกันการซ้ำ)
    const updatedCollections = [
      collectionId,
      ...recentCollections.filter(id => id !== collectionId)
    ];
    
    // เก็บเฉพาะ 20 รายการล่าสุด
    const limitedCollections = updatedCollections.slice(0, 20);
    
    // บันทึกลงใน localStorage
    localStorage.setItem('recentCollections', JSON.stringify(limitedCollections));
    
    return limitedCollections;
  } catch (error) {
    console.error('Error adding recent collection:', error);
    return [];
  }
};

export const getRecentCollections = (): string[] => {
  try {
    const stored = localStorage.getItem('recentCollections');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting recent collections:', error);
    return [];
  }
};

// ฟังก์ชันสร้างคอลเลกชันใหม่
export const createNewCollection = async (collectionId: string, templateId?: string): Promise<string | null> => {
  try {
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    
    // ตรวจสอบว่าคอลเลกชันมีอยู่แล้วหรือไม่
    const collectionRef = collection(db, collectionId);
    const snapshot = await getDocs(query(collectionRef, limit(1)));
    
    if (!snapshot.empty) {
      throw new Error(`Collection '${collectionId}' already exists`);
    }
    
    // สร้างเอกสารแรกในคอลเลกชัน (เพื่อให้คอลเลกชันมีอยู่จริง)
    const initialDoc = {
      _created: Timestamp.now(),
      _updated: Timestamp.now(),
      _system: true,
      name: 'Collection Info',
      description: 'Auto-generated document for collection initialization'
    };
    
    // หากมีเทมเพลต ให้ใช้โครงสร้างจากเทมเพลต
    if (templateId && collectionTemplates[templateId]) {
      // ทำตามเทมเพลตที่เลือก
      const template = collectionTemplates[templateId];
      
      // สร้างเอกสารตามเทมเพลต (ถ้ามี)
      if (template.initialDocuments) {
        const batch = writeBatch(db);
        
        for (const docData of template.initialDocuments) {
          const docRef = doc(collectionRef, docData.id || undefined);
          batch.set(docRef, {
            ...docData,
            _created: Timestamp.now(),
            _updated: Timestamp.now()
          });
        }
        
        await batch.commit();
      }
    } else {
      // สร้างเอกสารเริ่มต้น
      await setDoc(doc(collectionRef, 'info'), initialDoc);
    }
    
    // บันทึกคอลเลกชันในรายการที่เข้าถึงล่าสุด
    addRecentCollection(collectionId);
    
    toast.success(`คอลเลกชัน ${collectionId} ถูกสร้างเรียบร้อยแล้ว`);
    return collectionId;
  } catch (error: any) {
    console.error('Error creating collection:', error);
    toast.error(`ไม่สามารถสร้างคอลเลกชัน: ${error.message}`);
    return null;
  }
};

// ลบคอลเลกชัน (จำเป็นต้องลบเอกสารทั้งหมดในคอลเลกชันก่อน)
export const deleteCollectionV2 = async (collectionId: string): Promise<boolean> => {
  if (!collectionId) return false;
  
  // ป้องกัน XSS และ SQL Injection
  if (!/^[a-zA-Z0-9_]+$/.test(collectionId)) {
    toast.error('ชื่อคอลเลกชันไม่ถูกต้อง');
    return false;
  }
  
  try {
    // ดึงเอกสารทั้งหมดในคอลเลกชัน
    const colRef = collection(db, collectionId);
    let snapshot;
    
    try {
      snapshot = await getDocs(colRef);
    } catch (error) {
      console.log(`Collection ${collectionId} ไม่มีอยู่หรือไม่สามารถเข้าถึงได้`);
      toast.success(`คอลเลกชัน "${collectionId}" ถูกลบไปแล้ว หรือไม่มีอยู่ในระบบ`);
      return true; // คืนค่า true เพื่อให้ UI อัปเดตรายการ
    }
    
    if (snapshot.empty) {
      // ถ้าคอลเลกชันว่างเปล่า ให้ถือว่าลบสำเร็จแล้ว
      toast.success(`คอลเลกชัน "${collectionId}" ว่างเปล่า ถือว่าลบสำเร็จ`);
      return true;
    }
    
    // ใช้ batch เพื่อลบเอกสารทั้งหมดในคอลเลกชัน
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // ตรวจสอบว่าคอลเลกชันว่างเปล่าหลังจากลบแล้ว
    try {
      const checkSnapshot = await getDocs(colRef);
      if (checkSnapshot.empty) {
        toast.success(`ลบคอลเลกชัน "${collectionId}" สำเร็จ`);
        return true;
      } else {
        // ถ้ายังมีเอกสารเหลืออยู่ (อาจมีการเพิ่มในระหว่างลบ)
        toast(`ลบเอกสารบางส่วนในคอลเลกชัน "${collectionId}" สำเร็จ แต่ยังมีเอกสารบางส่วนเหลืออยู่`);
        return false;
      }
    } catch (error) {
      // ถ้าไม่สามารถเข้าถึงคอลเลกชันได้หลังจากลบ แสดงว่าอาจถูกลบไปแล้ว
      console.log(`Collection ${collectionId} อาจถูกลบไปแล้วหลังจากลบเอกสาร`);
      toast.success(`ลบคอลเลกชัน "${collectionId}" สำเร็จ`);
      return true;
    }
  } catch (error) {
    console.error('Error deleting collection:', error);
    toast.error('เกิดข้อผิดพลาดในการลบคอลเลกชัน');
    return false;
  }
}

// ดึงเอกสารในคอลเลกชัน
export const fetchDocumentsV2 = async (collectionId: string): Promise<DocumentData[]> => {
  try {
    const collectionRef = collection(db, collectionId);
    const snapshot = await getDocs(collectionRef);
    
    const documentsData: DocumentData[] = [];
    snapshot.forEach((doc) => {
      documentsData.push({
        id: doc.id,
        path: doc.ref.path,
        data: doc.data()
      });
    });
    
    return documentsData;
  } catch (error) {
    console.error(`Error fetching documents from ${collectionId}:`, error);
    toast.error('ไม่สามารถโหลดข้อมูลเอกสารได้');
    throw error;
  }
}

// สร้างเอกสารใหม่
export const createDocument = async (collectionPath: string, documentId: string, initialData: any = {}): Promise<boolean> => {
  try {
    const docRef = doc(db, collectionPath, documentId);
    const data = {
      ...initialData,
      createdAt: new Date().toISOString()
    }
    
    await setDoc(docRef, data);
    toast.success(`สร้างเอกสาร ${documentId} สำเร็จ`);
    return true;
  } catch (error) {
    console.error('Error creating document:', error);
    toast.error('ไม่สามารถสร้างเอกสารได้');
    return false;
  }
}

// ลบเอกสาร
export const deleteDocument = async (collectionPath: string, documentId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, collectionPath, documentId);
    await deleteDoc(docRef);
    
    toast.success(`ลบเอกสาร "${documentId}" สำเร็จ`);
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    toast.error(`เกิดข้อผิดพลาดในการลบเอกสาร: ${error instanceof Error ? error.message : 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
    return false;
  }
}

// ดึงฟิลด์ของเอกสาร
export const fetchFields = async (documentPath: string): Promise<FieldData[]> => {
  try {
    const docRef = doc(db, documentPath);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      const fieldsData: FieldData[] = Object.keys(data).map(key => ({
        name: key,
        type: typeof data[key],
        value: data[key]
      }));
      
      return fieldsData;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching fields from ${documentPath}:`, error);
    toast.error('ไม่สามารถโหลดข้อมูลฟิลด์ได้');
    throw error;
  }
}

// เพิ่มหรืออัปเดตฟิลด์ในเอกสาร
export const setDocumentField = async (
  documentPath: string, 
  fieldName: string, 
  fieldType: string, 
  fieldValue: string
): Promise<boolean> => {
  try {
    // แปลงค่าฟิลด์ตามประเภท
    let processedValue: any = fieldValue;
    
    switch (fieldType) {
      case 'number':
        processedValue = Number(fieldValue);
        if (isNaN(processedValue)) {
          throw new Error('ค่าที่ระบุไม่ใช่ตัวเลขที่ถูกต้อง');
        }
        break;
      case 'boolean':
        processedValue = fieldValue === 'true';
        break;
      case 'null':
        processedValue = null;
        break;
      case 'timestamp':
        if (fieldValue === '') {
          processedValue = serverTimestamp();
        } else {
          try {
            processedValue = new Date(fieldValue);
            if (isNaN(processedValue.getTime())) {
              throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
            }
          } catch (e) {
            processedValue = serverTimestamp();
          }
        }
        break;
      case 'array':
        try {
          if (fieldValue.trim() === '') {
            processedValue = [];
          } else {
            processedValue = JSON.parse(fieldValue);
            if (!Array.isArray(processedValue)) {
              throw new Error('รูปแบบอาร์เรย์ไม่ถูกต้อง');
            }
          }
        } catch (e) {
          throw new Error('รูปแบบอาร์เรย์ไม่ถูกต้อง');
        }
        break;
      case 'object':
        try {
          if (fieldValue.trim() === '') {
            processedValue = {};
          } else {
            processedValue = JSON.parse(fieldValue);
            if (Array.isArray(processedValue) || typeof processedValue !== 'object') {
              throw new Error('รูปแบบออบเจ็กต์ไม่ถูกต้อง');
            }
          }
        } catch (e) {
          throw new Error('รูปแบบออบเจ็กต์ไม่ถูกต้อง');
        }
        break;
    }
    
    // อัปเดตฟิลด์ในเอกสาร
    const docRef = doc(db, documentPath);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      throw new Error('ไม่พบเอกสารที่ระบุ');
    }
    
    await updateDoc(docRef, {
      [fieldName]: processedValue,
      updatedAt: serverTimestamp() // เพิ่ม timestamp ในการอัปเดต
    });
    
    toast.success(`เพิ่ม/แก้ไขฟิลด์ ${fieldName} สำเร็จ`);
    return true;
  } catch (error) {
    console.error('Error setting document field:', error);
    toast.error(`ไม่สามารถเพิ่มฟิลด์ได้: ${error instanceof Error ? error.message : 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
    return false;
  }
}

// ลบฟิลด์จากเอกสาร
export const deleteDocumentField = async (
  documentPath: string,
  fieldName: string
): Promise<boolean> => {
  try {
    // ป้องกันการลบฟิลด์สำคัญ
    const protectedFields = ['id', 'uid', 'createdAt', 'createdBy'];
    if (protectedFields.includes(fieldName)) {
      throw new Error(`ไม่สามารถลบฟิลด์ "${fieldName}" เนื่องจากเป็นฟิลด์สำคัญของระบบ`);
    }
    
    const docRef = doc(db, documentPath);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      throw new Error('ไม่พบเอกสารที่ระบุ');
    }
    
    // ใช้ deleteField() เพื่อลบฟิลด์จากเอกสาร
    await updateDoc(docRef, {
      [fieldName]: deleteField(),
      updatedAt: serverTimestamp() // เพิ่ม timestamp ในการอัปเดต
    });
    
    toast.success(`ลบฟิลด์ "${fieldName}" สำเร็จ`);
    return true;
  } catch (error) {
    console.error('Error deleting document field:', error);
    toast.error(`เกิดข้อผิดพลาดในการลบฟิลด์: ${error instanceof Error ? error.message : 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
    return false;
  }
}

/**
 * สร้างคอลเลกชันใหม่จากเทมเพลต
 * @param templateName ชื่อเทมเพลต
 * @returns true หากสำเร็จ, false หากล้มเหลว
 */
export const createCollectionWithTemplate = async (templateName: string): Promise<boolean> => {
  try {
    // ตรวจสอบว่ามีเทมเพลตหรือไม่
    const template = collectionTemplates[templateName];
    if (!template) {
      toast.error(`ไม่พบเทมเพลต "${templateName}"`);
      return false;
    }

    // ตรวจสอบว่าคอลเลกชันมีอยู่แล้วหรือไม่
    try {
      const colRef = collection(db, templateName);
      const snapshot = await getDocs(query(colRef, limit(1)));
      
      if (!snapshot.empty) {
        toast.error(`คอลเลกชัน "${templateName}" มีอยู่แล้ว`);
        return false;
      }
    } catch (error) {
      // ถ้ามี error แสดงว่าอาจจะยังไม่มีคอลเลกชันนี้ สามารถดำเนินการต่อได้
      console.log(`Collection ${templateName} does not exist, creating...`);
    }

    // เลือกชื่อเอกสารเริ่มต้นตามประเภทของคอลเลกชัน
    let initialDocId = 'template_example';
    
    if (templateName === 'users') {
      initialDocId = 'admin_example';
    } else if (templateName === 'wards') {
      initialDocId = 'ward_example';
    } else if (templateName === 'wardForms') {
      initialDocId = 'form_example';
    } else if (templateName === 'approvals') {
      initialDocId = 'approval_example';
    } else if (templateName === 'dailySummaries') {
      initialDocId = 'summary_example';
    } else if (templateName === 'systemLogs') {
      initialDocId = 'log_example';
    } else if (templateName === 'sessions') {
      initialDocId = 'session_example';
    } else if (templateName === 'currentSessions') {
      initialDocId = 'current_session_example';
    }
    
    // สร้างเอกสารแรกในคอลเลกชัน
    const docRef = doc(db, templateName, initialDocId);
    
    // สร้างข้อมูลจากเทมเพลต
    const data: Record<string, any> = {};
    
    // แปลงฟิลด์จากเทมเพลตให้เป็นออบเจ็กต์
    for (const field of template.fields) {
      // จัดการค่าเริ่มต้นพิเศษสำหรับบางฟิลด์
      if (field.name === 'dateString' && templateName === 'wardForms') {
        data[field.name] = new Date().toISOString().split('T')[0];
      } else if (field.name === 'wardName' && templateName === 'wards') {
        data[field.name] = 'ตัวอย่างแผนก';
      } else if (field.name === 'wardId' && templateName === 'wards') {
        data[field.name] = 'WARD_EXAMPLE';
      } else {
        data[field.name] = field.defaultValue;
      }
    }
    
    // เพิ่มข้อมูลลงใน Firestore
    await setDoc(docRef, data);
    
    toast.success(`สร้างคอลเลกชัน "${templateName}" สำเร็จ`);
    return true;
  } catch (error) {
    console.error('Error creating collection with template:', error);
    toast.error(`เกิดข้อผิดพลาดในการสร้างคอลเลกชัน: ${error instanceof Error ? error.message : 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
    return false;
  }
}

/**
 * ดึงข้อมูลคอลเลกชันทั้งหมด
 * @returns รายการคอลเลกชัน
 */
export const fetchAllCollections = async (): Promise<{ id: string }[]> => {
  try {
    // ป้องกัน collection ID ที่อาจมาจากผู้ใช้โดยตรวจสอบรูปแบบ (ไม่มีวิธีดึงข้อมูล collection ทั้งหมดโดยตรงจาก Firestore แต่ต้องใช้การดึงรายการ collection ที่รู้จักแล้วแทน)
    const response = await fetch('/api/firestore/collections');
    if (!response.ok) throw new Error('Failed to fetch collections');
    
    const data = await response.json();
    return data.collections;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}
