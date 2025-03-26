'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiCheck, FiLoader, FiAlertTriangle } from 'react-icons/fi';

interface WardData {
  id: string;
  ward: string;
  date: string;
  shift: 'morning' | 'night';
  patientCensus: number;
  nurseManager: number;
  rn: number;
  pn: number;
  wc: number;
  newAdmit: number;
  transferIn: number;
  referIn: number;
  transferOut: number;
  referOut: number;
  discharge: number;
  dead: number;
  available: number;
  unavailable: number;
  plannedDischarge: number;
  comment: string;
  firstName: string;
  lastName: string;
  status: 'draft' | 'final';
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp;
  supervisorFirstName?: string;
  supervisorLastName?: string;
}

interface DailySummary {
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
  supervisorFirstName: string;
  supervisorLastName: string;
}

export default function ApprovalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wardData, setWardData] = useState<WardData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [approvalData, setApprovalData] = useState({
    firstName: '',
    lastName: ''
  });
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    opd24hr: 0,
    oldPatient: 0,
    newPatient: 0,
    admit24hr: 0,
    supervisorFirstName: '',
    supervisorLastName: ''
  });
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Fetch ward data
  useEffect(() => {
    const fetchWardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const dataRef = collection(db, 'wardData');
        
        // Different query based on user role
        let q;
        if (user.role === 'admin') {
          // Admins see all wards
          q = query(
            dataRef,
            where('date', '==', selectedDate),
            where('status', '==', 'final'),
            orderBy('ward'),
            orderBy('shift')
          );
        } else {
          // Users only see their wards
          q = query(
            dataRef,
            where('date', '==', selectedDate),
            where('status', '==', 'final'),
            where('ward', 'in', user.wards || []),
            orderBy('shift')
          );
        }
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WardData[];
        
        setWardData(data);
        
        // Check if should show daily summary option
        const morningShifts = data.filter(d => d.shift === 'morning');
        const nightShifts = data.filter(d => d.shift === 'night');
        
        // If all shifts for the day are approved, show daily summary option
        if (morningShifts.length > 0 && nightShifts.length > 0) {
          const allApproved = [...morningShifts, ...nightShifts].every(shift => shift.isApproved);
          setShowDailySummary(allApproved);
        } else {
          setShowDailySummary(false);
        }
      } catch (error) {
        console.error('Error fetching ward data:', error);
        toast.error('Error loading approval data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWardData();
  }, [user, selectedDate]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Handle edit click
  const handleEditClick = (id: string) => {
    if (!user || user.role !== 'admin') {
      toast.error('Only administrators can edit records');
      return;
    }
    
    setEditingId(id);
    setSupervisorPassword('');
  };

  // Handle approval click
  const handleApprovalClick = (id: string) => {
    if (!user || user.role !== 'admin') {
      toast.error('Only administrators can approve records');
      return;
    }
    
    setApprovingId(id);
    setApprovalData({
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    });
  };

  // Verify supervisor password
  const handleVerifyPassword = async () => {
    try {
      // In a real app, use a secure way to verify admin password
      // This is just a placeholder - you should implement a proper secure authentication
      if (supervisorPassword !== 'admin123') {
        toast.error('Invalid supervisor password');
        return;
      }
      
      // Password verified, redirect to ward form with the record ID
      if (editingId) {
        router.push(`/wardform?edit=${editingId}`);
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      toast.error('Error verifying supervisor credentials');
    } finally {
      setEditingId(null);
      setSupervisorPassword('');
    }
  };

  // Handle approval submission
  const handleApproval = async () => {
    if (!approvingId) return;
    
    if (!approvalData.firstName || !approvalData.lastName) {
      toast.error('Please enter your first and last name');
      return;
    }
    
    try {
      setLoading(true);
      
      // Update the record with approval information
      await updateDoc(doc(db, 'wardData', approvingId), {
        isApproved: true,
        approvedBy: user?.uid || '',
        approvedAt: Timestamp.now(),
        supervisorFirstName: approvalData.firstName,
        supervisorLastName: approvalData.lastName
      });
      
      toast.success('Record approved successfully');
      
      // Refresh data
      const updatedData = wardData.map(item => {
        if (item.id === approvingId) {
          return {
            ...item,
            isApproved: true,
            supervisorFirstName: approvalData.firstName,
            supervisorLastName: approvalData.lastName
          };
        }
        return item;
      });
      
      setWardData(updatedData);
      
      // Check if all data is approved for the day
      const morningShifts = updatedData.filter(d => d.shift === 'morning');
      const nightShifts = updatedData.filter(d => d.shift === 'night');
      
      if (morningShifts.length > 0 && nightShifts.length > 0) {
        const allApproved = [...morningShifts, ...nightShifts].every(shift => shift.isApproved);
        setShowDailySummary(allApproved);
      }
    } catch (error) {
      console.error('Error approving record:', error);
      toast.error('Error approving record');
    } finally {
      setApprovingId(null);
      setApprovalData({
        firstName: '',
        lastName: ''
      });
      setLoading(false);
    }
  };

  // Handle daily summary submission
  const handleDailySummarySubmit = async () => {
    if (!dailySummary.supervisorFirstName || !dailySummary.supervisorLastName) {
      toast.error('Please enter supervisor name');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create daily summary record
      await setDoc(doc(db, 'dailySummaries', selectedDate), {
        date: selectedDate,
        ...dailySummary,
        createdBy: user?.uid || '',
        createdAt: Timestamp.now()
      });
      
      toast.success('Daily summary submitted successfully');
      setShowDailySummary(false);
    } catch (error) {
      console.error('Error submitting daily summary:', error);
      toast.error('Error submitting daily summary');
    } finally {
      setLoading(false);
    }
  };

  // Group ward data by ward
  const groupedData = wardData.reduce((groups, item) => {
    const ward = item.ward;
    if (!groups[ward]) {
      groups[ward] = [];
    }
    groups[ward].push(item);
    return groups;
  }, {} as Record<string, WardData[]>);

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, router, loading]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center">
          <h1 className="text-2xl font-bold">Approval Dashboard</h1>
          <div className="flex items-center space-x-4">
            <label htmlFor="date-select" className="text-sm font-medium text-white">
              Select Date:
            </label>
            <input
              type="date"
              id="date-select"
              className="rounded-md border-gray-300 shadow-sm text-gray-900 sm:text-sm"
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <FiLoader className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : wardData.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-lg text-center">
              <FiAlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">No data available</h3>
              <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                No finalized ward data found for this date. Please finalize ward data before approval.
              </p>
            </div>
          ) : (
            <>
              {Object.entries(groupedData).map(([ward, items]) => (
                <div key={ward} className="mb-10">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
                    {ward}
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {items.map(item => (
                      <div 
                        key={item.id} 
                        className={`border rounded-lg overflow-hidden ${
                          item.isApproved 
                            ? 'border-green-300 dark:border-green-700' 
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <div className={`px-4 py-3 ${
                          item.isApproved 
                            ? 'bg-green-50 dark:bg-green-900/30' 
                            : 'bg-gray-50 dark:bg-gray-700'
                        } flex justify-between items-center`}>
                          <h3 className="font-medium">
                            {item.shift === 'morning' ? 'Morning Shift' : 'Night Shift'}
                            {item.isApproved && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <FiCheck className="mr-1" />
                                Approved
                              </span>
                            )}
                          </h3>
                          <div className="flex space-x-2">
                            {user?.role === 'admin' && !item.isApproved && (
                              <>
                                <button
                                  onClick={() => handleEditClick(item.id)}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Edit"
                                >
                                  <FiEdit2 className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleApprovalClick(item.id)}
                                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                  title="Approve"
                                >
                                  <FiCheck className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Patient Census</p>
                              <p className="font-medium">{item.patientCensus}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Nurse Manager</p>
                              <p className="font-medium">{item.nurseManager}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">RN</p>
                              <p className="font-medium">{item.rn}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">PN</p>
                              <p className="font-medium">{item.pn}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">WC</p>
                              <p className="font-medium">{item.wc}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">New Admit</p>
                              <p className="font-medium">{item.newAdmit}</p>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Recorder</p>
                            <p className="font-medium">{item.firstName} {item.lastName}</p>
                          </div>
                          
                          {item.isApproved && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500 dark:text-gray-400">Approved by</p>
                              <p className="font-medium">{item.supervisorFirstName} {item.supervisorLastName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {showDailySummary && (
                <div className="mt-10 border-t pt-8">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
                    24-Hour Summary Data
                  </h2>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div>
                        <label htmlFor="opd24hr" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          OPD 24hr
                        </label>
                        <input
                          type="number"
                          id="opd24hr"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                          value={dailySummary.opd24hr}
                          onChange={(e) => setDailySummary({...dailySummary, opd24hr: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <label htmlFor="oldPatient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Old Patient
                        </label>
                        <input
                          type="number"
                          id="oldPatient"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                          value={dailySummary.oldPatient}
                          onChange={(e) => setDailySummary({...dailySummary, oldPatient: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <label htmlFor="newPatient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          New Patient
                        </label>
                        <input
                          type="number"
                          id="newPatient"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                          value={dailySummary.newPatient}
                          onChange={(e) => setDailySummary({...dailySummary, newPatient: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <label htmlFor="admit24hr" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Admit 24hr
                        </label>
                        <input
                          type="number"
                          id="admit24hr"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                          value={dailySummary.admit24hr}
                          onChange={(e) => setDailySummary({...dailySummary, admit24hr: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                        Supervisor Signature
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="supervisorFirstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            First Name
                          </label>
                          <input
                            type="text"
                            id="supervisorFirstName"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            value={dailySummary.supervisorFirstName}
                            onChange={(e) => setDailySummary({...dailySummary, supervisorFirstName: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="supervisorLastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="supervisorLastName"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            value={dailySummary.supervisorLastName}
                            onChange={(e) => setDailySummary({...dailySummary, supervisorLastName: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleDailySummarySubmit}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={loading}
                      >
                        {loading ? 'Submitting...' : 'Submit 24-Hour Summary'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Edit Confirmation Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Supervisor Authentication
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please enter your supervisor password to edit this record.
            </p>
            <div className="mb-6">
              <label htmlFor="supervisor-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supervisor Password
              </label>
              <input
                type="password"
                id="supervisor-password"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={supervisorPassword}
                onChange={(e) => setSupervisorPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleVerifyPassword}
              >
                Verify & Edit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Approval Modal */}
      {approvingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Approve Record
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please enter your name to approve this record.
            </p>
            <div className="mb-4">
              <label htmlFor="supervisor-firstname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="supervisor-firstname"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={approvalData.firstName}
                onChange={(e) => setApprovalData({...approvalData, firstName: e.target.value})}
              />
            </div>
            <div className="mb-6">
              <label htmlFor="supervisor-lastname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="supervisor-lastname"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={approvalData.lastName}
                onChange={(e) => setApprovalData({...approvalData, lastName: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                onClick={() => setApprovingId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={handleApproval}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 