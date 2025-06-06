# งานที่ดำเนินการในโปรเจค Summary of Personnel Ratio

## การอัปเดตรายการล่าสุด

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-07-26)
- [x] **แก้ไขการแสดงข้อมูล Patient Census ตามแผนก:**
  - [x] แก้ไขปัญหากราฟแท่ง Patient Census ไม่แสดงข้อมูลของแผนก CCU, ICU, LR, NSY, Ward10B, Ward11, Ward12, Ward6, Ward7, Ward8, Ward9, WardGI
  - [x] ปรับปรุง useMemo ของ wardCensusData ให้แสดงข้อมูลของทุกแผนกโดยไม่ต้องกรองตามสิทธิ์การเข้าถึงของผู้ใช้
  - [x] แก้ไขการส่งข้อมูลให้ EnhancedBarChart ให้แสดงข้อมูลทุกแผนกเสมอ ไม่ว่าผู้ใช้จะเป็นประเภทใด
  - [x] เพิ่มการสร้างข้อมูลเริ่มต้นสำหรับแผนกที่ไม่มีในระบบ เพื่อให้แสดงผลกราฟครบทุกแผนก

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-07-22)
- [x] **ปรับปรุงการแสดงกราฟในหน้า Dashboard:**
  - [x] ปรับสัดส่วนความสูงของกราฟแท่งจำนวนผู้ป่วยให้พอดีกับหน้าจอ
  - [x] แก้ไขปัญหากราฟวงกลมสถานะเตียงไม่แสดงผล
  - [x] ปรับปรุงฟังก์ชันดึงข้อมูลสถานะเตียงให้ทำงานได้ทั้งในกรณีเลือกแผนกหรือไม่เลือกแผนก
  - [x] เพิ่มการจัดการกรณีไม่มีข้อมูลสำหรับกราฟวงกลม

- [x] **เพิ่มการแสดงชื่อวันภาษาไทยในหน้า Dashboard:**
  - [x] เพิ่มฟังก์ชัน `getThaiDayName` สำหรับแปลงวันที่เป็นชื่อวันภาษาไทย (วันจันทร์, วันอังคาร, ฯลฯ)
  - [x] แสดงชื่อวันภาษาไทยควบคู่กับวันที่ในส่วนหัวของหน้า Dashboard
  - [x] ปรับปรุงการแสดงผลให้ผู้ใช้เห็นได้ชัดเจนว่าวันที่กำลังดูข้อมูลอยู่เป็นวันอะไร

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-07-05)
- [x] **ตรวจสอบฟังก์ชันตัวบ่งชี้สถานะรายงานในหน้า Dashboard:**
  - [x] ยืนยันการทำงานของการแสดงสถานะรายงาน (draft, final, approved) ในปฏิทิน
  - [x] ตรวจสอบความสอดคล้องของสี (เหลือง-draft, เขียวมรกต-final, ม่วง-approved) ในปฏิทินและคำอธิบายสัญลักษณ์
  - [x] ยืนยันว่าฟังก์ชัน `fetchMarkers` และการแปลงข้อมูลใน `calendarEvents` ทำงานได้อย่างถูกต้อง

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-07-04)
- [x] **ปรับปรุงตัวเลือกช่วงวันที่ในหน้า Dashboard (`DashboardPage.tsx`):**
  - [x] แก้ไข `DATE_RANGE_OPTIONS` ให้เหลือเพียง "วันนี้" และ "กำหนดเอง"
  - [x] กำหนดให้ "วันนี้" เป็นค่าเริ่มต้นของตัวเลือกช่วงวันที่
  - [x] ปรับปรุงฟังก์ชัน `handleDateRangeChange` ให้สอดคล้องกับตัวเลือกที่เปลี่ยนแปลง
