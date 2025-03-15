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

  if (!isOpen && !isVisible) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      } ${isVisible ? 'visible' : 'invisible'}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div 
        className={`bg-white rounded-xl max-w-md mx-auto p-8 shadow-xl transform transition-all duration-300 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          {iconMap[type]}
          
          {title && (
            <h3 className="mt-6 text-2xl font-medium text-gray-900">{title}</h3>
          )}
          
          {message && (
            <div className="mt-3 text-lg text-gray-600" dangerouslySetInnerHTML={{ __html: message }} />
          )}
          
          {timer > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-8">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${(timeLeft / timer) * 100}%` }}
              ></div>
            </div>
          )}
          
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            {showCancel && (
              <button
                className="w-full sm:w-auto px-8 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onCancel) onCancel();
                  onClose();
                }}
              >
                {cancelText}
              </button>
            )}
            <button
              className="w-full sm:w-auto px-8 py-3 bg-[#0ab4ab] text-white rounded-lg hover:bg-[#099a92] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ab4ab] transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onConfirm) onConfirm();
                onClose();
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindAlert;