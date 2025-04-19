import { useState, useEffect } from 'react';
import { 
  fetchDocumentsV2 as fetchDocuments, 
  createDocument, 
  fetchFields, 
  setDocumentField,
  FieldData 
} from '../services/databaseService';
import { DocumentData } from '../services/databaseService';

// Export type Field เพื่อใช้ใน DocumentFieldView.tsx
export type Field = FieldData;

/**
 * Hook สำหรับจัดการเอกสารและฟิลด์ใน Firestore
 */
export const useFirestoreDocument = (collectionId: string) => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [fields, setFields] = useState<FieldData[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // โหลดเอกสารเมื่อคอลเลกชันเปลี่ยน
  useEffect(() => {
    let isMounted = true;
    
    const loadDocs = async () => {
      if (collectionId && isMounted) {
        await loadDocuments();
      }
    };
    
    loadDocs();
    
    return () => {
      isMounted = false;
    };
  }, [collectionId]); // ไม่ใส่ loadDocuments เป็น dependency

  // โหลดฟิลด์เมื่อเอกสารที่เลือกเปลี่ยน
  useEffect(() => {
    let isMounted = true;
    
    const loadDocFields = async () => {
      if (collectionId && selectedDocument && isMounted) {
        try {
          setLoading(true);
          setError(null);
          const documentPath = `${collectionId}/${selectedDocument}`;
          const data = await fetchFields(documentPath);
          if (isMounted) {
            setFields(data);
          }
        } catch (err) {
          if (isMounted) {
            setError('ไม่สามารถโหลดฟิลด์ได้');
            console.error('Error loading fields:', err);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else if (isMounted) {
        setFields([]);
      }
    };
    
    loadDocFields();
    
    return () => {
      isMounted = false;
    };
  }, [collectionId, selectedDocument]); // ไม่ใส่ loadFields เป็น dependency

  // โหลดเอกสารทั้งหมดในคอลเลกชัน
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDocuments(collectionId);
      setDocuments(data);
    } catch (err) {
      setError('ไม่สามารถโหลดเอกสารได้');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // สร้างเอกสารใหม่
  const addDocument = async (docId: string) => {
    try {
      setLoading(true);
      setError(null);
      await createDocument(collectionId, docId);
      await loadDocuments();
      return true;
    } catch (err) {
      setError('ไม่สามารถสร้างเอกสารได้');
      console.error('Error creating document:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // เพิ่มหรืออัปเดตฟิลด์
  const addOrUpdateField = async (
    fieldName: string,
    fieldType: string,
    fieldValue: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      if (!collectionId || !selectedDocument) return false;
      
      const documentPath = `${collectionId}/${selectedDocument}`;
      const success = await setDocumentField(
        documentPath,
        fieldName, 
        fieldType, 
        fieldValue
      );
      
      if (success) {
        // โหลดข้อมูลฟิลด์ใหม่หลังจากอัปเดต
        const data = await fetchFields(documentPath);
        setFields(data);
      }
      
      return success;
    } catch (err) {
      setError('ไม่สามารถอัปเดตฟิลด์ได้');
      console.error('Error updating field:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    documents,
    fields,
    selectedDocument,
    setSelectedDocument,
    loading,
    error,
    addDocument,
    loadDocuments,
    addOrUpdateField
  };
}; 