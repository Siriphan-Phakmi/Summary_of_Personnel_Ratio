'use client';

import React from 'react';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';

interface PasswordVerificationModalProps {
  showPasswordModal: boolean;
  setShowPasswordModal: React.Dispatch<React.SetStateAction<boolean>>;
  adminPassword: string;
  setAdminPassword: React.Dispatch<React.SetStateAction<string>>;
  adminPasswordError: string;
  verifyAdminPassword: () => void;
}

const PasswordVerificationModal: React.FC<PasswordVerificationModalProps> = ({
  showPasswordModal,
  setShowPasswordModal,
  adminPassword,
  setAdminPassword,
  adminPasswordError,
  verifyAdminPassword,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAdminPassword();
  };

  return (
    <Modal
      isOpen={showPasswordModal}
      onClose={() => setShowPasswordModal(false)}
      title="Administrator Verification"
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setShowPasswordModal(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={verifyAdminPassword}
            disabled={!adminPassword}
          >
            Verify
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Please enter administrator password to continue.
          </p>
          
          <Input
            id="adminPassword"
            label="Admin Password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            error={adminPasswordError}
            required
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
};

export default PasswordVerificationModal; 