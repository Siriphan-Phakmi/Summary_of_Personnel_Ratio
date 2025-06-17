'use client';

import ApprovalPage from '@/app/features/approval/ApprovalPage';
import { AuthProvider } from '@/app/features/auth/AuthContext';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';

export default function CensusApprovalPage() {
  return (
    <AuthProvider>
      <ProtectedPage
        requiredRole={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.SUPERVISOR]}
      >
        <ApprovalPage />
      </ProtectedPage>
    </AuthProvider>
  );
} 