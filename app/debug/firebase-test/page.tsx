'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/app/core/firebase/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import NavBar from '@/app/core/ui/NavBar';

export default function FirebaseTestPage() {
  const [status, setStatus] = useState<string>('Testing...');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    testFirebaseConnection();
  }, []);

  const testFirebaseConnection = async () => {
    try {
      setStatus('Testing Firebase connection...');
      
      // Test 1: ทดสอบการเชื่อมต่อ Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(5));
      const snapshot = await getDocs(q);
      
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setResults(userData);
      setStatus(`✅ Connected successfully! Found ${userData.length} users`);
      
      // Test 2: ทดสอบ collections อื่นๆ
      const collections = ['wards', 'wardForms', 'dailySummaries'];
      for (const collectionName of collections) {
        try {
          const collRef = collection(db, collectionName);
          const collSnapshot = await getDocs(query(collRef, limit(1)));
          console.log(`✅ ${collectionName}: ${collSnapshot.size} documents`);
        } catch (error) {
          console.log(`❌ ${collectionName}: Error -`, error);
        }
      }
      
    } catch (error) {
      console.error('Firebase test error:', error);
      setStatus(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          🔧 Firebase Connection Test
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Connection Status
          </h2>
          <p className="text-lg mb-4">{status}</p>
          
          <button
            onClick={testFirebaseConnection}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            🔄 Test Again
          </button>
        </div>
        
        {results.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Sample Users Data
            </h2>
            <div className="space-y-2">
              {results.map((user, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Username:</strong> {user.username || 'N/A'}</p>
                  <p><strong>Role:</strong> {user.role || 'N/A'}</p>
                  <p><strong>Active:</strong> {user.active ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 