- [x] **แก้ไขปัญหา Linter Error ในไฟล์ DashboardPage.tsx**:
  - [x] แก้ไขการเข้าถึง property 'available' และ 'unavailable' บน object summary ที่มีประเภทเป็น DailySummary:
    - [x] ปรับเปลี่ยนจาก `summary.availableBeds ?? summary.available ?? 0` เป็น `summary.availableBeds ?? 0`
    - [x] ปรับเปลี่ยนจาก `summary.unavailableBeds ?? summary.unavailable ?? 0` เป็น `summary.unavailableBeds ?? 0`
  - [x] ลบคอมเมนต์ที่ไม่จำเป็นออกเพื่อทำให้โค้ดสะอาดขึ้น
  - [x] ปรับปรุงการใช้คำศัพท์ภาษาไทยจาก "อัพเดท" เป็น "อัพเดต" ให้ถูกต้อง

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-05-10)
- [x] **แก้ไขปัญหาการแสดงข้อมูลใน Dashboard:**
  - [x] ปรับแก้ไขฟังก์ชัน `fetchSummaries` ใน `DashboardPage.tsx` ให้ใช้ `getApprovedSummariesByDateRange` แทนการ query โดยตรง
  - [x] ปรับปรุงฟังก์ชัน `getApprovedSummariesByDateRange` ในไฟล์ `dailySummary.ts` ให้ใช้ compound index อย่างถูกต้อง
  - [x] เพิ่มกลไก fallback ในกรณีที่ compound index ไม่ทำงาน
  - [x] ตรวจสอบการทำงานของฟังก์ชัน `checkAndCreateDailySummary` และ `updateDailySummaryApprovalStatus`
  - [x] ตรวจสอบว่าค่า `allFormsApproved` ถูกอัปเดตเป็น `true` เมื่อฟอร์มทั้งกะเช้าและกะดึกได้รับการอนุมัติ
  - [x] จัดทำเอกสาร `DASHBOARD_FIX.md` เพื่ออธิบายปัญหาและวิธีการแก้ไข

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-05-09)
- [x] **แก้ไขปัญหาการแสดงข้อมูลใน Dashboard:**
  - [x] แก้ไขการใช้งาน API โดยย้ายจาก Pages Router เป็น App Router (`app/api/dashboard/daily-summaries/route.ts`)
  - [x] ปรับปรุงการจัดการ error ใน API และการแสดง CORS headers
  - [x] เพิ่ม fallback mechanism ใน `dashboardApi.ts` ให้ใช้ Firestore โดยตรง
  - [x] ปรับปรุงการจัดการกับ response ที่ไม่ใช่ JSON และการจัดการ HTTP errors
  - [x] เพิ่ม logging ละเอียดเพื่อค้นหาสาเหตุของปัญหา
  - [x] เพิ่ม option `API_DISABLED` เพื่อข้ามการเรียก API ในช่วงทดสอบ

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-05-08)
- [x] **ปรับปรุงการแสดงผล Patient Census:** 
  - [x] เพิ่มฟิลด์ `initialPatientCensus` และ `calculatedCensus` เพื่อแยกค่าที่ผู้ใช้กรอกกับค่าที่คำนวณได้
  - [x] ปรับปรุงการแสดงผลใน Component `PatientCensusDisplay` 
  - [x] แก้ไขฟังก์ชันคำนวณ `calculateMorningCensus` และ `calculateNightShiftCensus`
  - [x] ปรับปรุงการบันทึกข้อมูลในฟังก์ชัน `finalizeMorningShiftForm` และ `finalizeNightShiftForm`
  - [x] เพิ่มฟิลด์ในรายการ Collection Template สำหรับ admin
  - [x] แก้ไขปัญหา NaN ในการแสดงผลและคำนวณ Census

- [x] **แก้ไขปัญหาการแสดงผลข้อมูลใน Dashboard:**
  - [x] ปรับปรุงการดึงข้อมูลในฟังก์ชัน `fetchSummaries` ใน DashboardPage 
  - [x] เพิ่มการตรวจสอบวันที่ให้ถูกต้องเพื่อป้องกันการเกิด error
  - [x] ปรับปรุงการคัดกรองข้อมูลที่ได้รับและการเรียงลำดับตามวันที่
  - [x] แก้ไขปัญหาการใช้ข้อมูล wardId ใน getDailySummaries 
  - [x] ปรับปรุงฟังก์ชัน getApprovedSummariesByDateRange สำหรับการกรองเฉพาะข้อมูลที่อนุมัติแล้ว
  - [x] เพิ่ม fallback สำหรับการเกิด index error ใน query
  - [x] ปรับปรุงการตั้งค่า Timestamp ให้เป็น 00:00:00 และ 23:59:59 สำหรับช่วงวันที่
  - [x] เพิ่มการเรียงลำดับข้อมูลจากเก่าไปใหม่ใน getApprovedSummariesByDateRange
  - [x] แก้ไขเงื่อนไขการกำหนดค่า allFormsApproved ใน checkAndCreateDailySummary

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-05-07)
- [x] **Flow การ Reject:**
  - [x] แก้ไข `useWardFormData.ts`: เพิ่มการจัดการสถานะ `REJECTED` (ปลดล็อกฟอร์ม, แสดง Toast เหตุผล)
  - [x] แก้ไข `DailyCensusForm.tsx`: เพิ่ม `useEffect` สลับ `selectedShift` อัตโนมัติเมื่อโหลดข้อมูล `REJECTED`
  - [x] แก้ไข `useShiftManagement.ts`: ปรับ Logic ไม่ให้ Disable กะกลางคืนเมื่อสถานะเป็น `REJECTED`
  - [x] แก้ไข `ApprovalPage.tsx`: แก้ปัญหา Modal ปฏิเสธกระพริบ (ย้าย JSX, จัดการ Focus, เลื่อน Fetch)
  - [x] แก้ไข `wardFormService.ts`: อนุญาตให้ `finalize...ShiftForm` เขียนทับสถานะ `REJECTED` ได้ (แก้ Error `Cannot overwrite form with status rejected.`)
