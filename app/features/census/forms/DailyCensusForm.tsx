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

export default function DailyCensusForm() {
  const { user: currentUser } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isWardLoading, setIsWardLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadDataTrigger, setReloadDataTrigger] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Load wards once
  useEffect(() => {
    const loadWards = async () => {
      if (!currentUser) return;
      setIsWardLoading(true);
      try {
        const userWards = await getWardsByUserPermission(currentUser);
        setWards(userWards);
        if (userWards.length > 0 && !selectedWard) { // Set default only if not already set
          setSelectedWard(userWards[0].id);
        }
      } catch (error) {
        console.error("Error loading wards:", error);
        showErrorToast('ไม่สามารถโหลดข้อมูลวอร์ดได้');
      } finally {
        setIsWardLoading(false);
      }
    };
    loadWards();
  }, [currentUser]); // Removed selectedWard from dependency

  // --- Use Custom Hooks --- 
  const { 
    selectedShift, 
    morningShiftStatus,
    nightShiftStatus,
    isMorningShiftDisabled: shiftHookMorningDisabled,
    isNightShiftDisabled: shiftHookNightDisabled,
    isLoadingStatus,
    handleSelectShift,
    setMorningShiftStatus,
    setNightShiftStatus,
    setIsMorningShiftDisabled: setShiftHookMorningDisabled,
    setIsNightShiftDisabled: setShiftHookNightDisabled,
  } = useShiftManagement({ selectedWard, selectedDate });

  // Get values and functions directly from useWardFormData
  const {
    formData,
    error: dataError,
    handleChange,
    isFormReadOnly,
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
      selectedWard,
      selectedDate,
      selectedShift,
      user: currentUser,
      reloadDataTrigger
  });

  // Wrapper function for handleSaveDraft to match onClick signature
  const triggerSaveDraft = () => {
    handleSaveDraft(); // Call function from useWardFormData
  };

  // Wrapper function for handleSaveFinal
  const triggerSaveFinal = () => {
      handleSaveFinal(); // Call function from useWardFormData
  };

  // Combine loading states from different hooks
  const isLoading = isWardLoading || isLoadingStatus || isDataLoading;
  // Use the saving state directly from the hook (renamed to avoid conflict if needed elsewhere, but maybe not)
  // Let's just use isFormSaving directly where needed for buttons
  // const isSaving = isFormSaving;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWard(e.target.value);
  };

  // Combine overall page loading state
  const isPageLoading = isLoading || isLoadingStatus;

  // --- Determine button disabled states based on new logic ---
  // Disable actions if form is read-only (final/approved), saving, or either shift is approved OR if morning shift is FINAL
  const isActionDisabled = 
      isFormReadOnly || 
      isFormSaving || 
      morningShiftStatus === FormStatus.APPROVED || 
      nightShiftStatus === FormStatus.APPROVED ||
      morningShiftStatus === FormStatus.FINAL; // <<< ADDED: Disable if morning is FINAL
      
  const isSaveDraftDisabled = isActionDisabled || !isFormDirty; // Keep existing logic for button state
  
  // Determine if Night Shift button should be disabled more explicitly
  const finalNightShiftDisabled = 
      shiftHookNightDisabled || 
      isFormSaving || 
      isFormReadOnly || 
      morningShiftStatus === FormStatus.FINAL || // <<< ADDED: Disable if morning is FINAL
      morningShiftStatus === FormStatus.APPROVED; // Also disable if morning approved

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
                    disabled={isFormSaving || isFormReadOnly} // Disable if saving or form is read-only
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
                    disabled={isFormSaving || isFormReadOnly} // Disable if saving or form is read-only
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              
              {/* Remove Draft Notification Component - Notifications handled via Toast in hook */}
              
              {/* Shift Selection Component */}
               <ShiftSelection
                 selectedShift={selectedShift}
                 onSelectShift={handleSelectShift}
                 morningShiftStatus={morningShiftStatus}
                 nightShiftStatus={nightShiftStatus}
                 // Disable based on shift hook, saving state, or if form is read-only
                 isMorningShiftDisabled={shiftHookMorningDisabled || isFormSaving || isFormReadOnly}
                 // Pass the more explicit disable state for the night shift
                 isNightShiftDisabled={finalNightShiftDisabled} // <<< Use the new calculated state
               />

              {/* Census Input Fields Component */}
              <CensusInputFields
                formData={formData}
                handleChange={handleChange}
                errors={errors}
                isReadOnly={isFormReadOnly || isFormSaving} // ReadOnly if finalized or currently saving
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
                isReadOnly={isFormReadOnly || isFormSaving} // ReadOnly if finalized or currently saving
                isDraftLoaded={isDraftLoaded}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                <Button
                  variant="secondary"
                  onClick={triggerSaveDraft}
                  isLoading={isFormSaving} // Use saving state from hook
                  disabled={isSaveDraftDisabled} // Uses isFormDirty internally
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
                  disabled={isActionDisabled} // <<< Use the updated isActionDisabled state
                  leftIcon={<FiCheckSquare />}
                  loadingText="กำลังบันทึกสมบูรณ์..."
                  className="w-full sm:w-auto"
                >
                  บันทึกสมบูรณ์ (Save Final)
                </Button>
              </div>

              {/* คอมเมนต์ส่วนแสดง Validation Errors ด้านล่างออก */}
              {/* {Object.keys(errors).length > 0 && !isFormSaving && (
                   <div className="text-red-500 dark:text-red-400 mt-4 text-left space-y-1">
                       <p className="font-semibold">กรุณาแก้ไขข้อผิดพลาด:</p>
                       <ul className="list-disc list-inside">
                           {Object.values(errors).map((errorMsg, index) => (
                               <li key={index}>{errorMsg}</li>
                           ))}
                       </ul>
                   </div>
               )} */}
            </form>
          )}

        </div>
        
        {/* NEW: Render the confirmation modal */}
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
