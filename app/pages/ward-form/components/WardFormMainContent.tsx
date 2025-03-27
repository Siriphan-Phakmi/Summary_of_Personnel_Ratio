'use client';

import React from 'react';
import { FiInfo } from 'react-icons/fi';
import NumberInput from '@/app/components/Input/NumberInput';
import Input from '@/app/components/Input';
import { WardFormData } from '@/app/types/ward';

interface WardFormMainContentProps {
  formData: WardFormData;
  handleInputChange: (field: string, value: any) => void;
  validationErrors: Record<string, string>;
  formStatus: string;
  formFieldsDisabled: Record<string, boolean>;
  hasPreviousData: boolean;
  shift: string;
  morningShiftFinalized: boolean;
  firstName: string;
  lastName: string;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
}

const WardFormMainContent: React.FC<WardFormMainContentProps> = ({
  formData,
  handleInputChange,
  validationErrors,
  formStatus,
  formFieldsDisabled,
  hasPreviousData,
  shift,
  morningShiftFinalized,
  firstName,
  lastName,
  setFirstName,
  setLastName
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
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
              (shift === 'night' && morningShiftFinalized) ||
              formFieldsDisabled.patientCensus
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
      </div>
    </div>
  );
};

export default WardFormMainContent; 