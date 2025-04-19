import { serverTimestamp, FieldValue } from 'firebase/firestore';
import { ServerTimestampType } from '@/app/core/types/user';

export const createServerTimestamp = (): ServerTimestampType => {
  const timestamp = serverTimestamp();
  return {
    seconds: null,
    nanoseconds: null,
    isEqual: (timestamp as FieldValue).isEqual,
    toDate: () => new Date(),
    valueOf: () => null
  };
}; 