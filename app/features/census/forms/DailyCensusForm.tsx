'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/features/auth';
import { Ward } from '@/app/core/types/ward';
import { getWardsByUserPermission } from './services/wardService';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { Button, Input } from '@/app/core/ui';
import { format } from 'date-fns';
import { showErrorToast, showSuccessToast } from '@/app/core/utils/toastUtils';
import { logUserActivity } from '@/app/core/utils/logUtils';
import { useLoading } from '@/app/core/hooks/useLoading';
import { Toaster } from 'react-hot-toast';
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

// Import FormStatus correctly
import { ShiftType, FormStatus, WardForm } from '@/app/core/types/ward';

export default function DailyCensusForm() {
  const { user: currentUser } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isWardLoading, setIsWardLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isFormReadOnly, setIsFormReadOnly] = useState(false);

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

  const { 
    formData, 
    setFormData,
    error: dataError,
    setError: setDataError,
    handleChange,
    isFormReadOnly: dataFormReadOnly,
    isMorningCensusReadOnly,
    isCensusAutoCalculated,
    isDraftLoaded,
    errors: wardFormErrors,
    setErrors: setWardFormErrors,
  } = useWardFormData({ selectedWard, selectedDate, selectedShift, user: currentUser, morningShiftStatus, nightShiftStatus });

  const { 
    handleSaveDraft,
    handleFinalizeForm,
    isConfirmModalOpen,
    handleConfirmSaveDraft,
    handleCloseConfirmModal,
  } = useFormPersistence({
    formData,
    setFormData,
    errors,
    setErrors,
    selectedWard,
    selectedDate,
    selectedShift,
    user: currentUser,
    wards,
    existingDraftData: null,
    setExistingDraftData: () => {},
    setIsSaving,
    morningShiftStatus,
    setMorningShiftStatus,
    nightShiftStatus,
    setNightShiftStatus,
    setIsMorningShiftDisabled: setShiftHookMorningDisabled,
    setIsNightShiftDisabled: setShiftHookNightDisabled,
    isMorningCensusReadOnly,
  });

  useEffect(() => {
    setIsFormReadOnly(dataFormReadOnly);
  }, [dataFormReadOnly]);

  const isLoading = isWardLoading || isLoadingStatus;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setErrors({});
    setDataError(null);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWard(e.target.value);
    setErrors({});
    setDataError(null);
  };

  // Combine loading states
  const isPageLoading = isLoading || isLoadingStatus;
  // Combine disabled states
  const finalMorningDisabled = shiftHookMorningDisabled || isSaving || isFormReadOnly;
  const finalNightDisabled = shiftHookNightDisabled || isSaving || isFormReadOnly;

  // Render UI
  return (
    <ProtectedPage requiredRole={['nurse', 'user', 'admin', 'developer']}> 
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <Toaster position="top-right" />
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
                  <Input
                    type="date"
                    id="date"
                    name="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="form-input"
                    disabled={isSaving || isFormReadOnly}
                    max={format(new Date(), 'yyyy-MM-dd')} 
                  />
                </div>
              </div>
              
              {/* Shift Selection Component */}
               <ShiftSelection
                 selectedShift={selectedShift}
                 onSelectShift={handleSelectShift}
                 morningShiftStatus={morningShiftStatus}
                 nightShiftStatus={nightShiftStatus}
                 isMorningShiftDisabled={finalMorningDisabled}
                 isNightShiftDisabled={finalNightDisabled}
               />

              {/* Census Input Fields Component */}
              <CensusInputFields
                formData={formData}
                handleChange={handleChange}
                errors={errors}
                isReadOnly={isFormReadOnly || isSaving}
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
                isReadOnly={isFormReadOnly || isSaving}
                isDraftLoaded={isDraftLoaded}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  isLoading={isSaving}
                  disabled={isFormReadOnly || isSaving || morningShiftStatus === FormStatus.APPROVED || nightShiftStatus === FormStatus.APPROVED}
                  leftIcon={<FiSave />}
                  loadingText="กำลังบันทึกร่าง..."
                  className="w-full sm:w-auto"
                >
                  บันทึกร่าง (Save Draft)
                </Button>
                <Button
                  variant="primary"
                  onClick={handleFinalizeForm}
                  isLoading={isSaving}
                  disabled={isFormReadOnly || isSaving || morningShiftStatus === FormStatus.APPROVED || nightShiftStatus === FormStatus.APPROVED}
                  leftIcon={<FiCheckSquare />}
                  loadingText="กำลังบันทึกสมบูรณ์..."
                  className="w-full sm:w-auto"
                >
                  บันทึกสมบูรณ์ (Save Final)
                </Button>
              </div>

              {/* Display validation errors (now from Record) */}
              {Object.keys(errors).length > 0 && !isSaving && (
                   <div className="text-red-500 dark:text-red-400 mt-4 text-left space-y-1">
                       <p className="font-semibold">กรุณาแก้ไขข้อผิดพลาด:</p>
                       <ul className="list-disc list-inside">
                           {/* Iterate over the Record's values */}
                           {Object.values(errors).map((errorMsg, index) => (
                               <li key={index}>{errorMsg}</li>
                           ))}
                       </ul>
                   </div>
               )}
            </form>
          )}

           {/* Confirmation Modal Component */}
           <ConfirmSaveModal
             isOpen={isConfirmModalOpen}
             onClose={handleCloseConfirmModal}
             onConfirm={handleConfirmSaveDraft}
             formData={formData}
             isSaving={isSaving}
           />

        </div>
      </div>
    </ProtectedPage>
  );
}