- [x] **Flow ทั่วไป:**
  - [x] แก้ไข `useWardFormData.ts`: เพิ่ม Logic ดึง Patient Census กะเช้ามาแสดงเมื่อเริ่มกรอกกะดึก
  - [x] แก้ไข `DailyCensusForm.tsx`: แก้ไข Logic Disable ปุ่ม Save Draft/Final หลัง Approve กะเช้า, แก้ไขการส่ง Prop ไป `ShiftSelection`, เพิ่ม `reloadDataTrigger` หลัง Save Draft
  - [x] แก้ไข `DailyCensusForm.tsx`: จัดลำดับ Hook และ Effect แก้ Linter Error และปัญหาการสลับกะ
- [x] **แก้ไขปัญหาการแสดงผลข้อมูล:**
  - [x] แก้ไข `getWardForm` ใน `wardFormService.ts` ให้ดึงข้อมูล 'Final'/'Approved' อย่างถูกต้อง
  - [x] ปรับปรุง `useWardFormData.ts` ให้จัดการข้อมูล 'Final'/'Approved' และตั้งค่า `formData`/`isFormReadOnly` ถูกต้อง
  - [x] แก้ไข `CensusInputFields.tsx` ให้แสดงผลตาม `isFormReadOnly` ถูกต้อง
- [x] **การพัฒนาระบบแจ้งเตือน:**
  - [x] พัฒนาคอมโพเนนต์ NotificationBell และระบบการจัดการแจ้งเตือน
  - [x] เพิ่ม NotificationBell เข้าไปใน NavBar ทั้งในส่วน Desktop และ Mobile
  - [x] ปรับปรุงการแสดง Toast ให้เหมาะสมกับสถานการณ์ต่างๆ
- [x] **การปรับปรุงการคำนวณ Patient Census:**
  - [x] เพิ่มฟิลด์ `initialPatientCensus` และ `calculatedCensus` ใน `WardForm`
  - [x] ปรับปรุง `PatientCensusDisplay` ให้แสดงค่าที่คำนวณได้แยกจากค่าที่บันทึก
  - [x] แก้ไข `calculateMorningCensus` และ `calculateNightShiftCensus` ให้คำนวณและคืนค่าทั้ง 3 ฟิลด์
  - [x] ปรับปรุง `useWardFormData.ts` ให้อัปเดตค่าอัตโนมัติเมื่อมีการแก้ไขฟิลด์ที่เกี่ยวข้องกับการรับเข้า-จำหน่าย
  - [x] ปรับปรุงฟังก์ชัน `finalizeMorningShiftForm` และ `finalizeNightShiftForm` ให้บันทึกทั้ง 3 ฟิลด์

### รายการที่ต้องแก้ไขเพิ่มเติม / ข้อเสนอแนะ (อัปเดต 2024-05-10)
- [ ] **ปรับปรุงการแสดงข้อมูลใน Dashboard**:
  - [ ] สร้าง Compound Index สำหรับ collection `dailySummaries` ที่รองรับการ query ด้วยเงื่อนไข `wardId`, `allFormsApproved` และ `date`
  - [ ] เพิ่ม logging เพื่อตรวจสอบว่าข้อมูลถูกอัปเดตเป็น `allFormsApproved = true` อย่างถูกต้องเมื่อมีการอนุมัติ
  - [ ] เพิ่มการแจ้งเตือนแก่ผู้ใช้เมื่อแบบฟอร์มทั้งสองกะได้รับการอนุมัติและข้อมูลพร้อมแสดงในหน้า Dashboard
  - [ ] ติดตามประสิทธิภาพของการ query ข้อมูลหลังการแก้ไข

- [ ] **Flow การ Reject (ต้องทดสอบเพิ่มเติม):**
  - [ ] ตรวจสอบ Flow การ Reject ให้ครบถ้วนในสถานการณ์ต่างๆ เช่น การ Reject หลายครั้ง
  - [ ] ตรวจสอบการแสดงข้อความเหตุผลที่ปฏิเสธในหน้าแบบฟอร์ม
  - [ ] เพิ่มการล้างค่า `rejectionReason`, `rejectedBy`, `rejectedAt` ใน `finalize...ShiftForm` เมื่อบันทึกทับข้อมูล `REJECTED`
