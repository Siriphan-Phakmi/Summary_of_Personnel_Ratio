'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      error,
      helperText,
      className = '',
      fullWidth = true,
      startIcon,
      endIcon,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-2`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {startIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            required={required}
            disabled={disabled}
            className={`
              block rounded-md shadow-sm 
              ${startIcon ? 'pl-10' : 'pl-3'} 
              ${endIcon ? 'pr-10' : 'pr-3'} 
              py-2 w-full 
              ${
                error
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              }
              ${
                disabled
                  ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800'
              }
              text-gray-900 dark:text-white
              sm:text-sm
              ${className}
            `}
            {...props}
          />
          {endIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {endIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            className={`mt-1 text-sm ${
              error
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 