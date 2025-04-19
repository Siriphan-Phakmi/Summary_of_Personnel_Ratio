import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { toast } from 'react-hot-toast';

interface Collection {
  id: string;
  data: any;
}

export const useFirestoreCollection = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collectionsSnapshot = await getDocs(collection(db, 'collections')); // Replace '_collections' if incorrect
      const collectionsData = collectionsSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      setCollections(collectionsData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const addCollection = useCallback(async (newCollection: Collection) => {
    setCollections(prev => [...prev, newCollection]);
  }, []);

  const removeCollectionFromList = useCallback((collectionId: string) => {
    setCollections(prev => prev.filter(col => col.id !== collectionId));
  }, []);

  const checkCollectionExists = useCallback(async (collectionId: string): Promise<boolean> => {
    try {
      const docRef = doc(db, collectionId); // Assumes collectionId is the path
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (err) {
      console.error("Error checking collection existence:", err);
      return false; // Assume it doesn't exist on error
    }
  }, []);

  return {
    collections,
    loading,
    error,
    addCollection,
    loadCollections,
    removeCollectionFromList,
    checkCollectionExists
  };
}; 