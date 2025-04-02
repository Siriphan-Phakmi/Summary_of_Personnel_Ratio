import { useState, useEffect } from 'react';
import { fetchCollections } from '../services/databaseService';
import { CollectionData } from '../services/databaseService';
import { doc, collection, setDoc } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { toast } from 'react-hot-toast';

/**
 * Hook สำหรับจัดการคอลเลกชันใน Firestore
 */
export const useFirestoreCollection = () => {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // โหลดคอลเลกชันเมื่อเริ่มต้น
  useEffect(() => {
    loadCollections();
  }, []);

  // โหลดข้อมูลคอลเลกชัน
  const loadCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCollections();
      setCollections(data);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลคอลเลกชันได้');
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  };

  // สร้างคอลเลกชันใหม่
  const addCollection = async (collectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // ตรวจสอบความถูกต้องของชื่อคอลเลกชัน
      if (!/^[a-zA-Z0-9_]+$/.test(collectionId)) {
        toast.error('ชื่อคอลเลกชันต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่างเท่านั้น');
        return false;
      }
      
      // สร้างเอกสารเริ่มต้นในคอลเลกชัน
      const docRef = doc(db, collectionId, 'initial_document');
      
      // เพิ่มข้อมูลลงใน Firestore
      await setDoc(docRef, {
        createdAt: new Date(),
        description: 'เอกสารเริ่มต้นสำหรับคอลเลกชันใหม่'
      });
      
      toast.success(`สร้างคอลเลกชัน "${collectionId}" สำเร็จ`);
      
      // โหลดคอลเลกชันใหม่หลังจากสร้างสำเร็จ
      await loadCollections();
      
      return true;
    } catch (err) {
      setError('ไม่สามารถสร้างคอลเลกชันได้');
      console.error('Error creating collection:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    collections,
    loading,
    error,
    loadCollections,
    addCollection
  };
}; 