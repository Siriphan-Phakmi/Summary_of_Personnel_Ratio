'use client';

import React, { ReactNode, useEffect, useRef } from 'react';

// Custom X Icon Component
const XMarkIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M6 18L18 6M6 6l12 12" 
    />
  </svg>
);

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  showFooter?: boolean;
  footer?: ReactNode;
  position?: 'center' | 'top' | 'bottom';
  maxHeight?: string;
  closeOnEsc?: boolean;
  className?: string;
  overlayClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  showFooter = false,
  footer,
  position = 'center',
  maxHeight,
  closeOnEsc = true,
  className = '',
  overlayClassName = '',
  titleClassName = '',
  contentClassName = '',
  footerClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // เพิ่ม event listener สำหรับการกด ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    // เพิ่ม event listener
    window.addEventListener('keydown', handleKeyDown);

    // ล็อค scroll ของ body เมื่อ modal เปิด
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    // cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, closeOnEsc]);

  // จัดการคลิกที่ overlay
  const handleClickOutside = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // ไม่แสดง modal ถ้า isOpen เป็น false
  if (!isOpen) return null;

  // กำหนดขนาดของ modal
  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    'full': 'max-w-full',
  };

  // กำหนดตำแหน่งของ modal
  const positionClasses = {
    center: 'items-center',
    top: 'items-start pt-10',
    bottom: 'items-end pb-10',
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex justify-center ${positionClasses[position]} bg-black bg-opacity-50 transition-opacity ${overlayClassName}`}
      onClick={handleClickOutside}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className={`relative rounded-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col w-full ${sizeClasses[size]} ${className}`}
        style={{ maxHeight: maxHeight || '85vh' }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${titleClassName}`}>
            {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
          {showCloseButton && (
            <button
                type="button"
              onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                aria-label="Close"
            >
                <XMarkIcon />
            </button>
          )}
          </div>
        )}

        {/* Content */}
        <div 
          className={`p-4 overflow-y-auto ${contentClassName}`} 
          style={{ maxHeight: maxHeight ? `calc(${maxHeight} - ${(title || showCloseButton) ? '60px' : '0px'} - ${showFooter ? '60px' : '0px'})` : 'calc(85vh - 120px)' }}
        >
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className={`p-4 border-t border-gray-200 dark:border-gray-700 ${footerClassName}`}>
            {footer || (
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal; 