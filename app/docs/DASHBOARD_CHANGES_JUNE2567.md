# การปรับปรุงหน้า Dashboard (มิถุนายน 2567)

## รายการที่ได้แก้ไขแล้ว

1. **แก้ไขปัญหา Dark Mode ที่เปลี่ยนเองโดยอัตโนมัติ**
   - ปรับให้ใช้ค่าจาก localStorage เท่านั้น ไม่ใช้ matchMedia
   - ป้องกันการเปลี่ยนโหมดอัตโนมัติเมื่อเข้าหน้า Dashboard
   - ไฟล์ที่แก้ไข: `app/features/dashboard/components/DashboardPage.tsx`

2. **ปรับปรุงการแสดงผลกราฟแท่ง (Bar Chart)**
   - ยืนยันการคำนวณความสูงของกราฟแท่งแบบ dynamic เพื่อให้แสดงผลได้ดีกับทุกขนาดข้อมูล
   - ปรับสีกราฟให้เหมาะกับทั้งโหมดสว่างและมืด
   - ตรวจสอบการแสดงค่าเป็นตัวเลขจำนวนเต็ม
   - ไฟล์ที่แก้ไข: `app/features/dashboard/components/EnhancedBarChart.tsx`

3. **ปรับปรุงกราฟวงกลม (Pie Chart)**
   - ปรับเป็นกราฟวงกลมแบบ 2D ไม่มีรู (innerRadius = 0)
   - ลดค่า paddingAngle เพื่อให้เป็นกราฟวงกลมปกติ
   - ไฟล์ที่แก้ไข: `app/features/dashboard/components/EnhancedPieChart.tsx`

4. **ปรับปรุงการเปรียบเทียบเวรเช้า-ดึก**
   - เพิ่มการแสดงรายละเอียดพยาบาลแต่ละประเภท
   - ปรับปรุงความแตกต่างระหว่างเวรให้ชัดเจนด้วยสีและพื้นหลัง
   - ไฟล์ที่แก้ไข: `app/features/dashboard/components/ShiftComparisonPanel.tsx`

5. **เพิ่มการแสดงชื่อ Ward ในกราฟแนวโน้มผู้ป่วย**
   - แสดงชื่อ Ward ที่กำลังดูข้อมูลในปัจจุบัน
   - ปรับปรุงการแสดงผลให้เด่นชัดยิ่งขึ้น
   - ไฟล์ที่แก้ไข: `app/features/dashboard/components/PatientTrendChart.tsx`

6. **ตัดฟีเจอร์สำหรับผู้ดูแลระบบ (Admin)**
   - ลบตัวแปร hasAdminAccess ทั้งหมด
   - แก้ไขโค้ดในส่วนของการโหลดและกรองข้อมูล Ward ให้ใช้เฉพาะ getWardsByUserPermission
   - ปรับให้ทุกผู้ใช้เห็นเฉพาะแผนกที่มีสิทธิ์เข้าถึง
   - ไฟล์ที่แก้ไข: `app/features/dashboard/components/DashboardPage.tsx`

## รายละเอียดการแก้ไข

### 1. แก้ไขปัญหา Dark Mode
```typescript
// ตรวจสอบโหมดสีธีมเมื่อโหลดหน้า
useEffect(() => {
  // ใช้ค่าจาก localStorage เท่านั้น ไม่เปลี่ยนอัตโนมัติ
  const storedDarkMode = localStorage.getItem('darkMode');
  if (storedDarkMode !== null) {
    const isDark = storedDarkMode === 'true';
    setIsDarkMode(isDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  // ไม่ใช้ matchMedia เพื่อป้องกันการเปลี่ยนอัตโนมัติ
}, []);
```

### 2. กราฟแท่ง (Bar Chart)
ยืนยันการใช้คำนวณความสูงแบบ dynamic:
```typescript
// คำนวณความสูงของ chart แบบ dynamic
const chartHeight = Math.max(350, data.length * 45); // ขั้นต่ำ 350px, เพิ่ม 45px ต่อแผนก
```

