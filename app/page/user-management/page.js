'use client';
import dynamic from 'next/dynamic';
import LoadingScreen from '../../components/ui/LoadingScreen';

// โหลดคอมโพเนนต์แบบ dynamic เพื่อหลีกเลี่ยงปัญหา Hydration
const UserManagement = dynamic(
  () => import('../../admin/user-management/page'),
  {
    loading: () => <LoadingScreen />,
    ssr: false
  }
);

export default function UserManagementPage() {
  return <UserManagement />;
} 