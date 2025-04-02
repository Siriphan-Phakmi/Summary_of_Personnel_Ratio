import { useState, useEffect } from 'react';
import { 
  fetchDocumentsV2 as fetchDocuments, 
  createDocument, 
  fetchFields, 
  setDocumentField 
} from '../services/databaseService';
import { DocumentData, FieldData } from '../services/databaseService';

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
    if (collectionId) {
      loadDocuments();
    }
  }, [collectionId]);

  // โหลดฟิลด์เมื่อเอกสารที่เลือกเปลี่ยน
  useEffect(() => {
    if (collectionId && selectedDocument) {
      loadFields();
    } else {
      setFields([]);
    }
  }, [collectionId, selectedDocument]);

  // โหลดเอกสารทั้งหมดในคอลเลกชัน
  const loadDocuments = async () => {
    if (!collectionId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDocuments(collectionId);
      setDocuments(data);
      
      // เลือกเอกสารแรกถ้ามี
      if (data.length > 0 && !selectedDocument) {
        setSelectedDocument(data[0].id);
      } else if (data.length === 0) {
        setSelectedDocument(null);
      }
    } catch (err) {
      setError('ไม่สามารถโหลดเอกสารได้');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // โหลดฟิลด์ทั้งหมดในเอกสาร
  const loadFields = async () => {
    if (!collectionId || !selectedDocument) return;
    
    try {
      setLoading(true);
      setError(null);
      const documentPath = `${collectionId}/${selectedDocument}`;
      const data = await fetchFields(documentPath);
      setFields(data);
    } catch (err) {
      setError('ไม่สามารถโหลดฟิลด์ได้');
      console.error('Error loading fields:', err);
    } finally {
      setLoading(false);
    }
  };

  // สร้างเอกสารใหม่
  const addDocument = async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const success = await createDocument(collectionId, documentId);
      
      if (success) {
        // โหลดเอกสารใหม่หลังจากสร้างสำเร็จ
        await loadDocuments();
        setSelectedDocument(documentId);
      }
      
      return success;
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
    if (!collectionId || !selectedDocument) return false;
    
    try {
      setLoading(true);
      setError(null);
      const documentPath = `${collectionId}/${selectedDocument}`;
      const success = await setDocumentField(
        documentPath,
        fieldName, 
        fieldType, 
        fieldValue
      );
      
      if (success) {
        // โหลดฟิลด์ใหม่หลังจากอัปเดตสำเร็จ
        await loadFields();
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
    loading,
    error,
    setSelectedDocument,
    loadDocuments,
    loadFields,
    addDocument,
    addOrUpdateField
  };
}; 