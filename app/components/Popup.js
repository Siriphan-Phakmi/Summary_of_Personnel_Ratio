'use client';

import { useEffect, useState } from 'react';

/**
 * Custom Popup component using Tailwind CSS
 * @param {Object} props - Component props
 * @param {string} props.type - 'success', 'error', 'warning', 'info', 'confirm'
 * @param {string} props.title - Popup title
 * @param {string} props.message - Popup message
 * @param {boolean} props.isOpen - Whether popup is open
 * @param {function} props.onClose - Function to call when popup is closed
 * @param {number} props.autoClose - Time in ms to auto close (0 = no auto close)
 * @param {Array} props.buttons - Custom buttons [{ text, onClick, variant }]
 * @param {function} props.onConfirm - Function to call when confirm button is clicked
 * @param {function} props.onCancel - Function to call when cancel button is clicked
 */
export default function Popup({ 
  type = 'info', 
  title, 
  message, 
  isOpen, 
  onClose, 
  autoClose = 3000,
  buttons = [],
  onConfirm = null,
  onCancel = null
}) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Add a slight delay before removing from DOM to allow transition to complete
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  useEffect(() => {
    // Handle ESC key to close popup
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);
  
  // Auto close timer
  useEffect(() => {
    let timer;
    if (isOpen && autoClose && type !== 'confirm' && type !== 'warning') {
      timer = setTimeout(() => handleClose(), autoClose);
    }
    return () => clearTimeout(timer);
  }, [isOpen, autoClose, type]);
  
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  // Make sure to stop propagation on modal click to prevent backdrop click from closing
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  const handleConfirm = (e) => {
    e.stopPropagation();
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    handleClose();
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    if (typeof onCancel === 'function') {
      onCancel();
    }
    handleClose();
  };

  // Map type to styles
  const typeStyles = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      iconColor: 'text-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      )
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      iconColor: 'text-red-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      )
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      )
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    },
    confirm: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    }
  };

  const styles = typeStyles[type] || typeStyles.info;

  // Don't render if not open
  if (!isOpen && !isVisible) return null;

  // Add an emergency close function to window for debugging
  window.__closeCurrentPopup = handleClose;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose}></div>
      <div 
        className={`${styles.bgColor} ${styles.borderColor} border-l-4 relative rounded-lg shadow-lg max-w-md w-full mx-4 transform transition-all duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-4'}`}
        onClick={handleModalClick}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${styles.iconColor}`}>
              {styles.icon}
            </div>
            <div className="ml-3 w-full">
              {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
              {message && <div className="mt-2 text-sm text-gray-500">{message}</div>}
              
              {buttons.length > 0 && (
                <div className="mt-4 flex justify-end space-x-2">
                  {buttons.map((button, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof button.onClick === 'function') {
                          button.onClick();
                        }
                        if (button.closeOnClick !== false) {
                          handleClose();
                        }
                      }}
                      className={button.className || `px-4 py-2 rounded-md transition-colors ${button.color || 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                    >
                      {button.text}
                    </button>
                  ))}
                </div>
              )}
              
              {/* For confirm type popup with no custom buttons, show confirm/cancel buttons */}
              {buttons.length === 0 && type === 'confirm' && (
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
                  >
                    ไม่, ยกเลิก
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                  >
                    ใช่, ดำเนินการ
                  </button>
                </div>
              )}
              
              {/* For non-confirm popups with no custom buttons, show OK button */}
              {buttons.length === 0 && type !== 'confirm' && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleClose}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
                  >
                    ตกลง
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}