'use client';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import React from 'react';
import TailwindAlert from '../components/ui/TailwindAlert';
import { createRoot } from 'react-dom/client';

// Create React Context for alert service
const AlertContext = createContext(null);

/**
 * AlertProvider Component - Wrap your app with this to use the alert service
 */
export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [currentId, setCurrentId] = useState(0);

  // Add new alert
  const addAlert = useCallback((options) => {
    const id = currentId;
    setCurrentId(prev => prev + 1);
    
    setAlerts(prev => [...prev, { id, ...options }]);
    
    return id;
  }, [currentId]);

  // Remove alert by id
  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, isOpen: false } : alert
    ));
    
    // Remove from state after animation completes
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 300);
  }, []);

  return (
    <AlertContext.Provider value={{ addAlert, removeAlert }}>
      {children}
      
      {/* Render all alerts */}
      {alerts.map(alert => (
        <TailwindAlert
          key={alert.id}
          isOpen={alert.isOpen !== false}
          onClose={() => removeAlert(alert.id)}
          title={alert.title}
          message={alert.message || alert.text}
          type={alert.icon || alert.type || 'info'}
          confirmText={alert.confirmButtonText || 'ตกลง'}
          cancelText={alert.cancelButtonText || 'ยกเลิก'}
          onConfirm={() => {
            if (alert.resolve) alert.resolve({ isConfirmed: true, value: true });
            if (alert.onConfirm) alert.onConfirm();
          }}
          onCancel={() => {
            if (alert.resolve) alert.resolve({ isConfirmed: false, value: false });
            if (alert.onCancel) alert.onCancel();
          }}
          showCancel={alert.showCancelButton}
          allowOutsideClick={alert.allowOutsideClick !== false}
          timer={alert.timer || 0}
        />
      ))}
    </AlertContext.Provider>
  );
};

/**
 * useAlert Hook - Use this hook to access the alert service
 */
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

// เก็บอ้างอิงถึง loading alert
let loadingAlertInstance = null;

/**
 * Swal object for non-hook usage (similar to SweetAlert2)
 */
export const Swal = {
  fire: (title, text, icon) => {
    // Create a temporary element to host our component
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    
    return new Promise(resolve => {
      // Flag to track if alert is closed
      let isClosed = false;
      
      const handleClose = (result) => {
        if (isClosed) return;
        isClosed = true;
        
        // Clean up
        setTimeout(() => {
          if (tempDiv && tempDiv.parentNode) {
            document.body.removeChild(tempDiv);
          }
        }, 300);
        
        resolve(result);
      };
      
      // Support both parameter formats
      const options = typeof title === 'object' 
        ? { ...title, isOpen: true } 
        : { title, text, icon, isOpen: true };
        
      const alert = {
        ...options,
        onConfirm: () => handleClose({ isConfirmed: true, value: true }),
        onCancel: () => handleClose({ isConfirmed: false, value: false }),
        onClose: () => handleClose({ isConfirmed: false, value: false })
      };
      
      // Auto-close if timer is specified
      if (options.timer && options.timer > 0) {
        setTimeout(() => {
          handleClose({ isConfirmed: false, value: false });
        }, options.timer);
      }
      
      // Render the alert directly using createRoot for React 18
      const root = createRoot(tempDiv);
      root.render(
        <TailwindAlert
          isOpen={true}
          title={alert.title}
          message={alert.text || alert.html}
          type={alert.icon}
          confirmText={alert.confirmButtonText || 'ตกลง'}
          cancelText={alert.cancelButtonText || 'ยกเลิก'}
          showCancel={alert.showCancelButton}
          allowOutsideClick={alert.allowOutsideClick !== false}
          timer={alert.timer || 0}
          onConfirm={alert.onConfirm}
          onCancel={alert.onCancel}
          onClose={alert.onClose}
        />
      );
    });
  },
  
  showLoading: () => {
    // ถ้ามี loading alert อยู่แล้ว ไม่สร้างใหม่
    if (loadingAlertInstance) return loadingAlertInstance;
    
    // สร้าง loading alert ใหม่
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    
    // สร้าง component loading
    const LoadingComponent = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-40"></div>
        <div className="relative transform transition-transform duration-300 scale-100 alert-scale-in p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-white font-medium">กำลังประมวลผล...</p>
          </div>
        </div>
      </div>
    );
    
    // Render
    const root = createRoot(tempDiv);
    root.render(<LoadingComponent />);
    
    // สร้างตัวควบคุม
    loadingAlertInstance = {
      close: () => {
        if (tempDiv && tempDiv.parentNode) {
          root.unmount();
          document.body.removeChild(tempDiv);
          loadingAlertInstance = null;
        }
      }
    };
    
    return loadingAlertInstance;
  },
  
  close: () => {
    if (loadingAlertInstance) {
      loadingAlertInstance.close();
    }
  },
  
  // เพิ่มเมธอด showValidationMessage สำหรับใช้ใน ApproveButton.js
  showValidationMessage: (message) => {
    console.warn('Validation message shown:', message);
    // เนื่องจากเราไม่สามารถเข้าถึง input ใน Swal แบบเดิม เราแค่แสดง alert ใหม่
    Swal.fire({
      title: 'แจ้งเตือน',
      text: message,
      icon: 'warning',
      confirmButtonText: 'ตกลง'
    });
  },
  
  success: (title, text) => Swal.fire(title, text, 'success'),
  error: (title, text) => Swal.fire(title, text, 'error'),
  warning: (title, text) => Swal.fire(title, text, 'warning'),
  info: (title, text) => Swal.fire(title, text, 'info'),
  question: (title, text) => Swal.fire(title, text, 'question')
};

export default {
  Swal,
  useAlert,
  AlertProvider
}; 