### 3. กราฟวงกลม (Pie Chart)
```typescript
<Pie
  data={chartData}
  cx="50%"
  cy="50%"
  innerRadius={0} // เปลี่ยนเป็น 0 เพื่อให้แสดงเป็นกราฟวงกลมเต็มรูปแบบ
  outerRadius={90}
  paddingAngle={1} // ลดช่องว่างเพื่อให้แสดงเป็นกราฟวงกลมปกติ
  dataKey="value"
  onClick={(entryData) => onSelectWard(entryData.id)}
  labelLine={false}
  label={CustomLabel}
  isAnimationActive={true}
  animationDuration={500}
>
```

### 6. ตัดฟีเจอร์สำหรับ Admin
แก้ไขการโหลด Ward:
```typescript
const loadWards = async () => {
  if (!user) {
    setWards([]);
    setLoading(false);
    return;
  }
  setLoading(true);
  setError(null);
  try {
    // ดึงเฉพาะ Ward ที่มีสิทธิ์เข้าถึง ไม่สนใจว่าเป็น Admin หรือไม่
    const userPermittedWards = await getWardsByUserPermission(user);
    // กรองเฉพาะ ward ที่กำหนดไว้ใน DASHBOARD_WARDS
    const userDashboardWards = userPermittedWards.filter(ward => 
      DASHBOARD_WARDS.some(dashboardWard => 
        ward.wardName.toUpperCase().includes(dashboardWard.toUpperCase()) || 
        ward.id?.toUpperCase() === dashboardWard.toUpperCase()
      )
    );
    console.log("[loadWards] Showing permitted wards:", userDashboardWards.map(w => w.wardName));
    setWards(userDashboardWards);
    
    if (userDashboardWards.length > 0) {
      setSelectedWardId(userDashboardWards[0].id);
    }
  } catch (err) {
    console.error('[DashboardPage] Error loading wards:', err);
    setError('ไม่สามารถโหลดข้อมูลแผนกได้');
    setWards([]);
  } finally {
    // Defer setting loading to false to allow summary to load
  }
};
```

แก้ไขการกรองข้อมูลสำหรับกราฟและตาราง:
```typescript
// แก้ไขส่วนการแปลงข้อมูลสำหรับใช้แสดงบน Dashboard components
const wardCensusData = useMemo(() => {
  // แสดงเฉพาะ ward ที่มีสิทธิ์เข้าถึง ไม่สนใจว่าเป็น Admin หรือไม่
  const filteredData = summaryDataList.filter(ward => 
    wards.some(userWard => userWard.id?.toUpperCase() === ward.id.toUpperCase())
  );
  
  // ...และโค้ดส่วนที่เหลือ
}, [summaryDataList, summary, wards]);
```

## สิ่งที่ยังต้องทำต่อไป

1. **ทดสอบในสภาพแวดล้อมจริง**
   - ทดสอบกับผู้ใช้งานจริงเพื่อตรวจสอบการทำงานหลังแก้ไข
   - ตรวจสอบความถูกต้องของข้อมูลที่แสดงในกราฟแท่งและกราฟวงกลม
   - ตรวจสอบว่าการเปรียบเทียบเวรเช้า-ดึกแสดงข้อมูลถูกต้อง

2. **การเข้าถึงข้อมูล**
   - ยืนยันว่าผู้ใช้ทุกคนสามารถเข้าถึงข้อมูลตามสิทธิ์ได้อย่างถูกต้อง
   - ตรวจสอบว่าการลบการตรวจสอบสิทธิ์ Admin ไม่ส่งผลกระทบต่อการเข้าถึงข้อมูล

3. **ประสิทธิภาพการแสดงผล**
   - ติดตามการทำงานของกราฟที่มีความสูงยืดหยุ่น
   - ตรวจสอบประสิทธิภาพของการโหลดข้อมูลใน Dashboard

4. **ปรับปรุงเพิ่มเติมหากพบปัญหา**
   - เก็บรวบรวมฟีดแบ็คจากผู้ใช้งานเพื่อการปรับปรุงในรอบถัดไป
   - แก้ไขปัญหาอื่นๆ ที่อาจพบในการใช้งานจริง

## สรุปประโยชน์ที่ได้รับจากการปรับปรุง

1. **ประสบการณ์ผู้ใช้ที่ดีขึ้น**
   - ผู้ใช้มีอิสระในการเลือกโหมดสีธีมที่ต้องการโดยไม่ถูกเปลี่ยนอัตโนมัติ
   - กราฟและการแสดงข้อมูลมีความชัดเจนและเข้าใจง่ายขึ้น

