'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

// Define input variants
const inputVariants = cva(
  // Base styles
  "flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input bg-background focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus-visible:ring-blue-600",
        outline: "border-gray-300 bg-transparent focus-visible:border-blue-600 dark:border-gray-600 dark:text-gray-100",
        ghost: "border-none shadow-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 dark:text-gray-100",
        error: "border-red-500 bg-red-50 text-red-900 focus-visible:ring-1 focus-visible:ring-red-500 dark:border-red-600 dark:bg-red-900/10 dark:text-red-300",
      },
      // Size variations
      inputSize: {
        sm: "h-8 px-2 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
      // Full width option
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
    },
    // Default variants
    defaultVariants: {
      variant: "default",
      inputSize: "md",
      fullWidth: true,
    },
  }
);

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
  label?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant,
    inputSize,
    fullWidth,
    error, 
    label,
    helperText,
    type = "text",
    ...props 
  }, ref) => {
    // Set variant to error if there's an error message
    const inputVariant = error ? "error" : variant;
  
    return (
      <div className="space-y-2">
        {/* Show label if provided */}
        {label && (
          <label 
            htmlFor={props.id} 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        
        <input
          type={type}
          className={twMerge(
            inputVariants({ 
              variant: inputVariant, 
              inputSize,
              fullWidth,
              className 
            })
          )}
          ref={ref}
          {...props}
        />
        
        {/* Show error message if there's an error */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        
        {/* Show helper text if provided and no error */}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input; 