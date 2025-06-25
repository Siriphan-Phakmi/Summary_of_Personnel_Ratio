'use client';

import React, { useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { WardSelectionSection } from './components/forms/WardSelectionSection';
import { FormLoadingSection } from './components/forms/FormLoadingSection';
import { ActionButtonsSection } from './components/forms/ActionButtonsSection';
import CensusInputFields from './components/CensusInputFields';
import ShiftSelection from './components/ShiftSelection';
import DraftNotification from './components/DraftNotification';
import ConfirmSaveModal from './components/ConfirmSaveModal';
import ConfirmZeroValuesModal from './components/ConfirmZeroValuesModal';
import RecorderInfo from './components/RecorderInfo';
import { useWardFormData } from './hooks/useWardFormData';
import { useDailyCensusFormLogic } from './hooks/useDailyCensusFormLogic';
import { useFormConfig } from '@/app/features/config/hooks/useFormConfig';
import { ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';

export default function DailyCensusForm() {
  // Hook to fetch form configuration from Firestore
  const { formConfig, loading: configLoading, error: configError } = useFormConfig('census_form');

  // State for shift selection
  const [selectedShift, setSelectedShift] = useState<ShiftType>(ShiftType.MORNING);
        
  // Main form logic
  const {
    user: currentUser,
    wards,
    selectedWard,
    selectedDate,
    selectedWardObject,
    isDataLoading,
    dataError,
    morningShiftStatus: actualMorningStatus,
    nightShiftStatus: actualNightStatus,
    handleDateChange,
    handleWardChange,
    handleReload,
    isSingleWardUser,
  } = useDailyCensusFormLogic();

  // Ward form data management
  const {
    formData,
    errors,
    isLoading: isFormDataLoading,
    isSaving,
    isFormReadOnly,
    error: formDataError,
    isFormDirty,
    handleChange,
    handleBlur,
    handleSaveDraft,
    handleSaveFinal,
    showConfirmZeroModal,
    setShowConfirmZeroModal,
    isCensusAutoCalculated,
    fieldsWithValueZero,
    proceedWithSaveAfterZeroConfirmation,
  } = useWardFormData({
      selectedWard,
      selectedBusinessWardId: selectedWardObject?.wardCode || '',
      selectedDate,
      selectedShift,
      user: currentUser,
      reloadDataTrigger: 0, // Default value for reload trigger
  });

  // Determine button disabled state
  const isMorningShiftDisabled = actualMorningStatus === FormStatus.APPROVED || actualMorningStatus === FormStatus.FINAL;
  const isNightShiftDisabled = actualNightStatus === FormStatus.APPROVED || actualNightStatus === FormStatus.FINAL;

  // Form validation
  const isFormValid = !!(Object.keys(errors).length === 0 && selectedWard && selectedDate);
    
  // Combined loading and error states
  const isLoading = isDataLoading || isFormDataLoading || !currentUser || configLoading;
  
  // Combined error state
  const combinedError = dataError || formDataError;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="container mx-auto p-4">
        <Alert severity="error">
          Error loading form configuration: {configError}. Please try refreshing the page.
        </Alert>
      </div>
    );
  }

  // Handle shift change
  const handleShiftChange = (shift: ShiftType) => {
    setSelectedShift(shift);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
              {/* Ward and Date Selection */}
      <WardSelectionSection
        wards={wards}
        selectedWard={selectedWard}
        selectedDate={selectedDate}
        selectedWardObject={selectedWardObject}
        onWardChange={handleWardChange}
        onDateChange={handleDateChange}
        isSingleWardUser={isSingleWardUser || false}
      />
              
      {/* Shift Selection */}
               <ShiftSelection
                 selectedShift={selectedShift}
        onSelectShift={handleShiftChange}
                 morningShiftStatus={actualMorningStatus}
                 nightShiftStatus={actualNightStatus}
        isMorningShiftDisabled={isMorningShiftDisabled}
        isNightShiftDisabled={isNightShiftDisabled}
               />

      {/* Form Content */}
      {selectedWard && selectedDate ? (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            บันทึกข้อมูล Patient Census - {selectedShift === ShiftType.MORNING ? 'เวรเช้า' : 'เวรดึก'}
          </h3>

          {/* Census Input Fields */}
          <CensusInputFields
            formConfig={formConfig}
            formData={formData}
            handleChange={handleChange}
            handleBlur={handleBlur}
            errors={errors}
            isReadOnly={isFormReadOnly}
            selectedShift={selectedShift}
            isCensusAutoCalculated={isCensusAutoCalculated}
            isDraftLoaded={!!formData.isDraft}
          />

          {/* Recorder Information */}
          <RecorderInfo
            firstName={formData.recorderFirstName || ''}
            lastName={formData.recorderLastName || ''}
            handleChange={handleChange}
            errors={errors}
            isReadOnly={isFormReadOnly}
            isDraftLoaded={!!formData.isDraft}
          />
        </div>
      ) : (
        <FormLoadingSection 
          isDataLoading={false} 
          dataError={combinedError} 
          wards={wards} 
          selectedWard={selectedWard} 
        />
      )}
        
      {/* Action Buttons */}
      <ActionButtonsSection
        isFormReadOnly={isFormReadOnly}
        selectedShift={selectedShift}
        isFormSaving={isSaving}
        isFormDirty={isFormDirty}
        onSaveDraft={handleSaveDraft}
        onSaveFinal={handleSaveFinal}
        isFormValid={isFormValid}
        />

      {/* Confirmation Modals */}
      <ConfirmZeroValuesModal
        isOpen={showConfirmZeroModal}
        onClose={() => setShowConfirmZeroModal(false)}
        onConfirm={proceedWithSaveAfterZeroConfirmation}
        fieldsWithZero={fieldsWithValueZero || []}
        isSaving={isSaving}
        />
      </div>
  );
}
