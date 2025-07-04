'use client';

import { useState, useEffect } from 'react';
import { User, UserRole } from '@/app/features/auth/types/user';
import { Ward } from '@/app/features/ward-form/types/ward';
import { getAllWards } from '@/app/features/ward-form/services/ward-modules/wardQueries';
import { getAllUsers } from '@/app/features/auth/services/userService';
import { showErrorToast, showSuccessToast } from '@/app/lib/utils/toastUtils';

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [wardsData, usersData] = await Promise.all([
          getAllWards(),
          getAllUsers()
        ]);
        
        // ✅ Enhanced Error Handling for Ward Data with Better UX
        if (!wardsData || wardsData.length === 0) {
          console.warn('⚠️ No wards found in database. User ward assignment will be limited.');
          showErrorToast('Warning: No wards found. Please contact administrator to set up ward data.');
        } else {
          console.log(`✅ Successfully loaded ${wardsData.length} wards for user management.`);
        }
        
        // ✅ Safe Data Setting with Fallbacks
        setWards(wardsData || []);
        setUsers(usersData || []);
        
        // ✅ Success Feedback for Development
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 User Management Data Loaded:`, {
            wardsCount: wardsData?.length || 0,
            usersCount: usersData?.length || 0
          });
        }
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch initial data.';
        console.error('❌ User Management Data Loading Error:', err);
        setError(message);
        showErrorToast(message);
        
        // ✅ Fallback to Empty Arrays on Error
        setWards([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const createUser = async (userData: Partial<User> & { password?: string }) => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Client-side Ward Validation before API Call
      if (userData.role === UserRole.NURSE && !userData.assignedWardId) {
        throw new Error('Please select an assigned ward for NURSE role.');
      }
      
      if (userData.role === UserRole.APPROVER && (!userData.approveWardIds || userData.approveWardIds.length === 0)) {
        throw new Error('Please select at least one ward for APPROVER role.');
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error: ${response.status}`);
      }

      showSuccessToast(`User "${result.user.username}" created successfully.`);
      // Refresh the user list with the complete user object from the server
      setUsers(prev => [...prev, result.user]);
      return true;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred during user creation.';
      console.error('❌ User Creation Error:', err);
      setError(message);
      showErrorToast(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (uid: string, userData: Partial<User>) => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Enhanced Client-side Validation before API Call
      if (userData.role === UserRole.NURSE && !userData.assignedWardId) {
        throw new Error('Please select an assigned ward for NURSE role.');
      }
      
      if (userData.role === UserRole.APPROVER && (!userData.approveWardIds || userData.approveWardIds.length === 0)) {
        throw new Error('Please select at least one ward for APPROVER role.');
      }

      const response = await fetch(`/api/admin/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error: ${response.status}`);
      }

      showSuccessToast(`User updated successfully.`);
      // Refresh the user list with the updated data from the server response
      setUsers(prev => prev.map(user => user.uid === uid ? { ...user, ...result.user } : user));
      return true;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred during user update.';
      console.error('❌ User Update Error:', err);
      setError(message);
      showErrorToast(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${uid}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error: ${response.status}`);
      }

      showSuccessToast(`User deleted successfully.`);
      // Refresh the user list
      setUsers(prev => prev.filter(user => user.uid !== uid));
      return true;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred during user deletion.';
      console.error('❌ User Deletion Error:', err);
      setError(message);
      showErrorToast(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error: ${response.status}`);
      }

      showSuccessToast('User status updated successfully.');
      
      // ✅ Enhanced Debugging for Development
      if (process.env.NODE_ENV === 'development') {
        console.log("Updated user data from API:", result.user);
      }

      setUsers(prevUsers => {
        const newUsers = prevUsers.map(user => 
          user.uid === uid ? result.user : user
        );
        if (process.env.NODE_ENV === 'development') {
          console.log("New users state:", newUsers);
        }
        return newUsers;
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred during status toggle.';
      console.error('❌ User Status Toggle Error:', err);
      setError(message);
      showErrorToast(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await getAllUsers();
      setUsers(usersData || []);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Users refreshed: ${usersData?.length || 0} users loaded.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh users.';
      console.error('❌ User Refresh Error:', err);
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    wards,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    refreshUsers,
  };
}; 