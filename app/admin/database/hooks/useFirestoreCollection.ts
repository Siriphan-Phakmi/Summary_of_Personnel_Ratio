import { useState, useEffect, useCallback } from 'react';
import { fetchCollections } from '../services/databaseService';
import { CollectionData } from '../services/databaseService';
import { doc, collection, setDoc, query, getDocs, limit } from 'firebase/firestore';
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

  // ตรวจสอบว่าคอลเลกชันมีอยู่จริงหรือไม่
  const checkCollectionExists = useCallback(async (collectionId: string): Promise<boolean> => {
    try {
      const colRef = collection(db, collectionId);
      const snapshot = await getDocs(query(colRef, limit(1)));
      return true; // สามารถดึงข้อมูลได้แสดงว่าคอลเลกชันมีอยู่
    } catch (error) {
      console.log(`Collection ${collectionId} does not exist or cannot be accessed`);
      return false; // ไม่สามารถดึงข้อมูลได้แสดงว่าคอลเลกชันไม่มีอยู่หรือไม่มีสิทธิ์เข้าถึง
    }
  }, []);

  // โหลดข้อมูลคอลเลกชัน
  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCollections();
      
      // กรองเฉพาะคอลเลกชันที่มีอยู่จริง (สำหรับความปลอดภัยเพิ่มเติม)
      const existingCollections: CollectionData[] = [];
      for (const col of data) {
        const exists = await checkCollectionExists(col.id);
        if (exists) {
          existingCollections.push(col);
        }
      }
      
      setCollections(existingCollections);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลคอลเลกชันได้');
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  }, [checkCollectionExists]);

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
      
      // ตรวจสอบว่าคอลเลกชันมีอยู่แล้วหรือไม่
      const exists = await checkCollectionExists(collectionId);
      if (exists) {
        toast.error(`คอลเลกชัน "${collectionId}" มีอยู่แล้ว`);
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

  // ลบคอลเลกชันออกจากรายการโดยไม่ต้องรีโหลดข้อมูลจาก Firebase
  const removeCollectionFromList = (collectionId: string) => {
    setCollections(prev => prev.filter(col => col.id !== collectionId));
  };

  return {
    collections,
    loading,
    error,
    loadCollections,
    addCollection,
    checkCollectionExists,
    removeCollectionFromList
  };
}; 