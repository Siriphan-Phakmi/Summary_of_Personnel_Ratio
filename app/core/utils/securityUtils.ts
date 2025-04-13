/**
 * Utils สำหรับการรักษาความปลอดภัย เช่น การป้องกัน XSS
 */

/**
 * ทำความสะอาดข้อความ input เพื่อป้องกัน XSS
 * @param input ข้อความที่ต้องการทำความสะอาด
 * @returns ข้อความที่ผ่านการทำความสะอาดแล้ว
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * ทำความสะอาด object เพื่อป้องกัน XSS
 * @param obj Object ที่ต้องการทำความสะอาด
 * @returns Object ที่ผ่านการทำความสะอาดแล้ว
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: any = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}

/**
 * ตรวจสอบว่า input มีโค้ด JavaScript หรือไม่
 * @param input ข้อความที่ต้องการตรวจสอบ
 * @returns true ถ้ามีโค้ด JavaScript
 */
export function containsJavaScript(input: string): boolean {
  if (!input) return false;
  
  // ตรวจสอบ script tag
  const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  if (scriptRegex.test(input)) return true;
  
  // ตรวจสอบ event handlers
  const eventRegex = /\bon\w+\s*=/gi;
  if (eventRegex.test(input)) return true;
  
  // ตรวจสอบ javascript: URL
  const jsUrlRegex = /javascript\s*:/gi;
  if (jsUrlRegex.test(input)) return true;
  
  // ตรวจสอบรูปแบบอื่นๆ ที่อาจเป็นอันตราย
  const dangerousPatterns = [
    /eval\s*\(/gi,
    /document\.cookie/gi,
    /document\.write/gi,
    /window\.location/gi,
    /document\.location/gi
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) return true;
  }
  
  return false;
}

/**
 * ตรวจสอบว่า input มีคำสั่ง SQL Injection หรือไม่
 * @param input ข้อความที่ต้องการตรวจสอบ
 * @returns true ถ้ามีรูปแบบที่อาจเป็น SQL Injection
 */
export function containsSQLInjection(input: string): boolean {
  if (!input) return false;
  
  // ตรวจสอบรูปแบบที่อาจเป็น SQL Injection
  const sqlPatterns = [
    /'\s*OR\s*'1'\s*=\s*'1/gi,
    /'\s*OR\s*1\s*=\s*1/gi,
    /'\s*;\s*DROP\s+TABLE/gi,
    /'\s*;\s*DELETE\s+FROM/gi,
    /'\s*;\s*INSERT\s+INTO/gi,
    /'\s*;\s*UPDATE\s+/gi,
    /'\s*--/gi,
    /\/\*/gi
  ];
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) return true;
  }
  
  return false;
}

/**
 * ตรวจสอบและทำความสะอาด input ทั้งหมด
 * @param input ข้อความหรือ object ที่ต้องการตรวจสอบและทำความสะอาด
 * @returns ข้อความหรือ object ที่ผ่านการตรวจสอบและทำความสะอาดแล้ว
 */
export function validateAndSanitize<T>(input: T): { isValid: boolean; sanitized: T; errors: string[] } {
  const errors: string[] = [];
  
  // กรณีเป็น string
  if (typeof input === 'string') {
    if (containsJavaScript(input)) {
      errors.push('พบรูปแบบที่อาจเป็น JavaScript ที่เป็นอันตราย');
    }
    
    if (containsSQLInjection(input)) {
      errors.push('พบรูปแบบที่อาจเป็น SQL Injection');
    }
    
    return {
      isValid: errors.length === 0,
      sanitized: sanitizeInput(input) as unknown as T,
      errors
    };
  }
  
  // กรณีเป็น object
  if (input && typeof input === 'object') {
    const result = sanitizeObject(input);
    
    // ตรวจสอบทุก string ใน object
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        if (containsJavaScript(value)) {
          errors.push(`พบรูปแบบที่อาจเป็น JavaScript ที่เป็นอันตรายในฟิลด์ ${key}`);
        }
        
        if (containsSQLInjection(value)) {
          errors.push(`พบรูปแบบที่อาจเป็น SQL Injection ในฟิลด์ ${key}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitized: result,
      errors
    };
  }
  
  // กรณีเป็นชนิดข้อมูลอื่นๆ
  return {
    isValid: true,
    sanitized: input,
    errors: []
  };
} 