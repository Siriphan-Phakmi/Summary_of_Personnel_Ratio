import { serverTimestamp, FieldValue } from 'firebase/firestore';
// import { ServerTimestampType } from '@/app/core/types/user';

export const createServerTimestamp = (): FieldValue => {
  return serverTimestamp();
}; 