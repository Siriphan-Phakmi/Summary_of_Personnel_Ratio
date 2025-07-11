'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, wrapperClassName, id, ...props }, ref) => {
    // ✅ ตรวจสอบว่ามี draft background หรือไม่
    const hasDraftBg = className?.includes('bg-yellow') || className?.includes('yellow');
    
    // ✅ Base styles แยกออกจาก background
    const baseStyles = 'form-input flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:placeholder:text-gray-500 dark:focus-visible:ring-blue-400';
    
    const inputClasses = twMerge(
      baseStyles,
      // Default background เฉพาะเมื่อไม่มี draft หรือ custom background
      !hasDraftBg && 'bg-background dark:bg-gray-800',
      // Error styles
      error && 'border-red-500 focus-visible:ring-red-500 dark:border-red-400 dark:focus-visible:ring-red-400',
      // ✅ Custom className ตัวสุดท้าย - มี priority สูงสุด
      className
    );

    return (
      <div className={twMerge('w-full', wrapperClassName)}>
        {label && (
          <label htmlFor={id} className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          className={inputClasses}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input }; 