import { useState, useEffect } from 'react';
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';

/**
 * Custom hook สำหรับจัดการช่วงวันที่
 * @returns ข้อมูลช่วงวันที่และฟังก์ชันสำหรับจัดการ
 */
export const useDateRange = () => {
  // ตัวเลือกช่วงเวลาที่สามารถเลือกได้
  const DATE_RANGE_OPTIONS = [
    { label: 'วันนี้', value: 'today' },
    { label: 'กำหนดเอง', value: 'custom' }
  ];

  // วันที่เริ่มต้นและสิ้นสุดในรูปแบบข้อความ (yyyy-MM-dd)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  // วันที่ที่เลือกในปัจจุบัน
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  // ประเภทของช่วงวันที่ (today, custom)
  const [dateRange, setDateRange] = useState('today');
  // ช่วงวันที่ที่มีผลจริงๆ (เป็น Date object)
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });

  // ปรับ effectiveDateRange ให้ใช้ startDate และ endDate โดยตรง
  useEffect(() => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      setEffectiveDateRange({ start, end });
      // selectedDate สอดคล้องกับ endDate ของ range ที่เลือก
      setSelectedDate(format(end, 'yyyy-MM-dd'));
      console.log(`[useDateRange] Setting date range: ${format(start, 'yyyy-MM-dd')} - ${format(end, 'yyyy-MM-dd')}, selectedDate: ${format(end, 'yyyy-MM-dd')}`);
    } catch (err) {
      console.error('[useDateRange] Error parsing date range:', err);
    }
  }, [startDate, endDate]);

  /**
   * จัดการการเปลี่ยนช่วงเวลา
   * @param newRange ประเภทของช่วงวันที่ใหม่
   */
  const handleDateRangeChange = (newRange: string) => {
    let newStartDate = startDate;
    let newEndDate = endDate;
    let newSelectedDate = selectedDate;
    
    switch(newRange) {
      case 'today':
        newStartDate = format(new Date(), 'yyyy-MM-dd');
        newEndDate = format(new Date(), 'yyyy-MM-dd');
        newSelectedDate = newStartDate;
        break;
      case 'custom':
        // ใช้ค่าเดิมจาก state (startDate, endDate)
        // selectedDate จะถูกอัปเดตจาก useEffect ของ effectiveDateRange
        newSelectedDate = endDate; 
        break;
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setSelectedDate(newSelectedDate);
    setDateRange(newRange);
    
    console.log(`[useDateRange] Date range changed to ${newRange}, newStartDate: ${newStartDate}, newEndDate: ${newEndDate}, newSelectedDate: ${newSelectedDate}`);
  };

  return {
    DATE_RANGE_OPTIONS,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedDate,
    setSelectedDate,
    dateRange,
    setDateRange,
    effectiveDateRange,
    handleDateRangeChange
  };
};

export default useDateRange; 