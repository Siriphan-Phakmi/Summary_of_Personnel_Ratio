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
    approveWardIds: user.approveWardIds,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleWardSelection = (selectedWards: string[]) => {
    setFormData(prev => ({ ...prev, approveWardIds: selectedWards }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(user.uid, formData);
  };

  useEffect(() => {
    // Reset fields when role changes
    if (formData.role !== UserRole.NURSE) {
        setFormData(prev => ({...prev, assignedWardId: undefined}));
    }
    if (formData.role !== UserRole.APPROVER) {
        setFormData(prev => ({...prev, approveWardIds: []}));
    }
  }, [formData.role]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Edit User: {user.username}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" name="firstName" value={formData.firstName || ''} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" name="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <select id="role" name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 border rounded">
                {Object.values(UserRole).map(roleValue => (
                    <option key={roleValue} value={roleValue}>{roleValue}</option>
                ))}
            </select>
          </div>

          {/* Conditional fields based on role */}
          {formData.role === UserRole.NURSE && (
             <div>
                <Label htmlFor="assignedWardId">Assigned Ward</Label>
                 <select id="assignedWardId" name="assignedWardId" value={formData.assignedWardId || ''} onChange={handleInputChange} className="w-full p-2 border rounded">
                     <option value="">Select a ward</option>
                     {wards.map(ward => <option key={ward.wardId} value={ward.wardId}>{ward.wardName}</option>)}
                 </select>
             </div>
          )}
            
          {formData.role === UserRole.APPROVER && (
            <div>
              <Label>Approvable Wards</Label>
              <div className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                {wards.map(ward => (
                  <div key={ward.wardId} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`ward-${ward.wardId}`}
                      checked={formData.approveWardIds?.includes(ward.wardId) || false}
                      onChange={(e) => {
                        const newSelection = e.target.checked
                          ? [...(formData.approveWardIds || []), ward.wardId]
                          : (formData.approveWardIds || []).filter(id => id !== ward.wardId);
                        handleWardSelection(newSelection);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`ward-${ward.wardId}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
                      {ward.wardName}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal; 