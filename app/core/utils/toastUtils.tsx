import React from 'react';
import { toast, Toast } from 'react-hot-toast';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

// Success toast component
export const SuccessToast = ({ message, t }: { message: string; t: Toast }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/40 dark:to-emerald-900/40 border-l-4 border-green-500 dark:border-green-400 rounded-lg shadow-lg animate-fadeIn">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50">
        <FiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 animate-fadeIn" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-green-800 dark:text-green-200">{message}</div>
    <div className="ml-auto">
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="p-3 h-10 w-10 flex items-center justify-center rounded-md text-green-500 hover:text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/50 focus:outline-none transition-colors"
      >
        <span className="sr-only">ปิด</span>
        <FiX className="h-6 w-6" />
      </button>
    </div>
  </div>
);

// Error toast component
export const ErrorToast = ({ message, t }: { message: string; t: Toast }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-lg animate-fadeIn">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50">
        <FiAlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 animate-pulse" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-red-800 dark:text-red-200">{message}</div>
    <div className="ml-auto">
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="p-3 h-10 w-10 flex items-center justify-center rounded-md text-red-500 hover:text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 focus:outline-none transition-colors"
      >
        <span className="sr-only">ปิด</span>
        <FiX className="h-6 w-6" />
      </button>
    </div>
  </div>
);

// Info toast component
export const InfoToast = ({ message, t }: { message: string; t: Toast }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg shadow-lg animate-fadeIn">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50">
        <FiInfo className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-blue-800 dark:text-blue-200">{message}</div>
    <div className="ml-auto">
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="p-3 h-10 w-10 flex items-center justify-center rounded-md text-blue-500 hover:text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 focus:outline-none transition-colors"
      >
        <span className="sr-only">ปิด</span>
        <FiX className="h-6 w-6" />
      </button>
    </div>
  </div>
);

// Utility functions for showing toast notifications
export const showSuccessToast = (message: string) => {
  return toast.custom((t) => (
    <SuccessToast message={message} t={t} />
  ));
};

export const showErrorToast = (message: string) => {
  return toast.custom((t) => (
    <ErrorToast message={message} t={t} />
  ));
};

export const showInfoToast = (message: string) => {
  return toast.custom((t) => (
    <InfoToast message={message} t={t} />
  ));
};

// For simple toast notifications without custom styling
export const showSimpleSuccessToast = (message: string) => {
  return toast.success(message);
};

export const showSimpleErrorToast = (message: string) => {
  return toast.error(message);
};

/**
 * ลบ toast notifications ทั้งหมดที่กำลังแสดงอยู่
 * ประโยชน์สำหรับการล้าง notifications ก่อนออกจากระบบหรือเปลี่ยนหน้า
 */
export const dismissAllToasts = () => {
  toast.dismiss();
}; 