'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/features/auth';
import { Ward } from '@/app/core/types/ward';
import { getWardsByUserPermission } from './services/wardService';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { Button, Input } from '@/app/core/ui';
import { format } from 'date-fns';
import { showErrorToast, showSuccessToast, showSafeToast } from '@/app/core/utils/toastUtils';
import { logUserActivity } from '@/app/core/utils/logUtils';
import { useLoading } from '@/app/core/hooks/useLoading';
import { FiSave, FiCheckSquare } from 'react-icons/fi';

// Import Hooks
import { useWardFormData } from './hooks/useWardFormData';
import { useShiftManagement } from './hooks/useShiftManagement';
import { useFormPersistence } from './hooks/useFormPersistence';

// Import Components
import ShiftSelection from './components/ShiftSelection';
import CensusInputFields from './components/CensusInputFields';
import RecorderInfo from './components/RecorderInfo';
import ConfirmSaveModal from './components/ConfirmSaveModal';
import DraftNotification from './components/DraftNotification';

// Import FormStatus correctly
import { ShiftType, FormStatus, WardForm } from '@/app/core/types/ward';
import { getShiftStatusesForDay } from './services/wardFormService';

export default function DailyCensusForm() {
  const { user: currentUser } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isWardLoading, setIsWardLoading] = useState(false);
  const [reloadDataTrigger, setReloadDataTrigger] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // --- NEW State for Actual Shift Statuses ---
  const [actualMorningStatus, setActualMorningStatus] = useState<FormStatus | null>(null);
  const [actualNightStatus, setActualNightStatus] = useState<FormStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  // Load wards once
  useEffect(() => {
    const loadWards = async () => {
      if (!currentUser) return;
      setIsWardLoading(true);
      try {
        const userWards = await getWardsByUserPermission(currentUser);
        setWards(userWards);
        if (userWards.length > 0 && !selectedWard) {
          // Find the first ward that has a business wardId and set it
          const firstValidWard = userWards.find(w => w.wardId);
          if (firstValidWard) {
              setSelectedWard(firstValidWard.id);
              console.log("[DailyCensusForm] Auto-selected first valid ward:", firstValidWard.id, "Business ID:", firstValidWard.wardId);
          } else {
              console.warn("[DailyCensusForm] No valid wards with business wardId found.");
          }
        }
      } catch (error) {
        console.error("Error loading wards:", error);
        showErrorToast('ไม่สามารถโหลดข้อมูลวอร์ดได้');
      } finally {
        setIsWardLoading(false);
      }
    };
    loadWards();
  }, [currentUser]);

  // Find the full ward object and business ID
  const selectedWardObject = wards.find(w => w.id === selectedWard);
  const selectedBusinessWardId = selectedWardObject?.wardId || ''; 
  // Log when selectedBusinessWardId changes
  useEffect(() => {
    console.log("[DailyCensusForm] selectedBusinessWardId updated:", selectedBusinessWardId);
  }, [selectedBusinessWardId]);

  // --- NEW Effect to Fetch Shift Statuses ---
  useEffect(() => {
    // Only run if we have a business ward ID and a date
    if (!selectedBusinessWardId || !selectedDate) {
      console.log("[DailyCensusForm FetchStatus] Skipping status fetch: Missing business Ward ID or Date.");
      setActualMorningStatus(null); // Reset statuses if selection is invalid
      setActualNightStatus(null);
      return;
    }

    const fetchStatuses = async () => {
      console.log(`[DailyCensusForm FetchStatus] Fetching statuses for Business Ward ID: ${selectedBusinessWardId}, Date: ${selectedDate}`);
      setIsStatusLoading(true);
      try {
        const targetDate = new Date(selectedDate + 'T00:00:00');
        // Log before calling the service
        console.log(`[DailyCensusForm FetchStatus] Calling getShiftStatusesForDay with date: ${targetDate.toISOString()}, businessWardId: ${selectedBusinessWardId}`);
        const { morningStatus, nightStatus } = await getShiftStatusesForDay(targetDate, selectedBusinessWardId);
        // Log the raw result from the service
        console.log(`[DailyCensusForm FetchStatus] Raw result from getShiftStatusesForDay - Morning: ${morningStatus}, Night: ${nightStatus}`);
        setActualMorningStatus(morningStatus);
        setActualNightStatus(nightStatus);
        // Log after attempting to set state (to confirm the values set)
        console.log(`[DailyCensusForm FetchStatus] State update attempt - Morning: ${morningStatus}, Night: ${nightStatus}`);
      } catch (error) {
        console.error("[DailyCensusForm FetchStatus] Error fetching shift statuses:", error);
        showErrorToast('เกิดข้อผิดพลาดในการโหลดสถานะกะ');
        setActualMorningStatus(null); // Reset on error
        setActualNightStatus(null);
      } finally {
        setIsStatusLoading(false);
      }
    };

    fetchStatuses();
  }, [selectedBusinessWardId, selectedDate, reloadDataTrigger]); // Depend on business ID, date, and reload trigger (only status fetch)

  // Determine shift selection and disabled state using current statuses
  const {
    selectedShift,
    isMorningShiftDisabled,
    isNightShiftDisabled,
    handleSelectShift,
  } = useShiftManagement({
    morningStatus: actualMorningStatus,
    nightStatus: actualNightStatus,
  });

  // Auto-refresh shift statuses when window gains focus (e.g., after admin approval in another tab)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[DailyCensusForm] Window focused, refreshing shift statuses');
      setReloadDataTrigger(prev => prev + 1);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Auto-select shift for rejected form after statuses load
  useEffect(() => {
    if (actualMorningStatus === FormStatus.REJECTED && selectedShift !== ShiftType.MORNING) {
      console.log('[DailyCensusForm] Detected rejected morning shift, auto-switching to MORNING');
      handleSelectShift(ShiftType.MORNING);
    } else if (actualNightStatus === FormStatus.REJECTED && selectedShift !== ShiftType.NIGHT) {
      console.log('[DailyCensusForm] Detected rejected night shift, auto-switching to NIGHT');
      handleSelectShift(ShiftType.NIGHT);
    }
  }, [actualMorningStatus, actualNightStatus, selectedShift, handleSelectShift]);

  // Auto-select night shift after morning is approved
  useEffect(() => {
    if (
      actualMorningStatus === FormStatus.APPROVED &&
      selectedShift === ShiftType.MORNING &&
      !isNightShiftDisabled
    ) {
      console.log('[DailyCensusForm] Morning approved, auto-switching to night shift');
      handleSelectShift(ShiftType.NIGHT);
    }
  }, [actualMorningStatus, selectedShift, isNightShiftDisabled, handleSelectShift]);

  // Get values and functions directly from useWardFormData
  const {
    formData,
    error: dataError,
    handleChange,
    isFormReadOnly, // This reflects the loaded data for the *selected* shift
    isMorningCensusReadOnly,
    isCensusAutoCalculated,
    isDraftLoaded,
    isFinalDataFound,
    errors,
    handleSaveDraft,
    handleSaveFinal,
    isLoading: isDataLoading,
    isSaving: isFormSaving,
    isFormDirty,
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
    proceedToSaveDraft,
    setIsFormReadOnly,
  } = useWardFormData({
      selectedWard,
      selectedBusinessWardId,
      selectedDate,
      selectedShift,
      user: currentUser,
      reloadDataTrigger
  });

  // Auto-select shift for a rejected form based on loaded formData.shift
  useEffect(() => {
    if (formData.status === FormStatus.REJECTED && formData.shift) {
      console.log('[DailyCensusForm] Detected rejected form, switching to shift:', formData.shift);
      handleSelectShift(formData.shift as ShiftType);
    }
  }, [formData.status, formData.shift, handleSelectShift]);

  // Wrapper function for handleSaveDraft to match onClick signature; only run when form is dirty
  const triggerSaveDraft = async () => {
    if (!isFormDirty) return;
    // Preview draft save
    const summaryDraft =
      `Ward: ${selectedWardObject?.wardName}\nDate: ${selectedDate}\nShift: ${selectedShift}\nPatient Census: ${formData.patientCensus || ''}`;
    if (!window.confirm(`Preview Save Draft:\n${summaryDraft}\n\nConfirm save draft?`)) return;
    // Log user activity
    logUserActivity(
      currentUser?.uid || '',
      currentUser?.username || currentUser?.displayName || '',
      'save_draft',
      { wardId: selectedWard, date: selectedDate, shift: selectedShift }
    );
    // Perform draft save without reloading data (state updated in hook)
    await handleSaveDraft();
    // After saving draft, re-trigger data load to populate saved draft
    setReloadDataTrigger(prev => prev + 1);
  };

  // Wrapper function for handleSaveFinal; only run when form is dirty
  const triggerSaveFinal = () => {
    if (!isFormDirty && !isDraftLoaded) return;
    // Preview final save
    const summaryFinal =
      `Ward: ${selectedWardObject?.wardName}\nDate: ${selectedDate}\nShift: ${selectedShift}\nPatient Census: ${formData.patientCensus || ''}`;
    if (!window.confirm(`Preview Save Final:\n${summaryFinal}\n\nConfirm save final?`)) return;
    
    console.log('[DailyCensusForm] Final Save triggered with form data:', formData);
    
    // Log user activity
    logUserActivity(
      currentUser?.uid || '',
      currentUser?.username || currentUser?.displayName || '',
      'save_final',
      { wardId: selectedWard, date: selectedDate, shift: selectedShift }
    );
    // Perform final save and update shift status without reloading form
    handleSaveFinal().then((savedDocId) => {
      console.log('[DailyCensusForm] Final Save completed, document ID:', savedDocId);
      if (selectedShift === ShiftType.MORNING) {
        setActualMorningStatus(FormStatus.FINAL);
        console.log('[DailyCensusForm] Updated Morning shift status to FINAL');
      } else {
        setActualNightStatus(FormStatus.FINAL);
        console.log('[DailyCensusForm] Updated Night shift status to FINAL');
      }
      // No automatic reload to preserve displayed final data
      });
  };

  // Combine loading states from different hooks
  // Now includes status loading
  const isLoading = isWardLoading || isStatusLoading || isDataLoading;
  // const isSaving = isFormSaving; // Directly use isFormSaving

  // Log the value of isFormReadOnly for debugging
  console.log('[DailyCensusForm] isFormReadOnly =', isFormReadOnly, 'for shift =', selectedShift, 'morning status =', actualMorningStatus, 'night status =', actualNightStatus);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWard(e.target.value);
    // Reset statuses immediately when ward changes to avoid showing stale status
    setActualMorningStatus(null);
    setActualNightStatus(null);
  };

  // Combine overall page loading state
  const isPageLoading = isWardLoading || isStatusLoading; // isDataLoading is handled within the form area

  // --- Determine button disabled states based on new logic ---
  // Combine form read-only state with saving state for general disabling
  const isFormLocked = isFormReadOnly || isFormSaving;

  // Disable actions only if current shift is approved
  const isActionDisabledBasedOnApproval = selectedShift === ShiftType.MORNING
      ? actualMorningStatus === FormStatus.APPROVED
      : actualNightStatus === FormStatus.APPROVED;

  // Final Save button disabled if no changes and no existing draft, form locked, or *either* shift is approved
  const saveFinalDisabled = 
      isFormLocked || // Disable if form is read-only or saving
      isActionDisabledBasedOnApproval; // Disable if the current shift is already approved

  // Save Draft button disabled if no changes, form locked, or *either* shift is approved.
  const saveDraftDisabled = 
      !isFormDirty ||
      isFormLocked ||
      isActionDisabledBasedOnApproval;

  // Render UI
  return (
    <ProtectedPage requiredRole={['nurse', 'user', 'admin', 'developer']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">บันทึกข้อมูล</h1>

          {isPageLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span>Loading Ward/Status...</span> {/* Added text */} 
            </div>
          ) : (
            <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              {/* Ward and Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                  <label htmlFor="ward" className="form-label">หอผู้ป่วย (Ward)</label>
                <select
                    id="ward"
                    name="ward"
                    value={selectedWard}
                    onChange={handleWardChange}
                    className="form-input"
                    disabled={isFormLocked} // <<< Disable Ward select when form is locked
                  >
                    <option value="" disabled>-- เลือกหอผู้ป่วย --</option>
                  {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>{ward.wardName}</option>
                  ))}
                </select>
                </div>
                    <div>
                  <label htmlFor="date" className="form-label">วันที่ (Date)</label>
                  <Input
                    type="date"
                    id="date"
                    name="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="form-input"
                    disabled={isFormSaving} // <<< ONLY disable Date when actively saving
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              
              {/* Remove Draft Notification Component - Notifications handled via Toast in hook */} 
              
              {/* Shift Selection Component - Pass actual statuses */}
               <ShiftSelection
                 selectedShift={selectedShift}
                 onSelectShift={handleSelectShift}
                 morningShiftStatus={actualMorningStatus}
                 nightShiftStatus={actualNightStatus}
                 isMorningShiftDisabled={isMorningShiftDisabled || isFormSaving}
                 isNightShiftDisabled={isNightShiftDisabled || isFormSaving}
               />

               {/* Show data loading indicator within the form area */} 
               {isDataLoading && (
                   <div className="flex justify-center items-center h-32">
                       <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                       <span>Loading form data...</span>
                   </div>
               )}

              {/* Census Input Fields Component */} 
              <CensusInputFields
                formData={formData}
                handleChange={handleChange}
                errors={errors}
                isReadOnly={isFormLocked} // <<< Pass isFormLocked to make inputs read-only
                selectedShift={selectedShift}
                isMorningCensusReadOnly={isMorningCensusReadOnly}
                isCensusAutoCalculated={isCensusAutoCalculated}
                isDraftLoaded={isDraftLoaded}
              />

              {/* Recorder Info Component */} 
              <RecorderInfo
                firstName={formData.recorderFirstName || ''}
                lastName={formData.recorderLastName || ''}
                handleChange={handleChange}
                errors={errors}
                isReadOnly={isFormLocked} // <<< Pass isFormLocked to make inputs read-only
                isDraftLoaded={isDraftLoaded}
              />

              {/* Action Buttons */} 
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <Button
                  type="button"
                  variant="outline" 
                  onClick={triggerSaveDraft}
                  disabled={saveDraftDisabled} // <<< Use calculated saveDraftDisabled
                  isLoading={isFormSaving}
                >
                  <FiSave className="mr-2" />
                  บันทึกร่าง (Save Draft)
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={triggerSaveFinal}
                  disabled={saveFinalDisabled} // <<< Use calculated saveFinalDisabled
                  isLoading={isFormSaving}
                >
                  <FiCheckSquare className="mr-2" />
                  บันทึกสมบูรณ์ (Save Final)
                </Button>
              </div>

              {/* Validation Errors (optional) */} 
              {/* ... */} 
            </form>
          )}

        </div>
        
        {/* Confirmation modal */} 
        <ConfirmSaveModal
          isOpen={showConfirmOverwriteModal}
          onClose={() => setShowConfirmOverwriteModal(false)} // Close action
          onConfirm={proceedToSaveDraft} // Confirm action calls the saving function
          formData={formData} // Pass current form data to display in modal
          isSaving={isFormSaving} // Pass saving state for button loading indicator
        />
      </div>
    </ProtectedPage>
  );
}
