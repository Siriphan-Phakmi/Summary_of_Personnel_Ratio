'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FiPlus, FiEdit2, FiX, FiCheck, FiUser, FiLock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

import { useAuth } from '@/app/contexts/AuthContext';
import { WardUser, Ward } from '@/app/types/ward';
import { getAllUsers, createUser, updateUser, deactivateUser, reactivateUser } from '@/app/services/userService';
import { getAllWards } from '@/app/services/ward/ward.service';

import Loading from '@/app/components/ui/Loading';
import Button from '@/app/components/ui/Button';
import Modal from '@/app/components/ui/Modal';
import Input from '@/app/components/ui/Input';

export default function UserManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<WardUser[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  
  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  
  // Form data
  const [selectedUser, setSelectedUser] = useState<WardUser | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user' as 'admin' | 'user',
    wards: [] as string[],
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'admin') {
      router.push('/ward-form');
      toast.error('You do not have permission to access this page');
    }
  }, [user, authLoading, router]);

  // Load users and wards
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load users and wards in parallel
        const [usersData, wardsData] = await Promise.all([
          getAllUsers(),
          getAllWards()
        ]);
        
        setUsers(usersData);
        setWards(wardsData);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
        setIsLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user]);

  // Handle add user
  const handleAddUserClick = () => {
    // Reset form data
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'user',
      wards: [],
    });
    setFormErrors({});
    setShowAddUserModal(true);
  };

  // Handle edit user
  const handleEditUserClick = (userToEdit: WardUser) => {
    setSelectedUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      password: '', // Don't include password when editing
      firstName: userToEdit.firstName || '',
      lastName: userToEdit.lastName || '',
      role: userToEdit.role,
      wards: userToEdit.wards || [],
    });
    setFormErrors({});
    setShowEditUserModal(true);
  };

  // Handle deactivate user
  const handleDeactivateUserClick = (userToDeactivate: WardUser) => {
    setSelectedUser(userToDeactivate);
    setShowDeleteUserModal(true);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle ward selection
  const handleWardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setFormData(prev => {
      if (checked) {
        // Add ward if checked
        return {
          ...prev,
          wards: [...prev.wards, value]
        };
      } else {
        // Remove ward if unchecked
        return {
          ...prev,
          wards: prev.wards.filter(wardId => wardId !== value)
        };
      }
    });
  };

  // Validate form
  const validateForm = (isAddingUser: boolean): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (isAddingUser && !formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (isAddingUser && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (formData.wards.length === 0) {
      errors.wards = 'At least one ward must be selected';
    }
    
    setFormErrors(errors);
    
    return Object.keys(errors).length === 0;
  };

  // Add user
  const handleAddUser = async () => {
    if (!validateForm(true)) {
      return;
    }
    
    try {
      await createUser(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.role,
        formData.wards,
        user?.uid || ''
      );
      
      // Reload users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      setShowAddUserModal(false);
      toast.success('User added successfully');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser || !validateForm(false)) {
      return;
    }
    
    try {
      await updateUser(selectedUser.uid, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        wards: formData.wards,
      });
      
      // Reload users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      setShowEditUserModal(false);
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  // Deactivate user
  const handleDeactivateUser = async () => {
    if (!selectedUser) {
      return;
    }
    
    try {
      if (selectedUser.active) {
        await deactivateUser(selectedUser.uid);
        toast.success('User deactivated successfully');
      } else {
        await reactivateUser(selectedUser.uid);
        toast.success('User reactivated successfully');
      }
      
      // Reload users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      setShowDeleteUserModal(false);
    } catch (error) {
      console.error('Error toggling user activation:', error);
      toast.error(`Failed to ${selectedUser.active ? 'deactivate' : 'reactivate'} user`);
    }
  };

  // Render loading state
  if (authLoading) {
    return <Loading fullScreen />;
  }

  // Render if not authenticated or not admin (redirect is handled in useEffect)
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <Button
          variant="primary"
          icon={FiPlus}
          onClick={handleAddUserClick}
        >
          Add User
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loading />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Wards
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <FiUser className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.wards.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.wards.map(wardId => {
                              const ward = wards.find(w => w.id === wardId);
                              return ward ? (
                                <span key={wardId} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                  {ward.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">No wards assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.lastLogin ? format(user.lastLogin, 'yyyy-MM-dd HH:mm') : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditUserClick(user)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <FiEdit2 className="h-5 w-5" />
                            <span className="sr-only">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeactivateUserClick(user)}
                            className={`${
                              user.active
                                ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                            }`}
                          >
                            {user.active ? (
                              <FiX className="h-5 w-5" />
                            ) : (
                              <FiCheck className="h-5 w-5" />
                            )}
                            <span className="sr-only">
                              {user.active ? 'Deactivate' : 'Activate'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add New User"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowAddUserModal(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddUser}
            >
              Add User
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="md:col-span-2">
            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={formErrors.email}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Input
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              error={formErrors.password}
              required
            />
          </div>
          <div>
            <Input
              id="firstName"
              name="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange}
              error={formErrors.firstName}
              required
            />
          </div>
          <div>
            <Input
              id="lastName"
              name="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange}
              error={formErrors.lastName}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assigned Wards
            </label>
            {formErrors.wards && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-1">{formErrors.wards}</p>
            )}
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
              {wards.map(ward => (
                <div key={ward.id} className="flex items-center mb-2">
                  <input
                    id={`ward-${ward.id}`}
                    type="checkbox"
                    value={ward.id}
                    checked={formData.wards.includes(ward.id)}
                    onChange={handleWardChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor={`ward-${ward.id}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {ward.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Edit User Modal */}
      <Modal
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        title="Edit User"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowEditUserModal(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateUser}
            >
              Update User
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="md:col-span-2">
            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={formErrors.email}
              disabled
              required
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Email cannot be changed
            </p>
          </div>
          <div>
            <Input
              id="firstName"
              name="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange}
              error={formErrors.firstName}
              required
            />
          </div>
          <div>
            <Input
              id="lastName"
              name="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange}
              error={formErrors.lastName}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assigned Wards
            </label>
            {formErrors.wards && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-1">{formErrors.wards}</p>
            )}
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
              {wards.map(ward => (
                <div key={ward.id} className="flex items-center mb-2">
                  <input
                    id={`ward-edit-${ward.id}`}
                    type="checkbox"
                    value={ward.id}
                    checked={formData.wards.includes(ward.id)}
                    onChange={handleWardChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor={`ward-edit-${ward.id}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {ward.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Delete/Deactivate User Modal */}
      <Modal
        isOpen={showDeleteUserModal}
        onClose={() => setShowDeleteUserModal(false)}
        title={selectedUser?.active ? "Deactivate User" : "Activate User"}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteUserModal(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant={selectedUser?.active ? "danger" : "success"}
              onClick={handleDeactivateUser}
            >
              {selectedUser?.active ? "Deactivate" : "Activate"}
            </Button>
          </>
        }
      >
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300">
            {selectedUser?.active
              ? `Are you sure you want to deactivate ${selectedUser?.firstName} ${selectedUser?.lastName}? They will no longer be able to log in.`
              : `Are you sure you want to activate ${selectedUser?.firstName} ${selectedUser?.lastName}? They will be able to log in again.`
            }
          </p>
        </div>
      </Modal>
    </div>
  );
} 