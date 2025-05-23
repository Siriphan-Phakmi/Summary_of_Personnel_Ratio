# การปรับโครงสร้างโค้ดโปรเจค Summary of Personnel Ratio

วันที่ปรับปรุงครั้งล่าสุด: 15 พฤษภาคม 2024

## สรุปการเปลี่ยนแปลง

โปรเจคนี้ได้รับการปรับโครงสร้างใหม่เพื่อปรับปรุงความเป็นระเบียบและความสามารถในการบำรุงรักษาของโค้ด โดยเปลี่ยนจากการจัดเรียงตาม URL route เป็นการจัดเรียงตามฟีเจอร์ (Feature-based organization)

### หลักการสำคัญในการปรับโครงสร้าง

1. **แบ่งตามฟีเจอร์ (Feature-based)** - โค้ดถูกจัดกลุ่มตามฟีเจอร์ที่เกี่ยวข้อง ทำให้ง่ายต่อการหาและบำรุงรักษา
2. **แยก core จากฟีเจอร์** - โค้ดพื้นฐานที่ใช้ร่วมกันถูกแยกออกจากฟีเจอร์เฉพาะ
3. **แยก API Routes** - API routes ถูกจัดเรียงให้เป็นระเบียบตามฟีเจอร์
4. **เก็บเอกสารรวมกัน** - เอกสารสำคัญถูกย้ายไปเก็บใน `app/docs` เพื่อให้ง่ายต่อการค้นหา

## โครงสร้างโฟลเดอร์ใหม่

```
app/
  /features/           # ฟีเจอร์ต่างๆ ของแอปพลิเคชัน
    /auth/             # ฟีเจอร์การ authenticate
    /ward-form/        # ฟีเจอร์การกรอกข้อมูลหอผู้ป่วย (จากเดิม census/forms)
    /approval/         # ฟีเจอร์การอนุมัติข้อมูล (จากเดิม census/approval)
    /dashboard/        # ฟีเจอร์การแสดงผลข้อมูล (จากเดิม census/dashboard)
    /admin/            # ฟีเจอร์การจัดการผู้ใช้และระบบ
    /theme/            # การจัดการธีม dark/light mode
    /notifications/    # ระบบการแจ้งเตือน
  /core/               # โค้ดพื้นฐานที่ใช้ร่วมกัน
    /components/       # คอมโพเนนต์พื้นฐาน
    /hooks/            # React hooks ที่ใช้ร่วมกัน
    /services/         # บริการกลางต่างๆ
    /types/            # TypeScript type ที่ใช้ร่วมกัน
    /utils/            # Utility functions
    /firebase/         # การเชื่อมต่อ Firebase
    /ui/               # UI components พื้นฐาน
  /api/                # API routes
    /auth/             # API สำหรับการ authenticate
    /ward-form/        # API สำหรับฟอร์มหอผู้ป่วย
    /approval/         # API สำหรับการอนุมัติ
    /dashboard/        # API สำหรับข้อมูลแดชบอร์ด
  /docs/               # เอกสารต่างๆ
  /census/             # หน้าเว็บสำหรับกรอกข้อมูล (เรียกใช้ features)
    /form/             # หน้ากรอกข้อมูล
    /approval/         # หน้าอนุมัติข้อมูล
    /dashboard/        # หน้าแดชบอร์ด
  /admin/              # หน้าเว็บสำหรับผู้ดูแลระบบ (เรียกใช้ features)
```

## ความคืบหน้าในการปรับโครงสร้าง

### การย้ายไฟล์และแก้ไขการอิมพอร์ต ✅

