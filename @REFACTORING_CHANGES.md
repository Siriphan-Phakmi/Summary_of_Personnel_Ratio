# Refactoring Changes

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
