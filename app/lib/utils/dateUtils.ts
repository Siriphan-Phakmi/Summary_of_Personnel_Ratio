import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

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

export function formatDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '-';
  try {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
} 