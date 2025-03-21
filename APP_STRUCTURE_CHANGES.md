# การเปลี่ยนแปลงโครงสร้างแอปพลิเคชัน

## การเปลี่ยนแปลงล่าสุด (2025-03-21)

### ย้ายไฟล์จากโฟลเดอร์ชั่วคราว
- ย้ายไฟล์จาก `temp_utils` ไปยัง `app/utils`
- ย้ายไฟล์จาก `temp_context` ไปยัง `app/context`

### ลบไฟล์ซ้ำซ้อน
- ลบ `tailwind.config.js` เนื่องจากมี `tailwind.config.mjs` แล้ว

### ปรับปรุง Authentication
- ปรับปรุงระบบ AuthContext ให้ใช้ localStorage แทน sessionStorage
- เพิ่มการตรวจสอบ session ทุก 1 นาที
- ปรับปรุงระบบ error handling

## โครงสร้างโฟลเดอร์ปัจจุบัน

- `/app` - หน้าและคอมโพเนนต์หลัก
  - `/app/components` - React components
  - `/app/context` - Context providers
  - `/app/hooks` - Custom React hooks
  - `/app/lib` - Libraries and integrations
  - `/app/pages` - Route components
  - `/app/services` - Service functions
  - `/app/utils` - Utility functions
  - `/app/admin` - Admin area components
  - `/app/approval` - Approval workflow components
  - `/app/ward` - Ward management components
- `/public` - Assets สาธารณะ
- `/.hooks` - Git hooks scripts

## การปรับเปลี่ยน Redirects
- ปรับปรุง redirect rules ใน `next.config.js` ให้สอดคล้องกับโครงสร้างใหม่

## แผนการปรับปรุงในอนาคต
- เพิ่ม TypeScript type definitions
- ปรับปรุงโครงสร้างโค้ดตาม REFACTOR_GUIDE.md
- แยก Firebase API calls ออกจาก UI logic
- เพิ่มระบบทดสอบ (test) 