'use client';

import React, { useState } from 'react';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserRole } from '@/app/features/auth/types/user';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Ward } from '@/app/features/ward-form/types/ward';

const CreateUserForm = () => {
  const { wards, createUser, loading: isSubmitting } = useUserManagement();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: UserRole.NURSE,
    assignedWardId: '',
    approveWardIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, approveWardIds: selectedOptions }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.username) newErrors.username = 'Username is required.';
    if (!formData.password) newErrors.password = 'Password is required.';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    if (!formData.role) newErrors.role = 'Role is required.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const { confirmPassword, ...userData } = formData;
    const success = await createUser(userData);
    if (success) {
      // Reset form on success
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: UserRole.NURSE,
        assignedWardId: '',
        approveWardIds: [],
      });
    }
  };

  const commonInputClass = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white";

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create New User</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Username" id="username" name="username" value={formData.username} onChange={handleInputChange} error={errors.username} required />
          <Input label="First Name" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} />
          <Input label="Last Name" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} />
          <Input label="Password" id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} error={errors.password} required />
          <Input label="Confirm Password" id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} error={errors.confirmPassword} required />
          
          <div>
            <label htmlFor="role" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <select id="role" name="role" value={formData.role} onChange={handleInputChange} className={commonInputClass}>
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {formData.role === UserRole.APPROVER && (
             <div>
              <label htmlFor="approveWardIds" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Wards to Approve (Hold Ctrl/Cmd to select multiple)</label>
              <select id="approveWardIds" name="approveWardIds" multiple value={formData.approveWardIds} onChange={handleMultiSelectChange} className={`${commonInputClass} h-32`}>
                {wards.map((ward: Ward) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
            </div>
          )}

          {(formData.role === UserRole.NURSE) && (
             <div>
              <label htmlFor="assignedWardId" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Ward</label>
              <select id="assignedWardId" name="assignedWardId" value={formData.assignedWardId} onChange={handleInputChange} className={commonInputClass}>
                <option value="">Select a ward</option>
                {wards.map((ward: Ward) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" isLoading={isSubmitting} loadingText="Creating...">
            Create User
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm; 