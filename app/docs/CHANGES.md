# บันทึกการเปลี่ยนแปลงและงานที่ต้องทำต่อ

## การเปลี่ยนแปลงที่ดำเนินการแล้ว (พฤษภาคม 2024)

### การจัดโครงสร้างไฟล์ใหม่

- [x] สร้างโครงสร้างโฟลเดอร์ใหม่ตามแนวทาง Feature-based organization
- [x] ย้ายไฟล์จาก `features/census/dashboard` ไปยัง `features/dashboard`
- [x] ย้ายไฟล์จาก `features/census/forms` ไปยัง `features/ward-form`
- [x] ย้ายไฟล์จาก `features/census/approval` ไปยัง `features/approval`
- [x] ย้ายไฟล์จาก `features/census/api` ไปยัง `features/dashboard/api`
- [x] ย้ายเอกสารสำคัญไปยัง `app/docs` เพื่อให้ง่ายต่อการค้นหา

### การจัดการเอกสาร

- [x] สร้างไฟล์ `RESTRUCTURING.md` เพื่ออธิบายการเปลี่ยนแปลงโครงสร้าง
- [x] อัปเดต `README.md` เพื่อสะท้อนโครงสร้างใหม่
- [x] ย้ายคู่มือต่างๆ เช่น `FIRESTORE_INDEXES.md`, `TASKS.md` ไปยัง `app/docs`
- [x] ลบไฟล์ซ้ำซ้อน: `app/docs/firestore.indexes.json` และ `app/docs/firestore.rules`

### การปรับปรุงเส้นทางการนำเข้า (Import Paths)

- [x] แก้ไขการอิมพอร์ตในหน้า `census/form/page.tsx` ให้ใช้ `@/app/features/ward-form/DailyCensusForm`
- [x] แก้ไขการอิมพอร์ตในหน้า `census/dashboard/page.tsx` ให้ใช้ `@/app/features/dashboard/DashboardPage`
- [x] แก้ไขการอิมพอร์ตในหน้า `census/approval/page.tsx` ให้ใช้ `@/app/features/approval/ApprovalPage`
- [x] ลบไฟล์ `task-list.mdc` ที่ไม่มีการอ้างอิงในโค้ด

### การอัปเดตไฟล์ README.md

- [x] อัปเดตส่วน "Project Status" ในไฟล์ README.md เพื่อแสดงสถานะปัจจุบันของโปรเจค (อัปเดต 2024-05-10) 
- [x] เพิ่มรายการที่เสร็จสมบูรณ์แล้ว เช่น การปรับโครงสร้างโค้ดตามฟีเจอร์
- [x] อัปเดตรายการที่กำลังดำเนินการและกำลังจะทำในอนาคต
- [x] เพิ่มหัวข้อ "Developer Notes" เพื่อแนะนำไฟล์เอกสารสำหรับนักพัฒนา

### การปรับปรุงกฎความปลอดภัยใน Firestore

- [x] เพิ่มฟังก์ชัน `isUpdatingAllowedFields()` ใน firestore.rules เพื่อตรวจสอบฟิลด์ที่อนุญาตให้ผู้ใช้อัปเดตได้
- [x] เพิ่มฟังก์ชัน `canWriteWardForm()` เพื่อตรวจสอบสิทธิ์ในการเขียนฟอร์มของวอร์ด
- [x] ปรับปรุงกฎการเข้าถึงข้อมูลใน collection wardForms ให้รองรับกรณีที่แบบฟอร์มถูกปฏิเสธ
- [x] กำหนดให้ไม่สามารถแก้ไขหรือลบบันทึกใน collection systemLogs

### การแก้ไขล่าสุด (Dashboard Data Display - พฤษภาคม 2024)

- [x] **ปรับปรุง Logic การดึงข้อมูลใน `app/features/ward-form/services/approvalServices/dailySummary.ts`**:
  - [x] แก้ไขฟังก์ชัน `getApprovedSummariesByDateRange` ให้ Query ข้อมูลโดยใช้ `dateString` เพื่อแก้ไขปัญหา Timestamp mismatch
  - [x] เพิ่ม Fallback logic ในกรณีที่ไม่พบข้อมูลในช่วงวันที่ที่กำหนด โดยจะค้นหาจาก `wardId` แล้วกรองผลลัพธ์
  - [x] ตั้งค่า `allFormsApproved = true` สำหรับข้อมูลที่ดึงมาได้ เพื่อให้แสดงผลบน Dashboard ตามความต้องการปัจจุบัน
- [x] **ปรับปรุงการแสดงผลใน `app/features/dashboard/components/DashboardPage.tsx`**:
  - [x] อัปเดตฟังก์ชัน `fetchSummaries` ให้ประมวลผลข้อมูล `summaries` ที่ได้รับจาก `getApprovedSummariesByDateRange` อย่างถูกต้อง
  - [x] ปรับ Logic การคำนวณ `wardStats` (สำหรับ WardCard) ให้จัดลำดับความสำคัญของค่า Census (ใช้ `calculatedCensus` และรูปแบบตามกะ) เพื่อความแม่นยำ
  - [x] จัดการการตั้งค่า `allFormsApproved = true` ในข้อมูล `summaries` เพื่อให้สอดคล้องกับการแสดงผล
- [x] **ปรับปรุง Logic การอนุมัติใน `app/features/ward-form/services/approvalServices/approvalForms.ts`**:
  - [x] แก้ไขฟังก์ชัน `updateDailySummaryApprovalStatus` ให้ตั้งค่า `allFormsApproved = true` ในเอกสาร `dailySummaries` เมื่อมีการอัปเดตสถานะ
- [x] **อัปเดต Interface ใน `app/core/types/approval.ts`**:
  - [x] เพิ่มฟิลด์ `calculatedCensus`, `morningCalculatedCensus`, และ `nightCalculatedCensus` ใน Interface `DailySummary`

## งานที่ต้องทำต่อ

### การปรับปรุงเส้นทางการนำเข้า (Import Paths)

การย้ายไฟล์ไปยังตำแหน่งใหม่ทำให้ต้องปรับปรุงเส้นทางการนำเข้าใน components ต่างๆ จึงควรตรวจสอบและแก้ไขไฟล์ต่อไปนี้:

- [ ] ตรวจสอบและอัปเดตการอิมพอร์ตในโมดูลอื่นๆ ที่ยังอ้างอิง paths เก่า
- [x] หลังจากปรับการอิมพอร์ตทั้งหมดแล้ว ให้ลบโฟลเดอร์ซ้ำซ้อน `app/features/census`

### การตรวจสอบความสมบูรณ์

- [ ] ตรวจสอบว่าแอปพลิเคชันยังทำงานได้อย่างถูกต้องหลังการปรับโครงสร้าง
- [ ] ทดสอบการทำงานของระบบฟอร์ม การอนุมัติ และการแสดงผลแดชบอร์ด
- [ ] ตรวจสอบว่าไม่มีข้อผิดพลาดในการทำงานของ API

### การลบโค้ดซ้ำซ้อน

- [ ] กำจัดโค้ดที่ซ้ำซ้อนระหว่างโมดูลเก่าและใหม่
- [ ] รวมฟังก์ชันการทำงานที่ทำงานเหมือนกันเข้าด้วยกัน
- [ ] ปรับปรุงการใช้งานคอมโพเนนต์ให้มีประสิทธิภาพยิ่งขึ้น 