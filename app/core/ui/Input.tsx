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
        error: "border-red-500 border-2 bg-red-50 text-red-900 focus-visible:ring-1 focus-visible:ring-red-500 dark:border-red-600 dark:bg-red-900/10 dark:text-red-300",
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
  required?: boolean;
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
    required,
    type = "text",
    id,
    ...props 
  }, ref) => {
    
    // --- DEBUG LOGS --- 
    if (id === 'recorderFirstName' || id === 'recorderLastName') {
      console.log(`[Input Debug - ${id}] Received error prop:`, error);
    }
    // --- END DEBUG LOGS --- 

    // Set variant to error if there's an error message
    const inputVariant = error ? "error" : variant;
    
    // --- DEBUG LOGS --- 
    if (id === 'recorderFirstName' || id === 'recorderLastName') {
      console.log(`[Input Debug - ${id}] Calculated inputVariant:`, inputVariant);
    }
    // --- END DEBUG LOGS ---
    
    const calculatedClasses = inputVariants({ 
      variant: inputVariant, 
      inputSize,
      fullWidth,
      className 
    });

    // --- DEBUG LOGS --- 
    if (id === 'recorderFirstName' || id === 'recorderLastName') {
      console.log(`[Input Debug - ${id}] Classes before twMerge:`, calculatedClasses);
    }
    // --- END DEBUG LOGS ---

    const finalClassName = twMerge(calculatedClasses);

    // --- DEBUG LOGS --- 
    if (id === 'recorderFirstName' || id === 'recorderLastName') {
      console.log(`[Input Debug - ${id}] Final classes after twMerge:`, finalClassName);
    }
    // --- END DEBUG LOGS ---
  
    return (
      <div className="space-y-2">
        {/* Show label if provided */}
        {label && (
          <label 
            htmlFor={id} 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <input
          type={type}
          id={id}
          className={finalClassName}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
          ref={ref}
          required={required}
          {...props}
        />
        
        {/* Show error message if there's an error */}
        {error && (
             // --- DEBUG LOGS --- 
            (id === 'recorderFirstName' || id === 'recorderLastName') && console.log(`[Input Debug - ${id}] Rendering error message paragraph.`),
             // --- END DEBUG LOGS ---
          <p 
            id={`${id}-error`}
            className="text-sm text-red-600 dark:text-red-400 font-medium"
          >
            {error}
          </p>
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