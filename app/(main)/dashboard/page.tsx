'use client';

import Dashboard from '@/app/features/dashboard/page';
import ProtectedPage from '@/app/components/ui/ProtectedPage';

export default function DashboardRoutePage() {
  return (
    <ProtectedPage>
      <Dashboard />
    </ProtectedPage>
  );
} 