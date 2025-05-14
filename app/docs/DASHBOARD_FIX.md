# การแก้ไขปัญหาการแสดงข้อมูลในหน้า Dashboard

## ประเด็นปัญหา

พบปัญหาการแสดงข้อมูลในหน้า Dashboard โดยข้อมูลที่บันทึกแล้วเป็น "Final" หรือได้รับการอนุมัติแล้ว ไม่ปรากฏในหน้า Dashboard หลังจากการอนุมัติ

## สาเหตุของปัญหา

1. **การ Query ข้อมูลไม่ถูกต้อง**: ในไฟล์ `DashboardPage.tsx` มีการใช้ query ที่มีเงื่อนไขซับซ้อนหลายข้อ ซึ่งอาจไม่ตรงกับ compound index ที่มีอยู่ใน Firestore
2. **ค่า `allFormsApproved` ไม่ถูกอัปเดต**: มีความเป็นไปได้ว่าฟิลด์ `allFormsApproved` ไม่ได้ถูกอัปเดตเป็น `true` เมื่อแบบฟอร์มทั้งกะเช้าและกะดึกได้รับการอนุมัติ
3. **การปรับโครงสร้างโค้ด**: การย้ายไฟล์และโฟลเดอร์อาจทำให้ path การ import ไม่ถูกต้อง ส่งผลให้การเรียกใช้ฟังก์ชันไม่ทำงานตามที่คาดหวัง

## การแก้ไข

1. **ปรับวิธีการ Query ข้อมูล**:
   - แก้ไขไฟล์ `DashboardPage.tsx` ให้ใช้ฟังก์ชัน `getApprovedSummariesByDateRange` จาก `dailySummary.ts` แทนการ query ตรงไปยัง Firestore
   - ฟังก์ชัน `getApprovedSummariesByDateRange` ได้รับการปรับปรุงให้ใช้ `dateString` สำหรับการ query ตามช่วงวันที่ และมีกลไก fallback

2. **ปรับปรุงฟังก์ชัน `getApprovedSummariesByDateRange`**:
   - แก้ไขให้ Query โดยใช้ `dateString` เพื่อความแม่นยำในการกรองตามช่วงวันที่
   - มีการจัดการตั้งค่า `allFormsApproved = true` สำหรับข้อมูลที่ดึงมาเพื่อช่วยในการแสดงผลบน Dashboard
   - เพิ่มกลไก fallback ในกรณีที่ query หลักไม่พบข้อมูลในช่วงวันที่ที่แคบ โดยจะ query กว้างขึ้นตาม `wardId` แล้วกรองผลลัพธ์ด้วย JavaScript

3. **ตรวจสอบความถูกต้องของการอัปเดต `allFormsApproved`**:
   - ฟังก์ชัน `checkAndCreateDailySummary` และ `updateDailySummaryApprovalStatus` ใน `approvalForms.ts` และ `dailySummary.ts` มีการตั้งค่า `allFormsApproved = true` ในเอกสาร `dailySummaries` เพื่อให้ข้อมูลแสดงผลบน Dashboard
   - ฟังก์ชัน `approveForm` เรียกใช้ฟังก์ชันดังกล่าวอย่างถูกต้อง

4. **การใช้ `calculatedCensus`**:
    - `DashboardPage.tsx` ได้รับการปรับปรุงให้ความสำคัญกับ `calculatedCensus` (และรูปแบบตามกะ) เมื่อแสดงข้อมูลจำนวนผู้ป่วยใน WardCard และส่วนอื่นๆ

## สิ่งที่ต้องทำต่อ

1. **สร้าง Compound Index เพิ่มเติม (สำคัญมาก)**:
   - สร้าง Compound Index สำหรับ collection `dailySummaries` ที่รองรับการ query ด้วยเงื่อนไข `wardId` (Ascending), `dateString` (Ascending), `allFormsApproved` (Ascending) เพื่อประสิทธิภาพสูงสุด (หรือ `wardId`, `dateString` โดย `allFormsApproved` อาจไม่จำเป็นใน query path หลักอีกต่อไปหากมีการตั้งค่าเป็น `true` เสมอตอนดึงข้อมูล)
   - ที่สำคัญคือ Index สำหรับ query หลักใน `getApprovedSummariesByDateRange`: `wardId` (Ascending), `dateString` (Ascending), `dateString` (Descending) ถ้า Firebase อนุญาตให้มี field เดียวกันสองครั้งสำหรับ range หรือ `wardId` (Ascending), `dateString` (Descending) หาก query หลักเปลี่ยนเป็น order by dateString descending
   - **Index ที่แนะนำล่าสุดสำหรับ `getApprovedSummariesByDateRange` คือ: `wardId` (Ascending), `dateString` (Descending).** หาก Firestore ต้องการ order by field เดียวกับ range query ให้ตรวจสอบอีกครั้ง

2. **ตรวจสอบ Log การทำงานอย่างต่อเนื่อง**:
    - `console.log` ที่เพิ่มเข้าไปช่วยในการตรวจสอบการไหลของข้อมูล ควรคงไว้และตรวจสอบเพิ่มเติมหากยังพบปัญหา

3. **เพิ่มกลไกการแจ้งเตือน**:
   - เพิ่มการแจ้งเตือนแก่ผู้ใช้เมื่อแบบฟอร์มทั้งสองกะได้รับการอนุมัติและข้อมูลพร้อมแสดงในหน้า Dashboard
   - อาจใช้ระบบแจ้งเตือนผ่าน NotificationService ที่มีอยู่แล้ว

4. **ตรวจสอบประสิทธิภาพ**:
   - ติดตามประสิทธิภาพของการ query ข้อมูลหลังการแก้ไข
   - ตรวจสอบว่ากลไก fallback ทำงานได้อย่างถูกต้องหรือไม่

## การทดสอบ

1. ทดสอบการย้ายระหว่างกะเช้าและกะดึกในแบบฟอร์ม
2. ทดสอบการอนุมัติแบบฟอร์มทั้งกะเช้าและกะดึก
3. ตรวจสอบว่าข้อมูลปรากฏในหน้า Dashboard หลังการอนุมัติ
4. ตรวจสอบว่าข้อมูลแสดงถูกต้องตามช่วงวันที่ที่เลือก

## ผู้รับผิดชอบ

เนื่องจากเป็นการแก้ไขที่เกี่ยวข้องกับการแสดงผลและการอนุมัติข้อมูล ควรได้รับการตรวจสอบโดยผู้ที่เข้าใจทั้งระบบ Dashboard และระบบอนุมัติแบบฟอร์ม 