- [ ] **ระบบแจ้งเตือน:**
  - [ ] เชื่อมต่อระบบแจ้งเตือนเข้ากับเหตุการณ์การอนุมัติ/ปฏิเสธแบบฟอร์มในหน้า Approval
  - [ ] เพิ่มการแจ้งเตือนเมื่อต้องกรอกข้อมูลสรุป 24 ชั่วโมง (หน้า Daily Summary)
  - [ ] ทดสอบและปรับ UI ของ NotificationBell บนอุปกรณ์และธีมต่าง ๆ
- [ ] **UI/UX เพิ่มเติม:**
  - [x] เพิ่มการแจ้งเตือนเมื่อต้องกรอกข้อมูลสรุป 24 ชั่วโมง (หน้า Daily Summary)
  - [ ] เพิ่ม Banner แจ้งเตือนในหน้า Form เมื่อข้อมูลทั้ง 2 กะได้รับการอนุมัติครบแล้ว
  - [ ] ปรับปรุงการแสดง Toast ในมุมมองโมบายให้สวยงามและ responsive
- [ ] **User Management:**
  - [ ] พัฒนาหน้าจัดการผู้ใช้สำหรับผู้ดูแลระบบ
  - [ ] เพิ่มความสามารถในการเพิ่ม แก้ไข และลบผู้ใช้
  - [ ] สร้างระบบจัดการรายชื่อหอผู้ป่วย
- [ ] **การพัฒนารายงาน:**
  - [ ] พัฒนาฟังก์ชัน Export ข้อมูลเป็น Excel/PDF
  - [ ] ปรับปรุงการแสดงผลรายงานให้เป็นมิตรกับอุปกรณ์มือถือ

## งานที่วางแผนในอนาคต (เรียงตามความสำคัญ)

1. **ระบบจัดการผู้ใช้** (ความสำคัญสูง)
   - [ ] พัฒนาหน้าจัดการผู้ใช้สำหรับผู้ดูแลระบบ
   - [ ] เพิ่มความสามารถในการเพิ่ม แก้ไข และลบผู้ใช้
   - [ ] สร้างระบบจัดการรายชื่อหอผู้ป่วย
   - [ ] พัฒนาระบบกำหนดสิทธิ์ผู้ใช้แบบละเอียด
   - [ ] สร้างระบบลงทะเบียนผู้ใช้ใหม่พร้อมการยืนยันอีเมล

2. **การพัฒนารายงานเชิงลึก** (ความสำคัญสูง)
   - [ ] สร้างรายงานสรุปรายเดือน/รายไตรมาส/รายปี
   - [ ] พัฒนาการแสดงผลข้อมูลให้รองรับอุปกรณ์มือถือ

3. **การตรวจสอบและความปลอดภัย** (ความสำคัญสูง)
   - [ ] พัฒนาระบบเข้ารหัสรหัสผ่านด้วย bcrypt สำหรับรหัสผ่านที่ยังเก็บแบบ plain text
   - [ ] พัฒนาระบบบันทึกการใช้งานแบบละเอียด (Detailed Logging)
   - [ ] เพิ่มการตรวจสอบความครบถ้วนของข้อมูล (Data Integrity) 
   - [ ] ปรับปรุงความปลอดภัยในการเข้าถึงข้อมูล
   - [ ] เพิ่มการเข้ารหัสข้อมูลสำคัญก่อนจัดเก็บ
   - [ ] พัฒนาระบบตรวจจับและป้องกันการใช้งานที่ผิดปกติ

4. **การปรับปรุงประสิทธิภาพ** (ความสำคัญปานกลาง)
   - [ ] เพิ่ม Data Caching เพื่อลดการเรียกข้อมูลซ้ำ
   - [ ] ปรับปรุง Compound Index ใน Firestore
   - [ ] พัฒนาระบบ Data Prefetching สำหรับข้อมูลที่ใช้บ่อย
   - [ ] ปรับปรุงการโหลดหน้าแรกให้เร็วขึ้น
   - [ ] ลดขนาด Bundle JS เพื่อเพิ่มความเร็วในการโหลด

