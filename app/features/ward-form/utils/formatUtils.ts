import { ShiftType } from '../types/ward';

/**
 * Formats the shift type enum into a human-readable Thai string.
 * @param shift The shift type from the form data.
 * @returns A formatted string ('เวรเช้า', 'เวรดึก', or '-')
 */
export const formatShift = (shift: ShiftType | null | undefined): string => {
  if (!shift) return '-';
  return shift === ShiftType.MORNING ? 'เวรเช้า' : 'เวรดึก';
}; 