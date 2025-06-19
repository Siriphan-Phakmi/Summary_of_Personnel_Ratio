'use client';

import React from 'react';
import { FormStatus } from '@/app/features/ward-form/types/ward';
import useStatusStyles from '../hooks/useStatusStyles';
import { twMerge } from 'tailwind-merge';

interface StatusDisplayProps {
  status: FormStatus | null;
  shape?: 'tag' | 'badge';
  displayType?: 'full' | 'textOnly';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * A unified component for displaying form status as a tag or a badge.
 * Replaces StatusTag and ShiftStatusBadge.
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  status,
  shape = 'tag',
  displayType = 'full',
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const { getStatusText, getStatusIcon, getStatusInlineStyles } = useStatusStyles();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const shapeClasses = {
    tag: 'rounded-md',
    badge: 'rounded-full',
  };

  const baseClasses = `inline-flex items-center justify-center font-medium transition-colors`;

  const tagClasses = twMerge(
    baseClasses,
    sizeClasses[size],
    shapeClasses[shape],
    className
  );

  const styles = getStatusInlineStyles(status, displayType === 'textOnly');

  const iconSizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  const iconClassName = `mr-1.5 ${iconSizeClass[size]}`;

  return (
    <span className={tagClasses} style={styles} data-status={status || 'none'}>
      {showIcon && status && getStatusIcon(status, iconClassName)}
      <span>{getStatusText(status)}</span>
    </span>
  );
};

export default StatusDisplay; 