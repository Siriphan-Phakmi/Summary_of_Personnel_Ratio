# แผนการปรับโครงสร้าง DashboardPage.tsx

วันที่: 6 กรกฎาคม 2024

## 📝 สรุปปัญหา

ไฟล์ `DashboardPage.tsx` มีขนาดใหญ่เกินไป (2,441 บรรทัด) ซึ่งเกินกว่าขนาดมาตรฐานที่กำหนด (ไม่เกิน 500 บรรทัด) ทำให้เกิดปัญหาดังนี้:

- ยากต่อการดูแลรักษาและแก้ไขโค้ด
- อาจเกิดปัญหาประสิทธิภาพเนื่องจากมีการ re-render ทั้งคอมโพเนนต์บ่อยครั้ง
- ยากต่อการทำความเข้าใจโค้ดสำหรับนักพัฒนาใหม่
- ยากต่อการทดสอบและตรวจสอบข้อผิดพลาด
- เกินข้อจำกัดของ IDE และเครื่องมือช่วยพัฒนาบางตัว

## 🚀 แนวทางการปรับปรุง

จะดำเนินการปรับปรุงโดยยึดหลักการ "แยกเพื่อปกครอง" (Separation of Concerns) และ "Single Responsibility Principle" โดยไม่เปลี่ยนแปลงฟังก์ชันการทำงานเดิม

### 1. แยกคอมโพเนนต์ตามหน้าที่

แยกส่วนต่างๆ ของ Dashboard ออกเป็นคอมโพเนนต์ย่อย:

- **StatisticsSummary** - แสดงสถิติรวม (OPD 24hr, Old Patient, New Patient, Admit 24hr)
- **PatientCensusChart** - กราฟแสดงจำนวนผู้ป่วยตามแผนก
- **BedStatusChart** - กราฟวงกลมแสดงสถานะเตียง
- **PatientTrendSection** - ส่วนแสดงแนวโน้มจำนวนผู้ป่วย
- **WardSummarySection** - ส่วนแสดงข้อมูลสรุปรายหอผู้ป่วย
- **ShiftComparisonSection** - ส่วนเปรียบเทียบเวรเช้า-ดึก
- **DailyPatientSection** - ส่วนแสดงข้อมูลผู้ป่วยรายวัน

### 2. แยก Custom Hooks

แยกตรรกะการดึงข้อมูลและการจัดการ State ออกเป็น Custom Hooks:

- **useDashboardData** - จัดการข้อมูลหลักของ Dashboard
- **usePatientTrends** - จัดการข้อมูลแนวโน้มผู้ป่วย
- **useBedSummary** - จัดการข้อมูลสรุปเตียง
- **useWardSelection** - จัดการการเลือกแผนก
- **useDateRangeSelection** - จัดการการเลือกช่วงวันที่

### 3. แยก Utility Functions

แยกฟังก์ชันช่วยที่ไม่เกี่ยวข้องกับ UI โดยตรง:

- **dashboardCalculations.ts** - ฟังก์ชันคำนวณต่างๆ
- **dashboardDataTransformers.ts** - ฟังก์ชันแปลงข้อมูลสำหรับกราฟและตาราง
- **dashboardFormatters.ts** - ฟังก์ชันจัดรูปแบบข้อมูล

## 📂 โครงสร้างไฟล์ที่เสนอ

```
app/features/dashboard/
├── components/
│   ├── index.ts
│   ├── DashboardPage.tsx (ไฟล์หลักที่ import ส่วนประกอบอื่นๆ)
│   ├── sections/
│   │   ├── StatisticsSummary.tsx
│   │   ├── PatientCensusChart.tsx
│   │   ├── BedStatusChart.tsx
│   │   ├── PatientTrendSection.tsx
│   │   ├── WardSummarySection.tsx
│   │   ├── ShiftComparisonSection.tsx
│   │   └── DailyPatientSection.tsx
│   └── ...คอมโพเนนต์ที่มีอยู่เดิม
├── hooks/
│   ├── index.ts
│   ├── useDashboardData.ts
│   ├── usePatientTrends.ts
│   ├── useBedSummary.ts
│   ├── useWardSelection.ts
│   └── useDateRangeSelection.ts
└── utils/
    ├── index.ts
    ├── dashboardCalculations.ts
    ├── dashboardDataTransformers.ts
    └── dashboardFormatters.ts
```

## 🔍 ขั้นตอนการดำเนินการ

1. สร้างโครงสร้างไฟล์และโฟลเดอร์ตามที่เสนอไว้
2. แยกคอมโพเนนต์ทีละส่วนโดยเริ่มจากส่วนที่มีความซับซ้อนน้อยก่อน
3. แยก Custom Hooks และ Utility Functions
4. ปรับปรุง DashboardPage.tsx ให้ import และใช้งานคอมโพเนนต์ใหม่
5. ทดสอบการทำงานในแต่ละขั้นตอนเพื่อให้มั่นใจว่าไม่มีผลกระทบต่อฟังก์ชันการทำงานเดิม

