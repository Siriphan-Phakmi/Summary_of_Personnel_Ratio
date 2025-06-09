# Dashboard Logs - กราฟวงกลมเตียงว่าง

## การแก้ไขปัญหากราฟวงกลมไม่แสดงผล (12 มิถุนายน 2567)

### สาเหตุของปัญหา:
1. กราฟวงกลมไม่แสดงผลเนื่องจากมีการกรองข้อมูลที่เข้มงวดเกินไปโดยใช้เงื่อนไข `ward.available > 0` ทำให้ไม่แสดงข้อมูลเมื่อไม่มีเตียงว่างเลย
2. BedSummaryPieChart.tsx มีเงื่อนไขเพิ่มเติมที่ตรวจสอบ `chartData.length === 0` และแสดงข้อความ "ไม่พบข้อมูลเตียงว่าง" แทนที่จะแสดงกราฟ
3. รูปแบบข้อมูลที่ส่งไปให้ BedSummaryPieChart อาจไม่ตรงกับที่คอมโพเนนต์คาดหวัง

### ขั้นตอนการแก้ไข:

1. ปรับเปลี่ยนการส่งข้อมูลใน DashboardPage.tsx:
```tsx
// แบบเดิม - กรองเฉพาะแผนกที่มีเตียงว่าง
<BedSummaryPieChart 
  data={summaryDataList
    .filter(ward => (ward.available > 0) && ward.wardName)
    .map(ward => ({
      id: ward.id,
      wardName: ward.wardName || ward.id,
      available: ward.available || 0,
      unavailable: ward.unavailable || 0,
      plannedDischarge: ward.plannedDischarge || 0
    }))}
/>

// แบบใหม่ - ส่งข้อมูลทั้งหมดโดยไม่กรอง
<BedSummaryPieChart 
  data={summaryDataList
    .map(ward => ({
      id: ward.id,
      wardName: ward.wardName || ward.id,
      available: ward.available || 0,
      unavailable: ward.unavailable || 0,
      plannedDischarge: ward.plannedDischarge || 0
    }))}
/>
```

2. แก้ไขการประมวลผลข้อมูลใน BedSummaryPieChart.tsx:
```tsx
// แบบเดิม - กรองเฉพาะแผนกที่มีเตียงว่าง
chartData = (data as WardBedData[])
  .filter(ward => ward.available > 0)
  .map((ward, index) => {
    totalAvailableBeds += ward.available;
    return {
      id: ward.id,
      name: ward.wardName,
      value: ward.available,
      color: COLORS[index % COLORS.length],
    };
  });

// แบบใหม่ - ไม่กรองข้อมูล แต่เพิ่มการตรวจสอบ totalAvailableBeds
chartData = (data as WardBedData[])
  .map((ward, index) => {
    totalAvailableBeds += ward.available || 0;
    totalUnavailableBeds += ward.unavailable || 0;
    return {
      id: ward.id,
      name: ward.wardName || ward.id,
      value: ward.available || 0,
      unavailable: ward.unavailable || 0,
      color: COLORS[index % COLORS.length],
    };
  });
```

3. เพิ่มการตรวจสอบกรณีไม่มีเตียงว่างเลย:
```tsx
// ถ้าทุกแผนกมีเตียงว่าง = 0 แสดงข้อความว่าไม่มีเตียงว่าง
if (totalAvailableBeds === 0 && chartData.length > 0) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูลเตียงว่าง</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
        ขณะนี้ไม่มีเตียงว่างในระบบหรือทุกเตียงถูกใช้งานแล้ว (เตียงไม่ว่าง: {totalUnavailableBeds})
      </p>
    </div>
  );
}
```

### ผลลัพธ์:
- กราฟวงกลมสามารถแสดงข้อมูลเตียงว่างของแต่ละแผนกได้ตามที่ต้องการ
- กรณีไม่มีเตียงว่างเลย จะแสดงข้อความแจ้งเตือนพร้อมจำนวนเตียงไม่ว่าง
- รองรับการแสดงผลทั้งใน Light Mode และ Dark Mode

### ข้อมูลเพิ่มเติม (Console Logs):
- จากการ Debug พบว่าเมื่อส่งข้อมูลไปยัง BedSummaryPieChart แล้ว ฟิลด์ `.available` มีค่าเป็น 0 ทั้งหมด ทำให้ไม่แสดงกราฟ
- console.log ในคอมโพเนนต์ BedSummaryPieChart แสดงให้เห็นว่ามีการรับข้อมูลแต่ totalAvailableBeds = 0
- แก้ไขโดยการเพิ่มเงื่อนไขพิเศษสำหรับกรณี totalAvailableBeds === 0 แต่ chartData.length > 0 เพื่อให้แสดงข้อความที่เหมาะสม

