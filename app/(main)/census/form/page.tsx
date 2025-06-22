'use client';

import DailyCensusForm from '@/app/features/ward-form/DailyCensusForm';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';

export default function CensusFormPage() {
  return (
    <ProtectedPage requiredRole={[UserRole.NURSE, UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER]}>
      <DailyCensusForm />
    </ProtectedPage>
  );
} 