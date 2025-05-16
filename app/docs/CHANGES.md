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

## การแก้ไขปัญหา Dashboard และการปรับปรุง Logic (พฤษภาคม 2024 - รอบล่าสุด)

- [x] **ปรับปรุง Firestore Indexes:**
    - [x] เพิ่ม Index `wardId (ASC), dateString (DESC)` ใน `firestore.indexes.json` และ `app/docs/FIRESTORE_INDEXES.md` เพื่อรองรับ query หลักของ Dashboard
    - [x] เพิ่ม Index `wardId (ASC), allFormsApproved (ASC), dateString (DESC)` ใน `firestore.indexes.json` และ `app/docs/FIRESTORE_INDEXES.md` เพื่อเพิ่มประสิทธิภาพ query ของ Dashboard ที่กรองตามสถานะการอนุมัติและวันที่
- [x] **แก้ไขหน้า Dashboard (`app/features/dashboard/components/DashboardPage.tsx`):**
    - [x] ลดความซับซ้อนของ UI: แสดงเฉพาะ "Patient Census (คงพยาบาล)" สำหรับหอผู้ป่วยและวันที่ที่เลือก
    - [x] ปรับการเลือกวันที่: ให้เลือกได้เฉพาะวันเดียว (single day selection) แทนการเลือกช่วงวันที่
    - [x] อัปเดต Logic การดึงข้อมูล (`fetchSummaries`):
        - [x] ใช้ `selectedDate` (string 'yyyy-MM-dd') ที่ผู้ใช้เลือกโดยตรงในการสร้าง `queryStartDateString` และ `queryEndDateString` (ซึ่งจะเป็นวันเดียวกัน) สำหรับส่งไปให้ `getApprovedSummariesByDateRange`
    - [x] แก้ไข Linter error: เปลี่ยน `ward.name` เป็น `ward.wardName` ในการแสดงชื่อหอผู้ป่วย
    - [x] (ตรวจสอบ) เพิ่ม `subDays` ใน import จาก `date-fns` (แม้ว่าอาจจะไม่ถูกใช้งานในเวอร์ชันที่ลดความซับซ้อนลง)
- [x] **แก้ไข Service ดึงข้อมูลสรุป (`app/features/ward-form/services/approvalServices/dailySummary.ts`):**
    - [x] ในฟังก์ชัน `getApprovedSummariesByDateRange`:
        - [x] เพิ่มเงื่อนไข `where("allFormsApproved", "==", true)` เข้าไปใน query หลักเพื่อให้ดึงเฉพาะข้อมูลที่อนุมัติแล้วเท่านั้น
        - [x] ปรับปรุงพารามิเตอร์: ให้รับ `startDateStringForQuery` และ `endDateStringForQuery` (string 'yyyy-MM-dd') โดยตรง แทนการรับ Date objects (`startDate`, `endDate`)
        - [x] เพิ่ม `console.log` จำนวนมากเพื่อช่วยในการ Debugging:
            - Log ค่าพารามิเตอร์ที่รับเข้ามา
            - Log query string ที่จะถูก execute
            - Log จำนวนเอกสารที่ query หลักค้นพบ
            - Log เมื่อ query หลักไม่พบข้อมูล และเริ่มทำงานส่วน fallback
            - Log query string ของ fallback query
            - Log จำนวนเอกสารที่ fallback query ค้นพบ
            - Log ข้อมูลสรุปที่ได้หลังจาก fallback (ถ้ามี)
            - Log เมื่อไม่พบข้อมูลสรุปใดๆ เลย
- [x] **แก้ไข Logic การสร้าง/อัปเดตข้อมูลสรุปรายวัน (`app/features/ward-form/services/approvalServices/dailySummary.ts` - ฟังก์ชัน `checkAndCreateDailySummary`):**
    - [x] ตั้งค่า `allFormsApproved = true` เป็นค่าเริ่มต้นเมื่อมีการสร้างเอกสาร `dailySummary` ใหม่ หรือเมื่อมีการอัปเดตข้อมูลจากฟอร์มกะเช้าหรือกะดึก และข้อมูลทั้งสองกะครบถ้วน
    - [x] สร้าง `summaryId` แบบ deterministic (`${wardId}_d${formattedDateForId}`) และใช้ `setDoc` (พร้อม `{ merge: true }`) แทน `addDoc` เพื่อป้องกันการสร้างเอกสารซ้ำซ้อนสำหรับวันและหอผู้ป่วยเดียวกัน และช่วยให้สามารถอัปเดตเอกสารเดิมได้หากมีการเปลี่ยนแปลง
    - [x] เพิ่ม `console.log` เพื่อติดตามกระบวนการสร้างหรืออัปเดต `dailySummary` และการตั้งค่า `allFormsApproved`

## การปรับปรุง Dashboard เพิ่มเติม (16 พฤษภาคม 2024)

- [x] **ปรับปรุงการแสดงผล Dark Mode และ Light Mode**:
    - [x] แก้ไขปัญหา CSS ใน `DashboardOverview.tsx` ที่ไม่รองรับ Dark Mode ทำให้ข้อความไม่แสดงผลอย่างถูกต้อง
    - [x] แก้ไขปุ่มเปลี่ยน Dark Mode/Light Mode ที่ซ้ำซ้อนกัน โดยลบปุ่มที่อยู่ใน `DashboardPage.tsx` และคงไว้เฉพาะปุ่มที่อยู่ใน `app/layout.tsx`
    - [x] ปรับปรุงสีของข้อความและองค์ประกอบต่างๆ ให้มองเห็นชัดเจนในทั้งโหมดปกติและโหมดมืด

- [x] **ปรับปรุงกราฟแท่งและกราฟวงกลม**:
    - [x] แก้ไขให้กราฟแท่งและกราฟวงกลมแสดงข้อมูลครบทั้ง 12 Ward/หน่วย ได้แก่ CCU, ICU, LR, NSY, Ward10B, Ward11, Ward12, Ward6, Ward7, Ward8, Ward9, WardGI
    - [x] ปรับปรุงการแสดงผลตัวเลขในกราฟวงกลมให้เป็นจำนวนเต็ม (ไม่มีทศนิยม) โดยใช้ `Math.round()` แทนการใช้ `.toFixed(1)`
    - [x] แก้ไขให้กราฟวงกลมแสดงข้อมูลแม้ว่าค่าจะเป็น 0
    - [x] ปรับปรุงการแสดงผลข้อความบนกราฟวงกลมและใน Legend ให้มองเห็นชัดเจนในโหมดมืด

- [x] **การแสดงผลตาม Role ของ User**:
    - [x] ปรับปรุงให้ Dashboard แสดงเฉพาะข้อมูลของแผนกที่ User มีสิทธิ์เข้าถึง โดย Admin, Super Admin และ Developer จะเห็นข้อมูลของทุก Ward
    - [x] ปรับปรุงการกรองข้อมูลตาราง "ข้อมูลรวมทุกแผนก" ให้แสดงเฉพาะข้อมูลของ Ward ที่ผู้ใช้มีสิทธิ์เข้าถึง
    - [x] เพิ่มตัวแปร `hasAdminAccess` ใน `DashboardPage.tsx` เพื่อตรวจสอบสิทธิ์ของผู้ใช้และแสดงผลข้อมูลตามสิทธิ์

- [ ] ปรับปรุงการใช้งานคอมโพเนนต์ให้มีประสิทธิภาพยิ่งขึ้น 