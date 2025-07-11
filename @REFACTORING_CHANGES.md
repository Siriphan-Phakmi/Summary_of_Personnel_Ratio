# Refactoring Changes

## 2025-07-11

### แก้ไข Linter Errors หลังเพิ่มฟีเจอร์แจ้งเตือน

- **ไฟล์ที่แก้ไข:**
  - `app/features/ward-form/hooks/helpers/useFormSaveManager.ts`:
    - แก้ไขการ `import notificationService` จาก named import เป็น default import
  - `app/features/ward-form/hooks/helpers/useFormDataLoader.ts`:
    - อัปเดต `UseFormDataLoaderReturn` interface ให้ `loadData` function สามารถรับ optional parameter `forceRefetch` ได้

- **เหตุผล:**
  - เพื่อแก้ไขข้อผิดพลาดที่เกิดขึ้นจากการแก้ไขโค้ดครั้งล่าสุด ทำให้โค้ดกลับมาสมบูรณ์และไม่มีข้อผิดพลาด (Error-free)

### เพิ่มระบบแจ้งเตือน (Notification) สำหรับการบันทึกฟอร์ม

- **ไฟล์ที่แก้ไข:**
  - `app/features/ward-form/hooks/helpers/useFormSaveManager.ts`:
    - เพิ่มการเรียกใช้ `notificationService` เพื่อสร้างการแจ้งเตือนเมื่อมีการบันทึกฟอร์ม (ทั้งฉบับร่างและฉบับสมบูรณ์)
    - เพิ่มฟังก์ชัน `createSaveNotification` เพื่อจัดการตรรกะการสร้างการแจ้งเตือน
    - ดึงรายชื่อผู้ใช้ทั้งหมดเพื่อส่งการแจ้งเตือนไปยัง Admin และ Developer
  - `app/features/notifications/types/notification.ts`:
    - เพิ่ม `NotificationType` ใหม่: `FORM_DRAFT_SAVED` และ `FORM_FINALIZED`
  - `app/features/notifications/types/index.ts`:
    - ปรับปรุงการ export type ให้ถูกต้องและไม่ซ้ำซ้อน

- **เหตุผล:**
  - เพื่อเพิ่มการแจ้งเตือนแบบเรียลไทม์ให้ผู้ใช้ทราบเมื่อมีการบันทึกข้อมูลในระบบ
  - เป็นไปตามข้อกำหนดที่ User จะเห็นเฉพาะการแจ้งเตือนของตัวเอง ในขณะที่ Admin และ Developer จะเห็นการแจ้งเตือนทั้งหมด

### แก้ไขปัญหาข้อมูลฉบับร่าง (Draft) ไม่แสดงผล

- **ไฟล์ที่แก้ไข:**
  - `app/features/ward-form/hooks/helpers/useFormDataLoader.ts`:
    - ปรับปรุงฟังก์ชัน `loadData` ให้สามารถบังคับดึงข้อมูลใหม่จาก Firebase โดยไม่ผ่าน Cache (`forceRefetch`)
    - แก้ไข `useEffect` ที่เรียก `loadData` ให้ส่ง parameter `forceRefetch` เมื่อมีการ trigger reload
  - `app/features/ward-form/hooks/useWardFormData.ts`:
    - แก้ไข `onSaveSuccess` callback ให้เรียก `loadData(true)` เพื่อบังคับให้ดึงข้อมูลใหม่ทุกครั้งหลังการบันทึกสำเร็จ

- **เหตุผล:**
  - เพื่อแก้ไขปัญหาที่ข้อมูลฉบับร่างที่บันทึกไว้ไม่ถูกโหลดมาแสดงผลเมื่อผู้ใช้กลับมาที่หน้าฟอร์มอีกครั้ง เนื่องจากระบบ Caching ที่มีอยู่จะคืนค่าข้อมูลเก่า
  - การเปลี่ยนแปลงนี้ทำให้มั่นใจได้ว่าข้อมูลที่แสดงบน UI เป็นข้อมูลล่าสุดจาก Firebase เสมอ

## 2025-07-10

### แก้ไขปัญหา Failed to fetch ในระบบแจ้งเตือน

- **ไฟล์ที่แก้ไข:**
  - `app/features/notifications/services/NotificationService.ts`
    - เปลี่ยนจาก `fetch('/api/notifications/get')` เป็นใช้ `process.env.NEXT_PUBLIC_BASE_URL`
    - เพิ่ม headers `Content-Type: application/json`
  - `app/features/notifications/hooks/useNotificationBell.ts`
    - เพิ่ม retry mechanism โดยลอง fetch ใหม่หลังจาก 5 วินาทีหากเกิด error
  - `app/api/notifications/get/route.ts`
    - เพิ่ม error logging ละเอียด (แสดง error code จาก Firebase)
    - แก้ไขการนับ unreadCount
    - ปรับปรุงการแปลง timestamp
    - ปรับปรุงข้อความ error ที่ส่งกลับไปยัง client

- **เหตุผล:**
  - เพื่อแก้ไขปัญหา network และเพิ่มความเสถียรของระบบ
  - เพื่อให้ debug ข้อผิดพลาดได้ง่ายขึ้น
