'use client';

import React, { useState, useMemo } from 'react';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserRole } from '@/app/features/auth/types/user';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Ward } from '@/app/features/ward-form/types/ward';
import { validatePasswordStrength, validateUsername } from './helpers/editUserModalHelpers';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Real-time validation with useMemo
  const passwordValidation = useMemo(() => 
    validatePasswordStrength(formData.password, formData.confirmPassword),
    [formData.password, formData.confirmPassword]
  );

  const usernameValidation = useMemo(() => 
    validateUsername(formData.username),
    [formData.username]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, approveWardIds: selectedOptions }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Username validation
    if (!usernameValidation.isValid) {
      newErrors.username = usernameValidation.error || 'ข้อมูล Username ไม่ถูกต้อง';
    }
    
    // Password validation (แปลเป็นภาษาไทย)
    if (!passwordValidation.isValid) {
      const thaiErrors = passwordValidation.errors.map(error => {
        switch (error) {
          case 'Password is required':
            return 'กรุณากรอกรหัสผ่าน';
          case 'Password must be at least 8 characters long':
            return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
          case 'Password must contain at least one uppercase letter':
            return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว';
          case 'Password must contain at least one lowercase letter':
            return 'รหัสผ่านต้องมีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว';
          case 'Password must contain at least one number':
            return 'รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว';
          case 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)':
            return 'รหัสผ่านต้องมีอักขระพิเศษ (!@#$%^&*(),.?":{}|<>) อย่างน้อย 1 ตัว';
          case 'Password confirmation is required':
            return 'กรุณายืนยันรหัสผ่าน';
          case 'Passwords do not match':
            return 'รหัสผ่านไม่ตรงกัน';
          default:
            return error;
        }
      });
      newErrors.password = thaiErrors.join(', ');
    }
    
    if (!formData.role) newErrors.role = 'กรุณาเลือกบทบาท';
    
    // Name validation
    if (formData.firstName && formData.firstName.length > 100) {
      newErrors.firstName = 'ชื่อต้องไม่เกิน 100 ตัวอักษร';
    }
    
    if (formData.lastName && formData.lastName.length > 100) {
      newErrors.lastName = 'นามสกุลต้องไม่เกิน 100 ตัวอักษร';
    }

    // Ward validation
    if (formData.role === UserRole.NURSE && !formData.assignedWardId) {
      newErrors.assignedWardId = 'กรุณาเลือกแผนกที่รับผิดชอบสำหรับพยาบาล';
    }
    
    if (formData.role === UserRole.APPROVER && (!formData.approveWardIds || formData.approveWardIds.length === 0)) {
      newErrors.approveWardIds = 'กรุณาเลือกแผนกที่สามารถอนุมัติได้อย่างน้อย 1 แผนก';
    }
    
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
      setErrors({});
      
      // ✅ **BB's Request**: Refresh page after successful user creation
      window.location.reload();
    }
  };

  // ✅ Password Requirements in Thai
  const passwordRequirements = [
    'ความยาวอย่างน้อย 8 ตัวอักษร',
    'ตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว',
    'ตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว',
    'ตัวเลข (0-9) อย่างน้อย 1 ตัว',
    'อักขระพิเศษ (!@#$%^&*(),.?":{}|<>) อย่างน้อย 1 ตัว',
  ];

  const commonInputClass = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white";

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">สร้างผู้ใช้งานใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="ชื่อผู้ใช้งาน" 
            id="username" 
            name="username" 
            value={formData.username} 
            onChange={handleInputChange} 
            error={errors.username} 
            required 
          />
          <Input 
            label="ชื่อ" 
            id="firstName" 
            name="firstName" 
            value={formData.firstName} 
            onChange={handleInputChange} 
            error={errors.firstName}
          />
          <Input 
            label="นามสกุล" 
            id="lastName" 
            name="lastName" 
            value={formData.lastName} 
            onChange={handleInputChange} 
            error={errors.lastName}
          />
          
          {/* ✅ Password with Show/Hide Toggle */}
          <div className="relative">
            <Input 
              label="รหัสผ่าน" 
              id="password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              value={formData.password} 
              onChange={handleInputChange} 
              error={errors.password} 
              required 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {/* ✅ Confirm Password with Show/Hide Toggle */}
          <div className="relative">
            <Input 
              label="ยืนยันรหัสผ่าน" 
              id="confirmPassword" 
              name="confirmPassword" 
              type={showConfirmPassword ? "text" : "password"} 
              value={formData.confirmPassword} 
              onChange={handleInputChange} 
              error={errors.confirmPassword} 
              required 
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showConfirmPassword ? '🙈' : '👁️'}
            </button>
          </div>
          
          <div>
            <label htmlFor="role" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">บทบาท</label>
            <select id="role" name="role" value={formData.role} onChange={handleInputChange} className={commonInputClass}>
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
          </div>

          {formData.role === UserRole.APPROVER && (
             <div>
              <label htmlFor="approveWardIds" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">แผนกที่สามารถอนุมัติได้ (กด Ctrl/Cmd เพื่อเลือกหลายแผนก)</label>
              <select id="approveWardIds" name="approveWardIds" multiple value={formData.approveWardIds} onChange={handleMultiSelectChange} className={`${commonInputClass} h-32`}>
                {wards.map((ward: Ward) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
              {errors.approveWardIds && <p className="mt-1 text-sm text-red-600">{errors.approveWardIds}</p>}
            </div>
          )}

          {(formData.role === UserRole.NURSE) && (
             <div>
              <label htmlFor="assignedWardId" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">แผนกที่รับผิดชอบ</label>
              <select id="assignedWardId" name="assignedWardId" value={formData.assignedWardId} onChange={handleInputChange} className={commonInputClass}>
                <option value="">เลือกแผนก</option>
                {wards.map((ward: Ward) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
              {errors.assignedWardId && <p className="mt-1 text-sm text-red-600">{errors.assignedWardId}</p>}
            </div>
          )}
        </div>

        {/* ✅ Password Requirements Display */}
        {(formData.password || formData.confirmPassword) && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">ข้อกำหนดรหัสผ่าน:</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              {passwordRequirements.map((requirement, index) => (
                <li key={index} className="flex items-center">
                  <span className="mr-2">•</span>
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ✅ Real-time Validation Feedback */}
        {passwordValidation.hasInput && !passwordValidation.isValid && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">
              💡 {passwordValidation.errors.map(error => {
                switch (error) {
                  case 'Password must be at least 8 characters long':
                    return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
                  case 'Password must contain at least one uppercase letter':
                    return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว';
                  case 'Password must contain at least one lowercase letter':
                    return 'รหัสผ่านต้องมีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว';
                  case 'Password must contain at least one number':
                    return 'รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว';
                  case 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)':
                    return 'รหัสผ่านต้องมีอักขระพิเศษ (!@#$%^&*(),.?":{}|<>) อย่างน้อย 1 ตัว';
                  case 'Passwords do not match':
                    return 'รหัสผ่านไม่ตรงกัน';
                  default:
                    return error;
                }
              }).join(', ')}
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            isLoading={isSubmitting} 
            loadingText="กำลังสร้างผู้ใช้งาน..."
            disabled={!passwordValidation.isValid || !usernameValidation.isValid || isSubmitting}
          >
            สร้างผู้ใช้งาน
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm; 