import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, deleteField, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
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
}

// Database structure templates
export const collectionTemplates: Record<string, CollectionTemplate> = {
  users: {
    fields: [
      { name: 'email', type: 'string', defaultValue: '' },
      { name: 'displayName', type: 'string', defaultValue: '' },
      { name: 'photoURL', type: 'string', defaultValue: '' },
      { name: 'role', type: 'string', defaultValue: 'user', options: ['admin', 'user', 'developer'] },
      { name: 'createdAt', type: 'timestamp', defaultValue: new Date() },
    ],
  },
  sessions: {
    fields: [
      { name: 'userId', type: 'string', defaultValue: '' },
      { name: 'expires', type: 'timestamp', defaultValue: new Date() },
      { name: 'sessionToken', type: 'string', defaultValue: '' },
    ],
  },
  wards: {
    fields: [
      { name: 'wardName', type: 'string', defaultValue: '' },
      { name: 'wardCode', type: 'string', defaultValue: '' },
      { name: 'description', type: 'string', defaultValue: '' },
      { name: 'createdAt', type: 'timestamp', defaultValue: new Date() },
    ],
  },
  approvals: {
    fields: [
      { name: 'requesterId', type: 'string', defaultValue: '' },
      { name: 'status', type: 'string', defaultValue: 'pending' },
      { name: 'requestedAt', type: 'timestamp', defaultValue: new Date() },
      { name: 'approvedAt', type: 'timestamp', defaultValue: null },
      { name: 'approverId', type: 'string', defaultValue: '' },
    ],
  },
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

// ดึงข้อมูลคอลเลกชันทั้งหมด (จำลองเนื่องจากไม่สามารถดึงจาก client ได้โดยตรง)
export const fetchCollections = async (): Promise<CollectionData[]> => {
  try {
    // ในการทำงานจริง เราไม่สามารถดึงรายการ collection ทั้งหมดได้จาก client 
    // นี่เป็นเพียงการจำลองข้อมูลเพื่อแสดง UI
    const collectionsRef = ['users', 'wards', 'wardForms', 'systemLogs'];
    
    const collectionsData: CollectionData[] = collectionsRef.map(colId => ({
      id: colId,
      path: colId
    }));
    
    return collectionsData;
  } catch (error) {
    console.error('Error fetching collections:', error);
    toast.error('ไม่สามารถโหลดข้อมูลคอลเลกชันได้');
    throw error;
  }
}

// สร้างคอลเลกชันใหม่พร้อมเอกสารเริ่มต้น
export const createCollectionV2 = async (collectionId: string): Promise<boolean> => {
  try {
    // ตรวจสอบว่ามีเทมเพลตหรือไม่
    if (!/^[a-zA-Z0-9_]+$/.test(collectionId)) {
      toast.error('ชื่อคอลเลกชันต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่างเท่านั้น');
      return false;
    }
    
    // ตรวจสอบว่ามีเทมเพลตหรือไม่
    if (collectionTemplates[collectionId]) {
      return await createCollectionWithTemplate(collectionId);
    }
    
    // สร้างเอกสารแรกในคอลเลกชัน
    const docRef = doc(db, collectionId, 'initial_document');
    
    // เพิ่มข้อมูลลงใน Firestore
    await setDoc(docRef, {
      createdAt: new Date(),
      description: 'เอกสารเริ่มต้นสำหรับคอลเลกชันใหม่'
    });
    
    toast.success(`สร้างคอลเลกชัน "${collectionId}" สำเร็จ`);
    return true;
  } catch (error) {
    console.error('Error creating collection:', error);
    toast.error('เกิดข้อผิดพลาดในการสร้างคอลเลกชัน');
    return false;
  }
}

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
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      toast.error('คอลเลกชันนี้ว่างเปล่าหรือไม่มีอยู่');
      return false;
    }
    
    // ใช้ batch เพื่อลบเอกสารทั้งหมดในคอลเลกชัน
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    toast.success(`ลบคอลเลกชัน "${collectionId}" สำเร็จ`);
    return true;
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
      case 'array':
        try {
          processedValue = JSON.parse(fieldValue);
          if (!Array.isArray(processedValue)) {
            throw new Error('รูปแบบอาร์เรย์ไม่ถูกต้อง');
          }
        } catch (e) {
          throw new Error('รูปแบบอาร์เรย์ไม่ถูกต้อง');
        }
        break;
      case 'object':
        try {
          processedValue = JSON.parse(fieldValue);
          if (Array.isArray(processedValue) || typeof processedValue !== 'object') {
            throw new Error('รูปแบบออบเจ็กต์ไม่ถูกต้อง');
          }
        } catch (e) {
          throw new Error('รูปแบบออบเจ็กต์ไม่ถูกต้อง');
        }
        break;
    }
    
    // อัปเดตฟิลด์ในเอกสาร
    const docRef = doc(db, documentPath);
    await updateDoc(docRef, {
      [fieldName]: processedValue
    });
    
    toast.success(`เพิ่มฟิลด์ ${fieldName} สำเร็จ`);
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
    const docRef = doc(db, documentPath);
    
    // ใช้ deleteField() เพื่อลบฟิลด์จากเอกสาร
    await updateDoc(docRef, {
      [fieldName]: deleteField()
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

    // สร้างเอกสารแรกในคอลเลกชัน
    const docRef = doc(db, templateName, 'template');
    
    // แปลงฟิลด์จากเทมเพลตให้เป็นออบเจ็กต์
    const data = template.fields.reduce((acc, field) => {
      acc[field.name] = field.defaultValue;
      return acc;
    }, {} as Record<string, any>);
    
    // เพิ่มข้อมูลลงใน Firestore
    await setDoc(docRef, data);
    
    toast.success(`สร้างคอลเลกชัน "${templateName}" สำเร็จ`);
    return true;
  } catch (error) {
    console.error('Error creating collection with template:', error);
    toast.error('เกิดข้อผิดพลาดในการสร้างคอลเลกชัน');
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
