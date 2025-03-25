'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { IconType } from 'react-icons';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: IconType;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  // isLoading is an alias for loading to maintain backward compatibility
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon: Icon,
      iconPosition = 'left',
      loading = false,
      isLoading,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    // Use isLoading as a fallback for loading
    const isButtonLoading = loading || isLoading || false;
    
    // Variant styles
    const variantClasses = {
      primary:
        'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 border-transparent',
      secondary:
        'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500 border-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-700',
      danger:
        'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 border-transparent',
      success:
        'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 border-transparent',
      warning:
        'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500 border-transparent',
    };

    // Size styles
    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    // Width styles
    const widthClasses = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isButtonLoading}
        className={`
          inline-flex items-center justify-center border font-medium rounded-md
          shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${widthClasses}
          ${
            disabled || isButtonLoading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-md'
          }
          ${className}
        `}
        {...props}
      >
        {isButtonLoading && (
          <svg
            className={`animate-spin -ml-1 mr-2 h-4 w-4 text-current ${
              iconPosition === 'right' ? 'order-last -mr-1 ml-2' : ''
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {Icon && !isButtonLoading && iconPosition === 'left' && (
          <Icon className="h-4 w-4 mr-2 -ml-1" />
        )}
        {children}
        {Icon && !isButtonLoading && iconPosition === 'right' && (
          <Icon className="h-4 w-4 ml-2 -mr-1" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button; 