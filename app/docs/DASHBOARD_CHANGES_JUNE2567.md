# บันทึกการปรับปรุง Dashboard (มิถุนายน 2567)

## Clean Code (วันที่ 19-06-2567)

### ไฟล์ที่ลบ (ไม่ได้ใช้งาน)
- ลบไฟล์ `DashboardPage.tsx.bak` และ `DashboardPage.tsx.broken` ที่เป็นไฟล์ backup และไม่ได้ใช้งาน
- ลบไฟล์ `PieChart.tsx` ที่ถูกแทนที่ด้วย `EnhancedPieChart.tsx` และ `PieChartSummary.tsx`
- ลบไฟล์ `BarChartComponent.tsx` ที่ไม่ได้ถูกใช้งาน
- ลบไฟล์ `DashboardSimplified.tsx` ที่ไม่ได้ถูกใช้งาน
- ลบไฟล์ `PatientTable.tsx` ที่ไม่ได้ถูกใช้งาน
- ลบไฟล์ `CalendarWithMarkers.tsx` ที่ไม่ได้ถูกใช้งาน (มี `CalendarWithEvents.tsx` ใช้แทน)
- ลบไฟล์ `DashboardOverview.tsx` ที่ไม่ได้ใช้งาน
- ลบไฟล์ `OverallStats.tsx`, `BarChartSummary.tsx`, `LineChartSummary.tsx`, `PieChartSummary.tsx` ที่ไม่ได้ใช้งาน

### แยกคอมโพเนนต์ออกจาก DashboardPage.tsx
- แยก `NoDataMessage` ออกเป็นไฟล์ `NoDataMessage.tsx`
- แยก `WardCensusButtons` ออกเป็นไฟล์ `WardCensusButtons.tsx`

### ปรับปรุงไฟล์ index.ts
- แก้ไขไฟล์ `index.ts` โดยลบการ export ของคอมโพเนนต์ที่ไม่ได้ใช้งาน
- เพิ่มการ export ของคอมโพเนนต์ใหม่ (`NoDataMessage` และ `WardCensusButtons`)

### ปรับปรุง DashboardPage.tsx
- ลบการ import ที่ไม่ได้ใช้งาน เช่น `DashboardOverview`, `Timestamp`, `subWeeks`, `subYears`
- ลบการ import `BedSummaryData` ที่ไม่ได้ใช้งาน
- ปรับปรุง enum `ViewType` ให้มีเฉพาะที่ใช้งานจริง
- คงเฉพาะ import ที่จำเป็นเพื่อลดขนาดไฟล์และเพิ่มประสิทธิภาพ
- จัดกลุ่ม imports ให้เป็นระเบียบ โดยแยกเป็นหมวดหมู่ (ไลบรารีภายนอก, โมดูลภายใน, คอมโพเนนต์ท้องถิ่น)
- ย้าย imports คอมโพเนนต์ให้อยู่ด้านบนก่อนการนิยาม interface เพื่อความเป็นระเบียบ

### ปรับปรุงด้านความปลอดภัย
- เพิ่มฟังก์ชัน `logInfo` และ `logError` เพื่อควบคุมการแสดง log ในโหมด production
- แก้ไขการใช้ `console.log` โดยตรงให้ใช้ผ่านฟังก์ชัน `logInfo` และ `logError` แทน
- ตั้งค่าให้ไม่แสดง log ในโหมด production เพื่อป้องกันการรั่วไหลของข้อมูล
- แก้ไขการใช้ `console.log` ใน BedSummaryPieChart.tsx โดยการแปลงเป็นคอมเมนต์
- ลดการเปิดเผยข้อมูลที่อาจเป็นข้อมูลส่วนบุคคลในการ log ต่างๆ

