/**
 * Firebase Index Detector
 * 
 * ใช้สำหรับจับ Error ที่เกิดจากการใช้ Query ที่ต้องการ Index แต่ไม่มี และแสดงคำแนะนำ
 */

import { FirestoreError } from 'firebase/firestore';

/**
 * ตรวจจับ error ที่เกิดจากการไม่มี index สำหรับ query
 * ใช้ฟังก์ชันนี้เพื่อจับ error และแสดงลิงก์ในการสร้าง index
 * 
 * @param error Error จาก Firebase
 * @param context ข้อมูลเพิ่มเติมเกี่ยวกับ query หรือหน้าที่เกิด error
 * @returns boolean บอกว่าเป็น index error หรือไม่
 */
export function handleIndexError(error: unknown, context: string = ''): boolean {
  const firestoreError = error as FirestoreError;
  
  if (firestoreError?.code === 'failed-precondition' && 
      firestoreError?.message?.includes('index') &&
      firestoreError?.message?.includes('firestore')) {
    
    console.error(`[IndexError in ${context}] Missing Firestore Index:`);
    console.error(firestoreError.message);
    
    // ดึง URL สำหรับสร้าง index จาก error message
    const urlMatch = firestoreError.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
    if (urlMatch) {
      console.error('📊 CREATE MISSING INDEX URL:', urlMatch[0]);
      
      // สร้าง copy-paste command สำหรับเพิ่มเข้าใน firestore.indexes.json
      try {
        // พยายามดึงข้อมูล index จาก error message
        const indexInfo = extractIndexInfoFromError(firestoreError.message);
        if (indexInfo) {
          console.error('📋 ADD TO firestore.indexes.json:');
          console.error(indexInfo);
        }
      } catch (err) {
        // ไม่สามารถดึงข้อมูล index จาก error ได้
      }
    }
    
    return true;
  }
  
  return false;
}

/**
 * พยายามดึงข้อมูล index จาก error message
 * (หมายเหตุ: นี่เป็นการประมาณการแบบง่ายๆ เนื่องจาก error message อาจมีรูปแบบที่แตกต่างกัน)
 */
function extractIndexInfoFromError(errorMessage: string): string | null {
  try {
    // ตัวอย่าง pattern ของ error message
    // The query requires an index. You can create it here: https://console.firebase.google.com/...
    // Collection: wardForms, Fields: wardId ASC, status ASC, dateString DESC
    
    const collectionMatch = errorMessage.match(/Collection: ([^,]+)/);
    const fieldsMatch = errorMessage.match(/Fields: ([^\n]+)/);
    
    if (collectionMatch && fieldsMatch) {
      const collection = collectionMatch[1].trim();
      const fieldsText = fieldsMatch[1].trim();
      
      // แปลง "wardId ASC, status ASC, dateString DESC" เป็น array ของ fields
      const fields = fieldsText.split(',').map(field => {
        const [fieldPath, order] = field.trim().split(' ');
        const orderValue = order?.toLowerCase() === 'desc' ? 'DESCENDING' : 'ASCENDING';
        return `    { "fieldPath": "${fieldPath}", "order": "${orderValue}" }`;
      }).join(',\n');
      
      return `{
  "collectionGroup": "${collection}",
  "queryScope": "COLLECTION",
  "fields": [
${fields}
  ]
}`;
    }
  } catch (e) {
    console.error('Error extracting index info:', e);
  }
  
  return null;
}

export default { handleIndexError } 