'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import DatePicker from '@/app/components/wardForm/DatePicker';
import ShiftSelector from '@/app/components/wardForm/ShiftSelector';
import WardSelector from '@/app/components/wardForm/WardSelector';
import NumberInput from '@/app/components/wardForm/NumberInput';
import { toast } from 'react-hot-toast';

export default function WardFormPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedShift, setSelectedShift] = useState<'morning' | 'night'>(
    getDefaultShift()
  );
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [formData, setFormData] = useState({
    patientCensus: 0,
    nurseManager: 0,
    rn: 0,
    pn: 0,
    wc: 0,
    newAdmit: 0,
    transferIn: 0,
    referIn: 0,
    transferOut: 0,
    referOut: 0,
    discharge: 0,
    dead: 0,
    available: 0,
    unavailable: 0,
    plannedDischarge: 0,
    comment: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [saveType, setSaveType] = useState<'draft' | 'final' | null>(null);
  const [hasFormError, setHasFormError] = useState(false);
  const [hasPreviousDayData, setHasPreviousDayData] = useState(false);
  const [hasMorningShiftData, setHasMorningShiftData] = useState(false);
  const [hasMorningShiftApproved, setHasMorningShiftApproved] = useState(false);
  const [morningDataFinalized, setMorningDataFinalized] = useState(false);
  const [disablePatientCensus, setDisablePatientCensus] = useState(false);
  const [previousPatientCensus, setPreviousPatientCensus] = useState<number | null>(null);

  // Set default user info
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      }));
      
      // If user has assigned wards, set the first one as default
      if (user.wards && user.wards.length > 0) {
        setSelectedWard(user.wards[0]);
      }
    }
  }, [user]);

  // Get default shift based on current time
  function getDefaultShift(): 'morning' | 'night' {
    const currentHour = new Date().getHours();
    return (currentHour >= 7 && currentHour < 19) ? 'morning' : 'night';
  }

  // Check if previous day's night shift data exists
  useEffect(() => {
    const checkPreviousDayData = async () => {
      if (!selectedWard) return;
      
      try {
        setLoading(true);
        
        // Calculate previous day
        const prevDay = new Date(selectedDate);
        prevDay.setDate(prevDay.getDate() - 1);
        
        // Check for previous day's night shift data
        const previousDataRef = collection(db, 'wardData');
        const previousDataQuery = query(
          previousDataRef,
          where('ward', '==', selectedWard),
          where('date', '==', prevDay.toISOString().split('T')[0]),
          where('shift', '==', 'night'),
          where('isApproved', '==', true)
        );
        
        const previousDataSnapshot = await getDocs(previousDataQuery);
        
        if (!previousDataSnapshot.empty) {
          setHasPreviousDayData(true);
          const prevData = previousDataSnapshot.docs[0].data();
          setPreviousPatientCensus(prevData.patientCensus || 0);
          
          // If it's morning shift, automatically set patient census from previous night
          if (selectedShift === 'morning') {
            setFormData(prev => ({
              ...prev,
              patientCensus: prevData.patientCensus || 0
            }));
            setDisablePatientCensus(true);
          }
        } else {
          setHasPreviousDayData(false);
          setPreviousPatientCensus(null);
          setDisablePatientCensus(false);
        }
        
        // Check for current day's morning shift data if night shift is selected
        if (selectedShift === 'night') {
          const morningDataRef = collection(db, 'wardData');
          const morningDataQuery = query(
            morningDataRef,
            where('ward', '==', selectedWard),
            where('date', '==', selectedDate.toISOString().split('T')[0]),
            where('shift', '==', 'morning')
          );
          
          const morningDataSnapshot = await getDocs(morningDataQuery);
          
          if (!morningDataSnapshot.empty) {
            setHasMorningShiftData(true);
            const morningData = morningDataSnapshot.docs[0].data();
            setMorningDataFinalized(morningData.status === 'final');
            setMorningShiftApproved(morningData.isApproved || false);
            
            // If morning shift approved, set patient census for night shift
            if (morningData.isApproved) {
              setFormData(prev => ({
                ...prev,
                patientCensus: morningData.patientCensus || 0
              }));
              setDisablePatientCensus(true);
            }
          } else {
            setHasMorningShiftData(false);
            setMorningDataFinalized(false);
            setMorningShiftApproved(false);
            setDisablePatientCensus(false);
          }
        }
      } catch (error) {
        console.error('Error checking previous data:', error);
        toast.error('Error checking previous data');
      } finally {
        setLoading(false);
      }
    };
    
    checkPreviousDayData();
  }, [selectedDate, selectedShift, selectedWard]);

  // Handle shift change
  const handleShiftChange = (shift: 'morning' | 'night') => {
    if (morningDataFinalized && shift === 'morning') {
      toast.error('Morning shift data has been finalized and cannot be modified');
      return;
    }
    
    if (shift === 'night' && !morningShiftApproved) {
      toast.error('Morning shift must be approved before entering night shift data');
      return;
    }
    
    setSelectedShift(shift);
    
    // Reset form data except user info when changing shifts
    setFormData(prev => ({
      patientCensus: 0,
      nurseManager: 0,
      rn: 0,
      pn: 0,
      wc: 0,
      newAdmit: 0,
      transferIn: 0,
      referIn: 0,
      transferOut: 0,
      referOut: 0,
      discharge: 0,
      dead: 0,
      available: 0,
      unavailable: 0,
      plannedDischarge: 0,
      comment: '',
      firstName: prev.firstName,
      lastName: prev.lastName
    }));
  };

  // Calculate patient census for morning shift
  const calculatePatientCensus = () => {
    if (selectedShift === 'morning' && hasPreviousDayData && previousPatientCensus !== null) {
      const { newAdmit, transferIn, referIn, transferOut, referOut, discharge, dead } = formData;
      const newCensus = previousPatientCensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
      
      setFormData(prev => ({
        ...prev,
        patientCensus: newCensus
      }));
    }
  };

  // Effect to calculate patient census when relevant fields change
  useEffect(() => {
    if (selectedShift === 'morning' && !disablePatientCensus) {
      calculatePatientCensus();
    }
  }, [
    formData.newAdmit,
    formData.transferIn,
    formData.referIn,
    formData.transferOut,
    formData.referOut,
    formData.discharge,
    formData.dead
  ]);

  // Handle input change
  const handleInputChange = (name: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Check if form is valid
  const validateForm = () => {
    const requiredFields = [
      'nurseManager',
      'rn',
      'pn',
      'wc',
      'firstName',
      'lastName'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !formData[field as keyof typeof formData]
    );
    
    if (missingFields.length > 0) {
      setHasFormError(true);
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      // Focus the first missing field
      const firstMissingField = document.getElementById(missingFields[0]);
      if (firstMissingField) {
        firstMissingField.focus();
      }
      return false;
    }
    
    if (!selectedWard) {
      toast.error('Please select a ward');
      return false;
    }
    
    setHasFormError(false);
    return true;
  };

  // Handle form submission
  const handleSubmit = async (type: 'draft' | 'final') => {
    setSaveType(type);
    
    if (type === 'final' && !validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Check for existing data
      const dataRef = collection(db, 'wardData');
      const dataQuery = query(
        dataRef,
        where('ward', '==', selectedWard),
        where('date', '==', selectedDate.toISOString().split('T')[0]),
        where('shift', '==', selectedShift)
      );
      
      const dataSnapshot = await getDocs(dataQuery);
      
      // If draft exists and trying to save a new draft, ask for confirmation
      if (!dataSnapshot.empty && type === 'draft') {
        const existingData = dataSnapshot.docs[0].data();
        if (existingData.status === 'draft') {
          if (!window.confirm('A draft already exists. Do you want to overwrite it?')) {
            setLoading(false);
            return;
          }
        }
      }
      
      // If data is already finalized, prevent saving
      if (!dataSnapshot.empty) {
        const existingData = dataSnapshot.docs[0].data();
        if (existingData.status === 'final') {
          toast.error('This data has already been finalized and cannot be modified');
          setLoading(false);
          return;
        }
      }
      
      // Prepare data for saving
      const dataToSave = {
        ward: selectedWard,
        date: selectedDate.toISOString().split('T')[0],
        shift: selectedShift,
        ...formData,
        status: type,
        createdBy: user?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isApproved: false
      };
      
      // Save data
      const docId = dataSnapshot.empty 
        ? `${selectedWard}_${selectedDate.toISOString().split('T')[0]}_${selectedShift}`
        : dataSnapshot.docs[0].id;
      
      await setDoc(doc(db, 'wardData', docId), dataToSave);
      
      toast.success(`Data ${type === 'draft' ? 'saved as draft' : 'finalized'} successfully`);
      
      // If final, disable form
      if (type === 'final') {
        if (selectedShift === 'morning') {
          setMorningDataFinalized(true);
        }
      }
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Error saving data');
    } finally {
      setLoading(false);
      setSaveType(null);
    }
  };

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
    <div className="max-w-6xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 text-white">
          <h1 className="text-2xl font-bold">Ward Data Entry Form</h1>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <WardSelector 
              selectedWard={selectedWard}
              onChange={setSelectedWard}
              userWards={user?.wards || []}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <DatePicker 
              selectedDate={selectedDate}
              onChange={setSelectedDate}
              disabled={loading || morningDataFinalized || (selectedShift === 'night' && morningDataFinalized)}
            />
            
            <ShiftSelector 
              selectedShift={selectedShift}
              onChange={handleShiftChange}
              disableMorning={morningDataFinalized}
              disableNight={!morningShiftApproved}
            />
          </div>
          
          {hasPreviousDayData && selectedShift === 'morning' && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md mb-6">
              <p className="text-blue-800 dark:text-blue-200">
                Previous day's night shift data found. Patient census from previous shift: {previousPatientCensus}
              </p>
            </div>
          )}
          
          {selectedShift === 'night' && !hasMorningShiftData && (
            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-md mb-6">
              <p className="text-amber-800 dark:text-amber-200">
                Warning: Morning shift data for this day has not been entered yet. Please complete morning shift data first.
              </p>
            </div>
          )}
          
          {selectedShift === 'night' && hasMorningShiftData && !morningShiftApproved && (
            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-md mb-6">
              <p className="text-amber-800 dark:text-amber-200">
                Warning: Morning shift data has not been approved yet. Please contact a supervisor.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NumberInput
              id="patientCensus"
              label="Patient Census"
              value={formData.patientCensus}
              onChange={(value) => handleInputChange('patientCensus', value)}
              disabled={loading || disablePatientCensus || (selectedShift === 'morning' && morningDataFinalized)}
              required
            />
            
            <NumberInput
              id="nurseManager"
              label="Nurse Manager"
              value={formData.nurseManager}
              onChange={(value) => handleInputChange('nurseManager', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
              required
            />
            
            <NumberInput
              id="rn"
              label="RN"
              value={formData.rn}
              onChange={(value) => handleInputChange('rn', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
              required
            />
            
            <NumberInput
              id="pn"
              label="PN"
              value={formData.pn}
              onChange={(value) => handleInputChange('pn', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
              required
            />
            
            <NumberInput
              id="wc"
              label="WC"
              value={formData.wc}
              onChange={(value) => handleInputChange('wc', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
              required
            />
            
            <NumberInput
              id="newAdmit"
              label="New Admit"
              value={formData.newAdmit}
              onChange={(value) => handleInputChange('newAdmit', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="transferIn"
              label="Transfer In"
              value={formData.transferIn}
              onChange={(value) => handleInputChange('transferIn', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="referIn"
              label="Refer In"
              value={formData.referIn}
              onChange={(value) => handleInputChange('referIn', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="transferOut"
              label="Transfer Out"
              value={formData.transferOut}
              onChange={(value) => handleInputChange('transferOut', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="referOut"
              label="Refer Out"
              value={formData.referOut}
              onChange={(value) => handleInputChange('referOut', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="discharge"
              label="Discharge"
              value={formData.discharge}
              onChange={(value) => handleInputChange('discharge', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="dead"
              label="Dead"
              value={formData.dead}
              onChange={(value) => handleInputChange('dead', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="available"
              label="Available"
              value={formData.available}
              onChange={(value) => handleInputChange('available', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="unavailable"
              label="Unavailable"
              value={formData.unavailable}
              onChange={(value) => handleInputChange('unavailable', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
            
            <NumberInput
              id="plannedDischarge"
              label="Planned Discharge"
              value={formData.plannedDischarge}
              onChange={(value) => handleInputChange('plannedDischarge', value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
          </div>
          
          <div className="mt-6">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Comment
            </label>
            <textarea
              id="comment"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              value={formData.comment}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
            />
          </div>
          
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Recorded by</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                  disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                  disabled={loading || (selectedShift === 'morning' && morningDataFinalized)}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized) || saveType !== null}
            >
              {saveType === 'draft' ? (
                <span className="flex items-center">
                  {/* Spinner icon for loading state */}
                  {loading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700 dark:text-gray-200" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Saving...
                </span>
              ) : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('final')}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading || (selectedShift === 'morning' && morningDataFinalized) || saveType !== null}
            >
              {saveType === 'final' ? (
                <span className="flex items-center">
                  {/* Spinner icon for loading state */}
                  {loading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Finalizing...
                </span>
              ) : 'Save Final'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
