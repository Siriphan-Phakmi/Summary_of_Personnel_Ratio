'use client';

import React from 'react';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import NumberInput from '@/app/components/wardForm/NumberInput';
import { WardFormData } from '@/app/types/ward';

interface ApprovalFormEditorProps {
  showEditModal: boolean;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedForm: WardFormData | null;
  editFormData: Partial<WardFormData>;
  handleEditFormChange: (field: keyof WardFormData, value: number | string) => void;
  handleEditSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

const ApprovalFormEditor: React.FC<ApprovalFormEditorProps> = ({
  showEditModal,
  setShowEditModal,
  selectedForm,
  editFormData,
  handleEditFormChange,
  handleEditSubmit,
  isSubmitting,
}) => {
  if (!selectedForm) return null;

  return (
    <Modal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      title={`Edit Form: ${selectedForm.wardName} - ${selectedForm.shift === 'morning' ? 'Morning' : 'Night'}`}
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setShowEditModal(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleEditSubmit}
            isLoading={isSubmitting}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Patient Data</h3>
            
            <NumberInput
              id="patientCensus"
              label="Patient Census"
              value={editFormData.patientCensus || 0}
              onChange={(value) => handleEditFormChange('patientCensus', value)}
            />
            
            <NumberInput
              id="nurseManager"
              label="Nurse Manager"
              value={editFormData.nurseManager || 0}
              onChange={(value) => handleEditFormChange('nurseManager', value)}
            />
            
            <NumberInput
              id="rn"
              label="RN"
              value={editFormData.rn || 0}
              onChange={(value) => handleEditFormChange('rn', value)}
            />
            
            <NumberInput
              id="pn"
              label="PN"
              value={editFormData.pn || 0}
              onChange={(value) => handleEditFormChange('pn', value)}
            />
            
            <NumberInput
              id="wc"
              label="WC"
              value={editFormData.wc || 0}
              onChange={(value) => handleEditFormChange('wc', value)}
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Patient Movement</h3>
            
            <NumberInput
              id="newAdmit"
              label="New Admit"
              value={editFormData.newAdmit || 0}
              onChange={(value) => handleEditFormChange('newAdmit', value)}
            />
            
            <NumberInput
              id="transferIn"
              label="Transfer In"
              value={editFormData.transferIn || 0}
              onChange={(value) => handleEditFormChange('transferIn', value)}
            />
            
            <NumberInput
              id="referIn"
              label="Refer In"
              value={editFormData.referIn || 0}
              onChange={(value) => handleEditFormChange('referIn', value)}
            />
            
            <NumberInput
              id="transferOut"
              label="Transfer Out"
              value={editFormData.transferOut || 0}
              onChange={(value) => handleEditFormChange('transferOut', value)}
            />
            
            <NumberInput
              id="referOut"
              label="Refer Out"
              value={editFormData.referOut || 0}
              onChange={(value) => handleEditFormChange('referOut', value)}
            />
            
            <NumberInput
              id="discharge"
              label="Discharge"
              value={editFormData.discharge || 0}
              onChange={(value) => handleEditFormChange('discharge', value)}
            />
            
            <NumberInput
              id="dead"
              label="Dead"
              value={editFormData.dead || 0}
              onChange={(value) => handleEditFormChange('dead', value)}
            />
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Bed Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NumberInput
              id="available"
              label="Available"
              value={editFormData.available || 0}
              onChange={(value) => handleEditFormChange('available', value)}
            />
            
            <NumberInput
              id="unavailable"
              label="Unavailable"
              value={editFormData.unavailable || 0}
              onChange={(value) => handleEditFormChange('unavailable', value)}
            />
            
            <NumberInput
              id="plannedDischarge"
              label="Planned Discharge"
              value={editFormData.plannedDischarge || 0}
              onChange={(value) => handleEditFormChange('plannedDischarge', value)}
            />
          </div>
        </div>
        
        <div className="mt-6">
          <Input
            id="comment"
            label="Comment"
            value={editFormData.comment || ''}
            onChange={(e) => handleEditFormChange('comment', e.target.value)}
            className="w-full"
          />
        </div>
      </div>
    </Modal>
  );
};

export default ApprovalFormEditor; 