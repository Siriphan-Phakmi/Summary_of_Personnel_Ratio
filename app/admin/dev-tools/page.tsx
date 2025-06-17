'use client';

import LogViewer from '@/app/features/admin/LogViewer';
import { AuthProvider } from '@/app/features/auth/AuthContext';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';

export default function AdminDevToolsPage() {
  return (
    <AuthProvider>
      <ProtectedPage requiredRole={[UserRole.ADMIN, UserRole.DEVELOPER]}>
        <LogViewer />
      </ProtectedPage>
    </AuthProvider>
  );
} 