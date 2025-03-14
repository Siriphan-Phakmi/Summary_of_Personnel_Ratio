'use client';
import { createContext, useContext, useState, useEffect } from 'react';

/**
 * AlertService - บริการแจ้งเตือนที่พัฒนาด้วย Tailwind CSS
 * ทดแทนการใช้ SweetAlert2 เพื่อให้สอดคล้องกับ design system ของแอพพลิเคชัน
 */

// Create a context for our alert system
const AlertContext = createContext(null);

// Custom hook for using our alert system
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

// สร้าง alert API สำหรับใช้งานในแอพพลิเคชัน
export const alertAPI = {
  fire: async (options) => {
    // ถ้ามีการใช้ GlobalAlertService ผ่าน context
    if (window.__alertService) {
      return window.__alertService.showAlert(options);
    }
    
    // Fallback สำหรับกรณีที่ไม่ได้อยู่ใน AlertProvider
    console.warn('AlertProvider is not found. Using fallback alert.');
    if (options.icon === 'error' || options.type === 'error') {
      alert(options.title ? `${options.title}: ${options.text || ''}` : options.text);
      return { isConfirmed: true };
    } else if (options.icon === 'warning' || options.type === 'warning') {
      const result = confirm(options.title ? `${options.title}: ${options.text || ''}` : options.text);
      return { isConfirmed: result };
    } else {
      alert(options.title ? `${options.title}: ${options.text || ''}` : options.text);
      return { isConfirmed: true };
    }
  },
  success: async (title, text) => {
    return alertAPI.fire({
      title,
      text,
      icon: 'success'
    });
  },
  error: async (title, text) => {
    return alertAPI.fire({
      title,
      text,
      icon: 'error'
    });
  },
  warning: async (title, text, showCancelButton = true) => {
    return alertAPI.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton
    });
  },
  info: async (title, text) => {
    return alertAPI.fire({
      title,
      text,
      icon: 'info'
    });
  },
  confirm: async (title, text, confirmButtonText = 'ตกลง', cancelButtonText = 'ยกเลิก') => {
    return alertAPI.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText
    });
  },
  showLoading: (title = 'กำลังโหลด...') => {
    if (window.__alertService) {
      return window.__alertService.showLoading(title);
    }
    console.log('Loading:', title);
  },
  close: () => {
    if (window.__alertService) {
      return window.__alertService.closeAll();
    }
    console.log('Closing alerts');
  }
};

// Backward compatibility for code that uses Swal
export const Swal = alertAPI;