### ประเด็นด้านความปลอดภัย
- พบการใช้ `console.log` จำนวนมาก (58 จุด) ในไฟล์ `DashboardPage.tsx` ซึ่งอาจเปิดเผยข้อมูลสำคัญในการพัฒนาระบบ
- มีข้อมูลที่อาจเป็นข้อมูลส่วนบุคคลถูกบันทึกใน console.log เช่น wardId, patientCensus
- แนะนำให้นำ console.log ออกในการ build สำหรับ production หรือใช้ระบบ logging ที่เหมาะสม

### มาตรฐานความปลอดภัย
- ปฏิบัติตามหลักการ "Defense in Depth" โดยตรวจสอบสิทธิ์ผู้ใช้งานก่อนแสดงข้อมูล
- การตรวจสอบ null และ undefined อย่างสม่ำเสมอช่วยป้องกันข้อผิดพลาดและการโจมตีแบบ null pointer
- การใช้ TypeScript ช่วยป้องกันข้อผิดพลาดจากการกำหนดประเภทข้อมูลที่ไม่ถูกต้อง
- ใช้ formatting function และ parameterized query ในการเข้าถึงฐานข้อมูล เพื่อป้องกันการโจมตีแบบ injection
- มีการจำกัดการเข้าถึงข้อมูลตามบทบาทของผู้ใช้ (RBAC - Role-Based Access Control)
- แก้ไขการ logging เพื่อป้องกันการรั่วไหลของข้อมูลในสภาพแวดล้อม production

### ผลลัพธ์
- โค้ดมีความสะอาดและเป็นระเบียบมากขึ้น
- ลดขนาดไฟล์ `DashboardPage.tsx` ลงประมาณ 300 บรรทัด
- ลดความซับซ้อนของโค้ดด้วยการลบส่วนที่ไม่จำเป็น
- เพิ่มความชัดเจนในการอ่านและเข้าใจโค้ด
- ปรับปรุงประสิทธิภาพโดยรวมของแอปพลิเคชัน
- คอมโพเนนต์ที่เกี่ยวข้องมีการแยกออกจากกันอย่างชัดเจน ทำให้ง่ายต่อการบำรุงรักษา
- ลบคอมโพเนนต์ที่ไม่ได้ใช้งานออก ทำให้โปรเจคมีขนาดเล็กลง
- เพิ่มความปลอดภัยของข้อมูลด้วยการปรับปรุงระบบ logging

## การปรับปรุงด้านความปลอดภัยเพิ่มเติม (มิถุนายน 2567)
- แก้ไขการใช้ console.log ในฟังก์ชันต่างๆ ของ DashboardPage.tsx เพื่อเพิ่มความปลอดภัยของข้อมูล:
  - getDailySummary - ใช้ logInfo แทน console.log เพื่อไม่แสดงข้อมูลในโหมด production
  - fetchPatientTrends - ใช้ logInfo และ logError แทน console.log และ console.error
  - calculateBedSummary - ใช้ logInfo และ logError แทน console.log และ console.error
  - refreshData - ใช้ logInfo และ logError แทน console.log และ console.error
- ผลลัพธ์ด้านความปลอดภัย:
  - ข้อมูลที่อาจมีความอ่อนไหวจะไม่ถูกแสดงใน console ในโหมด production
  - ลดความเสี่ยงจากการรั่วไหลของข้อมูลผ่าน browser console
  - ง่ายต่อการติดตามและแก้ไขปัญหาในโหมด development
  - รองรับการตรวจสอบด้านความปลอดภัยของข้อมูล (data security audit)

## การแก้ไขเพิ่มเติม (21 มิถุนายน 2567)
1. ลบ interface `DashboardOverviewProps` ที่ไม่ได้ใช้งานจากไฟล์ `types.ts`
2. แก้ไขปัญหา reference error ของ `bedSummaryData` โดยใช้ `pieChartData` แทน
3. ปรับปรุงความชัดเจนของ comment เพื่อให้เข้าใจง่ายขึ้น

## การปรับปรุงโครงสร้าง Types และ Hooks (22 มิถุนายน 2567)

