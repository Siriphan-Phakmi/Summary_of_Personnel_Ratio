'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '@/app/features/auth/types/user';
import { Ward } from '@/app/features/ward-form/types/ward';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Label } from '@/app/components/ui/label';
import {
  validateWardSelection,
  getWardValidationMessage,
  validatePasswordStrength,
  passwordRequirements,
  validateUsername,
  PasswordEditState,
  UsernameEditState,
  resetPasswordEditState,
  resetUsernameEditState,
} from './helpers/editUserModalHelpers'; // Assuming you have a Label component

interface EditUserModalProps {
  user: User;
  wards: Ward[];
  onClose: () => void;
  onUpdate: (uid: string, data: Partial<User>) => void;
  onUpdatePassword?: (uid: string, newPassword: string, confirmPassword: string) => Promise<boolean>;
  onUpdateUsername?: (uid: string, newUsername: string) => Promise<boolean>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ 
  user, 
  wards, 
  onClose, 
  onUpdate, 
  onUpdatePassword, 
  onUpdateUsername 
}) => {
  // ✅ **NEW: Store original data for comparison**
  const originalData = useMemo(() => ({
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    assignedWardId: user.assignedWardId,
    approveWardIds: user.approveWardIds || [],
  }), [user]);

  const [formData, setFormData] = useState<Partial<User>>({
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    assignedWardId: user.assignedWardId,
    approveWardIds: user.approveWardIds || [],
  });
  
  // ✅ **Username editing state using helpers**
  const [usernameData, setUsernameData] = useState<UsernameEditState>(
    resetUsernameEditState(user.username)
  );
  
  // ✅ **Password editing state using helpers**
  const [passwordData, setPasswordData] = useState<PasswordEditState>(
    resetPasswordEditState()
  );
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ **NEW: Check if form data has changed (dirty state)**
  const hasFormDataChanged = useMemo(() => {
    return (
      formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName ||
      formData.role !== originalData.role ||
      formData.assignedWardId !== originalData.assignedWardId ||
      JSON.stringify(formData.approveWardIds?.sort()) !== JSON.stringify(originalData.approveWardIds?.sort())
    );
  }, [formData, originalData]);

  // ✅ **NEW: Check if username has changed**
  const hasUsernameChanged = useMemo(() => {
    return usernameData.newUsername.trim() !== user.username.trim();
  }, [usernameData.newUsername, user.username]);

  // ✅ **NEW: Check if password has been entered**
  const hasPasswordInput = useMemo(() => {
    return passwordData.newPassword.trim() !== '' || passwordData.confirmPassword.trim() !== '';
  }, [passwordData.newPassword, passwordData.confirmPassword]);

  // ✅ Ward validation using helpers
  const isWardSelectionValid = (): boolean => validateWardSelection(formData);
  const getValidationMessage = (): string | null => getWardValidationMessage(formData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setError(null);
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleWardSelection = (selectedWards: string[]) => {
    setError(null);
    setFormData(prev => ({ ...prev, approveWardIds: selectedWards }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // ✅ Reuse validation logic (DRY principle)
    const validationMessage = getValidationMessage();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    
    onUpdate(user.uid, formData);
  };

  // ✅ **NEW: Handle username update**
  const handleUsernameUpdate = async () => {
    if (!onUpdateUsername) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const success = await onUpdateUsername(user.uid, usernameData.newUsername);
      if (success) {
        setUsernameData(prev => ({ ...prev, isEditingUsername: false }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  // ✅ **Password Validation Helper Functions**
  // ✅ **Password validation using helper with useMemo**
  const passwordValidation = useMemo(() => 
    validatePasswordStrength(passwordData.newPassword, passwordData.confirmPassword),
    [passwordData.newPassword, passwordData.confirmPassword]
  );

  // ✅ **NEW: Handle password update with Enhanced Validation**
  const handlePasswordUpdate = async () => {
    if (!onUpdatePassword) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // ✅ Use validation helper
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }
      
      const trimmedPassword = passwordData.newPassword?.trim() || '';
      const trimmedConfirmPassword = passwordData.confirmPassword?.trim() || '';
      
      const success = await onUpdatePassword(user.uid, trimmedPassword, trimmedConfirmPassword);
      if (success) {
        setPasswordData(resetPasswordEditState());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.role !== UserRole.NURSE) {
        setFormData(prev => ({...prev, assignedWardId: undefined}));
    }
    if (formData.role !== UserRole.APPROVER) {
        setFormData(prev => ({...prev, approveWardIds: []}));
    }
  }, [formData.role]);

  // ✅ Calculate if Save button should be disabled
  const isSaveDisabled = !isWardSelectionValid();
  const currentValidationMessage = getValidationMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Edit User: {user.username}</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">⚠️ {error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ **NEW: Username Editing Section** */}
          <div className="border-b pb-4 mb-4 dark:border-gray-600">
            <Label htmlFor="username">Username</Label>
            {!usernameData.isEditingUsername ? (
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                <span className="text-gray-900 dark:text-white font-mono">{user.username}</span>
                {onUpdateUsername && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setUsernameData(prev => ({ ...prev, isEditingUsername: true }))}
                    disabled={loading}
                  >
                    Edit
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={usernameData.newUsername}
                  onChange={(e) => setUsernameData(prev => ({ ...prev, newUsername: e.target.value }))}
                  placeholder="Enter new username"
                  disabled={loading}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant="primary" 
                    size="sm"
                    onClick={handleUsernameUpdate}
                    disabled={loading || !usernameData.newUsername.trim() || !hasUsernameChanged}
                    className={(!hasUsernameChanged || loading) ? 'opacity-50 cursor-not-allowed' : ''}
                    title={!hasUsernameChanged ? 'No changes to save' : 'Save username changes'}
                  >
                    Save
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setUsernameData(resetUsernameEditState(user.username))}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ✅ **NEW: Password Editing Section** */}
          <div className="border-b pb-4 mb-4 dark:border-gray-600">
            <Label>Password</Label>
            {!passwordData.isEditingPassword ? (
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                <span className="text-gray-500 dark:text-gray-400">••••••••</span>
                {onUpdatePassword && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPasswordData(prev => ({ ...prev, isEditingPassword: true }))}
                    disabled={loading}
                  >
                    Change Password
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={passwordData.showPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    disabled={loading}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    disabled={loading}
                  >
                    {passwordData.showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                                <Input
                  type={passwordData.showPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  disabled={loading}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                
                {/* ✅ **Password Requirements Helper Text** */}
                {passwordData.isEditingPassword && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Password Requirements:</p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400">
                      {passwordRequirements.map((requirement, index) => (
                        <li key={index}>• {requirement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* ✅ **Real-time Password Validation Feedback** */}
                {passwordValidation.hasInput && passwordValidation.errors.length > 0 && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300">
                      {passwordValidation.errors.map((error: string, index: number) => (
                        <li key={index} className="flex items-center">
                          <span className="mr-1">⚠️</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant="primary" 
                    size="sm"
                    onClick={handlePasswordUpdate}
                    disabled={loading || !passwordValidation.isValid || !hasPasswordInput}
                    className={(!passwordValidation.isValid || !hasPasswordInput || loading) ? 'opacity-50 cursor-not-allowed' : ''}
                    title={
                      !hasPasswordInput 
                        ? 'Enter password to save changes'
                        : passwordValidation.isValid 
                        ? 'Save password changes' 
                        : passwordValidation.errors[0] || 'Please fix validation errors'
                    }
                  >
                    Save Password
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPasswordData(resetPasswordEditState())}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName" 
              name="firstName" 
              value={formData.firstName || ''} 
              onChange={handleInputChange}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName" 
              name="lastName" 
              value={formData.lastName || ''} 
              onChange={handleInputChange}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="role">Role</Label>
            <select 
              id="role" 
              name="role" 
              value={formData.role} 
              onChange={handleInputChange} 
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                {Object.values(UserRole).map(roleValue => (
                    <option key={roleValue} value={roleValue}>{roleValue}</option>
                ))}
            </select>
          </div>

          {formData.role === UserRole.NURSE && (
             <div>
                <Label htmlFor="assignedWardId">Assigned Ward</Label>
                 <select 
                   id="assignedWardId" 
                   name="assignedWardId" 
                   value={formData.assignedWardId || ''} 
                   onChange={handleInputChange} 
                   className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 >
                     <option value="">Select a ward</option>
                     {wards && wards.length > 0 ? (
                       wards.map(ward => (
                         <option key={ward.id} value={ward.id}>{ward.name}</option>
                       ))
                     ) : (
                       <option disabled>No wards available</option>
                     )}
                 </select>
                 {(!wards || wards.length === 0) && (
                   <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                     ⚠️ Warning: No wards found. Please contact administrator.
                   </p>
                 )}
             </div>
          )}
            
          {formData.role === UserRole.APPROVER && (
            <div>
              <Label>Approvable Wards</Label>
              {wards && wards.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 max-h-40 overflow-y-auto">
                  {wards.map(ward => (
                    <div key={ward.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`ward-${ward.id}`}
                        checked={formData.approveWardIds?.includes(ward.id) || false}
                        onChange={(e) => {
                          setError(null);
                          const newSelection = e.target.checked
                            ? [...(formData.approveWardIds || []), ward.id]
                            : (formData.approveWardIds || []).filter(id => id !== ward.id);
                          handleWardSelection(newSelection);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-500 dark:focus:ring-indigo-400"
                      />
                      <label 
                        htmlFor={`ward-${ward.id}`} 
                        className="ml-2 block text-sm text-gray-900 dark:text-gray-200 cursor-pointer"
                      >
                        {ward.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    ⚠️ No wards available for selection. Please contact administrator to set up wards.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSaveDisabled || !hasFormDataChanged}
              className={(isSaveDisabled || !hasFormDataChanged) ? 'opacity-50 cursor-not-allowed' : ''}
              title={
                !hasFormDataChanged 
                  ? 'No changes to save' 
                  : currentValidationMessage || 'Save changes'
              }
            >
              Save Changes
            </Button>
          </div>
        </form>
        
        {/* ✅ Visual feedback for disabled state */}
        {((isSaveDisabled && currentValidationMessage) || !hasFormDataChanged) && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">
              💡 {!hasFormDataChanged ? 'No changes detected. Modify any field to enable Save Changes button.' : currentValidationMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditUserModal; 