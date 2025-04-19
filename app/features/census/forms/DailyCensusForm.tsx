'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/features/auth';
import { Ward } from '@/app/core/types/ward';
import { getWardsByUserPermission } from './services/wardService';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import Button from '@/app/core/ui/Button';
import { format } from 'date-fns';
import { showErrorToast } from '@/app/core/utils/toastUtils';

// Import Hooks
import { useWardFormData } from './hooks/useWardFormData';
import { useShiftManagement } from './hooks/useShiftManagement';
import { useFormPersistence } from './hooks/useFormPersistence';

// Import Components
import ShiftSelection from './components/ShiftSelection';
import CensusInputFields from './components/CensusInputFields';
import RecorderInfo from './components/RecorderInfo';
import ConfirmSaveModal from './components/ConfirmSaveModal';

export default function DailyCensusForm() {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isWardLoading, setIsWardLoading] = useState(false);

  // Load wards once
  useEffect(() => {
    const loadWards = async () => {
      if (!user) return;
      setIsWardLoading(true);
      try {
        const userWards = await getWardsByUserPermission(user);
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
  }, [user]); // Removed selectedWard from dependency

  // --- Use Custom Hooks --- 
  const { 
    selectedShift, 
    morningShiftStatus,
    nightShiftStatus,
    isMorningShiftDisabled,
    isNightShiftDisabled,
    isLoadingStatus,
    handleSelectShift,
    setMorningShiftStatus, // Get setters from shift management
    setNightShiftStatus,
    setIsMorningShiftDisabled, // Get setters from shift management
    setIsNightShiftDisabled, // Get setters from shift management
  } = useShiftManagement({ selectedWard, selectedDate });

  const { 
    formData, 
    setFormData,
    errors,
    setErrors, 
    isLoading: isFormDataLoading,
    isSaving,
    setIsSaving,
    isMorningCensusReadOnly,
    isFormReadOnly,
    existingDraftData,
    setExistingDraftData, // Get setter from form data hook
    handleChange,
  } = useWardFormData({ selectedWard, selectedDate, selectedShift, user, morningShiftStatus, nightShiftStatus });

  const { 
    validateForm, 
    handleSaveDraft, 
    saveFormDraft, 
    handleSaveFinal, 
    isConfirmModalOpen, 
    setIsConfirmModalOpen 
  } = useFormPersistence({
    formData,
    setFormData,
    errors,
    setErrors,
    selectedWard,
    selectedDate,
    selectedShift,
    user,
    wards,
    existingDraftData,
    setExistingDraftData,
    setIsSaving,
    setIsFormReadOnly: (readOnly) => setFormData(prev => ({ ...prev, isFormReadOnly: readOnly })), // Directly update readOnly state in formData hook
    morningShiftStatus,
    setMorningShiftStatus,
    setNightShiftStatus,
    setIsMorningShiftDisabled,
    setIsNightShiftDisabled,
    isMorningCensusReadOnly,
  });

  const isLoading = isWardLoading || isFormDataLoading || isLoadingStatus;

  // Render UI
  return (
    <ProtectedPage requiredRole={['user', 'admin', 'developer']}> 
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">บันทึกข้อมูล</h1>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              {/* Ward and Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                  <label htmlFor="ward" className="form-label">หอผู้ป่วย (Ward)</label>
                <select 
                    id="ward"
                    name="ward"
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="form-input"
                    disabled={isSaving || isFormReadOnly}
                  >
                    <option value="" disabled>-- เลือกหอผู้ป่วย --</option>
                  {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>{ward.wardName}</option>
                  ))}
                </select>
                </div>
                    <div>
                  <label htmlFor="date" className="form-label">วันที่ (Date)</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-input"
                    disabled={isSaving || isFormReadOnly}
                    max={format(new Date(), 'yyyy-MM-dd')} 
                  />
                </div>
              </div>
              
              {/* Shift Selection Component */}
               <ShiftSelection
                 selectedShift={selectedShift}
                 onSelectShift={handleSelectShift} // Use handler from hook
                 morningShiftStatus={morningShiftStatus}
                 nightShiftStatus={nightShiftStatus}
                 isMorningShiftDisabled={isMorningShiftDisabled || isSaving || isFormReadOnly}
                 isNightShiftDisabled={isNightShiftDisabled || isSaving || isFormReadOnly}
               />

              {/* Census Input Fields Component */}
              <CensusInputFields
                formData={formData}
                handleChange={handleChange}
                errors={errors}
                isReadOnly={isFormReadOnly || isSaving}
                selectedShift={selectedShift}
                isMorningCensusReadOnly={isMorningCensusReadOnly}
              />

              {/* Recorder Info Component */}
              <RecorderInfo
                firstName={formData.recorderFirstName || ''}
                lastName={formData.recorderLastName || ''}
                handleChange={handleChange}
                errors={errors}
                isReadOnly={isFormReadOnly || isSaving}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  isLoading={isSaving}
                  disabled={isFormReadOnly || isSaving}
                  loadingText="กำลังบันทึกร่าง..."
                  className="w-full sm:w-auto"
                >
                  บันทึกร่าง (Save Draft)
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveFinal}
                  isLoading={isSaving}
                  disabled={isFormReadOnly || isSaving}
                  loadingText="กำลังบันทึก..."
                  className="w-full sm:w-auto"
                >
                  บันทึกสมบูรณ์ (Save Final)
                </Button>
              </div>
            </form>
          )}

           {/* Confirmation Modal Component */}
           <ConfirmSaveModal
             isOpen={isConfirmModalOpen}
             onClose={() => setIsConfirmModalOpen(false)}
             onConfirm={() => saveFormDraft(formData)} // Use direct save from persistence hook
             formData={existingDraftData || {}} 
             isSaving={isSaving}
           />

        </div>
      </div>
    </ProtectedPage>
  );
}

// Removed old state declarations and logic functions previously here
// - formData state and related handlers
// - errors state and related handlers
// - shift selection state and related handlers
// - loading/saving states
// - readOnly states
// - existingDraftData state
// - confirmModal state
// - loadExistingFormData function
// - handleChange function
// - validateForm function
// - handleSaveDraft function
// - saveFormDraft function
// - handleSaveFinal function