### ปรับปรุงโครงสร้าง Types
- แยกไฟล์ `types.ts` เป็นหลายไฟล์ตามหมวดหมู่:
  - `button-types.ts` - สำหรับ interface ที่เกี่ยวข้องกับปุ่มและการ์ด
  - `chart-types.ts` - สำหรับ interface ที่เกี่ยวข้องกับกราฟและชาร์ต
  - `form-types.ts` - สำหรับ interface ที่เกี่ยวข้องกับแบบฟอร์มและข้อมูลสรุป
  - `component-types.ts` - สำหรับ interface ที่เกี่ยวข้องกับคอมโพเนนต์อื่นๆ
  - `index.ts` - รวม export จากทุกไฟล์
- สร้าง interface พื้นฐาน `WardControlBaseProps` สำหรับเป็น base interface ของ `WardButtonProps` และ `WardSummaryCardProps`
- เพิ่ม JSDoc สำหรับทุก interface เพื่อให้อ่านและเข้าใจง่ายขึ้น
- ปรับปรุงการใช้ types ในคอมโพเนนต์ `WardButton`, `WardSummaryCard` และ `NoDataMessage`

### สร้าง Custom Hooks
- สร้าง `useWardData` สำหรับการจัดการข้อมูลแผนก:
  - ดึงข้อมูลแผนกตามสิทธิ์ของผู้ใช้
  - จัดการการเลือกแผนก
  - ตรวจสอบสิทธิ์การเข้าถึงแผนก
- สร้าง `useDateRange` สำหรับการจัดการช่วงวันที่:
  - จัดการการเลือกช่วงวันที่ (วันนี้, กำหนดเอง)
  - คำนวณช่วงวันที่ที่มีผลจริง
  - จัดการการเปลี่ยนแปลงช่วงวันที่
- สร้าง `useSafeLogging` สำหรับการบันทึกข้อมูลอย่างปลอดภัย:
  - `logInfo` - บันทึกข้อมูลเฉพาะในโหมด development
  - `logError` - บันทึกข้อผิดพลาดเฉพาะในโหมด development
  - เตรียมพร้อมสำหรับการส่งข้อมูลไปยังระบบติดตามข้อผิดพลาดในโหมด production

### ผลลัพธ์ด้านการพัฒนา
- โค้ดมีความเป็นระเบียบและเป็นโมดูลมากขึ้น
- ลดความซับซ้อนของไฟล์หลัก (`DashboardPage.tsx`)
- เพิ่มความสามารถในการนำโค้ดกลับมาใช้ใหม่ (code reusability)
- ง่ายต่อการบำรุงรักษาและการขยายความสามารถในอนาคต
- การแก้ไขปัญหาทำได้ง่ายขึ้นเนื่องจากแยกเป็นโมดูลที่ชัดเจน

### ผลลัพธ์ด้านความปลอดภัย
- การ logging ที่ปลอดภัยมากขึ้นด้วย `useSafeLogging`
- ข้อมูลที่อาจมีความอ่อนไหวจะไม่ถูกบันทึกในโหมด production
- ระบบพร้อมสำหรับการรวมกับระบบติดตามข้อผิดพลาดในอนาคต
- ลดความเสี่ยงจากการรั่วไหลของข้อมูลผ่าน console

## การแก้ไขและปรับปรุงเพิ่มเติม (กรกฎาคม 2567)

### แก้ไขปัญหา Patient Census (คงพยาบาล) ตามแผนก
- แก้ไขปัญหาที่ไม่แสดงข้อมูลกะเช้าหลังจากอนุมัติแล้ว
- ปรับปรุงการใช้ข้อมูลใน `bedCensusArr` โดยเปลี่ยนจากการใช้ `available` เป็น `patientCensus`
- แก้ไขฟังก์ชัน `refreshData` ให้ใช้ค่า `patientCensus` แทน `available` เพื่อแสดงจำนวนคนไข้ที่ถูกต้อง
- ปรับปรุง `wardCensusData` ใน useMemo เพื่อให้ดึงข้อมูลจากหลายแหล่งอย่างถูกต้อง
- เพิ่มการตรวจสอบข้อมูลเวรเช้าและเวรดึกโดยละเอียด และเพิ่ม logs เพื่อการแก้ไขปัญหา
- ปรับปรุงวิธีการคำนวณจำนวนผู้ป่วยรวมให้ใช้ผลรวมของเวรเช้าและเวรดึกที่ถูกต้อง

