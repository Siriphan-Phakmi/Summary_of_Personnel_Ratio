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
   - [x] **สร้างและแก้ไข API Mock Data Generator:** พัฒนา API endpoint (`/api/dev/generate-mock-data`) และหน้า Developer Tools (`/admin/dev-tools`) สำหรับสร้างข้อมูล `wardForms` จำลองลง Firestore เพื่อการทดสอบ, แก้ไขข้อผิดพลาดเกี่ยวกับการ Import, Type, และการเรียกใช้ Firebase
   - [x] **สร้าง Firestore Index:** ระบุและสร้าง Composite Index ที่จำเป็นใน Firestore สำหรับ Collection `wardForms` เพื่อรองรับ Query ของหน้า Approval (ตามเงื่อนไข `status`, `dateString`, `wardId`, `shift`)
   - [x] **ปรับปรุงระบบจัดการ Index Error:** เพิ่มฟังก์ชันสกัด URL สร้าง Index จาก error message และแสดงปุ่มคลิกสร้าง Index โดยตรงในหน้า UI

2. **การพัฒนา UI/UX**
   - [x] สร้างคอมโพเนนต์ `LoadingOverlay` สำหรับแสดงสถานะโหลดข้อมูล
   - [x] พัฒนา Context API สำหรับจัดการสถานะโหลด (LoadingContext)
   - [x] ปรับปรุงการแสดงผลในโหมดมืด (Dark Mode)
   - [x] พัฒนาระบบการแจ้งเตือนด้วย Toast
   - [x] ปรับปรุง NavBar ให้รองรับการใช้งานในอุปกรณ์มือถือ
   - [x] สร้างคอมโพเนนต์ Input แบบ Reusable ที่รองรับการตรวจสอบข้อมูล
   - [x] เพิ่มฟังก์ชัน `dismissAllToasts` สำหรับล้าง toast notifications ทั้งหมด
   - [x] ปรับปรุงระบบการแจ้งเตือน toast ให้มีการล้างเมื่อมีการออกจากระบบ (logout)
   - [x] **ปรับปรุงความชัดเจนช่อง Patient Census:** แก้ไข UI ของช่อง "Patient Census" ในหน้า Form ให้แสดงผลแตกต่างชัดเจน (ไม่มีกรอบ) เมื่ออยู่ในสถานะ Read-only (`CensusInputFields.tsx`)
   - [x] **ปรับปรุง CSS หน้า Form:** เพิ่ม CSS class `form-input-number` เพื่อซ่อนปุ่ม spinner เริ่มต้น และปรับสไตล์ input/button เล็กน้อย (`globals.css`)
   - [x] **เพิ่มการแสดงเวลาและเวอร์ชัน:** สร้าง Component `VersionAndTime` เพื่อแสดงเวลา, วันที่, และเวอร์ชันปัจจุบันของแอปพลิเคชัน
   - [x] **ปรับปรุงการแสดงผล Responsive:** ปรับแต่งการแสดงผลเวลาและเวอร์ชันให้แสดงแบบกระชับบนจอเล็ก (เช่น 16:18:00, 26/04/68, V.0.0.1) และแบบเต็มบนจอปกติ
   - [x] **แสดงปีพุทธศักราช:** ปรับปรุงการแสดงวันที่ให้แสดงเป็นปีพุทธศักราช (พ.ศ. 2568) แทนปีคริสต์ศักราช
   - [x] **ปรับปรุง IndexErrorMessage Component:** พัฒนาการแสดงผลข้อความแจ้งเตือน Index Error ให้มีความชัดเจน มีลิงก์ไปสร้าง Index โดยตรง และมีคำแนะนำสำหรับผู้ดูแลระบบอย่างละเอียด
   - [x] **เพิ่มฟังก์ชันลิงก์สร้าง Index:** รองรับการคลิกลิงก์เพื่อสร้าง Index ที่ขาดได้ทันทีผ่าน Firebase Console

