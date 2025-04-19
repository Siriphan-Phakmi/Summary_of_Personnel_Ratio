import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  setDoc 
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';

export interface Field {
  name: string;
  type: string;
  value: any;
}

interface Document {
  id: string;
  data: Record<string, any>;
}

export const useFirestoreDocument = (collectionId: string) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!collectionId) return;
    setLoading(true);
    setError(null);
    try {
      const docsRef = collection(db, collectionId);
      const snapshot = await getDocs(docsRef);
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      setDocuments(docsData);
      setSelectedDocument(null);
      setFields([]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const loadFields = async () => {
      if (!selectedDocument || !collectionId) {
        setFields([]);
        return;
      }
      setLoading(true);
      try {
        const docRef = doc(db, collectionId, selectedDocument);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedFields: Field[] = Object.entries(data).map(([key, value]) => ({
            name: key,
            value: value,
            type: typeof value,
          }));
          setFields(loadedFields);
        } else {
          setFields([]);
        }
      } catch (err) {
        setError(err as Error);
        setFields([]);
      } finally {
        setLoading(false);
      }
    };

    loadFields();
  }, [selectedDocument, collectionId]);

  const addDocument = useCallback(async (documentId: string, initialData: Record<string, any> = {}) => {
    try {
      const docRef = doc(db, collectionId, documentId);
      await setDoc(docRef, initialData); 
      await loadDocuments();
      setSelectedDocument(documentId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [collectionId, loadDocuments]);

  const addOrUpdateField = useCallback(async (fieldName: string, value: any) => {
    if (!selectedDocument) return false;
    try {
      const docRef = doc(db, collectionId, selectedDocument);
      await updateDoc(docRef, { [fieldName]: value });
      setFields(prevFields => {
        const fieldIndex = prevFields.findIndex(f => f.name === fieldName);
        const newField = { name: fieldName, value: value, type: typeof value };
        if (fieldIndex > -1) {
          const updatedFields = [...prevFields];
          updatedFields[fieldIndex] = newField;
          return updatedFields;
        } else {
          return [...prevFields, newField];
        }
      });
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [collectionId, selectedDocument]);

  return {
    documents,
    selectedDocument,
    setSelectedDocument,
    fields, 
    loading,
    error,
    addDocument,
    loadDocuments,
    addOrUpdateField
  };
}; 