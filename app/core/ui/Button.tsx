'use client';

import React, { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

// Define button variants using cva
const buttonVariants = cva(
  // Base styles applied to all button variants
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      // Different visual variants
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
        destructive: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
        outline: "border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800",
        ghost: "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
        link: "bg-transparent text-blue-600 underline-offset-4 hover:underline dark:text-blue-500"
      },
      // Size variations
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-5 py-2 text-base",
        xl: "h-12 px-6 py-3 text-lg"
      },
      // Full width option
      fullWidth: {
        true: "w-full"
      }
    },
    // Default variants if none specified
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false
    }
  }
);

// Extend standard button attributes with our custom props
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // Add isLoading state for loading indicator
  isLoading?: boolean;
  // Allow passing in children content
  children: ReactNode;
  // Add loadingText for accessibility during loading state
  loadingText?: string;
  // Add leftIcon and rightIcon for button with icons
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Define Button component
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    // Combine base variants with any custom classes
    return (
      <button
        className={twMerge(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-t-current border-l-current border-r-current" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

// Display name for React DevTools
Button.displayName = "Button";

export default Button; 