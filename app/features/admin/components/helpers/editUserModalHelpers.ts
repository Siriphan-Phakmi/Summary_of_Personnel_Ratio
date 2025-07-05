import { UserRole, User } from '@/app/features/auth/types/user';

/**
 * Ward Selection Validation for EditUserModal
 */
export const validateWardSelection = (formData: Partial<User>): boolean => {
  if (formData.role === UserRole.NURSE) {
    return !!formData.assignedWardId;
  }
  if (formData.role === UserRole.APPROVER) {
    return !!(formData.approveWardIds && formData.approveWardIds.length > 0);
  }
  return true; // Other roles don't require ward selection
};

/**
 * Get Ward Selection Validation Message
 */
export const getWardValidationMessage = (formData: Partial<User>): string | null => {
  if (formData.role === UserRole.NURSE && !formData.assignedWardId) {
    return 'Please select an assigned ward for NURSE role.';
  }
  if (formData.role === UserRole.APPROVER && (!formData.approveWardIds || formData.approveWardIds.length === 0)) {
    return 'Please select at least one ward for APPROVER role.';
  }
  return null;
};

/**
 * Password Validation Function - Matches Server-side Standards
 */
export const validatePasswordStrength = (password: string, confirmPassword?: string) => {
  const trimmedPassword = password?.trim() || '';
  const trimmedConfirmPassword = confirmPassword?.trim() || '';
  
  const errors: string[] = [];
  let isValid = true;
  
  if (!trimmedPassword) {
    errors.push('Password is required');
    isValid = false;
  } else {
    // Enterprise-grade validation matching server-side requirements
    if (trimmedPassword.length < 8) {
      errors.push('Password must be at least 8 characters long');
      isValid = false;
    }
    
    if (!/[A-Z]/.test(trimmedPassword)) {
      errors.push('Password must contain at least one uppercase letter');
      isValid = false;
    }
    
    if (!/[a-z]/.test(trimmedPassword)) {
      errors.push('Password must contain at least one lowercase letter');
      isValid = false;
    }
    
    if (!/\d/.test(trimmedPassword)) {
      errors.push('Password must contain at least one number');
      isValid = false;
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword)) {
      errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
      isValid = false;
    }
  }
  
  if (confirmPassword !== undefined) {
    if (!trimmedConfirmPassword) {
      errors.push('Password confirmation is required');
      isValid = false;
    } else if (trimmedPassword && trimmedPassword !== trimmedConfirmPassword) {
      errors.push('Passwords do not match');
      isValid = false;
    }
  }
  
  return { isValid, errors, hasInput: !!trimmedPassword || !!trimmedConfirmPassword };
};

/**
 * Password Requirements Component Data
 */
export const passwordRequirements = [
  'At least 8 characters long',
  'At least one uppercase letter (A-Z)',
  'At least one lowercase letter (a-z)',
  'At least one number (0-9)',
  'At least one special character (!@#$%^&*(),.?":{}|<>)',
] as const;

/**
 * Username Validation Function
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username || !username.trim()) {
    return { isValid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Username must not exceed 50 characters' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { isValid: true };
};

/**
 * Password Edit State Interface
 */
export interface PasswordEditState {
  newPassword: string;
  confirmPassword: string;
  isEditingPassword: boolean;
  showPassword: boolean;
}

/**
 * Username Edit State Interface
 */
export interface UsernameEditState {
  newUsername: string;
  isEditingUsername: boolean;
}

/**
 * Reset Password Edit State
 */
export const resetPasswordEditState = (): PasswordEditState => ({
  newPassword: '',
  confirmPassword: '',
  isEditingPassword: false,
  showPassword: false,
});

/**
 * Reset Username Edit State
 */
export const resetUsernameEditState = (currentUsername: string): UsernameEditState => ({
  newUsername: currentUsername,
  isEditingUsername: false,
}); 