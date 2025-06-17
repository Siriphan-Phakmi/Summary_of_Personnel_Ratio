'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const spinnerVariants = cva(
  'animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-4',
        lg: 'h-16 w-16 border-8',
      },
      color: {
        primary: 'text-blue-600 dark:text-blue-500',
        secondary: 'text-gray-600 dark:text-gray-400',
        light: 'text-white',
      }
    },
    defaultVariants: {
      size: 'md',
      color: 'primary',
    },
  }
);

export interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size, color, className }) => {
  return (
    <div
      className={twMerge(spinnerVariants({ size, color, className }))}
      role="status"
    >
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
};

export { LoadingSpinner, spinnerVariants }; 