'use client';

import React from 'react';
import { WardFormData } from '@/app/types/ward';
import NumberInput from '@/app/components/wardForm/NumberInput';
import Input from '@/app/components/ui/Input';

interface WardFormFieldsProps {
  formData: Partial<WardFormData>;
  formFieldsDisabled: Record<string, boolean>;
  validationErrors: Record<string, string>;
  handleInputChange: (field: keyof WardFormData, value: number | string) => void;
  calculatePatientCensus?: () => void;
}

const WardFormFields: React.FC<WardFormFieldsProps> = ({
  formData,
  formFieldsDisabled,
  validationErrors,
  handleInputChange,
  calculatePatientCensus
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-xl font-semibold mb-6 text-blue-700 dark:text-blue-400">
          Patient Census
        </h3>
        
        <div className="space-y-4">
          <NumberInput
            label="Patient Census"
            name="patientCensus"
            value={formData.patientCensus || 0}
            onChange={(value) => handleInputChange('patientCensus', value)}
            min={0}
            disabled={formFieldsDisabled.patientCensus}
            error={validationErrors.patientCensus}
            required
          />
          
          <NumberInput
            label="New Admit"
            name="newAdmit"
            value={formData.newAdmit || 0}
            onChange={(value) => handleInputChange('newAdmit', value)}
            min={0}
            error={validationErrors.newAdmit}
            onBlur={calculatePatientCensus}
          />
          
          <NumberInput
            label="Transfer In"
            name="transferIn"
            value={formData.transferIn || 0}
            onChange={(value) => handleInputChange('transferIn', value)}
            min={0}
            error={validationErrors.transferIn}
            onBlur={calculatePatientCensus}
          />
          
          <NumberInput
            label="Refer In"
            name="referIn"
            value={formData.referIn || 0}
            onChange={(value) => handleInputChange('referIn', value)}
            min={0}
            error={validationErrors.referIn}
            onBlur={calculatePatientCensus}
          />
          
          <NumberInput
            label="Discharge"
            name="discharge"
            value={formData.discharge || 0}
            onChange={(value) => handleInputChange('discharge', value)}
            min={0}
            error={validationErrors.discharge}
            onBlur={calculatePatientCensus}
          />
          
          <NumberInput
            label="Transfer Out"
            name="transferOut"
            value={formData.transferOut || 0}
            onChange={(value) => handleInputChange('transferOut', value)}
            min={0}
            error={validationErrors.transferOut}
            onBlur={calculatePatientCensus}
          />
          
          <NumberInput
            label="Refer Out"
            name="referOut"
            value={formData.referOut || 0}
            onChange={(value) => handleInputChange('referOut', value)}
            min={0}
            error={validationErrors.referOut}
            onBlur={calculatePatientCensus}
          />
          
          <NumberInput
            label="Dead"
            name="dead"
            value={formData.dead || 0}
            onChange={(value) => handleInputChange('dead', value)}
            min={0}
            error={validationErrors.dead}
            onBlur={calculatePatientCensus}
          />
          
          <NumberInput
            label="Planned Discharge"
            name="plannedDischarge"
            value={formData.plannedDischarge || 0}
            onChange={(value) => handleInputChange('plannedDischarge', value)}
            min={0}
            error={validationErrors.plannedDischarge}
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-6 text-blue-700 dark:text-blue-400">
          Staff Information
        </h3>
        
        <div className="space-y-4">
          <NumberInput
            label="Nurse Manager"
            name="nurseManager"
            value={formData.nurseManager || 0}
            onChange={(value) => handleInputChange('nurseManager', value)}
            min={0}
            error={validationErrors.nurseManager}
          />
          
          <NumberInput
            label="RN"
            name="rn"
            value={formData.rn || 0}
            onChange={(value) => handleInputChange('rn', value)}
            min={0}
            error={validationErrors.rn}
            required
          />
          
          <NumberInput
            label="PN"
            name="pn"
            value={formData.pn || 0}
            onChange={(value) => handleInputChange('pn', value)}
            min={0}
            error={validationErrors.pn}
          />
          
          <NumberInput
            label="Worker/Clerk"
            name="wc"
            value={formData.wc || 0}
            onChange={(value) => handleInputChange('wc', value)}
            min={0}
            error={validationErrors.wc}
          />
          
          <NumberInput
            label="Available Beds"
            name="available"
            value={formData.available || 0}
            onChange={(value) => handleInputChange('available', value)}
            min={0}
            error={validationErrors.available}
            required
          />
          
          <NumberInput
            label="Unavailable Beds"
            name="unavailable"
            value={formData.unavailable || 0}
            onChange={(value) => handleInputChange('unavailable', value)}
            min={0}
            error={validationErrors.unavailable}
          />
          
          <div className="mt-6">
            <label htmlFor="comment" className="block text-sm font-medium mb-1">
              Comments
            </label>
            <Input
              id="comment"
              name="comment"
              as="textarea"
              value={formData.comment || ''}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              rows={4}
              placeholder="Enter any additional comments here..."
              className="resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WardFormFields; 