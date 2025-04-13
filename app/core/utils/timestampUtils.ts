import { serverTimestamp, FieldValue } from 'firebase/firestore';
import { TimestampField } from '../types/user';

/**
 * สร้าง timestamp ที่ใช้ serverTimestamp แต่รองรับ TimestampField type
 * @returns server timestamp ที่รองรับ TimestampField
 */
export const createServerTimestamp = (): TimestampField => {
  return serverTimestamp() as unknown as TimestampField;
}; 