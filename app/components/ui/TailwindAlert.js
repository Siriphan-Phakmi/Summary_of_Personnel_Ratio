'use client';
import { useState, useEffect } from 'react';
import React from 'react';

/**
 * TailwindAlert Component - ใช้แทน SweetAlert2
 */
const TailwindAlert = ({ 
  isOpen = false, 
  onClose, 
  title, 
  message, 
  type = 'info', 
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
  showCancel = false,
  allowOutsideClick = true,
  timer = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timer > 0 ? timer : 0);
  
  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);
  
  // Handle timer if set
  useEffect(() => {
    if (timer > 0 && isOpen) {
      setTimeLeft(timer);
      const intervalId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 100) {
            clearInterval(intervalId);
            onClose();
            return 0;
          }
          return prev - 100;
        });
      }, 100);
      
      return () => clearInterval(intervalId);
    }
  }, [isOpen, timer, onClose]);

  // Handle click outside
  const handleBackdropClick = (e) => {
    if (allowOutsideClick && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Icon mapping based on type
  const iconMap = {
    success: (
      <svg className="w-20 h-20 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
      </svg>
    ),
    error: (
      <svg className="w-20 h-20 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    ),
    warning: (
      <svg className="w-20 h-20 mx-auto text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
    ),
    info: (
      <svg className="w-20 h-20 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    question: (
      <svg className="w-20 h-20 mx-auto text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    )
  };
  
  // Color mapping based on type
  const colorMap = {
    success: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    info: 'border-blue-200 bg-blue-50',
    question: 'border-purple-200 bg-purple-50',
    confirm: 'border-blue-200 bg-blue-50'
  };
  
  // Button color mapping based on type
  const buttonColorMap = {
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    error: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    question: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
    confirm: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  };
  
  const color = colorMap[type] || colorMap.info;
  const buttonColor = buttonColorMap[type] || buttonColorMap.info;
  
  if (!isVisible) return null;
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onClick={handleBackdropClick}
    >
      <div className="fixed inset-0 bg-black bg-opacity-40"></div>
      <div 
        className={`relative border rounded-lg shadow-xl transform ${isOpen ? 'scale-100 alert-scale-in' : 'scale-95'} transition-transform duration-300 w-full max-w-md p-6 ${color} bg-white`}
      >
        <div className="mb-6">
          {iconMap[type]}
        </div>
        
        <h3 className="text-xl font-semibold text-center mb-3">{title}</h3>
        <div className="text-center mb-6">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        
        {timer > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
            <div 
              className="bg-blue-600 h-1.5 rounded-full" 
              style={{ width: `${(timeLeft / timer) * 100}%` }}
            ></div>
          </div>
        )}
        
        <div className="flex justify-center space-x-4">
          {showCancel && (
            <button 
              className="px-5 py-2.5 text-gray-800 bg-gray-200 rounded hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={() => {
                if (onCancel) onCancel();
                onClose();
              }}
            >
              {cancelText}
            </button>
          )}
          <button 
            className={`px-5 py-2.5 text-white rounded transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColor}`}
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TailwindAlert; 