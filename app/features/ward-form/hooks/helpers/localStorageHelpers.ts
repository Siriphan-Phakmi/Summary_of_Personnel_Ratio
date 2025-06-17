import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';

/**
 * ข้อมูลที่จำเป็นสำหรับ local storage
 */
export interface LocalStorageFormData {
  wardId: string;
  shift: ShiftType;
  dateString: string;
  lastSaved: string;
  data: Partial<WardForm>;
}

/**
 * สร้าง storage key ที่ unique สำหรับแต่ละฟอร์ม
 */
export const createStorageKey = (wardId: string, shift: ShiftType, dateString: string): string => {
  return `ward_form_${wardId}_${shift}_${dateString}`;
};

/**
 * บันทึกข้อมูลลง localStorage พร้อม error handling
 */
export const saveToLocalStorage = (
  wardId: string,
  shift: ShiftType,
  dateString: string,
  data: Partial<WardForm>
): boolean => {
  try {
    const storageKey = createStorageKey(wardId, shift, dateString);
    const storageData: LocalStorageFormData = {
      wardId,
      shift,
      dateString,
      lastSaved: new Date().toISOString(),
      data
    };
    
    localStorage.setItem(storageKey, JSON.stringify(storageData));
    console.log(`[FormPersistence] Saved to localStorage: ${storageKey}`);
    return true;
  } catch (error) {
    console.error('[FormPersistence] Failed to save to localStorage:', error);
    return false;
  }
};

/**
 * ดึงข้อมูลจาก localStorage พร้อม error handling
 */
export const loadFromLocalStorage = (
  wardId: string,
  shift: ShiftType,
  dateString: string
): LocalStorageFormData | null => {
  try {
    const storageKey = createStorageKey(wardId, shift, dateString);
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      console.log(`[FormPersistence] No data found in localStorage: ${storageKey}`);
      return null;
    }
    
    const parsedData: LocalStorageFormData = JSON.parse(stored);
    console.log(`[FormPersistence] Loaded from localStorage: ${storageKey}`);
    return parsedData;
  } catch (error) {
    console.error('[FormPersistence] Failed to load from localStorage:', error);
    return null;
  }
};

/**
 * ลบข้อมูลจาก localStorage
 */
export const removeFromLocalStorage = (
  wardId: string,
  shift: ShiftType,
  dateString: string
): boolean => {
  try {
    const storageKey = createStorageKey(wardId, shift, dateString);
    localStorage.removeItem(storageKey);
    console.log(`[FormPersistence] Removed from localStorage: ${storageKey}`);
    return true;
  } catch (error) {
    console.error('[FormPersistence] Failed to remove from localStorage:', error);
    return false;
  }
};

/**
 * ตรวจสอบว่ามีข้อมูล draft ใน localStorage หรือไม่
 */
export const hasDraftInLocalStorage = (
  wardId: string,
  shift: ShiftType,
  dateString: string
): boolean => {
  const data = loadFromLocalStorage(wardId, shift, dateString);
  return data !== null;
};

/**
 * ดึงรายการ draft ทั้งหมดที่มีใน localStorage
 */
export const getAllDraftsFromLocalStorage = (): LocalStorageFormData[] => {
  try {
    const drafts: LocalStorageFormData[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ward_form_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed: LocalStorageFormData = JSON.parse(data);
            drafts.push(parsed);
          }
        } catch (parseError) {
          console.error(`[FormPersistence] Failed to parse localStorage item: ${key}`, parseError);
        }
      }
    }
    
    // เรียงตามวันที่บันทึกล่าสุด
    return drafts.sort((a, b) => 
      new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
    );
  } catch (error) {
    console.error('[FormPersistence] Failed to get all drafts from localStorage:', error);
    return [];
  }
};

/**
 * ทำความสะอาด localStorage โดยลบ draft เก่าๆ
 */
export const cleanupOldDrafts = (maxAgeInDays: number = 7): number => {
  try {
    const now = new Date();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // milliseconds
    let cleanedCount = 0;
    
    const allDrafts = getAllDraftsFromLocalStorage();
    
    for (const draft of allDrafts) {
      const draftAge = now.getTime() - new Date(draft.lastSaved).getTime();
      
      if (draftAge > maxAge) {
        const removed = removeFromLocalStorage(draft.wardId, draft.shift, draft.dateString);
        if (removed) {
          cleanedCount++;
        }
      }
    }
    
    console.log(`[FormPersistence] Cleaned up ${cleanedCount} old drafts`);
    return cleanedCount;
  } catch (error) {
    console.error('[FormPersistence] Failed to cleanup old drafts:', error);
    return 0;
  }
};

/**
 * ตรวจสอบว่าข้อมูลใน localStorage ยังใหม่หรือไม่
 */
export const isLocalStorageDataFresh = (
  wardId: string,
  shift: ShiftType,
  dateString: string,
  maxAgeInMinutes: number = 30
): boolean => {
  const data = loadFromLocalStorage(wardId, shift, dateString);
  if (!data) return false;
  
  const now = new Date();
  const lastSaved = new Date(data.lastSaved);
  const ageInMinutes = (now.getTime() - lastSaved.getTime()) / (1000 * 60);
  
  return ageInMinutes <= maxAgeInMinutes;
};

/**
 * สร้าง backup ของข้อมูลก่อนที่จะแก้ไข
 */
export const createBackup = (
  wardId: string,
  shift: ShiftType,
  dateString: string,
  data: Partial<WardForm>
): boolean => {
  const backupKey = `${createStorageKey(wardId, shift, dateString)}_backup`;
  try {
    const backupData = {
      ...data,
      backupCreatedAt: new Date().toISOString()
    };
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    console.log(`[FormPersistence] Backup created: ${backupKey}`);
    return true;
  } catch (error) {
    console.error('[FormPersistence] Failed to create backup:', error);
    return false;
  }
};

/**
 * คำนวณขนาดของ localStorage ที่ใช้ไป
 */
export const getLocalStorageSize = (): { used: number; remaining: number; percentage: number } => {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    
    // Browser มักจะมี quota ประมาณ 5-10 MB สำหรับ localStorage
    const quota = 5 * 1024 * 1024; // 5MB in bytes
    const remaining = Math.max(0, quota - total);
    const percentage = (total / quota) * 100;
    
    return {
      used: total,
      remaining,
      percentage: Math.min(100, percentage)
    };
  } catch (error) {
    console.error('[FormPersistence] Failed to calculate localStorage size:', error);
    return { used: 0, remaining: 0, percentage: 0 };
  }
};

/**
 * ตรวจสอบว่า localStorage เต็มหรือไม่
 */
export const isLocalStorageFull = (): boolean => {
  const { percentage } = getLocalStorageSize();
  return percentage > 90; // ถือว่าเต็มเมื่อใช้ไปกว่า 90%
}; 