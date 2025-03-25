'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FiSave, FiCheck, FiAlertTriangle, FiInfo } from 'react-icons/fi';

import { useAuth } from '@/app/contexts/AuthContext';
import WardSelector from '@/app/components/wardForm/WardSelector';
import DatePicker from '@/app/components/wardForm/DatePicker';
import ShiftSelector from '@/app/components/wardForm/ShiftSelector';
import NumberInput from '@/app/components/wardForm/NumberInput';
import Input from '@/app/components/ui/Input';
import Button from '@/app/components/ui/Button';
import Modal from '@/app/components/ui/Modal';
import Loading from '@/app/components/ui/Loading';

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
  const [showDraftExistsModal, setShowDraftExistsModal] = useState(false);
  const [showPreviousDataModal, setShowPreviousDataModal] = useState(false);
  const [modalAction, setModalAction] = useState<'draft' | 'final'>('draft');
  
  // Refs for focusing invalid fields
  const invalidFieldRef = useRef<HTMLInputElement>(null);
  
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
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <WardSelector 
              selectedWardId={wardId} 
              onWardChange={handleWardChange}
              disabled={formStatus === 'final'} 
            />
            
            <DatePicker 
              selectedDate={selectedDate} 
              onDateChange={handleDateChange} 
              disabled={formStatus === 'final'}
            />
            
            <ShiftSelector 
              selectedShift={shift} 
              onShiftChange={handleShiftChange}
              morningDisabled={formStatus === 'final' && shift === 'morning'}
              nightDisabled={!morningShiftApproved && shift === 'night'}
            />
          </div>
          
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
          
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2">
              Patient Data
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NumberInput
                id="patientCensus"
                label="Patient Census"
                value={formData.patientCensus || 0}
                onChange={(value) => handleInputChange('patientCensus', value)}
                error={validationErrors.patientCensus}
                disabled={
                  formStatus === 'final' || 
                  (hasPreviousData && shift === 'morning') ||
                  (shift === 'night' && morningShiftFinalized)
                }
              />
              
              <NumberInput
                id="nurseManager"
                label="Nurse Manager"
                value={formData.nurseManager || 0}
                onChange={(value) => handleInputChange('nurseManager', value)}
                error={validationErrors.nurseManager}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="rn"
                label="RN"
                value={formData.rn || 0}
                onChange={(value) => handleInputChange('rn', value)}
                error={validationErrors.rn}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="pn"
                label="PN"
                value={formData.pn || 0}
                onChange={(value) => handleInputChange('pn', value)}
                error={validationErrors.pn}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="wc"
                label="WC"
                value={formData.wc || 0}
                onChange={(value) => handleInputChange('wc', value)}
                error={validationErrors.wc}
                disabled={formStatus === 'final'}
              />
            </div>
            
            <h2 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 pt-4">
              Patient Movement
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NumberInput
                id="newAdmit"
                label="New Admit"
                value={formData.newAdmit || 0}
                onChange={(value) => handleInputChange('newAdmit', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="transferIn"
                label="Transfer In"
                value={formData.transferIn || 0}
                onChange={(value) => handleInputChange('transferIn', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="referIn"
                label="Refer In"
                value={formData.referIn || 0}
                onChange={(value) => handleInputChange('referIn', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="transferOut"
                label="Transfer Out"
                value={formData.transferOut || 0}
                onChange={(value) => handleInputChange('transferOut', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="referOut"
                label="Refer Out"
                value={formData.referOut || 0}
                onChange={(value) => handleInputChange('referOut', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="discharge"
                label="Discharge"
                value={formData.discharge || 0}
                onChange={(value) => handleInputChange('discharge', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="dead"
                label="Dead"
                value={formData.dead || 0}
                onChange={(value) => handleInputChange('dead', value)}
                disabled={formStatus === 'final'}
              />
            </div>
            
            <h2 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 pt-4">
              Bed Status
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NumberInput
                id="available"
                label="Available"
                value={formData.available || 0}
                onChange={(value) => handleInputChange('available', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="unavailable"
                label="Unavailable"
                value={formData.unavailable || 0}
                onChange={(value) => handleInputChange('unavailable', value)}
                disabled={formStatus === 'final'}
              />
              
              <NumberInput
                id="plannedDischarge"
                label="Planned Discharge"
                value={formData.plannedDischarge || 0}
                onChange={(value) => handleInputChange('plannedDischarge', value)}
                disabled={formStatus === 'final'}
              />
            </div>
            
            <div className="pt-4">
              <Input
                id="comment"
                label="Comment"
                value={formData.comment || ''}
                onChange={(e) => handleInputChange('comment', e.target.value)}
                disabled={formStatus === 'final'}
                className="w-full"
              />
            </div>
            
            <h2 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 pt-4">
              Recorder Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="firstName"
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={validationErrors.firstName}
                disabled={formStatus === 'final'}
              />
              
              <Input
                id="lastName"
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={validationErrors.lastName}
                disabled={formStatus === 'final'}
              />
            </div>
            
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
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Button
                  variant="secondary"
                  icon={FiSave}
                  onClick={() => handleSave('draft')}
                  isLoading={isSaving && modalAction === 'draft'}
                  disabled={
                    isSaving || 
                    (shift === 'night' && !morningShiftApproved)
                  }
                >
                  Save Draft
                </Button>
                
                <Button
                  variant="primary"
                  icon={FiCheck}
                  onClick={() => handleSave('final')}
                  isLoading={isSaving && modalAction === 'final'}
                  disabled={
                    isSaving || 
                    (shift === 'night' && !morningShiftApproved)
                  }
                >
                  Save Final
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Confirmation Modal for Final Save */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Finalize Form"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowConfirmModal(false);
                saveFormData('final');
              }}
              isLoading={isSaving && modalAction === 'final'}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="py-2">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to finalize this form? Once finalized, you will not be able to edit it without supervisor assistance.
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
    </div>
  );
} 