2. **ความสวยงามและความเป็นมืออาชีพ**
   - กราฟวงกลมแบบ 2D มีความสวยงามและเข้าใจง่าย
   - ความสูงกราฟแท่งที่ปรับตามจำนวนข้อมูลทำให้มองเห็นข้อมูลได้ครบถ้วน

3. **ความเรียบง่ายและตรงไปตรงมา**
   - หน้า Dashboard เรียบง่ายและมุ่งเน้นเฉพาะข้อมูลที่ผู้ใช้ควรเห็น
   - ลดความสับสนในการแสดงข้อมูล

4. **ข้อมูลที่สมบูรณ์ขึ้น**
   - ผู้ใช้สามารถดูรายละเอียดพยาบาลแต่ละประเภทในการเปรียบเทียบเวรเช้า-ดึก
   - การแสดงชื่อ Ward ในกราฟแนวโน้มผู้ป่วยช่วยให้ทราบว่ากำลังดูข้อมูลของแผนกใด

## ผู้รับผิดชอบการแก้ไข

- ทีมพัฒนาฝ่ายดูแลระบบ Dashboard
- วันที่ดำเนินการแก้ไข: 29 มิถุนายน 2567 

## การปรับปรุง Dashboard สำหรับการแสดงผลข้อมูลสถานะเตียง เดือนมิถุนายน 2567

## รายการแก้ไข

### ปรับปรุงการดึงข้อมูลสถานะเตียง
- แก้ไขไฟล์ `BedSummaryPieChart.tsx` ให้รองรับการรับข้อมูลจากทั้ง dailySummaries และ wardForm
  - ปรับปรุง interface `BedSummaryData` ให้รองรับทั้งฟิลด์ `availableBeds`, `unavailableBeds` (จาก dailySummaries) และ `available`, `unavailable` (จาก wardForm)
  - แก้ไขการคำนวณสรุปข้อมูลเตียงให้ใช้ข้อมูลจากทั้งสองแหล่งได้
  - เพิ่มการแสดง tooltip ที่มีรายละเอียดของแต่ละแผนกมากขึ้น

### สาเหตุของปัญหา
- ข้อมูลจาก `dailySummaries` มีฟิลด์ `availableBeds`, `unavailableBeds`, `plannedDischarge` เป็น 0
- ข้อมูลจาก `wardForm` มีฟิลด์ `available`, `unavailable`, `plannedDischarge` ที่มีค่าถูกต้อง
- การดึงข้อมูลเดิมไม่ได้พิจารณาความแตกต่างของชื่อฟิลด์ระหว่าง Collection ทำให้แสดงค่าเป็น 0

### แนวทางการแก้ไข
1. ปรับปรุง interface `BedSummaryData` ให้รองรับทั้งสองรูปแบบ:
```typescript
export interface BedSummaryData {
  availableBeds?: number; // จาก dailySummaries
  unavailableBeds?: number; // จาก dailySummaries
  plannedDischarge?: number;
  available?: number; // จาก wardForm
  unavailable?: number; // จาก wardForm
  wardName?: string; // เพิ่มชื่อ Ward
}
```

2. ปรับปรุงการคำนวณใน BedSummaryPieChart:
```typescript
// รองรับทั้ง availableBeds (จาก dailySummaries) และ available (จาก wardForm)
totalAvailable = singleData.available || singleData.availableBeds || 0;
totalUnavailable = singleData.unavailable || singleData.unavailableBeds || 0;
```

### ผลลัพธ์
- กราฟวงกลมสถานะเตียงสามารถแสดงข้อมูลที่ถูกต้องจากทั้ง dailySummaries และ wardForm
- เมื่อเอาเมาส์ไปชี้ที่กราฟ จะแสดงรายละเอียดเตียงว่าง เตียงไม่ว่าง และแผนจำหน่าย ของแต่ละแผนก
- รองรับการแสดงผลในทั้งโหมดสว่างและโหมดมืด

## วันที่ดำเนินการ
วันที่ 10 มิถุนายน 2567

# การแก้ไขเพิ่มเติม - ปรับปรุงลอจิกการดึงข้อมูลจาก wardForm

## รายการแก้ไข

