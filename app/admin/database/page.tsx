'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { useAuth } from '@/app/features/auth';
import { Button, Input } from '@/app/core/ui';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import toast from 'react-hot-toast';
import { FiEdit2, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

interface Ward {
  id: string;
  wardName: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DatabaseManagement() {
  const [activeTab, setActiveTab] = useState<'wards'|'indexes'|'security'>('wards');
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWard, setShowAddWard] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  
  // Form states
  const [wardName, setWardName] = useState('');
  const [wardDescription, setWardDescription] = useState('');
  const [wardActive, setWardActive] = useState(true);
  
  const { user } = useAuth();

  // Fetch data based on active tab
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
    if (activeTab === 'wards') {
      fetchWards();
    }
  }, [user, activeTab]);

  // Fetch wards
  const fetchWards = async () => {
    setLoading(true);
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
      
      setWards(wardsData);
    } catch (error) {
      console.error('Error fetching wards:', error);
      toast.error('Failed to load wards');
    } finally {
      setLoading(false);
    }
  };

  const resetWardForm = () => {
    setWardName('');
    setWardDescription('');
    setWardActive(true);
    setEditingWard(null);
    setShowAddWard(false);
  };

  const handleEditWard = (ward: Ward) => {
    setEditingWard(ward);
    setWardName(ward.wardName);
    setWardDescription(ward.description);
    setWardActive(ward.active);
    setShowAddWard(true);
  };

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wardName) {
      toast.error('Please enter a ward name');
      return;
    }
    
    setLoading(true);
    
    try {
      const wardData = {
        wardName,
        description: wardDescription,
        active: wardActive,
        updatedAt: new Date().toISOString()
      };
      
      if (editingWard) {
        // Update existing ward
        const wardRef = doc(db, 'wards', editingWard.id);
        await updateDoc(wardRef, wardData);
        
        // Update local state
        setWards(wards.map(w => 
          w.id === editingWard.id ? {...w, ...wardData} : w
        ));
        
        toast.success(`Ward ${wardName} updated successfully`);
      } else {
        // Create new ward
        const now = new Date().toISOString();
        const newWardData = {
          ...wardData,
          createdAt: now,
        };
        
        // Generate a unique ID for the new ward
        const newWardRef = doc(collection(db, 'wards'));
        await setDoc(newWardRef, newWardData);
        
        // Add to local state
        setWards([...wards, { 
          ...newWardData, 
          id: newWardRef.id 
        } as Ward]);
        
        toast.success(`Ward ${wardName} created successfully`);
      }
      
      resetWardForm();
    } catch (error) {
      console.error('Error saving ward:', error);
      toast.error('Failed to save ward');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWard = async (wardId: string) => {
    if (confirm('Are you sure you want to delete this ward? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'wards', wardId));
        setWards(wards.filter(ward => ward.id !== wardId));
        toast.success('Ward deleted successfully');
      } catch (error) {
        console.error('Error deleting ward:', error);
        toast.error('Failed to delete ward');
      }
    }
  };

  if (loading && wards.length === 0) {
    return (
      <ProtectedPage requiredRole="admin">
        <NavBar />
        <div className="p-4">Loading database configuration...</div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRole="admin">
      <NavBar />
      <div className="p-4 admin-page">
        <h2 className="text-2xl font-bold mb-6">Database Management</h2>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('wards')}
              className={`${
                activeTab === 'wards'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Wards
            </button>
            <button
              onClick={() => setActiveTab('indexes')}
              className={`${
                activeTab === 'indexes'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Indexes
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Security Rules
            </button>
          </nav>
        </div>
        
        {/* Wards Tab Content */}
        {activeTab === 'wards' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Ward Management</h3>
              <Button 
                onClick={() => setShowAddWard(!showAddWard)}
                variant={showAddWard ? "secondary" : "primary"}
                leftIcon={showAddWard ? <FiX /> : <FiPlus />}
              >
                {showAddWard ? "Cancel" : "Add New Ward"}
              </Button>
            </div>
            
            {showAddWard && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <h4 className="text-lg font-medium mb-4">
                  {editingWard ? 'Edit Ward' : 'Add New Ward'}
                </h4>
                <form onSubmit={handleWardSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Ward Name"
                      value={wardName}
                      onChange={(e) => setWardName(e.target.value)}
                      placeholder="Enter ward name"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select 
                        value={wardActive ? 'active' : 'inactive'}
                        onChange={(e) => setWardActive(e.target.value === 'active')}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={wardDescription}
                        onChange={(e) => setWardDescription(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Enter ward description"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={resetWardForm}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={loading} leftIcon={<FiSave />}>
                      {editingWard ? 'Update Ward' : 'Create Ward'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Ward Name</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {wards.map(ward => (
                    <tr key={ward.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4">{ward.wardName}</td>
                      <td className="py-3 px-4">
                        {ward.description || <span className="text-gray-500 dark:text-gray-400">No description</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          ward.active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {ward.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEditWard(ward)}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit Ward"
                          >
                            <FiEdit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWard(ward.id)}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Ward"
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {wards.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
                        No wards found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Indexes Tab Content */}
        {activeTab === 'indexes' && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Database Indexes</h3>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Indexes are configured in the Firebase console. They help improve query performance by allowing Firebase to pre-sort data.
              </p>
              
              <h4 className="font-medium text-lg mb-2">Recommended Indexes</h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border dark:border-gray-700 rounded-lg mb-4">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Collection</th>
                      <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Fields</th>
                      <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Query Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b dark:border-gray-600">wardForms</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">wardId (ASC), date (DESC), shift (ASC)</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">Filter forms by ward and sort by date</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b dark:border-gray-600">wardForms</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">createdBy (ASC), date (DESC), status (ASC)</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">Show user's forms sorted by date</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b dark:border-gray-600">wardForms</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">status (ASC), date (DESC), wardId (ASC)</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">Filter by status and sort by date</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b dark:border-gray-600">approvals</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">wardId (ASC), date (DESC)</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">Show approvals by ward</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b dark:border-gray-600">systemLogs</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">type (ASC), createdAt (DESC)</td>
                      <td className="py-2 px-4 border-b dark:border-gray-600">Filter logs by type</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4">
                <Button 
                  onClick={() => window.open('https://console.firebase.google.com/project/_/firestore/indexes', '_blank')}
                  variant="primary"
                >
                  Open Firebase Console
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Security Rules Tab Content */}
        {activeTab === 'security' && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Security Rules</h3>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Security rules define who can read and write data in your Firebase database. The following are the recommended security rules for this application.
              </p>
              
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto mb-4">
                <pre className="text-sm text-gray-800 dark:text-gray-200">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ฟังก์ชันตรวจสอบการยืนยันตัวตน
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // ฟังก์ชันตรวจสอบว่าเป็น admin หรือไม่
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // กำหนดกฎสำหรับ Collection users
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
      allow update: if request.auth.uid == userId && 
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastActiveTime']);
    }
    
    // กำหนดกฎสำหรับ Collection wardForms
    match /wardForms/{formId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (resource.data.createdBy == request.auth.uid || isAdmin());
      allow delete: if isAdmin();
    }
    
    // กำหนดกฎสำหรับ Collection wards
    match /wards/{wardId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // กำหนดกฎสำหรับ Collection systemLogs
    match /systemLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
  }
}`}
                </pre>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Warning:</strong> During development, you might be using less restrictive rules. Make sure to update your security rules before deploying to production.
              </p>
              
              <div className="mt-4">
                <Button 
                  onClick={() => window.open('https://console.firebase.google.com/project/_/firestore/rules', '_blank')}
                  variant="primary"
                >
                  Open Firebase Rules Console
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
} 