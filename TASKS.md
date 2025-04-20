# งานที่ดำเนินการในโปรเจค Summary of Personnel Ratio

## สรุปงานที่ได้ดำเนินการแล้ว

1. **ระบบหลังบ้าน**
   - [x] สร้างฟังก์ชัน `validateFormData` สำหรับตรวจสอบข้อมูลก่อนบันทึก
   - [x] ปรับปรุงฟังก์ชัน `calculateNightShiftCensus` สำหรับคำนวณจำนวนผู้ป่วย
   - [x] เพิ่มฟังก์ชัน `calculateMorningCensus` สำหรับคำนวณจำนวนผู้ป่วยกะเช้า
   - [x] พัฒนา `IndexManager` สำหรับสร้าง Indexes ใน Firebase
   - [x] อัพเดทฟังก์ชัน `updateDailySummary` สำหรับบันทึกข้อมูลสรุป 24 ชม.
   - [x] เพิ่มฟังก์ชัน `getApprovedSummaries` สำหรับดึงข้อมูลที่อนุมัติแล้ว
   - [x] เพิ่มฟังก์ชัน `getApprovedSummariesByDateRange` ดึงข้อมูลตามช่วงเวลา
   - [x] สร้าง interface `DailySummary` สำหรับข้อมูลสรุปประจำวัน
   - [x] แก้ไข Type Error เกี่ยวกับ TimestampField และการแปลงวันที่
   - [x] ปรับปรุงฟังก์ชัน `createServerTimestamp` ใน timestampUtils.ts ให้ return ค่า `serverTimestamp()` ที่ถูกต้อง
   - [x] แก้ไขกระบวนการตรวจสอบและสร้าง indexes ใน Firestore
   - [x] แก้ไข API Route `/api/auth/login` ให้ตรวจสอบ CSRF Token
   - [x] แก้ไข API Route `/api/auth/login` ให้ใช้ `bcrypt.compare` ในการตรวจสอบรหัสผ่าน
   - [x] แก้ไข API Route `/api/auth/login` ให้สร้าง Token และตั้ง Cookie อย่างถูกต้อง
   - [x] ตรวจสอบ API Route `/api/auth/session` สำหรับการยืนยัน Session
   - [x] แก้ไข Utility `authUtils.ts`:
       - [x] ปรับปรุง `comparePassword` ให้ใช้ bcrypt เท่านั้น ลบ Fallback Plaintext
       - [x] ตรวจสอบ `generateToken` และ `verifyToken` ให้ทำงานสอดคล้องกัน
       - [x] เพิ่ม `export` ให้ `generateCSRFToken` และ `validateCSRFToken`
       - [x] แก้ไข Linter errors หลังการปรับปรุง `comparePassword`
   - [x] **ปรับปรุง Document ID:** แก้ไข `wardFormService.ts` ให้สร้าง Document ID แบบกำหนดเอง (Custom ID) สำหรับ Collection `wardForms` ตามรูปแบบ `{wardId}_{shift}_{status}_d{date}_t{time}` และเปลี่ยนไปใช้ `setDoc` แทน `addDoc`
   - [x] แก้ไข Linter Errors ที่เกิดจากการปรับปรุง Document ID (เกี่ยวกับ Type ของวันที่ และการเข้าถึง Property แบบ Dynamic)

2. **การพัฒนา UI/UX**
   - [x] สร้างคอมโพเนนต์ `LoadingOverlay` สำหรับแสดงสถานะโหลดข้อมูล
   - [x] พัฒนา Context API สำหรับจัดการสถานะโหลด (LoadingContext)
   - [x] ปรับปรุงการแสดงผลในโหมดมืด (Dark Mode)
   - [x] พัฒนาระบบการแจ้งเตือนด้วย Toast
   - [x] ปรับปรุง NavBar ให้รองรับการใช้งานในอุปกรณ์มือถือ
   - [x] สร้างคอมโพเนนต์ Input แบบ Reusable ที่รองรับการตรวจสอบข้อมูล
   - [x] เพิ่มฟังก์ชัน `dismissAllToasts` สำหรับล้าง toast notifications ทั้งหมด
   - [x] ปรับปรุงระบบการแจ้งเตือน toast ให้มีการล้างเมื่อมีการออกจากระบบ (logout)

3. **การพัฒนา Dashboard**
   - [x] เพิ่มตัวเลือกกรองเฉพาะข้อมูลที่อนุมัติแล้ว
   - [x] ปรับปรุงหน้า Dashboard ให้แสดงข้อมูลสถิติสรุป
   - [x] เพิ่มตารางแสดงข้อมูลรายวัน
   - [x] สร้างฟังก์ชันคำนวณค่าเฉลี่ยและสถิติ
   - [x] พัฒนาหน้า SummaryDetailPage สำหรับแสดงข้อมูลเชิงลึก