- [x] ย้ายไฟล์จาก `features/census/dashboard` ไปยัง `features/dashboard`
- [x] ย้ายไฟล์จาก `features/census/forms` ไปยัง `features/ward-form`
- [x] ย้ายไฟล์จาก `features/census/approval` ไปยัง `features/approval`
- [x] ย้ายไฟล์จาก `features/census/api` ไปยัง `features/dashboard/api`
- [x] แก้ไขการอิมพอร์ตในหน้า `census/form/page.tsx` ให้ใช้ `@/app/features/ward-form/DailyCensusForm`
- [x] แก้ไขการอิมพอร์ตในหน้า `census/dashboard/page.tsx` ให้ใช้ `@/app/features/dashboard/DashboardPage`
- [x] แก้ไขการอิมพอร์ตในหน้า `census/approval/page.tsx` ให้ใช้ `@/app/features/approval/ApprovalPage`
- [x] ลบโฟลเดอร์ `features/census` ที่ไม่ได้ใช้งานแล้ว

### การจัดการเอกสาร ✅

- [x] ย้ายเอกสารสำคัญไปยัง `app/docs` เพื่อให้ง่ายต่อการค้นหา
- [x] สร้างและอัปเดตเอกสารอธิบายการปรับโครงสร้าง
- [x] อัปเดต README.md ในโฟลเดอร์ต่างๆ
- [x] ลบไฟล์ซ้ำซ้อนใน `app/docs`
- [x] อัปเดตไฟล์ README.md ในโฟลเดอร์หลัก เพิ่มส่วน "Project Status" แสดงสถานะโปรเจคล่าสุด
- [x] เพิ่มส่วน "Developer Notes" ใน README.md เพื่อแนะนำเอกสารสำคัญสำหรับนักพัฒนา
- [x] อัปเดตรายการความคืบหน้าในไฟล์ README.md แยกเป็นส่วน "Recently Completed", "In Progress" และ "Upcoming"

### การปรับปรุงกฎความปลอดภัย ✅

- [x] ปรับปรุงกฎใน `firestore.rules` เพื่อรองรับโครงสร้างใหม่
- [x] เพิ่มฟังก์ชัน `isUpdatingAllowedFields()` สำหรับตรวจสอบฟิลด์ที่อนุญาตให้ผู้ใช้อัปเดตได้
- [x] เพิ่มฟังก์ชัน `canWriteWardForm()` สำหรับตรวจสอบสิทธิ์ในการเขียนฟอร์มของวอร์ด
- [x] ปรับปรุงกฎการเข้าถึงข้อมูลใน collection wardForms ให้รองรับกรณีที่แบบฟอร์มถูกปฏิเสธ
- [x] กำหนดกฎพิเศษสำหรับ systemLogs ป้องกันการแก้ไขหรือลบบันทึก

### งานที่ต้องดำเนินการต่อ ⏳

1. **ปรับปรุงการนำเข้า (Imports)** - ตรวจสอบและปรับปรุงการอิมพอร์ตในโมดูลอื่นๆ ที่ยังอ้างอิงถึงโฟลเดอร์เก่า
2. **ตรวจสอบความสมบูรณ์** - ตรวจสอบว่าแอปพลิเคชันยังทำงานได้อย่างถูกต้องหลังการปรับโครงสร้าง
3. **อัปเดตแผนผังโปรเจค** - อัปเดตเอกสารให้สะท้อนถึงโครงสร้างใหม่
4. **กำจัดโค้ดซ้ำซ้อน** - หลังจากจัดโครงสร้างใหม่ ควรตรวจสอบและลบโค้ดที่ซ้ำซ้อน

## ผลลัพธ์ที่คาดหวัง

การปรับโครงสร้างนี้จะช่วยให้:

1. การค้นหาและแก้ไขโค้ดทำได้ง่ายขึ้น เนื่องจากโค้ดถูกจัดกลุ่มตามฟีเจอร์
2. การพัฒนาฟีเจอร์ใหม่ทำได้สะดวกขึ้น เพราะมีโครงสร้างที่ชัดเจน
3. การบำรุงรักษาโค้ดระยะยาวมีประสิทธิภาพมากขึ้น
4. ลดความซับซ้อนของการนำทางในโค้ด (code navigation) สำหรับนักพัฒนา 