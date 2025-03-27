'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FiSave, FiCheck, FiAlertTriangle, FiInfo } from 'react-icons/fi';

import { useAuth } from '@/app/contexts/AuthContext';
import Modal from '@/app/components/ui/Modal';
import Loading from '@/app/components/ui/Loading';
import Button from '@/app/components/ui/Button';

// Import the separated components
import WardFormHeader from './components/WardFormHeader';
import WardFormFields from './components/WardFormFields';
import WardFormActions from './components/WardFormActions';
import ValidationModals from './components/ValidationModals';

import { 
  WardFormData, 
  Shift, 
  SaveStatus
} from '@/app/types/ward';
import {
  getWardFormByDateShift,
  saveWardForm,
  getPreviousNightShiftData,
  getWardFormByDateAndShift,
  saveWardFormDraft,
  checkMorningShiftApproved,
  calculatePatientCensus
} from '@/app/services/ward';

export default function WardFormPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // State for form data
  const [wardId, setWardId] = useState<string>('');
  const [wardName, setWardName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shift, setShift] = useState<Shift>('morning');
  const [formData, setFormData] = useState<Partial<WardFormData>>({
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
    comment: ''
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Form status and loading states
  const [formId, setFormId] = useState<string | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [morningShiftFinalized, setMorningShiftFinalized] = useState(false);
  const [morningShiftApproved, setMorningShiftApproved] = useState(false);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [formStatus, setFormStatus] = useState<SaveStatus>('draft');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPreviousDataModal, setShowPreviousDataModal] = useState(false);
  const [modalAction, setModalAction] = useState<'draft' | 'final'>('draft');
  
  // Refs for focusing invalid fields
  const invalidFieldRef = useRef<HTMLInputElement>(null);
  
  // New states
  const [existingForm, setExistingForm] = useState<WardFormData | null>(null);
  const [draftExists, setDraftExists] = useState(false);
  const [existingDraft, setExistingDraft] = useState<WardFormData | null>(null);
  const [showDraftExistsModal, setShowDraftExistsModal] = useState(false);
  const [formFieldsDisabled, setFormFieldsDisabled] = useState<{
    patientCensus: boolean;
    [key: string]: boolean;
  }>({
    patientCensus: false
  });
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  // Set staff names based on user data
  useEffect(() => {
    if (user) {
      if (user.firstName) {
        setFirstName(user.firstName);
      }
      if (user.lastName) {
        setLastName(user.lastName);
      }
    }
  }, [user]);
  
  // Check for existing form when date/shift/ward changes
  useEffect(() => {
    const checkExistingForm = async () => {
      if (!wardId) return;
      
      try {
        setIsFormLoading(true);
        
        // Format date as YYYY-MM-DD
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        
        // Check if morning shift is finalized
        const morningForm = await getWardFormByDateAndShift(wardId, dateString, 'morning');
        
        if (morningForm) {
          setMorningShiftFinalized(morningForm.status === 'final');
          setMorningShiftApproved(morningForm.approvalStatus === 'approved');
        } else {
          setMorningShiftFinalized(false);
          setMorningShiftApproved(false);
        }
        
        // Check for existing form for current shift
        const existingForm = await getWardFormByDateShift(
          wardId,
          dateString,
          shift
        );
        
        if (existingForm) {
          // Load existing form data
          setFormId(existingForm.id || null);
          setFormData({
            patientCensus: existingForm.patientCensus || 0,
            nurseManager: existingForm.nurseManager || 0,
            rn: existingForm.rn || 0,
            pn: existingForm.pn || 0,
            wc: existingForm.wc || 0,
            newAdmit: existingForm.newAdmit || 0,
            transferIn: existingForm.transferIn || 0,
            referIn: existingForm.referIn || 0,
            transferOut: existingForm.transferOut || 0,
            referOut: existingForm.referOut || 0,
            discharge: existingForm.discharge || 0,
            dead: existingForm.dead || 0,
            available: existingForm.available || 0,
            unavailable: existingForm.unavailable || 0,
            plannedDischarge: existingForm.plannedDischarge || 0,
            comment: existingForm.comment || ''
          });
          setFormStatus(existingForm.status);
          
          if (existingForm.createdBy) {
            setFirstName(existingForm.createdBy.firstName || '');
            setLastName(existingForm.createdBy.lastName || '');
          }
        } else {
          // If no existing form, check for previous night data if morning shift
          if (shift === 'morning') {
            const previousNightData = await getPreviousNightShiftData(wardId, dateString);
            
            if (previousNightData) {
              setHasPreviousData(true);
              setShowPreviousDataModal(true);
              
              // Pre-fill patient census from previous night shift
              setFormData(prevState => ({
                ...prevState,
                patientCensus: previousNightData.patientCensus || 0
              }));
            } else {
              setHasPreviousData(false);
              // Reset form data for new form
              resetFormData();
            }
          } else {
            // For night shift, check if morning shift exists and is approved
            if (morningForm && morningForm.status === 'final') {
              // Pre-fill patient census from morning shift
              setFormData(prevState => ({
                ...prevState,
                patientCensus: morningForm.patientCensus || 0
              }));
            } else {
              resetFormData();
            }
          }
        }
        
        setIsFormLoading(false);
      } catch (error) {
        console.error('Error checking existing form:', error);
        toast.error('Error loading form data. Please try again.');
        setIsFormLoading(false);
      }
    };
    
    checkExistingForm();
  }, [wardId, selectedDate, shift]);
  
  // Reset form data
  const resetFormData = () => {
    setFormData({
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
      comment: ''
    });
    setFormId(null);
    setFormStatus('draft');
  };
  
  // Handle ward change
  const handleWardChange = (id: string, name: string) => {
    setWardId(id);
    setWardName(name);
  };
  
  // Handle date change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };
  
  // Handle shift change
  const handleShiftChange = (newShift: Shift) => {
    setShift(newShift);
  };
  
  // Calculate patient census based on current inputs
  const calculateCurrentPatientCensus = () => {
    const {
      patientCensus,
      newAdmit,
      transferIn,
      referIn,
      transferOut,
      referOut,
      discharge,
      dead
    } = formData;
    
    return calculatePatientCensus(
      patientCensus || 0,
      newAdmit || 0,
      transferIn || 0,
      referIn || 0,
      transferOut || 0,
      referOut || 0,
      discharge || 0,
      dead || 0
    );
  };
  
  // Handle input change
  const handleInputChange = (field: keyof WardFormData, value: number | string) => {
    setFormData(prevState => ({
      ...prevState,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required numeric fields
    const requiredNumericFields: (keyof WardFormData)[] = [
      'patientCensus',
      'nurseManager',
      'rn',
      'pn',
      'wc'
    ];
    
    // Check required numeric fields
    requiredNumericFields.forEach(field => {
      const value = formData[field];
      if (value === undefined || value === null || value < 0) {
        errors[field] = `This field is required and must be a positive number`;
      }
    });
    
    // Check names
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    setValidationErrors(errors);
    
    // Focus the first invalid field
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return false;
    }
    
    return true;
  };
  
  // Handle save action (draft or final)
  const handleSave = async (status: SaveStatus) => {
    if (status === 'final' && !validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setModalAction(status);
    
    // Check for existing draft
    if (status === 'draft' && !formId) {
      // Check local storage for draft
      const localStorageKey = `ward-form-draft-${wardId}-${format(selectedDate, 'yyyy-MM-dd')}-${shift}`;
      const savedDraft = localStorage.getItem(localStorageKey);
      
      if (savedDraft) {
        setShowDraftExistsModal(true);
        return;
      }
    }
    
    // For final save, show confirmation modal
    if (status === 'final') {
      setShowConfirmModal(true);
      return;
    }
    
    // Proceed with saving
    await saveFormData(status);
  };
  
  // Save form data to Firebase
  const saveFormData = async (status: SaveStatus) => {
    try {
      setIsSaving(true);
      
      // Format date as YYYY-MM-DD
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      // Calculate patient census for night shift if needed
      let calculatedPatientCensus;
      if (shift === 'night') {
        calculatedPatientCensus = calculateCurrentPatientCensus();
      }
      
      // Begin building the form data
      const formDataToSave: WardFormData = {
        wardId,
        wardName,
        date: format(selectedDate, 'yyyy-MM-dd'),
        shift,
        status,
        approvalStatus: 'pending',
        lastModified: Date.now(),
        patientCensus: formData.patientCensus || 0,
        nurseManager: formData.nurseManager || 0,
        rn: formData.rn || 0,
        pn: formData.pn || 0,
        wc: formData.wc || 0,
        newAdmit: formData.newAdmit || 0,
        transferIn: formData.transferIn || 0,
        referIn: formData.referIn || 0,
        transferOut: formData.transferOut || 0,
        referOut: formData.referOut || 0,
        discharge: formData.discharge || 0,
        dead: formData.dead || 0,
        available: formData.available || 0,
        unavailable: formData.unavailable || 0,
        plannedDischarge: formData.plannedDischarge || 0,
        comment: formData.comment || '',
        firstName: firstName || '',
        lastName: lastName || '',
        userId: user?.uid || '',
        userEmail: user?.email || '',
        createdBy: {
          uid: user?.uid || '',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          timestamp: Date.now()
        }
      };
      
      // Add calculated patient census for night shift
      if (shift === 'night' && calculatedPatientCensus !== undefined) {
        formDataToSave.calculations = {
          patientCensusCalculated: calculatedPatientCensus
        };
      }
      
      // Save to Firebase
      const savedFormId = await saveWardForm(formDataToSave, formId || undefined);
      
      setFormId(savedFormId);
      setFormStatus(status);
      
      // Clear local storage draft if this was a successful save
      if (status === 'draft') {
        const localStorageKey = `ward-form-draft-${wardId}-${dateString}-${shift}`;
        localStorage.removeItem(localStorageKey);
      }
      
      // Show success message
      toast.success(
        status === 'draft' 
          ? 'Draft saved successfully' 
          : 'Form finalized successfully'
      );
      
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Error saving form. Please try again.');
      setIsSaving(false);
    }
  };
  
  // Handle using existing draft data
  const handleUseDraft = () => {
    const localStorageKey = `ward-form-draft-${wardId}-${format(selectedDate, 'yyyy-MM-dd')}-${shift}`;
    const savedDraft = localStorage.getItem(localStorageKey);
    
    if (savedDraft) {
      try {
        const parsedDraft: WardFormData = JSON.parse(savedDraft);
        setFormData({
          patientCensus: parsedDraft.patientCensus || 0,
          nurseManager: parsedDraft.nurseManager || 0,
          rn: parsedDraft.rn || 0,
          pn: parsedDraft.pn || 0,
          wc: parsedDraft.wc || 0,
          newAdmit: parsedDraft.newAdmit || 0,
          transferIn: parsedDraft.transferIn || 0,
          referIn: parsedDraft.referIn || 0,
          transferOut: parsedDraft.transferOut || 0,
          referOut: parsedDraft.referOut || 0,
          discharge: parsedDraft.discharge || 0,
          dead: parsedDraft.dead || 0,
          available: parsedDraft.available || 0,
          unavailable: parsedDraft.unavailable || 0,
          plannedDischarge: parsedDraft.plannedDischarge || 0,
          comment: parsedDraft.comment || ''
        });
        toast.success('Draft loaded successfully');
      } catch (error) {
        console.error('Error parsing draft:', error);
        toast.error('Error loading draft. Please try again.');
      }
    }
    
    setShowDraftExistsModal(false);
  };
  
  // ตรวจสอบข้อมูลกะดึกของวันก่อนหน้า
  const checkPreviousDayNightShift = async (selectedDate: Date, wardId: string) => {
    try {
      setIsFormLoading(true);
      // คำนวณวันก่อนหน้า
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      
      // แปลงเป็นรูปแบบ YYYY-MM-DD
      const prevDateString = format(prevDate, 'yyyy-MM-dd');
      
      // ดึงข้อมูลกะดึกของวันก่อนหน้า
      const prevNightShiftData = await getPreviousNightShiftData(wardId, prevDateString);
      
      if (prevNightShiftData && prevNightShiftData.approvalStatus === 'approved') {
        // ถ้ามีข้อมูลกะดึกของวันก่อนหน้าที่อนุมัติแล้ว ให้ดึงค่า patientCensus มาใช้
        setFormData(prev => ({
          ...prev,
          patientCensus: prevNightShiftData.patientCensus,
        }));
        
        // แจ้งเตือนผู้ใช้ว่าดึงข้อมูลมาแล้ว
        toast.success('Patient census data imported from previous night shift');
        
        // ทำให้ช่อง Patient Census ไม่สามารถแก้ไขได้
        setFormFieldsDisabled({
          ...formFieldsDisabled,
          patientCensus: true
        });
      } else {
        // ถ้าไม่มีข้อมูลกะดึกที่อนุมัติแล้ว ให้สามารถกรอกข้อมูลได้
        setFormFieldsDisabled({
          ...formFieldsDisabled,
          patientCensus: false
        });
      }
    } catch (error) {
      console.error('Error checking previous day night shift:', error);
      toast.error('Failed to check previous night shift data');
    } finally {
      setIsFormLoading(false);
    }
  };

  // เพิ่ม effect hook เพื่อเรียกใช้ฟังก์ชัน checkPreviousDayNightShift เมื่อมีการเปลี่ยนวันที่หรือ ward
  useEffect(() => {
    if (wardId && selectedDate) {
      checkPreviousDayNightShift(selectedDate, wardId);
    }
  }, [wardId, selectedDate]);
  
  // If still loading auth, show loading spinner
  if (authLoading) {
    return <Loading fullScreen />;
  }
  
  // If user not logged in, don't render anything (redirect handled by useEffect)
  if (!user) {
    return null;
  }
  
  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Ward Form
      </h1>
      
      {isFormLoading ? (
        <div className="flex justify-center py-10">
          <Loading />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ward Form Header Component */}
          <WardFormHeader 
            wardId={wardId}
            wardName={wardName}
            selectedDate={selectedDate}
            shift={shift}
            firstName={firstName}
            lastName={lastName}
            formStatus={formStatus}
            onWardChange={handleWardChange}
            onDateChange={handleDateChange}
            onShiftChange={handleShiftChange}
          />
          
          {shift === 'night' && !morningShiftFinalized && (
            <div className="mb-6 p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-400 text-amber-700 dark:text-amber-300">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Morning shift data required</p>
                  <p className="text-sm mt-1">
                    The morning shift must be finalized and approved before night shift data can be entered.
                    Please complete the morning shift first.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {hasPreviousData && shift === 'morning' && (
            <div className="mb-6 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 text-blue-700 dark:text-blue-300">
              <div className="flex">
                <FiInfo className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Previous night data available</p>
                  <p className="text-sm mt-1">
                    Patient census data has been pre-filled from the previous night shift.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            {/* Ward Form Fields Component */}
            <WardFormFields
              formData={formData}
              formFieldsDisabled={formFieldsDisabled}
              validationErrors={validationErrors}
              handleInputChange={handleInputChange}
              calculatePatientCensus={calculateCurrentPatientCensus}
            />
            
            {formStatus === 'final' ? (
              <div className="mt-6 p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400 text-green-700 dark:text-green-300">
                <div className="flex">
                  <FiCheck className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Form finalized</p>
                    <p className="text-sm mt-1">
                      This form has been finalized and cannot be edited. Contact a supervisor if you need to make changes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <WardFormActions
                isSubmitting={isSaving && modalAction === 'final'} 
                isSavingDraft={isSaving && modalAction === 'draft'}
                isFormValid={Object.keys(validationErrors).length === 0}
                formStatus={formStatus}
                handleSaveDraft={() => handleSave('draft')}
                handleSubmit={() => handleSave('final')}
                handleReset={resetFormData}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Validation Modals */}
      <ValidationModals
        showSuccessModal={false} // Add state for this if needed
        showConfirmModal={showConfirmModal}
        showErrorModal={false} // Add state for this if needed
        showWarningModal={false} // Add state for this if needed
        setShowSuccessModal={() => {}} // Add handler for this if needed
        setShowConfirmModal={setShowConfirmModal}
        setShowErrorModal={() => {}} // Add handler for this if needed
        setShowWarningModal={() => {}} // Add handler for this if needed
        handleConfirmSubmit={() => {
          setShowConfirmModal(false);
          saveFormData('final');
        }}
        validationErrors={Object.values(validationErrors)}
        validationWarnings={[]} // Add state for this if needed
      />
      
      {/* Previous Data Modal */}
      <Modal
        isOpen={showPreviousDataModal}
        onClose={() => setShowPreviousDataModal(false)}
        title="Previous Data Available"
        size="md"
        footer={
          <Button
            variant="primary"
            onClick={() => setShowPreviousDataModal(false)}
          >
            Understood
          </Button>
        }
      >
        <div className="py-2">
          <p className="text-gray-700 dark:text-gray-300">
            Patient census data has been automatically imported from the previous night shift. This value cannot be changed.
          </p>
        </div>
      </Modal>
      
      {/* Draft Exists Modal */}
      <Modal
        isOpen={showDraftExistsModal}
        onClose={() => setShowDraftExistsModal(false)}
        title="Draft Exists"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDraftExistsModal(false);
                saveFormData('draft');
              }}
              className="mr-2"
            >
              Save New Draft
            </Button>
            <Button
              variant="primary"
              onClick={handleUseDraft}
            >
              Use Existing Draft
            </Button>
          </>
        }
      >
        <div className="py-2">
          <p className="text-gray-700 dark:text-gray-300">
            A draft already exists for this ward, date, and shift. Would you like to use the existing draft or save a new one?
          </p>
        </div>
      </Modal>
    </div>
  );
} 