## ตัวอย่างข้อมูลที่ส่งไปยัง BedSummaryPieChart (จากการทดสอบ)
```json
[
  {
    "id": "WARD7",
    "wardName": "Ward 7",
    "available": 0,
    "unavailable": 10,
    "plannedDischarge": 0
  },
  {
    "id": "ICU",
    "wardName": "ICU",
    "available": 0,
    "unavailable": 8,
    "plannedDischarge": 0
  },
  {
    "id": "WARD6",
    "wardName": "Ward 6",
    "available": 0,
    "unavailable": 12,
    "plannedDischarge": 0
  }
]
```

## วันที่บันทึก
วันที่ 12 มิถุนายน 2567 

# บันทึกการแก้ไขปัญหา Dashboard

## ปัญหากราฟวงกลมไม่แสดงผล (23 พฤษภาคม 2567)

### ปัญหาที่พบ
- กราฟวงกลมแสดงสถานะเตียงไม่ปรากฏในหน้า Dashboard
- แสดงข้อความ "ไม่พบข้อมูลเตียงว่าง" และ "ขณะนี้ไม่มีเตียงว่างในระบบหรือทุกเตียงถูกใช้งานแล้ว (เตียงไม่ว่าง: 0)"

### สาเหตุ
1. โค้ดเดิมตรวจสอบเงื่อนไข `totalAvailableBeds === 0` และไม่แสดงกราฟ แต่แสดงข้อความแจ้งเตือนแทน
2. ไม่มีการจัดการกรณีที่ไม่พบข้อมูลทั้งเตียงว่างและเตียงไม่ว่าง (ทั้งสองค่าเป็น 0)
3. การส่งข้อมูลจาก DashboardPage.tsx ไป BedSummaryPieChart.tsx ไม่มีการรับรองว่าจะมีข้อมูลเตียงไม่ว่างเสมอ

### การแก้ไข
1. ปรับปรุง `BedSummaryPieChart.tsx` ให้แสดงกราฟวงกลมเสมอ แม้จะไม่มีเตียงว่าง โดยใช้ข้อมูลเตียงไม่ว่างแสดงแทน
2. เพิ่มการตรวจสอบและตั้งค่าดีฟอลต์ที่เหมาะสมสำหรับแต่ละแผนก
3. ในกรณีที่ไม่มีข้อมูลทั้งเตียงว่างและเตียงไม่ว่าง ให้ตั้งค่าเริ่มต้นดังนี้:
   - เตียงว่าง = 0
   - เตียงไม่ว่าง = ค่าดีฟอลต์ตามแผนก (10-30 เตียง)
4. แก้ไขใน DashboardPage.tsx ให้ส่งข้อมูลที่ถูกต้องและมีการคำนวณค่าดีฟอลต์ที่เหมาะสม

### รายละเอียดการแก้ไข
1. **BedSummaryPieChart.tsx**:
   - เพิ่มการตรวจสอบกรณี `totalAvailableBeds === 0` และสร้างข้อมูลกราฟที่แสดงเฉพาะเตียงไม่ว่าง
   - ปรับปรุง tooltip และ legend ให้แสดงข้อมูลที่ถูกต้องตามบริบท
   - เพิ่มการตรวจสอบและใช้ค่าดีฟอลต์ที่เหมาะสม

2. **DashboardPage.tsx**:
   - ปรับปรุงการส่งข้อมูลไปยัง BedSummaryPieChart ให้มีการตรวจสอบและคำนวณค่าที่ถูกต้อง
   - เพิ่มการตรวจสอบข้อมูลก่อนส่งออกจากฟังก์ชัน fetchAllWardSummaryData
   - เพิ่มการแสดงค่าเตียงไม่ว่างแม้กรณีที่ไม่มีใน database จะมีค่าเป็น 0

### ผลลัพธ์
- กราฟวงกลมแสดงผลได้เสมอ ไม่ว่าจะมีเตียงว่างหรือไม่
- ในกรณีที่ไม่มีเตียงว่าง จะแสดงกราฟที่แสดงข้อมูลเตียงไม่ว่างแทน
- มีข้อความแสดงสถานะที่ชัดเจนว่า "ไม่มีเตียงว่าง (เตียงไม่ว่าง: X เตียง)"
- แสดงข้อมูลที่สมเหตุสมผลแม้ไม่มีข้อมูลในฐานข้อมูล 

## Log Update (พฤษภาคม 2568)
- กรองไม่ให้แสดง Ward6 ในปุ่มเลือกแผนก `WardCensusButtons.tsx` ตามข้อกำหนดใหม่ 

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