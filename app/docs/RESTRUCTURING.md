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

## การปรับโครงสร้างไฟล์ DashboardPage.tsx (2024-07-05)

ไฟล์ `DashboardPage.tsx` มีขนาดใหญ่เกินไป (2441 บรรทัด) ทำให้ยากต่อการบำรุงรักษาและทำความเข้าใจ จึงมีแผนโยกย้ายโค้ดเพื่อลดขนาดไฟล์ ดังนี้:

### 1. แยก Custom Hooks ไปยัง `/hooks`

| Custom Hook | หน้าที่ | ไฟล์ปลายทาง |
|-------------|---------|-------------|
| `useDateRangeEffect` | จัดการการเปลี่ยนแปลงช่วงวันที่ | `hooks/useDateRangeEffect.ts` |
| `useBedSummaryData` | จัดการข้อมูลสรุปเตียง | `hooks/useBedSummaryData.ts` |

### 2. แยก Utility Functions ไปยัง `/utils`

| Utility Function | หน้าที่ | ไฟล์ปลายทาง |
|------------------|---------|-------------|
| `getThaiDayName` | แปลงวันที่เป็นชื่อวันภาษาไทย | `utils/dateUtils.ts` |
| `logInfo`, `logError` | บันทึกข้อความลงใน console | `utils/loggingUtils.ts` |
| `hasAccessToWard` | ตรวจสอบสิทธิ์การเข้าถึง ward | `utils/loggingUtils.ts` |

### 3. แยก Service Functions ไปยัง `/services`

| Service Function | หน้าที่ | ไฟล์ปลายทาง |
|------------------|---------|-------------|
| `fetchWardForms` | ดึงข้อมูลแบบฟอร์มสำหรับ ward ที่เลือก | `services/dashboardDataService.ts` |

### 4. แยก UI Components ไปยัง `/components`

| Component | หน้าที่ | ไฟล์ปลายทาง |
|-----------|---------|-------------|
| `DashboardHeader` | แสดงส่วนหัวของ Dashboard | `components/DashboardHeader.tsx` |
| `DashboardCalendar` | แสดงปฏิทินใน Dashboard | `components/DashboardCalendar.tsx` |
| `PatientCensusSection` | แสดงข้อมูล Patient Census | `components/PatientCensusSection.tsx` |

## ผลการดำเนินการ (2024-07-06)

ได้ดำเนินการแยกส่วนต่างๆ ของโค้ดออกจาก DashboardPage.tsx แล้วดังนี้:

### Custom Hooks ที่สร้างเสร็จแล้ว
- ✅ `hooks/useDateRangeEffect.ts` - จัดการการเปลี่ยนแปลงช่วงวันที่
- ✅ `hooks/useBedSummaryData.ts` - จัดการข้อมูลสรุปเตียง

### Utility Functions ที่สร้างเสร็จแล้ว
- ✅ `utils/dateUtils.ts` - ฟังก์ชันที่เกี่ยวข้องกับวันที่
- ✅ `utils/loggingUtils.ts` - ฟังก์ชันการบันทึกและตรวจสอบสิทธิ์
- ✅ `utils/index.ts` - export ฟังก์ชันทั้งหมด

### Service Functions ที่สร้างเสร็จแล้ว
- ✅ `services/dashboardDataService.ts` - ฟังก์ชันดึงข้อมูล Dashboard

### UI Components ที่สร้างเสร็จแล้ว
- ✅ `components/DashboardHeader.tsx` - ส่วนหัวของ Dashboard
- ✅ `components/DashboardCalendar.tsx` - ปฏิทินใน Dashboard
- ✅ `components/PatientCensusSection.tsx` - ข้อมูล Patient Census

### การอัปเดต Export
- ✅ `components/index.ts` - รวมการ export ทั้งหมดให้เป็นระเบียบ

## ขั้นตอนต่อไป

1. ปรับแก้ไขไฟล์ `DashboardPage.tsx` ให้ใช้ component, hook และ utility ที่แยกออกไป
2. ทดสอบการทำงานของแต่ละส่วน
3. แยกส่วนที่เหลือของ DashboardPage.tsx ออกเป็น component ย่อยๆ เพิ่มเติม
4. ลดขนาดของไฟล์ DashboardPage.tsx ให้เหลือไม่เกิน 500 บรรทัด

## ประโยชน์ที่ได้รับ

1. โค้ดอ่านง่ายขึ้น แต่ละไฟล์มีหน้าที่ชัดเจน
2. บำรุงรักษาง่ายขึ้น แก้ไขแต่ละส่วนได้โดยไม่กระทบส่วนอื่น
3. นำกลับมาใช้ใหม่ได้ (reusable) ในส่วนอื่นของแอปพลิเคชัน
4. ทำงานเป็นทีมได้ดีขึ้น แต่ละคนสามารถทำงานกับส่วนต่างๆ ได้อย่างอิสระ
5. ทดสอบง่ายขึ้น สามารถเขียน unit test สำหรับแต่ละส่วนได้แยกกัน

## สรุปการทำงานวันนี้ (กรกฎาคม 2024)

### การปรับโครงสร้าง TypeScript Interfaces
- **ปัญหา**: พบข้อผิดพลาด TypeScript ที่เกี่ยวข้องกับ `isolatedModules` และ `export type` รวมถึงโครงสร้าง interface ที่กระจัดกระจายและซ้ำซ้อนในส่วนของ Dashboard components.
- **การแก้ไข**:
    - [x] **จัดระเบียบ Interface**: แยก Interface ออกเป็นไฟล์เฉพาะทางเพื่อความเป็นระเบียบและง่ายต่อการจัดการ
        - [x] สร้าง `app/features/dashboard/components/types/interface-types.ts` สำหรับเก็บ shared data interfaces (เช่น `WardSummary`, `PatientTrend`).
        - [x] สร้าง `app/features/dashboard/components/types/componentInterfaces.ts` สำหรับเก็บ props interfaces ของคอมโพเนนท์โดยเฉพาะ (เช่น `EnhancedBarChartProps`, `BedSummaryPieChartProps`).
    - [x] **แก้ไขการ Export**: ปรับปรุงไฟล์ `app/features/dashboard/components/types/index.ts` ให้ทำการ `export type` จากไฟล์ใหม่ทั้งหมด เพื่อแก้ปัญหา `isolatedModules` และทำให้การ import มีประสิทธิภาพ
    - [x] **ลดความซ้ำซ้อน**: รวม interface ที่ซ้ำซ้อนกันและจัดระเบียบให้ง่ายต่อการบำรุงรักษา
- **ผลลัพธ์**:
    - แก้ไขข้อผิดพลาดของ TypeScript ได้สำเร็จ
    - โครงสร้างโค้ดในส่วนของ types มีความชัดเจนและเป็นระเบียบมากขึ้น
    - ลดความซ้ำซ้อนของโค้ดและเพิ่มความสามารถในการบำรุงรักษาในระยะยาว