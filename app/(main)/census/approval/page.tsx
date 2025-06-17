'use client';

import ApprovalPage from '@/app/features/approval/ApprovalPage';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';

export default function CensusApprovalPage() {
  return (
    <ProtectedPage>
      <ApprovalPage />
    </ProtectedPage>
  );
} 