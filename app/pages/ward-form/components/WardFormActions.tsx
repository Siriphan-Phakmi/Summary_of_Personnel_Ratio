'use client';

import React from 'react';
import Button from '@/app/components/Button';
import { FaSave, FaCheck, FaTrash, FaFileExport } from 'react-icons/fa';

interface WardFormActionsProps {
  isSubmitting: boolean;
  isSavingDraft: boolean;
  isFormValid: boolean;
  formStatus: string;
  handleSaveDraft: () => void;
  handleSubmit: () => void;
  handleReset: () => void;
  handleExport?: () => void;
}

const WardFormActions: React.FC<WardFormActionsProps> = ({
  isSubmitting,
  isSavingDraft,
  isFormValid,
  formStatus,
  handleSaveDraft,
  handleSubmit,
  handleReset,
  handleExport
}) => {
  const isFinal = formStatus === 'final';
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mt-6">
      <div className="flex flex-wrap gap-4 justify-end">
        {!isFinal && (
          <>
            <Button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <FaSave className="w-4 h-4" />
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              variant="primary"
              className="flex items-center gap-2"
            >
              <FaCheck className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </Button>
            
            <Button
              onClick={handleReset}
              variant="danger"
              className="flex items-center gap-2"
            >
              <FaTrash className="w-4 h-4" />
              Reset Form
            </Button>
          </>
        )}
        
        {handleExport && (
          <Button
            onClick={handleExport}
            variant="success"
            className="flex items-center gap-2"
          >
            <FaFileExport className="w-4 h-4" />
            Export Data
          </Button>
        )}
      </div>
    </div>
  );
};

export default WardFormActions; 