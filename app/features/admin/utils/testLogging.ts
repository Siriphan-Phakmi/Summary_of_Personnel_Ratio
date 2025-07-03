/**
 * Utility functions for testing the logging system
 * This file helps administrators verify that logs are being properly saved to Firebase
 * 
 * IMPORTANT: These functions are for testing logging infrastructure only.
 * For production testing, create real users through Firebase Console.
 */

import { User, UserRole } from '@/app/features/auth/types/user';
import { ActionStatus } from '@/app/features/auth/types/log';
import { logLogin, logLogout, logUserAction, logSystemError, logPageAccess } from '@/app/features/auth/services/logService';
import { logUserManagementAction } from '@/app/features/auth/services/userManagementLogService';

/**
 * Test function to verify authentication logging
 * Note: This will create minimal test data. For production, use real Firebase Console users.
 */
export const testAuthenticationLogging = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing authentication logging...');
    console.log('💡 Use real Firebase Console users for production testing');
    
    // Minimal test user for infrastructure testing only
    const minimalTestUser: User = {
      uid: 'test-uid-001',
      username: 'test-system',
      role: UserRole.DEVELOPER,
      firstName: 'System',
      lastName: 'Test',
      isActive: true
    };
    
    // Test login logging
    await logLogin(minimalTestUser);
    console.log('✅ Login log infrastructure test completed');
    
    // Test logout logging
    await logLogout(minimalTestUser);
    console.log('✅ Logout log infrastructure test completed');
    
    return true;
  } catch (error) {
    console.error('❌ Authentication logging test failed:', error);
    return false;
  }
};

/**
 * Test function to verify page access logging
 */
export const testPageAccessLogging = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing page access logging...');
    console.log('💡 Use real Firebase Console users for production testing');
    
    const minimalTestUser: User = {
      uid: 'test-uid-002',
      username: 'test-system',
      role: UserRole.DEVELOPER,
      firstName: 'System',
      lastName: 'Test',
      isActive: true
    };
    
    await logPageAccess(minimalTestUser, '/census/form');
    console.log('✅ Page access log infrastructure test completed');
    
    return true;
  } catch (error) {
    console.error('❌ Page access logging test failed:', error);
    return false;
  }
};

/**
 * Test function to verify user action logging
 */
export const testUserActionLogging = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing user action logging...');
    console.log('💡 Use real Firebase Console users for production testing');
    
    const minimalTestUser: User = {
      uid: 'test-uid-003',
      username: 'test-system',
      role: UserRole.DEVELOPER,
      firstName: 'System',
      lastName: 'Test',
      isActive: true
    };
    
    await logUserAction(
      minimalTestUser,
      'SYSTEM.TEST',
      'SUCCESS',
      { id: 'test-001', type: 'Infrastructure Test' },
      { 
        testContext: 'infrastructure-validation',
        timestamp: new Date().toISOString()
      }
    );
    console.log('✅ User action log infrastructure test completed');
    
    return true;
  } catch (error) {
    console.error('❌ User action logging test failed:', error);
    return false;
  }
};

/**
 * Test function to verify system error logging
 */
export const testSystemErrorLogging = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing system error logging...');
    console.log('💡 Use real Firebase Console users for production testing');
    
    const minimalTestUser: User = {
      uid: 'test-uid-004',
      username: 'test-system',
      role: UserRole.DEVELOPER,
      firstName: 'System',
      lastName: 'Test',
      isActive: true
    };
    
    const testError = new Error('Infrastructure test error for logging validation');
    await logSystemError(testError, 'Logging Infrastructure Test', minimalTestUser);
    console.log('✅ System error log infrastructure test completed');
    
    return true;
  } catch (error) {
    console.error('❌ System error logging test failed:', error);
    return false;
  }
};

/**
 * Test User Management Logs infrastructure
 * IMPORTANT: Creates minimal test data only. Use Firebase Console for production.
 */
