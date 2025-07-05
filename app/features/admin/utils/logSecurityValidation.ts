import { UserRole, User } from '@/app/features/auth/types/user';

/**
 * Security validation for log deletion operations
 * Only DEVELOPER role is allowed to perform bulk delete operations
 */

export interface SecurityValidationResult {
  isAllowed: boolean;
  reason?: string;
  userRole: UserRole | 'UNKNOWN';
}

/**
 * Validates if user has permission to delete all logs
 * @param user Current user
 * @returns Validation result
 */
export const validateDeleteAllLogsPermission = (user: User | null): SecurityValidationResult => {
  if (!user) {
    return {
      isAllowed: false,
      reason: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
      userRole: 'UNKNOWN'
    };
  }

  if (user.role !== UserRole.DEVELOPER) {
    return {
      isAllowed: false,
      reason: `การลบ logs ทั้งหมดใช้ได้เฉพาะ DEVELOPER เท่านั้น (บทบาทปัจจุบัน: ${user.role})`,
      userRole: user.role
    };
  }

  if (!user.isActive) {
    return {
      isAllowed: false,
      reason: 'บัญชีผู้ใช้ถูกปิดใช้งาน ไม่สามารถดำเนินการได้',
      userRole: user.role
    };
  }

  return {
    isAllowed: true,
    userRole: user.role
  };
};

/**
 * Validates if user has permission to delete selected logs
 * @param user Current user
 * @param selectedCount Number of selected logs
 * @returns Validation result
 */
export const validateDeleteSelectedLogsPermission = (user: User | null, selectedCount: number): SecurityValidationResult => {
  if (!user) {
    return {
      isAllowed: false,
      reason: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
      userRole: 'UNKNOWN'
    };
  }

  if (selectedCount === 0) {
    return {
      isAllowed: false,
      reason: 'ไม่มีรายการที่เลือกสำหรับการลบ',
      userRole: user.role
    };
  }

  // Allow DEVELOPER and ADMIN to delete selected logs
  if (user.role !== UserRole.DEVELOPER && user.role !== UserRole.ADMIN) {
    return {
      isAllowed: false,
      reason: `การลบ logs ที่เลือกใช้ได้เฉพาะ DEVELOPER และ ADMIN เท่านั้น (บทบาทปัจจุบัน: ${user.role})`,
      userRole: user.role
    };
  }

  if (!user.isActive) {
    return {
      isAllowed: false,
      reason: 'บัญชีผู้ใช้ถูกปิดใช้งาน ไม่สามารถดำเนินการได้',
      userRole: user.role
    };
  }

  // Extra validation for large selections (> 100 logs)
  if (selectedCount > 100 && user.role !== UserRole.DEVELOPER) {
    return {
      isAllowed: false,
      reason: `การลบ logs มากกว่า 100 รายการต้องมีสิทธิ์ DEVELOPER (เลือกไว้: ${selectedCount} รายการ)`,
      userRole: user.role
    };
  }

  return {
    isAllowed: true,
    userRole: user.role
  };
};

/**
 * Validates if user has permission to perform cleanup operations
 * @param user Current user
 * @param days Number of days for cleanup
 * @returns Validation result
 */
export const validateCleanupLogsPermission = (user: User | null, days: number): SecurityValidationResult => {
  if (!user) {
    return {
      isAllowed: false,
      reason: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
      userRole: 'UNKNOWN'
    };
  }

  // Allow DEVELOPER and ADMIN to perform cleanup
  if (user.role !== UserRole.DEVELOPER && user.role !== UserRole.ADMIN) {
    return {
      isAllowed: false,
      reason: `การทำความสะอาด logs ใช้ได้เฉพาะ DEVELOPER และ ADMIN เท่านั้น (บทบาทปัจจุบัน: ${user.role})`,
      userRole: user.role
    };
  }

  if (!user.isActive) {
    return {
      isAllowed: false,
      reason: 'บัญชีผู้ใช้ถูกปิดใช้งาน ไม่สามารถดำเนินการได้',
      userRole: user.role
    };
  }

  if (days <= 0) {
    return {
      isAllowed: false,
      reason: 'จำนวนวันสำหรับการทำความสะอาดต้องเป็นค่าบวก',
      userRole: user.role
    };
  }

  // Extra caution for very recent logs (< 7 days)
  if (days < 7 && user.role !== UserRole.DEVELOPER) {
    return {
      isAllowed: false,
      reason: `การลบ logs ที่อายุน้อยกว่า 7 วันต้องมีสิทธิ์ DEVELOPER (ระบุ: ${days} วัน)`,
      userRole: user.role
    };
  }

  return {
    isAllowed: true,
    userRole: user.role
  };
};

/**
 * Logs security violations for audit purposes
 * @param user User who attempted the action
 * @param action Action that was attempted
 * @param reason Reason for denial
 */
export const logSecurityViolation = async (user: User | null, action: string, reason: string): Promise<void> => {
  console.warn(`🚨 [SECURITY_VIOLATION] User: ${user?.username || 'unknown'} (${user?.role || 'unknown'}) attempted: ${action}. Denied: ${reason}`);
  
  // In a real application, you might want to save this to a separate security audit log
  // await saveSecurityAuditLog({ user, action, reason, timestamp: new Date() });
}; 