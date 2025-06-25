/**
 * Ward Summary Statistics Utilities
 * ฟังก์ชันยูทิลิตี้สำหรับการจัดการข้อมูลสถิติแผนก
 */

import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { DailySummary } from './WardSummaryTypes';

/**
 * ดึงข้อมูลล่าสุดของแผนก
 */
export const getLatestSummary = (
  summaries: DailySummary[], 
  selectedWard: string
): DailySummary | DailySummary[] | null => {
  if (summaries.length === 0) return null;
  
  // ถ้าดูข้อมูลแผนกเดียว ให้ดึงข้อมูลล่าสุด
  if (selectedWard !== 'all') {
    return summaries.reduce((latest, current) => {
      if (current.wardId !== selectedWard) return latest;
      
      const latestDate = latest.date instanceof Date ? latest.date : new Date(latest.date);
      const currentDate = current.date instanceof Date ? current.date : new Date(current.date);
      return currentDate > latestDate ? current : latest;
    }, summaries.find(s => s.wardId === selectedWard) || summaries[0]);
  }
  
  // ถ้าดูทุกแผนก ให้รวมข้อมูลจากทุกแผนกล่าสุด
  const latestByWard = new Map<string, DailySummary>();
  summaries.forEach(summary => {
    const existing = latestByWard.get(summary.wardId);
    if (!existing) {
      latestByWard.set(summary.wardId, summary);
      return;
    }
    
    const existingDate = existing.date instanceof Date ? existing.date : new Date(existing.date);
    const currentDate = summary.date instanceof Date ? summary.date : new Date(summary.date);
    
    if (currentDate > existingDate) {
      latestByWard.set(summary.wardId, summary);
    }
  });
  
  return Array.from(latestByWard.values());
};

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย
 */
export const formatDate = (date: Date | any): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, 'dd MMMM yyyy', { locale: th });
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Invalid Date';
  }
};