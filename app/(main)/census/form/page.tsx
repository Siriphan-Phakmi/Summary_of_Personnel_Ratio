'use client';

import DailyCensusForm from '@/app/features/ward-form/DailyCensusForm';
import ProtectedPage from '@/app/components/ui/ProtectedPage';

export default function CensusFormPage() {
  return (
    <ProtectedPage>
      <DailyCensusForm />
    </ProtectedPage>
  );
} 