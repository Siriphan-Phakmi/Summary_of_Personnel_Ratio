'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/features/auth/AuthContext';
import { useRouter } from 'next/navigation';
import NavBar from '@/app/core/ui/NavBar';
import { UserRole } from '@/app/core/types/user';

export default function RoleTestPage() {
  const { user, checkRole } = useAuth();
  const router = useRouter();
  const [testResults, setTestResults] = useState<any[]>([]);

  const roleBasedPaths = [
    { path: '/census/form', requiredRoles: ['nurse', 'ward_clerk', 'admin', 'super_admin', 'developer', 'approver'] },
    { path: '/census/approval', requiredRoles: ['admin', 'super_admin', 'developer', 'approver'] },
    { path: '/admin/dev-tools', requiredRoles: ['developer', 'super_admin'] },
    { path: '/features/dashboard', requiredRoles: [] }, // All roles
  ];

  const testRoleAccess = () => {
    const results = roleBasedPaths.map(({ path, requiredRoles }) => {
      const hasAccess = requiredRoles.length === 0 || requiredRoles.includes(user?.role || '');
      const checkRoleResult = requiredRoles.length === 0 || checkRole(requiredRoles);
      
      return {
        path,
        requiredRoles,
        userRole: user?.role,
        hasAccess,
        checkRoleResult,
        status: hasAccess === checkRoleResult ? '✅ PASS' : '❌ FAIL'
      };
    });
    
    setTestResults(results);
  };

  const navigateToPath = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          🧪 Role-based Access Test
        </h1>
        
        {/* Current User Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            ข้อมูลผู้ใช้ปัจจุบัน
          </h2>
          {user ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <p className="font-medium text-gray-900 dark:text-white">{user.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-red-500">ไม่พบข้อมูลผู้ใช้</p>
          )}
        </div>

        {/* Test Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            การทดสอบ
          </h2>
          <button
            onClick={testRoleAccess}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md mr-4"
          >
            🔍 ทดสอบสิทธิ์การเข้าถึง
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              ผลการทดสอบ
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left p-2">Path</th>
                    <th className="text-left p-2">Required Roles</th>
                    <th className="text-left p-2">Your Role</th>
                    <th className="text-left p-2">Expected</th>
                    <th className="text-left p-2">Actual</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="p-2 font-mono text-sm">{result.path}</td>
                      <td className="p-2">
                        {result.requiredRoles.length === 0 ? 'All' : result.requiredRoles.join(', ')}
                      </td>
                      <td className="p-2">{result.userRole}</td>
                      <td className="p-2">{result.hasAccess ? '✓ Allow' : '✗ Deny'}</td>
                      <td className="p-2">{result.checkRoleResult ? '✓ Allow' : '✗ Deny'}</td>
                      <td className="p-2">{result.status}</td>
                      <td className="p-2">
                        <button
                          onClick={() => navigateToPath(result.path)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Go
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Path Testing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            ทดสอบการเข้าถึงหน้าต่างๆ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleBasedPaths.map(({ path, requiredRoles }) => {
              const hasAccess = requiredRoles.length === 0 || checkRole(requiredRoles);
              return (
                <div key={path} className="border dark:border-gray-700 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-sm">{path}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      hasAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {hasAccess ? 'Allowed' : 'Denied'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Required: {requiredRoles.length === 0 ? 'All roles' : requiredRoles.join(', ')}
                  </p>
                  <button
                    onClick={() => navigateToPath(path)}
                    className={`w-full px-3 py-2 rounded text-sm ${
                      hasAccess 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    {hasAccess ? '🚀 ไปหน้านี้' : '🚫 ทดสอบการปิดกั้น'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 