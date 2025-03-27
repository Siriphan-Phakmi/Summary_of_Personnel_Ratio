'use client';

import React from 'react';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import NumberInput from '@/app/components/wardForm/NumberInput';
import Input from '@/app/components/ui/Input';
import { DailySummary } from '@/app/types/ward';

interface DailySummaryFormProps {
  showDailySummaryModal: boolean;
  setShowDailySummaryModal: React.Dispatch<React.SetStateAction<boolean>>;
  dailySummaryData: Partial<DailySummary>;
  handleDailySummaryChange: (field: keyof DailySummary, value: number) => void;
  supervisorFirstName: string;
  setSupervisorFirstName: React.Dispatch<React.SetStateAction<string>>;
  supervisorLastName: string;
  setSupervisorLastName: React.Dispatch<React.SetStateAction<string>>;
  handleDailySummarySubmit: () => Promise<void>;
  isSubmitting: boolean;
}

const DailySummaryForm: React.FC<DailySummaryFormProps> = ({
  showDailySummaryModal,
  setShowDailySummaryModal,
  dailySummaryData,
  handleDailySummaryChange,
  supervisorFirstName,
  setSupervisorFirstName,
  supervisorLastName,
  setSupervisorLastName,
  handleDailySummarySubmit,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={showDailySummaryModal}
      onClose={() => setShowDailySummaryModal(false)}
      title="Daily Summary"
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setShowDailySummaryModal(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDailySummarySubmit}
            isLoading={isSubmitting}
            disabled={!supervisorFirstName || !supervisorLastName}
          >
            Save Summary
          </Button>
        </>
      }
    >
      <div className="py-4">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          All ward forms for this date have been approved. Please enter the daily summary data.
        </p>
        
        <div className="space-y-4">
          <NumberInput
            id="opd24hr"
            label="OPD 24hr"
            value={dailySummaryData.opd24hr || 0}
            onChange={(value) => handleDailySummaryChange('opd24hr', value)}
          />
          
          <NumberInput
            id="oldPatient"
            label="Old Patient"
            value={dailySummaryData.oldPatient || 0}
            onChange={(value) => handleDailySummaryChange('oldPatient', value)}
          />
          
          <NumberInput
            id="newPatient"
            label="New Patient"
            value={dailySummaryData.newPatient || 0}
            onChange={(value) => handleDailySummaryChange('newPatient', value)}
          />
          
          <NumberInput
            id="admit24hr"
            label="Admit 24hr"
            value={dailySummaryData.admit24hr || 0}
            onChange={(value) => handleDailySummaryChange('admit24hr', value)}
          />
        </div>
        
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Supervisor Signature</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="supervisorFirstName"
              label="First Name"
              value={supervisorFirstName}
              onChange={(e) => setSupervisorFirstName(e.target.value)}
              required
            />
            
            <Input
              id="supervisorLastName"
              label="Last Name"
              value={supervisorLastName}
              onChange={(e) => setSupervisorLastName(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DailySummaryForm; 