### ปรับปรุงการแสดงผลปฏิทิน
- ปรับปรุงการแสดงวันที่ปัจจุบันในปฏิทินให้ชัดเจนขึ้น
- เพิ่มขนาดวันที่จาก `text-[10px]` เป็น `text-xs font-bold`
- เพิ่มกรอบสีและพื้นหลังสำหรับวันที่ปัจจุบัน
- ปรับขนาดตัวเลขวันที่ให้แสดงในวงกลมขนาด `w-5 h-5`

### ปรับปรุงการแสดงสถานะรายงาน
- เพิ่มขนาดจุดสีแสดงสถานะใต้วันที่จาก `w-1.5 h-1.5` เป็น `w-2.5 h-2.5`
- เพิ่มขนาดจุดสีแสดงสถานะใต้ปฏิทินจาก `w-2.5 h-2.5` เป็น `w-4 h-4`
- เพิ่มขนาดตัวอักษรอธิบายสถานะจาก `text-xs` เป็น `text-sm`
- สถานะที่มีการปรับปรุง: รายงานฉบับร่าง, รายงานสมบูรณ์บางเวร, รายงานที่อนุมัติแล้วทั้ง 2 เวร

### ปรับปรุงการแสดงแนวโน้มผู้ป่วยทุกแผนก
- แก้ไขปัญหาเมื่อกด "แสดงแยกแผนก" แล้วข้อมูลไม่แสดง
- เพิ่มการบันทึกสถานะการแสดงผลใน localStorage เพื่อจำค่าการตั้งค่าไว้
- เพิ่มคำอธิบายการใช้งานปุ่ม "แสดงแยกแผนก" ให้ชัดเจนขึ้น

### ปรับปรุงส่วนแสดงข้อมูลที่ต้องเลือก Ward
- ปรับปรุงส่วน "จำนวนผู้ป่วย (ตามหอผู้ป่วย)" ให้ต้องเลือก Ward ก่อนจึงจะแสดงข้อมูล
- ปรับปรุงส่วน "เปรียบเทียบเวรเช้า-ดึก" ให้ต้องเลือก Ward ก่อนจึงจะแสดงข้อมูล
- เพิ่มตัวเลือก Ward สำหรับผู้ดูแลระบบเพื่อให้เลือกข้อมูลได้ง่ายขึ้น
- ปรับปรุงหน้าตาให้มีคำแนะนำและปุ่มเลือก Ward ที่ชัดเจน

### เพิ่มคำอธิบายในส่วนกราฟ
- เพิ่มสัญลักษณ์สีอธิบายความหมายของแท่งกราฟสำหรับเวรเช้าและเวรดึก

### ผลลัพธ์
- แก้ไขปัญหาการแสดงข้อมูลกะเช้าหลังอนุมัติแล้วให้ถูกต้อง
- ผู้ใช้งานสามารถเห็นวันที่ปัจจุบันได้ชัดเจนยิ่งขึ้น
- การแสดงสถานะของรายงานมีความชัดเจนและสังเกตเห็นได้ง่ายขึ้น
- แก้ไขปัญหาการแสดงแนวโน้มผู้ป่วยแยกตามแผนกให้ทำงานได้ถูกต้อง
- ปรับปรุงประสบการณ์ผู้ใช้ (UX) สำหรับการเลือก Ward ดูข้อมูลเฉพาะ
- ปรับปรุงประสบการณ์ผู้ใช้ (UX) โดยรวมให้ดีขึ้น
