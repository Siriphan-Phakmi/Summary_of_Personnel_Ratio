/**
 * Common utility functions shared across the application
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a UUID
 * @returns UUID string
 */
export const uuid = (): string => {
  return uuidv4();
};

/**
 * Format date to Thai locale
 * @param date Date object or date string
 * @returns Formatted date string in Thai format
 */
export const formatThaiDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param date Date object
 * @returns ISO date string
 */
export const formatISODate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Check if running in a browser environment
 * @returns Boolean indicating if code is running in browser
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Format time remaining in minutes and seconds
 * @param ms Milliseconds remaining
 * @returns Formatted string "MM:SS"
 */
export const formatTimeRemaining = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Check if object is empty
 * @param obj Object to check
 * @returns Boolean indicating if object is empty
 */
export const isEmptyObject = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0;
};