export const testUserManagementLogging = async (): Promise<boolean> => {
  console.log('🧪 Testing User Management Logging infrastructure...');
  console.log('💡 IMPORTANT: Create real admin users through Firebase Console for production');
  
  try {
    // Test CREATE_USER action
    await logUserManagementAction({
      action: 'CREATE_USER',
      adminUid: 'test-admin-uid',
      adminUsername: 'test-system',
      targetUid: 'test-target-uid',
      targetUsername: 'test-target',
      details: {
        testMode: true,
        note: 'Infrastructure test only',
        timestamp: new Date().toISOString()
      }
    });

    // Test UPDATE_USER action
    await logUserManagementAction({
      action: 'UPDATE_USER',
      adminUid: 'test-admin-uid',
      adminUsername: 'test-system',
      targetUid: 'test-target-uid',
      targetUsername: 'test-target',
      details: {
        testMode: true,
        updatedFields: ['test-field'],
        timestamp: new Date().toISOString()
      }
    });

    // Test TOGGLE_STATUS action
    await logUserManagementAction({
      action: 'TOGGLE_STATUS',
      adminUid: 'test-admin-uid',
      adminUsername: 'test-system',
      targetUid: 'test-target-uid',
      targetUsername: 'test-target',
      details: {
        testMode: true,
        reason: 'Infrastructure test',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ User Management logging infrastructure test completed');
    return true;
  } catch (error) {
    console.error('❌ User Management logging test failed:', error);
    return false;
  }
};

/**
 * Test User Activity Logs infrastructure
 * IMPORTANT: Creates minimal test data only. Use real user activities for production.
 */
export const testUserActivityLogging = async (): Promise<boolean> => {
  console.log('🧪 Testing User Activity Logging infrastructure...');
  console.log('💡 IMPORTANT: Use real user activities for production testing');
  
  try {
    const minimalTestUser: User = {
      uid: 'test-activity-uid',
      username: 'test-system',
      role: UserRole.DEVELOPER,
      firstName: 'System',
      lastName: 'Test',
      isActive: true
    };

    // Test FORM action
    await logUserAction(
      minimalTestUser,
      'FORM.TEST',
      'SUCCESS' as ActionStatus,
      {
        id: 'test-form-001',
        type: 'INFRASTRUCTURE_TEST',
        displayName: 'Infrastructure Test Form'
      },
      {
        testMode: true,
        note: 'Infrastructure validation only',
        timestamp: new Date().toISOString()
      }
    );

    // Test SYSTEM action
    await logUserAction(
      minimalTestUser,
      'SYSTEM.VALIDATION',
      'SUCCESS' as ActionStatus,
      {
        id: 'test-validation-001',
        type: 'INFRASTRUCTURE_TEST',
        displayName: 'Infrastructure Validation'
      },
      {
        testMode: true,
        component: 'logging-system',
        timestamp: new Date().toISOString()
      }
    );

    console.log('✅ User Activity logging infrastructure test completed');
    return true;
  } catch (error) {
    console.error('❌ User Activity logging test failed:', error);
    return false;
  }
};

/**
 * Comprehensive test function that runs all logging infrastructure tests
 * IMPORTANT: These are infrastructure tests only. Use Firebase Console for production data.
 */
export const runAllLoggingTests = async (): Promise<{ success: boolean; results: Record<string, boolean> }> => {
  console.log('🚀 Starting logging infrastructure validation...');
  console.log('💡 PRODUCTION NOTE: Create real users through Firebase Console for actual testing');
  
  const results = {
    authentication: await testAuthenticationLogging(),
    pageAccess: await testPageAccessLogging(),
    userAction: await testUserActionLogging(),
    systemError: await testSystemErrorLogging(),
    userManagement: await testUserManagementLogging(),
    userActivity: await testUserActivityLogging()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('📊 Infrastructure Test Results:', results);
  console.log(allPassed ? '✅ All logging infrastructure tests passed!' : '❌ Some logging tests failed');
  
  if (allPassed) {
    console.log('🎉 Logging infrastructure is working correctly!');
    console.log('📝 Expected collections: system_logs, user_activity_logs, userManagementLogs');
    console.log('💡 For production: Create real users in Firebase Console → Authentication → Users');
  }
  
  return {
    success: allPassed,
    results
  };
};

// Export function สำหรับเรียกใช้จาก Console
if (typeof window !== 'undefined') {
  (window as any).testLogging = {
    all: runAllLoggingTests,
    auth: testAuthenticationLogging,
    userAction: testUserActionLogging,
    pageAccess: testPageAccessLogging,
    userManagement: testUserManagementLogging,
    userActivity: testUserActivityLogging,
  };
  
  console.log('🔧 Logging infrastructure test functions available:');
  console.log('- testLogging.all() : Test all logging infrastructure');
  console.log('- testLogging.auth() : Test authentication logging');
  console.log('- testLogging.userAction() : Test user action logging');
  console.log('- testLogging.pageAccess() : Test page access logging');
  console.log('- testLogging.userManagement() : Test user management logging');
  console.log('- testLogging.userActivity() : Test user activity logging');
  console.log('');
  console.log('💡 PRODUCTION: Create real users in Firebase Console for actual testing');
}