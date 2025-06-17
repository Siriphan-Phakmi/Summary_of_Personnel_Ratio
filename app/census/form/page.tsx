'use client';

import DailyCensusForm from '@/app/features/ward-form/DailyCensusForm';
import { AuthProvider } from '@/app/features/auth/AuthContext';
import ProtectedPage from '@/app/components/ui/ProtectedPage';

export default function CensusFormPage() {
  return (
    <AuthProvider>
      <ProtectedPage>
        <DailyCensusForm />
      </ProtectedPage>
    </AuthProvider>
  );
} 