3. **การพัฒนา Dashboard**
   - [x] เพิ่มตัวเลือกกรองเฉพาะข้อมูลที่อนุมัติแล้ว
   - [x] ปรับปรุงหน้า Dashboard ให้แสดงข้อมูลสถิติสรุป
   - [x] เพิ่มตารางแสดงข้อมูลรายวัน
   - [x] สร้างฟังก์ชันคำนวณค่าเฉลี่ยและสถิติ
   - [x] พัฒนาหน้า SummaryDetailPage สำหรับแสดงข้อมูลเชิงลึก
   - [x] วิเคราะห์ข้อมูลจาก `data/analysis_results.csv`
   - [x] ใช้/พัฒนาฟังก์ชันสำหรับการวิเคราะห์ข้อมูล (เช่น ค่าเฉลี่ย, ส่วนเบี่ยงเบนมาตรฐาน)
   - [x] สร้างการแสดงผลข้อมูล (Visualization) สำหรับผลลัพธ์ (เช่น ฮิสโตแกรม, แผนภาพกระจาย)

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
   - [x] **แก้ไขปัญหาหน้า Approval:** แก้ไขปัญหาหน้า Approval ไม่แสดงข้อมูลสำหรับ Role 'nurse' ทั้งที่ข้อมูลมีอยู่ (เกิดจาก Query ไม่ถูกต้องและไม่มี Firestore Index ที่เหมาะสม)
   - [x] **ปรับปรุง Query หน้า Approval:** ปรับปรุงฟังก์ชัน `getPendingForms` ใน `approvalQueries.ts` ให้รองรับการ Filter ตาม `status` ที่ส่งมาจากหน้า Approval อย่างถูกต้อง (แก้ไขจากที่เคย Hardcode ค่า 'final')
   - [x] **เพิ่ม Logging สำหรับ Debug:** เพิ่มการ Logging ใน `ApprovalPage.tsx` เพื่อช่วยตรวจสอบค่า Filter ที่ส่งไปยัง Service ระหว่างการ Debug ปัญหาหน้า Approval
   - [x] **แก้ไข Type Errors และ Logic ในหน้า Form:**
       - [x] ปรับ State `formData` ใน `useWardFormData` ให้ใช้ `Partial<WardForm>`
       - [x] แก้ไข `initialFormData` และการตั้งค่า State ให้ช่อง Input ตัวเลขแสดงค่าว่าง (`''`) เริ่มต้น แต่เก็บค่าเป็น `number` หรือ `undefined` ใน State
       - [x] ปรับปรุง `handleChange` ใน `useWardFormData` ให้แปลงค่า Input (`''` -> `undefined`, string number -> `number`)
       - [x] แก้ไข `CensusInputFields` ให้แสดง `value={formData[fieldName] ?? ''}`
       - [x] ปรับปรุง Toast Notification ใน `useWardFormData` ให้แสดงตามสถานะ (`APPROVED`, `FINAL`, `DRAFT`, `null`) ของ Form กะดึกคืนก่อนอย่างละเอียด
       - [x] เพิ่ม Helper `prepareDataForSave` ใน `useFormPersistence` เพื่อแปลง `undefined` เป็น `0` ก่อน Validation และ Save
       - [x] ปรับปรุง `handleSaveDraft` และ `handleFinalizeForm` ใน `useFormPersistence` ให้เรียกใช้ `prepareDataForSave` และ Service functions (`save...`, `finalize...`) อย่างถูกต้อง
       - [x] แก้ไข Linter errors ที่เกิดจากการปรับแก้ Type หลายครั้ง
       - [x] แก้ไข Linter error ใน `CensusInputFields.tsx` เกี่ยวกับ Type ของ `value` ที่ส่งให้ `Input` component
       - [x] แก้ไข Linter error ใน `DailyCensusForm.tsx` โดยสร้าง Wrapper function `triggerSaveDraft` สำหรับ `onClick` ของปุ่ม "บันทึกร่าง"
       - [x] ปรับปรุงประเภทของ Toast Notification (Info/Warning/Error) ให้เหมาะสมกับสถานการณ์ต่างๆ เพื่อความชัดเจนยิ่งขึ้น

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
   - [x] บันทึกประวัติการดำเนินการ (ใคร, ทำอะไร, เมื่อไหร่, เหตุผล) ลง Collection แยก (`approvalHistory`)
   - [x] แสดงประวัติการอนุมัติ/ปฏิเสธใน Modal ดูรายละเอียดของหน้า Approval
   - [ ] เพิ่มระบบการอนุมัติหลายระดับ (Multi-level Approval)
   - [ ] พัฒนาระบบแจ้งเตือนเมื่อมีแบบฟอร์มรอการอนุมัติ
   - [ ] เพิ่มการแสดงความคิดเห็นในขั้นตอนการอนุมัติ
   - [ ] พัฒนาระบบติดตามประวัติการอนุมัติ (อาจใช้ Collection เดิม)
   - [ ] ปรับปรุง UX ของหน้าอนุมัติให้ใช้งานง่ายขึ้น