4. **ระบบผู้ใช้และความปลอดภัย**
   - [x] ปรับปรุงระบบ Authentication และ Authorization
   - [x] พัฒนาระบบจัดการ Session ของผู้ใช้
   - [x] สร้างฟังก์ชัน `checkUserRole` สำหรับตรวจสอบสิทธิ์การเข้าถึง
   - [x] พัฒนาคอมโพเนนต์ `ProtectedPage` สำหรับป้องกันหน้าที่ต้องล็อกอิน
   - [x] เพิ่มระบบบันทึกการใช้งาน (User Activity Logs)
   - [x] พัฒนาฟังก์ชันการ Sanitize ข้อมูลป้องกัน XSS และ SQL Injection
   - [x] **จัดการการปิด Browser:** เพิ่ม event handler `window.onbeforeunload` ใน AuthContext.tsx เพื่อแสดงคำยืนยัน และใช้ `navigator.sendBeacon` เพื่อ *พยายาม* ส่ง Request Logout ไปยัง Server เมื่อผู้ใช้ปิด Browser/Tab
   - [x] ปรับปรุงกระบวนการ logout ให้เรียกใช้ `dismissAllToasts` ก่อนออกจากระบบ
   - [x] พัฒนาระบบ CSRF Protection สำหรับการ login และ form submission
   - [x] สร้าง API Routes สำหรับระบบ Authentication (`/api/auth/*`)
   - [x] ปรับปรุง Security Headers และ CSP ใน middleware.ts
   - [x] เพิ่มระบบ Rate Limiting สำหรับการ login
   - [x] พัฒนาระบบ Session Timeout และ Inactivity Detection
   - [x] ปรับปรุงการจัดการ Cookies (HttpOnly, Secure, SameSite)
   - [x] เพิ่มระบบติดตามกิจกรรมผู้ใช้ (User Activity Tracking)
   - [x] ปรับปรุงระบบ Login/Logout ให้ใช้ API Routes
   - [x] เพิ่มการตรวจสอบ Browser Session เพื่อป้องกันการ login ซ้ำซ้อน
   - [x] พัฒนาระบบแจ้งเตือนสำหรับความผิดพลาดในการ login
   - [x] ปรับปรุง UI/UX ของหน้า Login ให้ใช้งานง่ายและปลอดภัยยิ่งขึ้น

5. **การแก้ไขข้อผิดพลาด**
   - [x] **ปัญหา Login:** ผู้ใช้ Login สำเร็จ (เห็น Toast) แต่ถูก Redirect กลับมาหน้า Login ทันที (แก้ไขโดยเปลี่ยน sameSite cookie จาก 'strict' เป็น 'lax' ใน /api/auth/login)
   - [x] แก้ไขปัญหาการแสดง Notifications ตอน Login สำเร็จ/ไม่สำเร็จ
   - [x] แก้ไขปัญหาการแสดง Notifications เมื่อใส่รหัสผ่านผิด (เพิ่มเงื่อนไขตรวจสอบข้อความ error เพื่อแสดง toast ที่เฉพาะเจาะจง)
   - [x] สร้างไฟล์ TASKS.md เพื่อติดตามความคืบหน้าของโปรเจค
   - [x] แก้ไขปัญหาการแปลง Timestamp เป็น Date ในหลายส่วนของแอปพลิเคชัน
   - [x] แก้ไขปัญหา Type Error ใน interface ต่างๆ
   - [x] แก้ไขปัญหา "Cannot read properties of undefined (reading 'call')" ในไฟล์ login/page.tsx โดยเปลี่ยนจาก dynamic import เป็น static import
   - [x] ลบไฟล์ที่ไม่ได้ใช้งาน (app/login/page-example.tsx) เพื่อลดความสับสนและทำความสะอาดโค้ด
   - [x] แก้ไข Type Errors ใน loginService.ts เกี่ยวกับ QuerySnapshot, resetUserSessions และ logLogin
   - [x] แก้ไขปัญหาการล็อกอินใช้เวลานานหรือค้าง โดยปรับปรุงการจัดการ Promise และเพิ่มการ log เพื่อติดตามขั้นตอนการทำงาน
   - [x] ปรับปรุงระบบตรวจสอบผู้ใช้และรหัสผ่านให้ตรงกับโครงสร้างข้อมูลใน Firebase
   - [x] ทำความสะอาดโค้ด โดยลบไฟล์และโฟลเดอร์ที่ไม่จำเป็น (ตามรายการที่เคยทำ)
   - [x] แก้ไขไฟล์ tsconfig.json เพื่อลบการอ้างอิงถึงโฟลเดอร์ app/components ที่ไม่มีอยู่แล้ว
   - [x] ปรับปรุงฟังก์ชัน `logoutUser`, `clearAllSessions` และ `logout` ใน logoutService.ts ให้เรียกใช้ `dismissAllToasts` ด้วย
   - [x] **ปัญหา Loop ไม่สิ้นสุด:** แก้ไขปัญหาหน้า `/census/form` โหลดซ้ำและแสดง Toast แจ้งเตือนข้อมูลกะดึกรัวๆ สาเหตุเกิดจาก Role Mismatch ใน `ProtectedPage` ทำให้เกิด Redirect Loop (แก้ไขโดยเพิ่ม role `nurse` ใน `requiredRole` ของ `ProtectedPage` ใน `DailyCensusForm.tsx`)
   - [x] **ปัญหา FirebaseError (Invalid Data):** แก้ไข Error `Unsupported field value: a function` ที่เกิดตอนบันทึกข้อมูล `wardForms` (แก้ไข `createServerTimestamp` ใน `timestampUtils.ts`)
   - [x] **แก้ไขปัญหา State Management ใน DailyCensusForm:** แก้ไข Type Error และปัญหาการส่งผ่าน State `isFormReadOnly` ระหว่าง Custom Hooks (`useWardFormData`, `useFormPersistence`) โดยปรับแก้ให้ State นี้ถูกจัดการภายใน Component `DailyCensusForm` โดยตรง

