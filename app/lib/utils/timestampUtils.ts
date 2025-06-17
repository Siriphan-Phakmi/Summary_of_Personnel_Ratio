import { Timestamp, FieldValue } from 'firebase/firestore';
import { format as formatDateFn, isValid } from 'date-fns';
import { ServerTimestamp } from '@/app/features/ward-form/types/ward';

export type TimestampInput = Timestamp | Date | string | number | ServerTimestamp | FieldValue | null | undefined;

/**
 * Converts various timestamp formats into a JavaScript Date object.
 * Returns null if the input is invalid.
 * @param time - The timestamp to convert (Firebase Timestamp, Date, string, or number).
 * @returns A Date object or null.
 */
export const toDate = (time: TimestampInput): Date | null => {
  if (!time) {
    return null;
  }
  let date: Date;
  if (time instanceof Timestamp) {
    date = time.toDate();
  } else if (time instanceof Date) {
    date = time;
  } else if (typeof time === 'string' || typeof time === 'number') {
    date = new Date(time);
  } else {
    return null;
  }
  
  return isValid(date) ? date : null;
};

/**
 * Formats a timestamp into a specified string format.
 * Handles Firebase Timestamps, Date objects, and date strings.
 * @param time - The timestamp to format.
 * @param format - The desired output format (e.g., 'dd/MM/yyyy HH:mm').
 * @returns The formatted date string, or an empty string if the input is invalid.
 */
export const formatTimestamp = (time: TimestampInput, format: string = 'dd/MM/yyyy'): string => {
  const date = toDate(time);
  if (!date) {
    return '';
  }
  try {
    return formatDateFn(date, format);
  } catch (error) {
    console.error(`Error formatting date: ${date} with format: ${format}`, error);
    return '';
  }
}; 