5. **การทดสอบและประกันคุณภาพ**
   - [ ] เพิ่มการทดสอบอัตโนมัติ (Unit Tests, Integration Tests)
   - [ ] ทดสอบการใช้งานบนอุปกรณ์และเบราว์เซอร์ที่หลากหลาย
   - [ ] จัดทำเอกสารคู่มือการใช้งานสำหรับผู้ใช้
   - [ ] พัฒนาระบบรับข้อเสนอแนะและรายงานข้อผิดพลาด
   - [ ] วางแผนการเปิดตัวและฝึกอบรมผู้ใช้งาน 

# Tasks นับจำนวนพนักงาน และยอดคงเหลือเตียง

## ระบบ Backend (เน้น)
- [x] สร้าง Function Ward Form Validator
- [x] สร้าง Function Final Form and Save Draft
- [x] สร้าง Function Create Daily Summary ของพยาบาลตลอด 24 ชม.
- [x] แก้ไขระบบ Toast แจ้งเตือนใน useWardFormData ใช้ Global Toast Tracker ป้องกันการแสดงซ้ำซ้อน
- [x] เพิ่มระบบ Throttle สำหรับ Toast Notification เพื่อป้องกันการแสดงซ้ำซ้อนในเวลาใกล้เคียงกัน
- [x] เพิ่มระบบป้องกันการกด Save หรือ Finalize ซ้ำๆ รัวๆ
- [x] เพิ่มการบันทึกประวัติการอนุมัติ/ปฏิเสธ (Approval History)
- [ ] สร้าง Function Notification ส่ง Socket รายชื่อผู้ที่ต้องการแจ้งเตือน
- [ ] สร้าง Function Report by Day, Month, Year.

## ส่วน UI / UX Development
- [x] สร้าง Patient Census และการคำนวณ
- [x] แก้ไขหน้า Approval เพิ่มความสามารถในการอนุมัติและปฏิเสธแบบฟอร์ม (แสดง Modal ยืนยันการอนุมัติ/ปฏิเสธ)
- [x] เพิ่ม Modal แสดงรายละเอียดแบบฟอร์มในหน้า Approval
- [x] แก้ไขการแสดง Toast ใน Form page เพื่อป้องกันการแสดงซ้ำซ้อนหลายครั้ง
- [x] แก้ไข Type Error ในหน้า Form
- [x] ปรับปรุงฟังก์ชัน handleSaveDraft และ handleFinalizeForm ใน useFormPersistence ให้เรียกใช้ prepareDataForSave
- [x] แก้ไข Linter Error ใน CensusInputFields.tsx และ DailyCensusForm.tsx
- [ ] สร้าง Report by Day, Month, Year ออกมาเป็น PDF
- [ ] สร้างแบบฟอร์ม Input จำนวนเตียงเป็นรอบตลอด 24 ชม.

## ส่วน Dashboard
- [x] แสดงจำนวนพนักงาน และ Patient อัตราส่วนต่อวัน
- [ ] แสดง Chart ข้อมูลย้อนหลัง 7, 30 วัน
- [ ] แสดง Ratio สีเปอร์เซ็นต์แนวโน้ม การเปลี่ยนแปลง
- [ ] ออกแบบ Dashboard ทั้งหมดใหม่ มีรูปที่สวยงาม

