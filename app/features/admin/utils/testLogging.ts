/**
 * Utility functions for testing the logging system
 * This file helps administrators verify that logs are being properly saved to Firebase
 */

import { User, UserRole } from '@/app/features/auth/types/user';
import { logLogin, logLogout, logUserAction, logSystemError, logPageAccess } from '@/app/features/auth/services/logService';

// Test user object สำหรับการทดสอบ
const testUser: User = {
  uid: 'test-user-123',
  username: 'test-admin',
  role: UserRole.ADMIN,
  firstName: 'Test',
  lastName: 'User',
  isActive: true
};

/**
 * Test function to verify authentication logging
 */
export const testAuthenticationLogging = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing authentication logging...');
    
    // Test login logging
    await logLogin(testUser);
    console.log('✅ Login log sent');
    
    // Test logout logging
    await logLogout(testUser);
    console.log('✅ Logout log sent');
    
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
    
    await logPageAccess(testUser, '/census/form');
    console.log('✅ Page access log sent');
    
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
    
    await logUserAction(
      testUser,
      'SAVE_DRAFT',
      'SUCCESS',
      { id: 'ward-001', type: 'Ward Form' },
      { 
        wardId: 'ward-001', 
        shift: 'morning',
        testContext: 'automated-test'
      }
    );
    console.log('✅ User action log sent');
    
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
    
    const testError = new Error('Test error for logging system validation');
    await logSystemError(testError, 'Logging System Test', testUser);
    console.log('✅ System error log sent');
    
    return true;
  } catch (error) {
    console.error('❌ System error logging test failed:', error);
    return false;
  }
};

/**
 * Comprehensive test function that runs all logging tests
 */
export const runAllLoggingTests = async (): Promise<{ success: boolean; results: Record<string, boolean> }> => {
  console.log('🚀 Starting comprehensive logging system test...');
  
  const results = {
    authentication: await testAuthenticationLogging(),
    pageAccess: await testPageAccessLogging(),
    userAction: await testUserActionLogging(),
    systemError: await testSystemErrorLogging()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('📊 Test Results:', results);
  console.log(allPassed ? '✅ All logging tests passed!' : '❌ Some logging tests failed');
  
  if (allPassed) {
    console.log('🎉 Logging system is working correctly! Check Firebase Console for the test log entries.');
    console.log('📝 Expected collections: system_logs, userManagementLogs');
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
  };
  
  console.log('🔧 Logging test functions available:');
  console.log('- testLogging.all() : Test all logging functions');
  console.log('- testLogging.auth() : Test authentication logging');
  console.log('- testLogging.userAction() : Test user action logging');
  console.log('- testLogging.pageAccess() : Test page access logging');
}