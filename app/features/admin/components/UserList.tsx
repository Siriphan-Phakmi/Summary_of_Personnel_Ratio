'use client';

import React from 'react';
import { User, UserRole } from '@/app/features/auth/types/user';
import { formatDateSafely } from '@/app/lib/utils/dateUtils';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (uid: string) => void;
  onToggleStatus: (uid: string, currentStatus: boolean) => void;
}

const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete, onToggleStatus }) => {

  const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" | "info" | "success" | "warning" => {
    switch (role) {
      case UserRole.ADMIN: return 'destructive';
      case UserRole.DEVELOPER: return 'info';
      case UserRole.APPROVER: return 'success';
      case UserRole.NURSE: return 'default';
      default: return 'outline';
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created At</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Updated At</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <tr key={user.uid} className="hover:bg-gray-100 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.username}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatDateSafely(user.createdAt)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatDateSafely(user.updatedAt)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                 <div className="flex items-center justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const action = user.isActive ? 'deactivate' : 'activate';
                      if (confirm(`Are you sure you want to ${action} this user?`)) {
                        onToggleStatus(user.uid, user.isActive === true)
                      }
                    }}>
                        {user.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                        <span className="sr-only">Toggle Status</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { if(confirm('Are you sure you want to delete this user? This action cannot be undone.')) onDelete(user.uid) }}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                    </Button>
                 </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList; 