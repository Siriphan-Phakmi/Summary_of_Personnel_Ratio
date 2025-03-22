'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { APP_VERSION } from '../../config/version';
import { loginUser } from '../../services/authService';
import { useForm } from 'react-hook-form';
import { logEvent } from '../../utils/sessionRecording';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, loading: authLoading, isAuthenticated, login } = useAuth();
  
  // Using React Hook Form for better form management
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      username: localStorage.getItem('rememberedUsername') || '',
      password: ''
    }
  });

  useEffect(() => {
    // Check for remembered username and set rememberMe if exists
    if (localStorage.getItem('rememberedUsername')) {
      setRememberMe(true);
    }
    
    // Check if user is already logged in
    if (!authLoading && isAuthenticated) {
      console.log('Already authenticated, redirecting to home');
      // รอให้ hydration เสร็จสมบูรณ์ก่อนแล้วค่อย redirect
      setTimeout(() => {
        router.push('/');
      }, 100);
    }
  }, [authLoading, isAuthenticated, router, user]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      // Save or remove remembered username based on checkbox
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', data.username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }

      // Call loginUser from authService instead of direct Firebase calls
      const result = await login(data.username, data.password);
      
      if (!result || !result.success) {
        const errorMsg = result?.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        setError(errorMsg);
        setLoading(false);
        
        // Log failed login attempt
        logEvent('login_failed', {
          username: data.username,
          error: errorMsg,
          timestamp: new Date().toISOString()
        });
        
        return;
      }

      // Log successful login
      logEvent('login_success', {
        userId: result.user.uid,
        username: result.user.username,
        role: result.user.role,
        timestamp: new Date().toISOString()
      });

      // นำทางตาม role ของผู้ใช้
      if (result.user && result.user.role) {
        const userRole = result.user.role.toLowerCase();
        
        setTimeout(() => {
          if (userRole === 'admin' || userRole === 'approver') {
            window.location.href = '/page/approval/';
          } else {
            window.location.href = '/page/ward-form/';
          }
        }, 300);
      } else {
        setTimeout(() => window.location.href = '/page/ward-form/', 300);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + (error.message || 'กรุณาลองใหม่อีกครั้ง'));
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Show loading spinner while checking auth state
  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300`}>
      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
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
      <div className={`absolute bottom-4 right-4 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        {APP_VERSION}
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src="/images/BPK.jpg" 
            alt="BPK Logo" 
            className="mx-auto h-20 w-auto" 
          />
          <h1 className={`text-lg text-center font-medium text-[#0ab4ab] mb-4 font-THSarabun ${theme === 'dark' ? 'text-opacity-90' : ''}`}>
            Daily Patient Census and Staffing
          </h1>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-gray-900 bg-gradient-to-r from-[#0ab4ab] to-blue-600 text-transparent bg-clip-text'}`}>
            เข้าสู่ระบบ | Login
          </h2>
        </div>
        
        <div className={`mt-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-[#f8f9ff] border-[#e6eaff]'} p-8 rounded-xl shadow-xl border transition-colors duration-300`}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-[#5b6987]'} mb-1`}>
                  ชื่อผู้ใช้ (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-[#8da2fb]'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    {...register("username", { 
                      required: "กรุณากรอกชื่อผู้ใช้", 
                      minLength: { value: 3, message: "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร" } 
                    })}
                    type="text"
                    autoComplete="username"
                    className={`appearance-none block w-full pl-10 px-3 py-3 border ${
                      theme === 'dark' 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-[#c9d4f6] bg-[#f0f4ff] text-[#3a4f7a] placeholder-[#859bd0] focus:ring-[#99b6ff] focus:border-[#99b6ff]'
                    } ${errors.username ? 'border-red-500' : ''} rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm`}
                    placeholder="หอผู้ป่วย (เช่น Ward6, ICU, CCU)"
                  />
                </div>
                {errors.username && (
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {errors.username.message}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-[#5b6987]'} mb-1`}>
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-[#8da2fb]'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    {...register("password", { 
                      required: "กรุณากรอกรหัสผ่าน", 
                      minLength: { value: 6, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" } 
                    })}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={`appearance-none block w-full pl-10 pr-10 px-3 py-3 border ${
                      theme === 'dark' 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-[#c9d4f6] bg-[#f0f4ff] text-[#3a4f7a] placeholder-[#859bd0] focus:ring-[#99b6ff] focus:border-[#99b6ff]'
                    } ${errors.password ? 'border-red-500' : ''} rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm`}
                    placeholder="รหัสผ่าน"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className={`focus:outline-none ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {errors.password && (
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {errors.password.message}
                  </p>
                )}
              </div>
              
              {/* Remember me checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className={`h-4 w-4 rounded ${
                    theme === 'dark'
                      ? 'text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800'
                      : 'text-[#99b6ff] focus:ring-[#99b6ff] border-[#c9d4f6]'
                  }`}
                />
                <label htmlFor="remember-me" className={`ml-2 block text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-[#5b6987]'}`}>
                  จดจำชื่อผู้ใช้
                </label>
              </div>
            </div>

            {error && (
              <div className={`rounded-md ${theme === 'dark' ? 'bg-red-900/50 border border-red-800' : 'bg-red-50'} p-4`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={`h-5 w-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 space-y-1">
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>{error}</h3>
                    <p className={`text-xs ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
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
                className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                  theme === 'dark'
                    ? loading 
                      ? 'bg-blue-600/50'
                      : 'bg-blue-600 hover:bg-blue-700'
                    : loading 
                      ? 'bg-[#cdb4ff]/70'
                      : 'bg-gradient-to-r from-[#b3c6ff] to-[#d5b3ff] hover:from-[#a3bbff] hover:to-[#c8a3ff]'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d5b3ff] transition-all duration-200 transform hover:scale-[1.02] shadow-md`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : 'เข้าสู่ระบบ (Sign in)'}
              </button>
            </div>
            
            <div className="flex justify-end">
              <a href="#" className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-[#7b9cff] hover:text-[#5a85ff]'} transition-colors`}>
                ลืมรหัสผ่าน?
              </a>
            </div>
          </form>
        </div>
        
        <div className={`mt-6 ${theme === 'dark' ? 'bg-pink-900/30 border-pink-900/50' : 'bg-[#ffeef8] border-[#ffd6f1]'} p-4 rounded-lg border`}>
          <div className="flex items-center">
            <svg className={`h-6 w-6 ${theme === 'dark' ? 'text-pink-500' : 'text-[#ff99d6]'} mr-2`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={`text-sm ${theme === 'dark' ? 'text-pink-300' : 'text-[#e066b3]'}`}>
              <span className="font-medium">ข้อมูลการเข้าใช้: </span>
              หากยังไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
