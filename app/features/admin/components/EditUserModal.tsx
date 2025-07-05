'use client';

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '@/app/features/auth/types/user';
import { Ward } from '@/app/features/ward-form/types/ward';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Label } from '@/app/components/ui/label'; // Assuming you have a Label component

interface EditUserModalProps {
  user: User;
  wards: Ward[];
  onClose: () => void;
  onUpdate: (uid: string, data: Partial<User>) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, wards, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    assignedWardId: user.assignedWardId,
    approveWardIds: user.approveWardIds || [],
  });
  
  const [error, setError] = useState<string | null>(null);

  // ✅ Lean Code: Ward validation logic
  const isWardSelectionValid = (): boolean => {
    if (formData.role === UserRole.NURSE) {
      return !!formData.assignedWardId;
    }
    if (formData.role === UserRole.APPROVER) {
      return formData.approveWardIds && formData.approveWardIds.length > 0;
    }
    return true; // Other roles don't require ward selection
  };

  // ✅ Validation message for user feedback
  const getValidationMessage = (): string | null => {
    if (formData.role === UserRole.NURSE && !formData.assignedWardId) {
      return 'Please select an assigned ward for NURSE role.';
    }
    if (formData.role === UserRole.APPROVER && (!formData.approveWardIds || formData.approveWardIds.length === 0)) {
      return 'Please select at least one ward for APPROVER role.';
    }
    return null;
  };

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
              disabled={isSaveDisabled}
              className={isSaveDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              title={currentValidationMessage || 'Save changes'}
            >
              Save Changes
            </Button>
          </div>
        </form>
        
        {/* ✅ Visual feedback for disabled state */}
        {isSaveDisabled && currentValidationMessage && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">
              💡 {currentValidationMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditUserModal; 