5. **การพัฒนาระบบการอนุมัติขั้นสูง** (ความสำคัญปานกลาง)
   - [ ] เพิ่มระบบการอนุมัติหลายระดับ (Multi-level Approval)
   - [ ] พัฒนาระบบแจ้งเตือนเมื่อมีแบบฟอร์มรอการอนุมัติ
   - [ ] เพิ่มการแสดงความคิดเห็นในขั้นตอนการอนุมัติ
   - [ ] พัฒนาระบบติดตามประวัติการอนุมัติอย่างละเอียด
   - [ ] ปรับปรุง UX ของหน้าอนุมัติให้ใช้งานง่ายขึ้น

6. **การทดสอบและประกันคุณภาพ** (ความสำคัญปานกลาง)
   - [ ] เพิ่มการทดสอบอัตโนมัติ (Unit Tests, Integration Tests)
   - [ ] ทดสอบการใช้งานบนอุปกรณ์และเบราว์เซอร์ที่หลากหลาย
   - [ ] จัดทำเอกสารคู่มือการใช้งานสำหรับผู้ใช้
   - [ ] พัฒนาระบบรับข้อเสนอแนะและรายงานข้อผิดพลาด
   - [ ] วางแผนการเปิดตัวและฝึกอบรมผู้ใช้ 

7. **ปรับปรุง UI/UX เพิ่มเติม** (ความสำคัญกลาง)
   - [ ] ปรับแต่ง CSS ให้เป็น Official และ Youthful มากขึ้น
   - [ ] ปรับปรุง UI ของช่อง Input และปุ่มกดให้มีความทันสมัยยิ่งขึ้น
   - [ ] พัฒนา UI/UX สำหรับอุปกรณ์เคลื่อนที่ให้ใช้งานได้ดียิ่งขึ้น 

### รายการที่ยังไม่แก้ไข
- [ ] ระบบควบคุมเวอร์ชัน (Versioning System)
- [ ] ปรับปรุงการแสดงรายงานสรุป ให้สามารถเลือกเป็นช่วงเวลาจาก-ถึง
- [ ] เพิ่มการช่วยเหลือในการใช้งาน (Tool Tips)
- [ ] เพิ่มหน้าสำหรับการดาวน์โหลดข้อมูลรายเดือน
- [ ] เพิ่มความสามารถในการเพิ่ม แก้ไข และลบผู้ใช้

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-05-15)
- [x] **แก้ไขปัญหาการแสดงข้อมูล Dashboard (รอบล่าสุด):**
  - [x] `dailySummary.ts`: ปรับ `getApprovedSummariesByDateRange` ให้ใช้ `dateString` ในการ query, เพิ่ม fallback logic, และจัดการ `allFormsApproved` เพื่อการแสดงผล
  - [x] `DashboardPage.tsx`: ปรับ `fetchSummaries` และการประมวลผล `summaries`, ปรับการคำนวณ `wardStats` ให้ใช้ `calculatedCensus` เป็นหลัก, และจัดการ `allFormsApproved`
  - [x] `approvalForms.ts`: ปรับ `updateDailySummaryApprovalStatus` ให้ตั้ง `allFormsApproved = true` ใน `dailySummaries`
  - [x] `approval.ts`: อัปเดต interface `DailySummary` ให้มี `calculatedCensus`, `morningCalculatedCensus`, `nightCalculatedCensus`
  - [x] ตรวจสอบและยืนยันการใช้ `console.log` เพื่อติดตามข้อมูลในส่วนที่เกี่ยวข้องกับการดึงและแสดงผลข้อมูล Dashboard

### รายการที่แก้ไขไป (อัปเดตล่าสุด 2024-06-30)
- [x] **ปรับปรุงหน้า Approval:**
  - [x] เพิ่มความสามารถในการเลือกจำนวนรายการที่แสดงในตาราง (20, 50, 100, 300, 500, 1000 รายการ)
  - [x] กำหนดให้แสดง 20 รายการเป็นค่าเริ่มต้น
  - [x] เพิ่มส่วนแสดงจำนวนรายการที่กำลังแสดงจากจำนวนทั้งหมด
  - [x] ปรับปรุง layout ของ filter ให้มีความสมดุลมากขึ้น
  - [x] แก้ไขไฟล์ `ApprovalPage.tsx` เพื่อรองรับการจำกัดจำนวนรายการที่แสดง

## รายการงานที่ต้องดำเนินการต่อ

- 📅 **ทดสอบประสิทธิภาพ RefactoredDashboardPage.tsx**:
  - ทดสอบประสิทธิภาพระหว่างเวอร์ชันเก่าและใหม่
  - ตรวจสอบการทำงานถูกต้องครบถ้วนทุกฟีเจอร์
  - วางแผนการอัปเดตและเปลี่ยนแทนไฟล์เดิม

 