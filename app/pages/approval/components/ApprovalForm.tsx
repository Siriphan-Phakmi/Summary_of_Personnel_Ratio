'use client';

import React from 'react';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import { WardFormData } from '@/app/types/ward';

interface ApprovalFormProps {
  showApprovalModal: boolean;
  setShowApprovalModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedForm: WardFormData | null;
  supervisorFirstName: string;
  setSupervisorFirstName: React.Dispatch<React.SetStateAction<string>>;
  supervisorLastName: string;
  setSupervisorLastName: React.Dispatch<React.SetStateAction<string>>;
  handleApprovalSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

const ApprovalForm: React.FC<ApprovalFormProps> = ({
  showApprovalModal,
  setShowApprovalModal,
  selectedForm,
  supervisorFirstName,
  setSupervisorFirstName,
  supervisorLastName,
  setSupervisorLastName,
  handleApprovalSubmit,
  isSubmitting,
}) => {
  if (!selectedForm) return null;

  return (
    <Modal
      isOpen={showApprovalModal}
      onClose={() => setShowApprovalModal(false)}
      title={`Approve Form: ${selectedForm.wardName} - ${selectedForm.shift === 'morning' ? 'Morning' : 'Night'}`}
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setShowApprovalModal(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApprovalSubmit}
            isLoading={isSubmitting}
            disabled={!supervisorFirstName || !supervisorLastName}
          >
            Approve Form
          </Button>
        </>
      }
    >
      <div className="py-4">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          You are about to approve the ward form submitted by {selectedForm.firstName} {selectedForm.lastName}.
          Please confirm your name below to proceed with the approval.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="supervisorFirstName"
            label="Supervisor First Name"
            value={supervisorFirstName}
            onChange={(e) => setSupervisorFirstName(e.target.value)}
            required
          />
          
          <Input
            id="supervisorLastName"
            label="Supervisor Last Name"
            value={supervisorLastName}
            onChange={(e) => setSupervisorLastName(e.target.value)}
            required
          />
        </div>
      </div>
    </Modal>
  );
};

export default ApprovalForm; 