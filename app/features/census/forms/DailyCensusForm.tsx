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
  }, [selectedBusinessWardId, selectedDate, reloadDataTrigger]); // Depend on business ID, date, and reload trigger

  // --- Use Custom Hooks (Pass actual statuses to useShiftManagement) ---
  const {
    selectedShift,
    isMorningShiftDisabled,
    isNightShiftDisabled,
    handleSelectShift,
  } = useShiftManagement({
    // Pass the actual statuses fetched by DailyCensusForm
    morningStatus: actualMorningStatus, 
    nightStatus: actualNightStatus,
    // Optionally pass initial shift if needed, otherwise defaults to MORNING
  });

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
  } = useWardFormData({
      selectedWard, // Still needed to identify the ward document
      selectedBusinessWardId, // Crucial for loading/saving logic
      selectedDate,
      selectedShift,
      user: currentUser,
      reloadDataTrigger
  });

  // Wrapper function for handleSaveDraft to match onClick signature
  const triggerSaveDraft = () => {
      handleSaveDraft().then(() => {
          // Trigger status reload after successful save
          setReloadDataTrigger(prev => prev + 1); 
      });
  };

  // Wrapper function for handleSaveFinal
  const triggerSaveFinal = () => {
      handleSaveFinal().then(() => {
          // Trigger status reload after successful save
          setReloadDataTrigger(prev => prev + 1);
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
  // Disable actions if form is read-only (from useWardFormData), saving, or either actual shift is approved
  const isActionDisabledBasedOnStatus = 
      actualMorningStatus === FormStatus.APPROVED || 
      actualNightStatus === FormStatus.APPROVED;
      
  // Final Save button disabled if: form is read-only (current shift final/approved), saving, OR *either* shift is approved
  const saveFinalDisabled = 
      isFormReadOnly || // Check if the currently loaded form data is read-only
      isFormSaving || 
      isActionDisabledBasedOnStatus; // Check overall approval status

  // Save Draft button disabled if: saving, OR *either* shift is approved, OR form isn't dirty.
  // Allow saving draft even if form is technically read-only (e.g., showing final data) IF the user makes it dirty (requires confirmation modal handled by useWardFormData)
  const saveDraftDisabled = 
      isFormSaving || 
      isActionDisabledBasedOnStatus || // Cannot save draft if anything is approved
      !isFormDirty;

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
                    disabled={isFormSaving} // Only disable while actively saving
                  >
                    <option value="" disabled>-- เลือกหอผู้ป่วย --</option>
                  {wards.map((ward) => (
                      // Ensure key is unique and value is the document ID
                      <option key={ward.id} value={ward.id}>{ward.wardName} ({ward.wardId})</option> // Display business ID too
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
                    disabled={isFormSaving} // Only disable while actively saving
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              
              {/* Remove Draft Notification Component - Notifications handled via Toast in hook */} 
              
              {/* Shift Selection Component - Pass actual statuses */}
               <ShiftSelection
                 selectedShift={selectedShift}
                 onSelectShift={handleSelectShift}
                 morningShiftStatus={actualMorningStatus} // <<< Pass actual status
                 nightShiftStatus={actualNightStatus} // <<< Pass actual status
                 isMorningShiftDisabled={isMorningShiftDisabled || isFormSaving} // Disable based on hook logic + saving state
                 isNightShiftDisabled={isNightShiftDisabled || isFormSaving} // Disable based on hook logic + saving state
                 isFormFinalReadOnly={isFormReadOnly} // <<< เพิ่ม prop เพื่อบังคับปิดปุ่มเมื่อ form เป็น readonly
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
                // ReadOnly if the loaded form data says so, OR if actively saving
                isReadOnly={isFormReadOnly || isFormSaving} 
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
                // ReadOnly if the loaded form data says so, OR if actively saving
                isReadOnly={isFormReadOnly || isFormSaving} 
                isDraftLoaded={isDraftLoaded}
              />

              {/* Action Buttons */} 
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                <Button
                  variant="secondary"
                  onClick={triggerSaveDraft}
                  isLoading={isFormSaving && !showConfirmOverwriteModal} // Show loading only if actually saving, not just showing modal
                  disabled={saveDraftDisabled} // <<< Use new calculated disable state
                  leftIcon={<FiSave />}
                  loadingText="กำลังบันทึกร่าง..."
                  className="w-full sm:w-auto"
                >
                  บันทึกร่าง (Save Draft)
                </Button>
                <Button
                  variant="primary"
                  onClick={triggerSaveFinal}
                  isLoading={isFormSaving} // Use saving state from hook
                  disabled={saveFinalDisabled} // <<< Use new calculated disable state
                  leftIcon={<FiCheckSquare />}
                  loadingText="กำลังบันทึกสมบูรณ์..."
                  className="w-full sm:w-auto"
                >
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