## ส่วน User System และ Security
- [x] สร้างระบบ Login ด้วย Email, Password
- [x] กำหนดสิทธิ์อนุมัติเอกสาร
- [x] กำหนดสิทธิ์การเห็นข้อมูลและดู Dashboard
- [ ] ระบบจัดการผู้ใช้ รายชื่อหอผู้ป่วย

## แก้ไขข้อผิดพลาด (Bugs)
- [x] แก้ไข Type Error ใน Form page (useFormPersistence.ts, useWardFormData.ts, CensusInputFields.tsx)
- [x] แก้ไข Logic ใน formData state ที่ไม่แสดงเป็นค่าว่างเมื่อเป็น 0
- [x] แก้ไขปัญหา Toast แจ้งเตือนซ้ำซ้อนโดยใช้ระบบ Global Toast Tracker
- [x] สร้าง Firestore index สำหรับ wardForms collection เพื่อรองรับการค้นหาข้อมูลในหน้า Approval
- [x] ปรับปรุงหน้า Approval ให้สามารถอนุมัติและปฏิเสธแบบฟอร์มได้จริง
- [x] ปรับแก้ UI ช่อง Input ให้แสดงกรอบสีแดงและเครื่องหมาย * เมื่อต้องกรอกข้อมูล
- [x] เพิ่มระบบ Throttle สำหรับ Toast Notification ใน toastUtils.tsx เพื่อป้องกันการแสดง toast ซ้ำๆ ในระยะเวลาที่ใกล้เคียงกัน
- [x] เพิ่มระบบ Cooldown ปุ่ม Save Draft และ Save Final ใน useFormPersistence.ts เพื่อป้องกันการกดปุ่มซ้ำๆ รัวๆ
- [x] ปรับปรุงการแสดงข้อความ error ในหน้าฟอร์มให้แสดงชื่อฟิลด์ที่ต้องกรอกอย่างชัดเจน เช่น "Patient Census (คงพยาบาล)" แทนที่จะเป็นแค่ "patientCensus"
- [x] ปรับปรุงประเภทของ Toast Notification (Info/Warning/Error) ให้เหมาะสมกับสถานการณ์ต่างๆ เพื่อความชัดเจนยิ่งขึ้น
- [x] **ปรับปรุงการแสดง Firestore Index Error:** ปรับปรุงการแสดงผลเมื่อเกิด Index Error ให้มีคำแนะนำที่ชัดเจนและครบถ้วน
- [x] **เพิ่มฟังก์ชัน `extractIndexUrl`:** พัฒนาฟังก์ชันสำหรับดึง URL จาก Error message ของ Firebase เพื่อนำไปสร้าง Index ได้ทันที
- [x] **ปรับปรุง UI แสดง Index Error:** เพิ่มปุ่มคลิกเพื่อสร้าง Index โดยตรงพร้อมไอคอน และปรับแต่งสีพื้นหลัง ขอบ และข้อความให้ดูชัดเจนยิ่งขึ้น
- [x] **เพิ่มคำแนะนำสำหรับผู้ดูแลระบบ:** เพิ่มส่วนแสดงคำแนะนำเป็นขั้นตอนสำหรับผู้ดูแลระบบในการสร้าง Index ผ่าน Firebase Console หรือ Firebase CLI

## อื่นๆ
- [x] ปรับการแสดงผล Toast เมื่อเปิดดูข้อมูลย้อนหลังที่เป็น FINAL หรือ APPROVED ให้แสดงข้อความ "นี่คือข้อมูลย้อนหลัง จะไม่สามารถบันทึกซ้ำได้ หากต้องการแก้ไข กรุณาติดต่อฝ่ายการพยาบาล หรือ Surveyor"
- [ ] ปรับแต่ง CSS ให้เป็น Official และ Youthful มากขึ้น 