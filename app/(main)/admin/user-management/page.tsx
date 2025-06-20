'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/app/features/auth/AuthContext';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { User, UserRole } from '@/app/features/auth/types/user';
import CreateUserForm from '@/app/features/admin/components/CreateUserForm';
import UserList from '@/app/features/admin/components/UserList';
import { useUserManagement } from '@/app/features/admin/hooks/useUserManagement';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Button } from '@/app/components/ui/Button';
import EditUserModal from '@/app/features/admin/components/EditUserModal';

// Main component for User Management
const UserManagementComponent = () => {
  const { users, wards, loading, error, updateUser, deleteUser, toggleUserStatus } = useUserManagement();
  const [isCreateFormVisible, setCreateFormVisible] = useState(false);
  
  // State for the edit modal
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleToggleStatus = async (uid: string, currentStatus: boolean) => {
    await toggleUserStatus(uid, !currentStatus);
  };
  
  const handleDelete = async (uid: string) => {
    await deleteUser(uid);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
  }

  const handleUpdateUser = async (uid: string, data: Partial<User>) => {
    const success = await updateUser(uid, data);
    if (success) {
      handleCloseModal();
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            User Management
            </h1>
            <p className="mt-1 text-md text-gray-600 dark:text-gray-400">
            Create, view, and manage user accounts in the system.
            </p>
        </div>
        <Button onClick={() => setCreateFormVisible(!isCreateFormVisible)} variant="default">
            {isCreateFormVisible ? 'Hide Form' : 'Add New User'}
        </Button>
      </header>

      <div className="space-y-8">
        {isCreateFormVisible && <CreateUserForm />}
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">All Users</h2>
          {loading && users.length === 0 && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {!error && (
            <UserList 
              users={users} 
              onEdit={handleEditClick} 
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          )}
        </div>
      </div>
      
      {isEditModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={handleCloseModal}
          onUpdate={handleUpdateUser}
          wards={wards}
        />
      )}
    </div>
  );
};

// Page Wrapper for the Route
const UserManagementPage = () => {
  return (
    <AuthProvider>
      <ProtectedPage requiredRole={[UserRole.ADMIN, UserRole.DEVELOPER]}>
        <UserManagementComponent />
      </ProtectedPage>
    </AuthProvider>
  );
};

export default UserManagementPage; 