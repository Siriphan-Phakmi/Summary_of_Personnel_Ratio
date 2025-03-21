'use client';

import { useEffect, useState } from 'react';

/**
 * Custom Popup component using Tailwind CSS
 * @param {Object} props - Component props
 * @param {string} props.type - 'success', 'error', 'warning', 'info'
 * @param {string} props.title - Popup title
 * @param {string} props.message - Popup message
 * @param {boolean} props.isOpen - Whether popup is open
 * @param {function} props.onClose - Function to call when popup is closed
 * @param {number} props.autoClose - Time in ms to auto close (0 = no auto close)
 * @param {Array} props.buttons - Custom buttons [{ text, onClick, variant }]
 */
export default function Popup({ 
  type = 'info', 
  title, 
  message, 
  isOpen, 
  onClose, 
  autoClose = 3000,
  buttons = []
}) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      
      // Auto close if autoClose is set
      if (autoClose > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoClose);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose && onClose();
    }, 300); // Animation duration
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
    }
  };

  const styles = typeStyles[type] || typeStyles.info;

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={handleClose}></div>
      <div className={`${styles.bgColor} ${styles.borderColor} border-l-4 relative rounded-lg shadow-lg max-w-md w-full mx-4 transform transition-all duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-4'}`}>
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
                  {buttons.map((button, index) => {
                    const btnVariant = button.variant || 'primary';
                    const btnStyles = {
                      primary: 'bg-blue-500 hover:bg-blue-600 text-white',
                      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
                      success: 'bg-green-500 hover:bg-green-600 text-white',
                      danger: 'bg-red-500 hover:bg-red-600 text-white',
                    };
                    
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          button.onClick ? button.onClick() : handleClose();
                        }}
                        className={`px-4 py-2 rounded-md ${btnStyles[btnVariant]} transition-colors duration-200`}
                      >
                        {button.text}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {buttons.length === 0 && (
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
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 