'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  loading = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-12 h-6',
    lg: 'w-16 h-8',
  };

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'w-7 h-7',
  };

  const thumbPositionClasses = {
    sm: checked ? 'translate-x-4' : 'translate-x-0.5',
    md: checked ? 'translate-x-6' : 'translate-x-0.5',
    lg: checked ? 'translate-x-8' : 'translate-x-0.5',
  };

  const isDisabled = disabled || loading;

  return (
    <label 
      className={twMerge(
        'relative inline-flex cursor-pointer items-center',
        isDisabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => !isDisabled && onChange(e.target.checked)}
        disabled={isDisabled}
        aria-label={ariaLabel}
      />
      <div
        className={twMerge(
          'relative rounded-full transition-colors duration-200 ease-in-out',
          sizeClasses[size],
          checked
            ? 'bg-green-500 dark:bg-green-600'
            : 'bg-gray-300 dark:bg-gray-600',
          isDisabled && 'cursor-not-allowed'
        )}
      >
        <div
          className={twMerge(
            'absolute top-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
            thumbSizeClasses[size],
            thumbPositionClasses[size],
            isDisabled && 'cursor-not-allowed'
          )}
        />
      </div>
    </label>
  );
};

export default ToggleSwitch;