## งานที่กำลังดำเนินการ

1. **การพัฒนาระบบแจ้งเตือน**
   - [ ] พัฒนาระบบแจ้งเตือนเมื่อมีการอนุมัติ/ปฏิเสธแบบฟอร์ม
   - [ ] เพิ่มการแจ้งเตือนเมื่อต้องกรอกข้อมูลสรุป 24 ชั่วโมง
   - [ ] ปรับปรุงการแสดง Toast ในมุมมองโมบาย

2. **การพัฒนาหน้า Dashboard**
   - [ ] เพิ่มการแสดงกราฟข้อมูลย้อนหลัง
   - [ ] พัฒนา UI สำหรับเปรียบเทียบข้อมูลรายวอร์ด
   - [ ] เพิ่มตัวเลือกการกรองข้อมูลที่ละเอียดขึ้น

## งานที่วางแผนในอนาคต

1. **การพัฒนารายงาน**
   - [ ] พัฒนาฟังก์ชัน Export ข้อมูลเป็น Excel/PDF
   - [ ] สร้างรายงานสรุปรายเดือน/รายไตรมาส/รายปี
   - [ ] พัฒนากราฟแสดงแนวโน้มและการเปรียบเทียบข้อมูล
   - [ ] สร้างรายงานวิเคราะห์เชิงลึกสำหรับผู้บริหาร
   - [ ] พัฒนาระบบจัดเก็บรายงานและเรียกดูย้อนหลัง

2. **การปรับปรุงประสิทธิภาพ**
   - [ ] เพิ่ม Data Caching เพื่อลดการเรียกข้อมูลซ้ำ
   - [ ] ปรับปรุง Compound Index ใน Firestore
   - [ ] พัฒนาระบบ Data Prefetching สำหรับข้อมูลที่ใช้บ่อย
   - [ ] ปรับปรุงการโหลดหน้าแรกให้เร็วขึ้น
   - [ ] ลดขนาด Bundle JS เพื่อเพิ่มความเร็วในการโหลด

3. **การตรวจสอบและความปลอดภัย**
   - [ ] พัฒนาระบบเข้ารหัสรหัสผ่านด้วย bcrypt สำหรับรหัสผ่านที่ยังเก็บแบบ plain text
   - [ ] พัฒนาระบบบันทึกการใช้งานแบบละเอียด (Detailed Logging) - *พิจารณาเพิ่ม Field เช่น browserName, deviceType แทนการใช้ Custom ID*
   - [ ] เพิ่มการตรวจสอบความครบถ้วนของข้อมูล (Data Integrity) 
   - [ ] ปรับปรุงความปลอดภัยในการเข้าถึงข้อมูล
   - [ ] เพิ่มการเข้ารหัสข้อมูลสำคัญก่อนจัดเก็บ
   - [ ] พัฒนาระบบตรวจจับและป้องกันการใช้งานที่ผิดปกติ

4. **การพัฒนาระบบการอนุมัติ**
   - [ ] เพิ่มระบบการอนุมัติหลายระดับ (Multi-level Approval)
   - [ ] พัฒนาระบบแจ้งเตือนเมื่อมีแบบฟอร์มรอการอนุมัติ
   - [ ] เพิ่มการแสดงความคิดเห็นในขั้นตอนการอนุมัติ
   - [ ] พัฒนาระบบติดตามประวัติการอนุมัติ
   - [ ] ปรับปรุง UX ของหน้าอนุมัติให้ใช้งานง่ายขึ้น

5. **การทดสอบและประกันคุณภาพ**
   - [ ] เพิ่มการทดสอบอัตโนมัติ (Unit Tests, Integration Tests)
   - [ ] ทดสอบการใช้งานบนอุปกรณ์และเบราว์เซอร์ที่หลากหลาย
   - [ ] จัดทำเอกสารคู่มือการใช้งานสำหรับผู้ใช้
   - [ ] พัฒนาระบบรับข้อเสนอแนะและรายงานข้อผิดพลาด
   - [ ] วางแผนการเปิดตัวและฝึกอบรมผู้ใช้งาน 