# แก้ไขปัญหา Network Issues

## ปัญหา: Failed to fetch

### สาเหตุที่เป็นไปได้:
1. การเชื่อมต่ออินเทอร์เน็ตมีปัญหา
2. API Endpoint ไม่ถูกต้อง
3. เกิดปัญหา CORS policy
4. Server Down
5. ปัญหา Authentication

### วิธีการแก้ไข:
1. **ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต**
2. **ใช้ BASE_URL จาก environment variable**
   - แก้ไขไฟล์ service โดยใช้ `process.env.NEXT_PUBLIC_BASE_URL`
   - ตัวอย่าง:
     ```typescript
     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
     const response = await fetch(`${baseUrl}/api/endpoint`);
     ```
3. **เพิ่ม retry mechanism**
   - ในกรณีที่การเชื่อมต่อล้มเหลว ให้ลองใหม่หลังจากเวลาหนึ่ง
   - ตัวอย่าง:
     ```typescript
     setTimeout(() => {
       fetchData();
     }, 5000);
     ```
4. **ตรวจสอบ CORS settings** ใน server
5. **ตรวจสอบ API keys และ authentication tokens**
