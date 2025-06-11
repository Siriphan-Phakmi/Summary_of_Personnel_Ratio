'use client';

import React, { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    disabled = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    ...props
  }, ref) => {
    // Base classes for the button
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition-colors';
    
    // Variant specific classes
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm dark:bg-blue-700 dark:hover:bg-blue-800',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
      outline: 'border border-gray-300 hover:bg-gray-100 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300',
      ghost: 'hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm dark:bg-red-700 dark:hover:bg-red-800',
      destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-sm dark:bg-red-700 dark:hover:bg-red-800',
      link: 'text-blue-600 hover:text-blue-800 hover:underline p-0 h-auto dark:text-blue-400 dark:hover:text-blue-300',
    };
    
    // Size specific classes
    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-base px-4 py-2',
      lg: 'text-lg px-6 py-3',
    };
    
    // Disabled and loading state classes
    const stateClasses = (disabled || isLoading) 
      ? 'opacity-60 cursor-not-allowed' 
      : 'cursor-pointer';
    
    // Width classes
    const widthClasses = fullWidth ? 'w-full' : '';

    // Skip size classes for link variant
    const applySizeClass = variant !== 'link' ? sizeClasses[size] : '';
    
    return (
      <button
        ref={ref}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${applySizeClass}
          ${stateClasses}
          ${widthClasses}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        
        {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
        {isLoading && loadingText ? loadingText : children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button; 