import { useState, useCallback, useEffect } from 'react';
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { User } from '@/app/core/types/user';
import { logInfo, logError } from '../utils';

/**
 * Custom hook สำหรับจัดการช่วงวันที่ใน Dashboard
 * 
 * @param initialStartDate วันที่เริ่มต้น (ค่าเริ่มต้น: วันนี้)
 * @param initialEndDate วันที่สิ้นสุด (ค่าเริ่มต้น: วันนี้)
 * @param onDateRangeChange callback เมื่อมีการเปลี่ยนแปลงช่วงวันที่
 * @returns object ที่ประกอบด้วย state และ functions ที่เกี่ยวข้องกับช่วงวันที่
 */
export const useDateRangeEffect = (
  initialStartDate: string = format(new Date(), 'yyyy-MM-dd'),
  initialEndDate: string = format(new Date(), 'yyyy-MM-dd'),
  onDateRangeChange?: (start: Date, end: Date) => void
) => {
  // State สำหรับเก็บข้อมูลช่วงวันที่
  const [dateRange, setDateRange] = useState<string>('today');
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(parseISO(initialStartDate)),
    end: endOfDay(parseISO(initialEndDate))
  });

  /**
   * ฟังก์ชันสำหรับจัดการเมื่อมีการเปลี่ยนช่วงวันที่
   */
  const handleDateRangeChange = useCallback((value: string) => {
    // ตั้งค่าช่วงวันที่ตามตัวเลือกที่เลือก
    switch(value) {
      case 'today':
        // วันนี้
        const today = format(new Date(), 'yyyy-MM-dd');
        setEffectiveDateRange({
          start: startOfDay(new Date()),
          end: endOfDay(new Date())
        });
        
        // อัปเดต startDate และ endDate ให้เป็นวันเดียวกัน
        setStartDate(today);
        setEndDate(today);
        break;
      case 'custom':
        // ใช้ค่า startDate และ endDate ที่ผู้ใช้กำหนด
        if (startDate && endDate) {
          setEffectiveDateRange({
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate))
          });
        }
        break;
      case 'all':
        // แสดงข้อมูลทั้งหมด
        setEffectiveDateRange({
          start: startOfDay(parseISO('2021-01-01')), // หรือวันที่เริ่มต้นที่ต้องการ
          end: endOfDay(new Date()) // วันปัจจุบัน
        });
        break;
      default:
        // ค่าดีฟอลต์คือวันนี้
        setEffectiveDateRange({
          start: startOfDay(new Date()),
          end: endOfDay(new Date())
        });
        break;
    }
  }, [startDate, endDate]);

  /**
   * เรียกใช้ callback เมื่อ effectiveDateRange เปลี่ยนแปลง
   */
  useEffect(() => {
    onDateRangeChange?.(effectiveDateRange.start, effectiveDateRange.end);
  }, [effectiveDateRange, onDateRangeChange]);

  /**
   * ฟังก์ชันสำหรับตั้งค่าช่วงวันที่แบบกำหนดเอง
   */
  const applyCustomDateRange = useCallback(() => {
    setDateRange('custom');
    handleDateRangeChange('custom');
  }, [handleDateRangeChange]);

  /**
   * ฟังก์ชันสำหรับเปลี่ยนวันที่เลือกเป็นวันที่เฉพาะเจาะจง
   */
  const selectSpecificDate = useCallback((date: string) => {
    setStartDate(date);
    setEndDate(date);
    setDateRange('today');
    setEffectiveDateRange({
      start: startOfDay(parseISO(date)),
      end: endOfDay(parseISO(date))
    });
  }, []);

  return {
    dateRange,
    setDateRange,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    effectiveDateRange,
    handleDateRangeChange,
    applyCustomDateRange,
    selectSpecificDate
  };
};

export default useDateRangeEffect; 