### แก้ไขเออร์เรอร์โครงสร้างเงื่อนไข if-else ในไฟล์ DashboardPage.tsx
- แก้ไขปัญหาลินเตอร์เออร์เรอร์ "Declaration or statement expected" ในฟังก์ชัน `fetchAllWardSummaryData`
- ปรับปรุงโครงสร้างเงื่อนไขให้ถูกต้องตามหลักไวยากรณ์ JavaScript/TypeScript
- ปรับปรุงลอจิกการตรวจสอบและการดึงข้อมูลเตียงจากแหล่งข้อมูลที่หลากหลาย

### รายละเอียดการแก้ไข
1. ปรับปรุงโครงสร้างเงื่อนไขให้ถูกต้อง:
```typescript
if (summary.availableBeds !== undefined && summary.availableBeds !== null) {
  // กรณีมีข้อมูล availableBeds จาก dailySummaries
  // ...
} else {
  // กรณีไม่มีข้อมูลใน availableBeds
  if (summary.unavailableBeds !== undefined && summary.unavailableBeds !== null) {
    // มีเฉพาะข้อมูล unavailableBeds แต่ไม่มี availableBeds
    // ...
  } else {
    // ไม่มีข้อมูลใน dailySummaries เลย ดึงข้อมูลจาก wardForms ทั้งหมด
    // ...
  }
}
```

2. ปรับปรุงข้อความบันทึกให้ชัดเจนขึ้น:
```typescript
console.log(`[fetchAllWardSummaryData] Got bed data from wardForm: ${wardId}, available=${summaryData.available}`);
console.log(`[fetchAllWardSummaryData] No bed data found for ${wardId}, using dummy values`);
```

3. เพิ่มคอมเมนต์อธิบายลอจิกให้ชัดเจนยิ่งขึ้น:
```typescript
// เนื่องจาก dailySummaries เก็บด้วยชื่อฟิลด์ availableBeds ส่วน wardForms เก็บด้วยชื่อฟิลด์ available
```

### ประโยชน์ที่ได้รับ
- แก้ไขปัญหาลินเตอร์เออร์เรอร์ ทำให้โค้ดสามารถทำงานได้ถูกต้อง
- ปรับปรุงความเข้าใจในโค้ดด้วยการเพิ่มคอมเมนต์ที่ชัดเจนยิ่งขึ้น
- ไม่กระทบกับฟังก์ชันการทำงานเดิม ยังคงสามารถดึงข้อมูลจากทั้ง dailySummaries และ wardForm ได้

## วันที่ดำเนินการแก้ไขเพิ่มเติม
วันที่ 11 มิถุนายน 2567

# การปรับปรุงการแสดงผลกราฟวงกลมจำนวนเตียงว่าง

## รายการแก้ไข

### ออกแบบหน้าตาใหม่สำหรับกราฟวงกลมเตียงว่าง
- ปรับปรุงคอมโพเนนต์ `BedSummaryPieChart.tsx` ให้แสดงเฉพาะข้อมูลเตียงว่างแยกตามแผนก
- เปลี่ยนชุดสีให้สดใสมากขึ้นตามรูปแบบในตัวอย่าง
- ปรับปรุงการแสดง tooltip และคำอธิบายกราฟให้มีความชัดเจนมากขึ้น

### สาเหตุของปัญหา
- กราฟวงกลมเดิมแสดงข้อมูลทั้งเตียงว่าง เตียงไม่ว่าง และแผนจำหน่าย ทำให้ไม่เน้นข้อมูลเตียงว่างโดยเฉพาะ
- สีที่ใช้ในกราฟวงกลมเดิมไม่สอดคล้องกับต้นแบบที่ต้องการ
- โค้ดไม่ได้กรองเฉพาะแผนกที่มีเตียงว่าง ทำให้กราฟอาจมีส่วนที่ไม่มีข้อมูลหรือมีค่าเป็น 0

### รายละเอียดการแก้ไข

1. ปรับปรุงกราฟวงกลมเตียงว่างใน `BedSummaryPieChart.tsx`:
```typescript
// กำหนดสีให้สดใสสำหรับแต่ละ ward
const COLORS = [
  '#FFD700', // สีเหลืองทอง (4A)
  '#87CEEB', // สีฟ้าอ่อน (9B)
  '#FFA07A', // สีส้มอ่อน (7B)
  '#FFB6C1', // สีชมพูอ่อน (10B)
  '#DDA0DD', // สีม่วงอ่อน (11B)
  '#98FB98', // สีเขียวอ่อน (SEMI-ICU 10B)
  '#FF7F50', // สีส้มแดง (SEMI-ICU 8B)
  '#00BFFF', // สีฟ้าสด (8B)
  // สีอื่นๆ...
];
```