## ⚠️ ข้อควรระวัง

- รักษา props และ state ที่จำเป็นสำหรับแต่ละคอมโพเนนต์
- ตรวจสอบให้แน่ใจว่า dependencies ของ useEffect ถูกต้องหลังการแยกคอมโพเนนต์
- รักษาลำดับการทำงานของโค้ดเดิม โดยเฉพาะในส่วนที่มีการเรียกใช้งาน API
- ตรวจสอบการทำงานในทุกๆ ฟีเจอร์หลังการปรับปรุง

## 📊 ประโยชน์ที่คาดว่าจะได้รับ

- โค้ดอ่านง่ายและดูแลรักษาง่ายขึ้น
- ลดการ re-render ที่ไม่จำเป็น ช่วยเพิ่มประสิทธิภาพ
- ทำให้การทดสอบทำได้ง่ายขึ้น
- สามารถนำคอมโพเนนต์ไปใช้ซ้ำในส่วนอื่นของแอปพลิเคชันได้
- ง่ายต่อการขยายฟีเจอร์ในอนาคต

## 🕒 ระยะเวลาดำเนินการ

คาดว่าจะใช้เวลาประมาณ 3-5 วันทำงาน ขึ้นอยู่กับความซับซ้อนที่พบระหว่างการแยกคอมโพเนนต์ 

## การปรับโครงสร้างไฟล์ Dashboard (2024-07-20)

## การเปลี่ยนแปลง
- แยกฟังก์ชันและตัวแปรที่เกี่ยวข้องกับ DashboardPage.tsx ไปยังไฟล์ที่เหมาะสม
- ย้าย interface ไปยังไฟล์ types.ts
- สร้าง hooks ใหม่สำหรับจัดการข้อมูลต่างๆ
- สร้างไฟล์ utils เพิ่มเติมสำหรับ dashboard

## รายการไฟล์ที่เพิ่ม/แก้ไข
1. `app/features/dashboard/components/types.ts`
   - เพิ่ม interface WardCensusData, ViewType, CalendarMarker, DailyPatientData

2. `app/features/dashboard/services/calendarService.ts`
   - เพิ่มฟังก์ชัน fetchCalendarMarkers

3. `app/features/dashboard/services/patientTrendService.ts`
   - เพิ่มฟังก์ชัน fetchDailyPatientData

4. `app/features/dashboard/hooks/useTrendData.ts`
   - สร้างไฟล์ใหม่สำหรับจัดการข้อมูล trend

5. `app/features/dashboard/hooks/useDailyPatientData.ts`
   - สร้างไฟล์ใหม่สำหรับจัดการข้อมูลผู้ป่วยรายวัน

6. `app/features/dashboard/utils/dashboardUtils.ts`
   - สร้างไฟล์ใหม่สำหรับฟังก์ชัน utilities ของ dashboard
   - เพิ่มค่าคงที่ DASHBOARD_WARDS, DATE_RANGE_OPTIONS
   - เพิ่มฟังก์ชัน isRegularUser, isAdmin, fetchDailyPatientDataWrapper

7. `app/features/dashboard/hooks/index.ts`
   - ปรับปรุงการ export hooks ทั้งหมด

8. `app/features/dashboard/utils/index.ts`
   - ปรับปรุงการ export utils ทั้งหมด

## เหตุผลในการเปลี่ยนแปลง
- แยกโค้ดจากไฟล์ DashboardPage.tsx ที่มีขนาดใหญ่เกินไป (2441 บรรทัด)
- จัดกลุ่มฟังก์ชันที่เกี่ยวข้องกันให้อยู่ในไฟล์เดียวกัน
- ลดความซ้ำซ้อนของโค้ด
- ทำให้การบำรุงรักษาและแก้ไขโค้ดง่ายขึ้น

## ผลกระทบที่อาจเกิดขึ้น
- ต้องทดสอบการทำงานของ Dashboard หลังจากการปรับโครงสร้าง
- ตรวจสอบว่าการนำเข้า (import) ในไฟล์ต่างๆ ถูกต้อง
- ตรวจสอบการทำงานของฟังก์ชันต่างๆ ที่ย้ายไปยังไฟล์ใหม่ 

## บันทึกการแก้ไขล่าสุด
### วันที่แก้ไข: กรกฎาคม 2024
1. แก้ไขปัญหา type errors ใน DashboardPage.tsx
   - เพิ่ม interface WardCensusMapData เพื่อกำหนดโครงสร้างข้อมูล
   - แก้ไขการเข้าถึงข้อมูลใน wardCensusMap
   - แก้ไขการใช้งาน PatientTrendChart props

2. ปรับปรุงการทำงานของฟังก์ชัน processBedCensusData
   - รองรับทั้งกรณี wardCensusMap เก็บข้อมูลเป็นตัวเลขและ object

3. แก้ไขการทำงานในส่วนของ WardSummaryDashboard
   - ปรับปรุงการดึงข้อมูล patientCount จาก wardCensusMap

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