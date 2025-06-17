import { format } from 'date-fns';
import { TimestampField, ServerTimestamp } from '@/app/features/ward-form/types/ward';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * Formats a Date object or a date string into 'yyyy-MM-dd' format.
 * @param date The date to format.
 * @returns The formatted date string.
 */
export const formatDateYMD = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    // Handle invalid date gracefully
    return '';
  }
  return format(dateObj, 'yyyy-MM-dd');
};

/**
 * DEPRECATED: This function is being moved to timestampUtils.ts to better separate concerns.
 * Please import from 'app/lib/utils/timestampUtils' instead.
 * 
 * Creates a server-side timestamp object for Firestore.
 * This is a placeholder that gets converted to a real timestamp by Firestore servers.
 * @returns A server timestamp sentinel object.
 */
export const createServerTimestamp = (): ReturnType<typeof serverTimestamp> => {
  return serverTimestamp();
}; 