// Alert component based on TailwindAlert
const Alert = ({
  id,
  isOpen,
  onClose,
  title,
  text,
  icon = 'info',
  type = 'info',
  confirmButtonText = 'ตกลง',
  cancelButtonText = 'ยกเลิก',
  onConfirm,
  onCancel,
  showCancelButton = false,
  allowOutsideClick = true,
  timer = 0,
  html = null,
  customClass = {},
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [timeLeft, setTimeLeft] = useState(timer > 0 ? Math.floor(timer / 1000) : 0);
  
  // Apply icon based on type/icon prop
  const finalType = icon || type;
  
  // Handle ESC key for dismissing alert
  useEffect(() => {
    if (!isVisible) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && allowOutsideClick) {
        handleClose(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, allowOutsideClick]);
  
  // Handle timer autclose
  useEffect(() => {
    if (!isVisible || timer <= 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => handleClose(true), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isVisible, timer]);
  
  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && allowOutsideClick) {
      handleClose(false);
    }
  };
  
  // Handle close with result
  const handleClose = (isConfirmed) => {
    setIsVisible(false);
    setTimeout(() => {
      if (isConfirmed) {
        onConfirm && onConfirm();
      } else {
        onCancel && onCancel();
      }
      onClose && onClose(isConfirmed);
    }, 300);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${allowOutsideClick ? 'cursor-pointer' : ''}`}
      onClick={handleBackdropClick}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)'
      }}
    >
      <div 
        className={`bg-white rounded-lg shadow-2xl max-w-md w-full m-4 transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } cursor-default ${customClass.container || ''}`}
      >
        <div className="p-6">
          <div className="text-center">
            {/* Icon based on type */}
            {finalType === 'success' && (
              <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {finalType === 'error' && (
              <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            {finalType === 'info' && (
              <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            {finalType === 'warning' && (
              <div className="mx-auto bg-yellow-100 p-3 rounded-full w-fit mb-4">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            {finalType === 'question' && (
              <div className="mx-auto bg-purple-100 p-3 rounded-full w-fit mb-4">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            {finalType === 'loading' && (
              <div className="mx-auto p-3 w-fit mb-4">
                <div className="w-12 h-12 border-4 border-t-[#0ab4ab] border-r-[#0ab4ab] border-b-gray-200 border-l-gray-200 rounded-full animate-spin"></div>
              </div>
            )}
            
            {title && <h2 className={`text-xl font-semibold mb-2 ${customClass.title || ''}`}>{title}</h2>}
            {text && <p className={`text-gray-600 ${customClass.text || ''}`}>{text}</p>}
            {html && <div className={`mt-2 ${customClass.htmlContainer || ''}`} dangerouslySetInnerHTML={{ __html: html }}></div>}
            
            {/* Timer indicator */}
            {timeLeft > 0 && (
              <div className="mt-3 text-sm text-gray-500">
                ปิดอัตโนมัติใน {timeLeft} วินาที
              </div>
            )}
          </div>
          
          {finalType !== 'loading' && (
            <div className="flex justify-center gap-3 mt-6">
              {showCancelButton && (
                <button
                  onClick={() => handleClose(false)}
                  className={`px-5 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 ${customClass.cancelButton || ''}`}
                >
                  {cancelButtonText}
                </button>
              )}
              <button
                onClick={() => handleClose(true)}
                className={`px-5 py-2 bg-[#0ab4ab] text-white rounded-md hover:bg-[#099a92] ${customClass.confirmButton || ''}`}
              >
                {confirmButtonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Provider component that wraps your app and makes alerts available
export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(null);
  
  useEffect(() => {
    // Create global access to the alert service
    window.__alertService = {
      showAlert,
      showLoading,
      closeAll
    };
    
    return () => {
      delete window.__alertService;
    };
  }, []);

  const showAlert = (options) => {
    return new Promise((resolve) => {
      const id = Date.now();
      const alert = {
        id,
        isOpen: true,
        ...options,
        onClose: (result) => {
          closeAlert(id);
          resolve({ isConfirmed: result });
        }
      };
      setAlerts((prevAlerts) => [...prevAlerts, alert]);
    });
  };
  
  const showLoading = (title = 'กำลังโหลด...') => {
    closeAll(); // ปิดทุก alert ก่อน
    
    const id = Date.now();
    const loadingAlert = {
      id,
      isOpen: true,
      title,
      type: 'loading',
      icon: 'loading',
      allowOutsideClick: false
    };
    
    setGlobalLoading(loadingAlert);
    return id;
  };
  
  const closeAlert = (id) => {
    setAlerts((prevAlerts) => 
      prevAlerts.map((alert) => 
        alert.id === id ? { ...alert, isOpen: false } : alert
      )
    );
    
    // Remove after animation
    setTimeout(() => {
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
    }, 300);
  };
  
  const closeAll = () => {
    setAlerts((prevAlerts) => 
      prevAlerts.map((alert) => ({ ...alert, isOpen: false }))
    );
    
    if (globalLoading) {
      setGlobalLoading({ ...globalLoading, isOpen: false });
      setTimeout(() => {
        setGlobalLoading(null);
      }, 300);
    }
    
    setTimeout(() => {
      setAlerts([]);
    }, 300);
  };

  return (
    <AlertContext.Provider value={{ showAlert, showLoading, closeAlert, closeAll }}>
      {children}
      
      {/* Render all active alerts */}
      {alerts.map((alert) => (
        <Alert key={alert.id} {...alert} />
      ))}
      
      {/* Render global loading */}
      {globalLoading && <Alert {...globalLoading} />}
    </AlertContext.Provider>
  );
};