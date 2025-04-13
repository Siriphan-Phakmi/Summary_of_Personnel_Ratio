'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/app/core/contexts/LoadingContext';
import { loginWithCredentials } from '@/app/features/auth/services/loginService';

export default function LoginPageExample() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const router = useRouter();
  const { showLoading, hideLoading, withLoading } = useLoading();

  // วิธีที่ 1: ใช้ withLoading โดยตรงในการครอบ Promise
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // ใช้ withLoading ครอบ Promise ที่ต้องการแสดง loading
      const result = await withLoading(
        loginWithCredentials(username, password)
      );
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์');
    }
  };

  // วิธีที่ 2: ใช้ showLoading และ hideLoading เอง
  const handleLoginManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    showLoading(); // แสดงหน้า loading
    
    try {
      const result = await loginWithCredentials(username, password);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์');
    } finally {
      hideLoading(); // ซ่อนหน้า loading เมื่อเสร็จสิ้น (ไม่ว่าจะสำเร็จหรือไม่)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">ระบบบันทึกข้อมูลอัตรากำลัง BPK9</p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 