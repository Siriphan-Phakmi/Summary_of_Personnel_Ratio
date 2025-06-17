export const getComparisonTimestamp = (time: any): number => {
    if (!time) return 0;
    
    // ถ้าเป็น Firebase Timestamp
    if (time && typeof time === 'object' && 'seconds' in time) {
      return time.seconds;
    }
    
    // ถ้าเป็น Date object
    if (time instanceof Date) {
      return Math.floor(time.getTime() / 1000);
    }
    
    // ถ้าเป็นตัวเลข (timestamp)
    if (typeof time === 'number') {
      return time > 1e10 ? Math.floor(time / 1000) : time;
    }
    
    return 0;
  }; 