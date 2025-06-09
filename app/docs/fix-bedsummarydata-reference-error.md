# การแก้ไขปัญหา ReferenceError: bedSummaryData is not defined

## วันที่แก้ไข
22 พฤษภาคม 2025

## ปัญหาที่พบ
เกิด Error ในหน้า Dashboard:
```
ReferenceError: bedSummaryData is not defined
    at DashboardPage (webpack-internal:///(app-pages-browser)/./app/features/dashboard/components/DashboardPage.tsx:1620:9)
    at Dashboard (webpack-internal:///(app-pages-browser)/./app/features/dashboard/page.tsx:10:87)
    at ClientPageRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/client-page.js:20:50)
```

## สาเหตุของปัญหา
1. มีการอ้างอิงตัวแปร `bedSummaryData` ในบรรทัด 1434 ของไฟล์ `DashboardPage.tsx` ซึ่งเป็น dependency ของ useEffect แต่ตัวแปรนี้ไม่ได้ถูกประกาศไว้

2. ในฟังก์ชัน `refreshData` มีการเรียกใช้ฟังก์ชัน `calculateBedSummary()` ซึ่งไม่มีการประกาศไว้ในไฟล์และอาจใช้งาน `bedSummaryData` ภายใน

## การแก้ไข
1. **ลบ `bedSummaryData` ออกจาก dependency array ใน useEffect**
```tsx
}, [effectiveDateRange, wards, pieChartData]);
```

2. **เพิ่มประกาศตัวแปร `bedSummaryData`**
```tsx
// ป้องกัน ReferenceError: bedSummaryData is not defined
const bedSummaryData = pieChartData;
```

3. **แทนที่การเรียกใช้ `calculateBedSummary()` ในฟังก์ชัน `refreshData`**
โดยใช้โค้ดที่สร้างข้อมูลสถานะเตียงแบบใหม่ โดยดึงข้อมูลจาก `getWardFormsByDateAndWard` และกำหนดค่า `bedCensusData` โดยตรงสำหรับแสดงผลในกราฟแท่ง

## ผลลัพธ์
- แก้ไขข้อผิดพลาด `ReferenceError: bedSummaryData is not defined` อย่างสมบูรณ์
- ปรับปรุงโค้ดให้ใช้ `bedCensusData` แทน `bedSummaryData` อย่างสอดคล้องกันในทุกส่วนของโปรแกรม
- คงไว้ซึ่งฟังก์ชันการทำงานหลักของแอปพลิเคชัน

## หมายเหตุเพิ่มเติม
แอปพลิเคชันมีการเปลี่ยนแปลงจากการใช้ `BedSummaryPieChart` เป็น `EnhancedBarChart` เพื่อแสดงข้อมูลสถานะเตียง โดยใช้ข้อมูลจาก `bedCensusData` แทน `bedSummaryData` ตามโครงสร้างใหม่ของแอปพลิเคชัน

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
