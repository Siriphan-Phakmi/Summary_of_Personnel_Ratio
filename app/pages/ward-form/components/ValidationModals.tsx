'use client';

import React from 'react';
import Modal from '@/app/components/Modal';
import Button from '@/app/components/Button';
import { FaExclamationTriangle, FaCheck } from 'react-icons/fa';

interface ValidationModalsProps {
  showSuccessModal: boolean;
  showConfirmModal: boolean;
  showErrorModal: boolean;
  showWarningModal: boolean;
  setShowSuccessModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowErrorModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWarningModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleConfirmSubmit: () => void;
  validationErrors: string[];
  validationWarnings: string[];
}

const ValidationModals: React.FC<ValidationModalsProps> = ({
  showSuccessModal,
  showConfirmModal,
  showErrorModal,
  showWarningModal,
  setShowSuccessModal,
  setShowConfirmModal,
  setShowErrorModal,
  setShowWarningModal,
  handleConfirmSubmit,
  validationErrors,
  validationWarnings
}) => {
  return (
    <>
      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Form Submitted Successfully"
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <FaCheck className="text-green-600 text-3xl" />
            </div>
          </div>
          <p className="mb-6">
            Your form has been submitted successfully. The data is now awaiting review.
          </p>
          <Button onClick={() => setShowSuccessModal(false)} variant="primary" className="w-full">
            Close
          </Button>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Submission"
      >
        <div>
          <p className="mb-6">
            Are you sure you want to submit this form? Once submitted, it cannot be modified.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setShowConfirmModal(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirmSubmit} variant="primary" className="flex-1">
              Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Validation Errors"
      >
        <div>
          <div className="flex items-center mb-4">
            <div className="bg-red-100 p-3 rounded-full mr-3">
              <FaExclamationTriangle className="text-red-600 text-2xl" />
            </div>
            <p className="font-medium">
              Please fix the following errors before submitting:
            </p>
          </div>
          <ul className="list-disc pl-10 mb-6 text-red-600 space-y-2">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <Button onClick={() => setShowErrorModal(false)} variant="primary" className="w-full">
            Close
          </Button>
        </div>
      </Modal>

      {/* Warning Modal */}
      <Modal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="Validation Warnings"
      >
        <div>
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 p-3 rounded-full mr-3">
              <FaExclamationTriangle className="text-yellow-600 text-2xl" />
            </div>
            <p className="font-medium">
              The following warnings were detected:
            </p>
          </div>
          <ul className="list-disc pl-10 mb-6 text-yellow-600 space-y-2">
            {validationWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
          <p className="mb-6">
            You can still proceed with the submission, but please verify the information is correct.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setShowWarningModal(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => {
              setShowWarningModal(false);
              setShowConfirmModal(true);
            }} variant="warning" className="flex-1">
              Proceed Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ValidationModals; 