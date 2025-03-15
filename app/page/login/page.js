'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { APP_VERSION } from '../../config/version';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  // Debug the auth context to see what's available
  const auth = useAuth();
  console.log('Auth context:', auth);
  
  const { user, loading: authLoading, isAuthenticated, login } = auth;
  
  // Debug login function specifically
  console.log('Login function type:', typeof login);

  useEffect(() => {
    console.log('Login page - Auth state:', { authLoading, isAuthenticated, user });
    
    // Check if user is already logged in
    if (!authLoading && isAuthenticated) {
      console.log('Already authenticated, redirecting to home');
      // รอให้ hydration เสร็จสมบูรณ์ก่อนแล้วค่อย redirect
      setTimeout(() => {
        router.push('/');
      }, 100);
    }
  }, [authLoading, isAuthenticated, router, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log('Attempting to login with:', { username });

    // Check if login is a function before calling it
    if (typeof login !== 'function') {
      console.error('Login is not a function:', login);
      setError('ขออภัย เกิดข้อผิดพลาดระบบ โปรดติดต่อผู้ดูแลระบบ');
      setLoading(false);
      return;
    }

    try {
      // Use the login function from AuthContext
      const result = await login(username, password);
      console.log('Login result:', result);
      
      if (!result || !result.success) {
        // Display error message
        setError(result?.error || 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setLoading(false);
        return;
      }

      // นำทางตาม role ของผู้ใช้
      if (result.user && result.user.role) {
        console.log('User role:', result.user.role);
        
        if (result.user.role.toLowerCase() === 'admin' || result.user.role.toLowerCase() === 'approver') {
          console.log('User is admin/approver, redirecting to approval page');
          window.location.href = '/page/approval/';
        } else {
          console.log('User is a regular user, redirecting to ward-form');
          window.location.href = '/page/ward-form/';
        }
      } else {
        console.log('No role found, redirecting to ward-form as default');
        window.location.href = '/page/ward-form/';
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth state
  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
        )}
      </button>

      {/* App version display */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400">{APP_VERSION}</div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src="/images/BPK.jpg" 
            alt="BPK Logo" 
            className="mx-auto h-20 w-auto" 
          />
          <h1 className="text-lg text-center font-medium text-[#0ab4ab] mb-4 font-THSarabun">
            Daily Patient Census and Staffing
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 bg-gradient-to-r from-[#0ab4ab] to-blue-600 text-transparent bg-clip-text">
            เข้าสู่ระบบ | Login
          </h2>
        </div>
        <div className="mt-6 bg-[#f8f9ff] p-8 rounded-xl shadow-xl border border-[#e6eaff]">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#5b6987] mb-1">ชื่อผู้ใช้ (Username)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8da2fb]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="appearance-none block w-full pl-10 px-3 py-3 border border-[#c9d4f6] bg-[#f0f4ff] rounded-lg placeholder-[#859bd0] text-[#3a4f7a] focus:outline-none focus:ring-2 focus:ring-[#99b6ff] focus:border-[#99b6ff] transition-all duration-200 sm:text-sm"
                    placeholder="หอผู้ป่วย (เช่น Ward6, ICU, CCU)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#5b6987] mb-1">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8da2fb]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full pl-10 px-3 py-3 border border-[#c9d4f6] bg-[#f0f4ff] rounded-lg placeholder-[#859bd0] text-[#3a4f7a] focus:outline-none focus:ring-2 focus:ring-[#99b6ff] focus:border-[#99b6ff] transition-all duration-200 sm:text-sm"
                    placeholder="รหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 space-y-1">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    <p className="text-xs text-red-700">
                      หากยังไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${loading ? 'bg-[#cdb4ff]/70' : 'bg-gradient-to-r from-[#b3c6ff] to-[#d5b3ff] hover:from-[#a3bbff] hover:to-[#c8a3ff]'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d5b3ff] transition-all duration-200 transform hover:scale-[1.02] shadow-md`}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign in)'}
              </button>
            </div>
          </form>
        </div>
        <div className="mt-6 bg-[#ffeef8] p-4 rounded-lg border border-[#ffd6f1]">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-[#ff99d6] mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[#e066b3]">
              <span className="font-medium">ข้อมูลการเข้าใช้: </span>
              หากยังไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
