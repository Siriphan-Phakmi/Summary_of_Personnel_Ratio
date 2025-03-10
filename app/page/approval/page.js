'use client';
import Approval from '../../components/approval/Approval';
import PageLayout from '../../components/layouts/PageLayout';

export default function ApprovalPage() {
  return (
    <PageLayout title="อนุมัติข้อมูล" requiredRole="user">
      <Approval />
    </PageLayout>
  );
} 