2. กรองข้อมูลให้แสดงเฉพาะแผนกที่มีเตียงว่างใน `DashboardPage.tsx`:
```typescript
<BedSummaryPieChart 
  data={summaryDataList
    .filter(ward => (ward.available > 0) && ward.wardName) // กรองเฉพาะแผนกที่มีเตียงว่าง
    .map(ward => ({
      id: ward.id,
      wardName: ward.wardName || ward.id,
      available: ward.available || 0,
      unavailable: ward.unavailable || 0,
      plannedDischarge: ward.plannedDischarge || 0
    }))}
/>
```

3. เพิ่มการแสดงกรณีไม่มีข้อมูลเตียงว่าง:
```typescript
// ถ้าไม่มีข้อมูลเตียงว่าง แสดงข้อความแจ้งเตือน
if (chartData.length === 0) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูลเตียงว่าง</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
        ขณะนี้ไม่มีข้อมูลเตียงว่างในระบบหรือทุกเตียงถูกใช้งานแล้ว
      </p>
    </div>
  );
}
```

### ประโยชน์ที่ได้รับ
- กราฟวงกลมแสดงเฉพาะข้อมูลเตียงว่างแยกตามแผนก ทำให้เห็นสัดส่วนเตียงว่างได้ชัดเจน
- สีสันสดใสและการแสดงข้อมูลที่เรียบง่าย ช่วยให้ผู้ใช้งานเข้าใจข้อมูลได้ง่ายขึ้น
- มีการแสดงข้อความที่เหมาะสมเมื่อไม่มีข้อมูลเตียงว่าง ทำให้ผู้ใช้ไม่สับสน
- รองรับการแสดงผลในทั้งโหมดสว่างและโหมดมืด

## วันที่ดำเนินการ
วันที่ 12 มิถุนายน 2567

# การแก้ไขเพิ่มเติม - แก้ไขปัญหากราฟวงกลมไม่แสดงผล

## รายการแก้ไข

### ปรับปรุงการส่งข้อมูลและการแสดงผลกราฟวงกลม
- แก้ไขปัญหากราฟวงกลมไม่แสดงข้อมูลหรือแสดงข้อความ "ไม่พบข้อมูลเตียงว่าง"
- เพิ่มการบันทึกข้อมูล (logging) เพื่อตรวจสอบข้อมูลที่รับมาและส่งต่อไปยังคอมโพเนนต์
- ปรับเปลี่ยนการกรองข้อมูลให้แสดงข้อมูลทั้งหมดแม้ไม่มีเตียงว่าง

### สาเหตุของปัญหา
- การกรอง `ward.available > 0` ที่เข้มงวดเกินไป ทำให้ไม่แสดงข้อมูลใดๆ ในกรณีที่ทุกแผนกไม่มีเตียงว่าง
- ข้อมูลในฐานข้อมูลอาจมี available = 0 ทั้งหมด หรือไม่มีค่าที่ถูกต้อง
- การตรวจสอบที่ไม่ครอบคลุมเพียงพอทำให้แสดงข้อความแจ้งเตือน "ไม่พบข้อมูลเตียงว่าง" แทนที่จะแสดงเป็นกราฟวงกลม

### รายละเอียดการแก้ไข

1. ปรับปรุง `BedSummaryPieChart.tsx` เพื่อแสดงข้อมูลทั้งหมดโดยไม่กรองเฉพาะเตียงว่าง:
```typescript
// แสดงข้อมูลทุกแผนก ไม่ว่าจะมีเตียงว่างหรือไม่
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

2. เพิ่มการตรวจสอบกรณีไม่มีเตียงว่างเลย:
```typescript
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

3. เพิ่มข้อมูลในส่วน tooltip เพื่อแสดงเตียงไม่ว่างด้วย:
```typescript
<Tooltip content={({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, unavailable } = payload[0].payload;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {name}
        </p>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          จำนวนเตียงว่าง: <span className="font-medium">{value}</span> เตียง
        </p>
        {unavailable !== undefined && (
          <p className="text-xs text-gray-700 dark:text-gray-300">
            จำนวนเตียงไม่ว่าง: <span className="font-medium">{unavailable}</span> เตียง
          </p>
        )}
      </div>
    );
  }
  return null;
}} />
```

