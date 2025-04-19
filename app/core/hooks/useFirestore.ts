import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, QueryConstraint } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';

export interface UseFirestoreOptions {
  collectionName: string;
  defaultQueries?: QueryConstraint[];
}

export function useFirestore<T = any>({ collectionName, defaultQueries = [] }: UseFirestoreOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (additionalQueries: QueryConstraint[] = []) => {
    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, collectionName),
        ...defaultQueries,
        ...additionalQueries
      );

      const snapshot = await getDocs(q);
      const fetchedData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      setData(fetchedData);
      return fetchedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
      setError(errorMessage);
      console.error('Error fetching data:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [collectionName, defaultQueries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    fetchData,
    setData
  };
} 