'use client';

import LogViewer from '@/app/features/admin/LogViewer';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';

export default function AdminDevToolsPage() {
  return (
    <ProtectedPage requiredRole={[UserRole.DEVELOPER]}>
      <LogViewer />
    </ProtectedPage>
  );
} 