4. ปรับปรุงการส่งข้อมูลใน `DashboardPage.tsx`:
```typescript
<BedSummaryPieChart 
  data={summaryDataList
    // ส่งข้อมูลทั้งหมดโดยไม่มีการกรอง
    .map(ward => ({
      id: ward.id,
      wardName: ward.wardName || ward.id,
      available: ward.available || 0,
      unavailable: ward.unavailable || 0,
      plannedDischarge: ward.plannedDischarge || 0
    }))}
/>
```

### ประโยชน์ที่ได้รับ
- แก้ไขปัญหากราฟวงกลมไม่แสดงผล ทำให้สามารถแสดงข้อมูลเตียงว่างได้อย่างถูกต้อง
- รองรับกรณีที่ไม่มีเตียงว่างเลย โดยแสดงข้อความแจ้งเตือนที่เหมาะสมและข้อมูลเตียงไม่ว่าง
- เพิ่มข้อมูลใน tooltip ให้ครบถ้วนมากขึ้น ทำให้ผู้ใช้สามารถเห็นทั้งจำนวนเตียงว่างและเตียงไม่ว่างในแต่ละแผนก
- รองรับการแสดงผลทั้งในโหมดสว่างและโหมดมืด

## วันที่ดำเนินการ
วันที่ 12 มิถุนายน 2567

# การเปลี่ยนแปลง Dashboard เดือนมิถุนายน 2567

## ปรับปรุงการแสดงผลกราฟวงกลมแสดงสถานะเตียง

### วันที่ปรับปรุง: 23 มิถุนายน 2567

### ไฟล์ที่เกี่ยวข้อง:
1. `app/features/dashboard/components/BedSummaryPieChart.tsx`
2. `app/features/dashboard/components/DashboardPage.tsx`

### รายละเอียดการเปลี่ยนแปลง

#### 1. แก้ไขปัญหากราฟวงกลมไม่แสดงผล
- แก้ไขปัญหากรณีไม่มีเตียงว่าง (available beds = 0) กราฟไม่แสดงผล
- ปรับเปลี่ยนให้แสดงเป็นกราฟวงกลมเสมอ โดยแสดงข้อมูลเตียงไม่ว่างแทนในกรณีที่ไม่มีเตียงว่าง

#### 2. ปรับปรุงการตั้งค่าดีฟอลต์สำหรับข้อมูลเตียง
- เพิ่มการตั้งค่าดีฟอลต์ที่เหมาะสมสำหรับแต่ละแผนก (ICU/CCU: 10 เตียง, LR/NSY: 15 เตียง, ตึกใหญ่: 30 เตียง)
- ในกรณีที่ไม่มีข้อมูลทั้งเตียงว่างและเตียงไม่ว่าง จะตั้งค่าเริ่มต้นให้เตียงทั้งหมดเป็นเตียงไม่ว่าง
- เพิ่มการตรวจสอบข้อมูลก่อนส่งออกจากฟังก์ชัน fetchAllWardSummaryData

#### 3. ปรับปรุงการแสดงข้อมูลในกราฟ
- ปรับปรุง tooltip ให้แสดงข้อมูลที่เหมาะสมตามบริบท (ไม่ว่าจะเป็นเตียงว่างหรือเตียงไม่ว่าง)
- ปรับปรุง legend ให้แสดงสถานะที่ชัดเจน
- เพิ่มการแสดงข้อมูลเตียงทั้งหมดใน tooltip

### ประโยชน์ที่ได้รับ
1. กราฟวงกลมแสดงผลได้เสมอ แม้ในสถานการณ์ที่ไม่มีเตียงว่าง
2. ผู้ใช้สามารถเห็นข้อมูลเตียงไม่ว่างได้อย่างชัดเจน
3. แก้ไขปัญหาข้อความแจ้งเตือน "ไม่พบข้อมูลเตียงว่าง" ที่ทำให้สับสน
4. ระบบมีความเสถียรมากขึ้น แม้มีข้อมูลไม่สมบูรณ์
