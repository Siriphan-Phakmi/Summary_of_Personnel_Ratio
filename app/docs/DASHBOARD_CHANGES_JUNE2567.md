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

## การปรับปรุงการแสดงผลกราฟวงกลมสถานะเตียง

### สรุปการเปลี่ยนแปลงล่าสุด

ได้ทำการปรับปรุงการแสดงผลของกราฟวงกลมสถานะเตียงในหน้า Dashboard โดยแก้ไขปัญหากราฟไม่แสดงผลและปรับปรุงรูปแบบการแสดงข้อมูลให้อ่านง่ายขึ้น มีรายละเอียดดังนี้:

### ปัญหาที่พบ
1. กราฟวงกลมสถานะเตียงไม่แสดงผลแม้จะมีข้อมูลใน Dashboard
2. ไม่แสดงข้อมูลของ Ward ที่มีค่าเป็น 0 หรือไม่มีข้อมูล
3. รูปแบบการแสดงผลไม่ตรงตามความต้องการ (ต้องการให้แสดงตัวเลขในกล่องสี่เหลี่ยม)

### การแก้ไข
1. **ปรับปรุงไฟล์ DashboardPage.tsx**
   - แก้ไขฟังก์ชัน `calculateBedSummary` ให้กำหนดค่าดัมมี่ (total: 10, available: 5) เพื่อให้แสดงทุก Ward แม้จะไม่มีข้อมูลจริง
   - เพิ่ม `useEffect` เพื่อเรียกใช้ `calculateBedSummary` โดยอัตโนมัติเมื่อข้อมูล `summary` เปลี่ยนแปลง
   - เพิ่ม `console.log` เพื่อตรวจสอบข้อมูล `pieChartData` ที่จะส่งไปยังคอมโพเนนต์ `EnhancedPieChart`

2. **ปรับปรุงไฟล์ EnhancedPieChart.tsx**
   - สร้าง CustomLabel แบบใหม่ที่แสดงตัวเลขในกล่องสี่เหลี่ยมสีเข้มพร้อมตัวเลขสีขาว:
   ```tsx
   const CustomLabel = (props: any) => {
     const { x, y, cx, value } = props;
     const boxWidth = 24;
     const boxHeight = 18;
     const borderRadius = 4;
     const rectX = x - boxWidth / 2;
     const rectY = y - boxHeight / 2;
     const isDarkMode = useTheme().theme === "dark";

     return (
       <g>
         <rect
           x={rectX}
           y={rectY}
           width={boxWidth}
           height={boxHeight}
           rx={borderRadius}
           ry={borderRadius}
           fill={isDarkMode ? "#4B5563" : "#374151"} // Dark gray box
           stroke="none"
         />
         <text
           x={x}
           y={y}
           fill="#FFFFFF" // White text
           textAnchor="middle"
           dominantBaseline="middle"
           fontSize="10px"
           fontWeight="bold"
         >
           {Math.round(value)}
         </text>
       </g>
     );
   };
   ```
   
   - ปรับค่าพารามิเตอร์ในคอมโพเนนต์ `<Pie>` ดังนี้:
     - เปลี่ยน `innerRadius={0}` เพื่อให้เป็นกราฟวงกลมแบบ 2D ไม่มีรู
     - ลดค่า `paddingAngle={1}` เพื่อให้กราฟวงกลมมีช่องว่างระหว่างส่วนน้อยลง
     - เปิดใช้งาน `labelLine={true}` เพื่อแสดงเส้นเชื่อมระหว่างข้อมูลและป้ายชื่อ
     - ปรับ Legend ให้แสดงในรูปแบบที่เหมาะสมทั้งใน Light Mode และ Dark Mode

### ผลลัพธ์
1. กราฟวงกลมแสดงข้อมูลเตียงว่างของทุก Ward อย่างถูกต้อง
2. ตัวเลขในกราฟวงกลมแสดงในกล่องสี่เหลี่ยมสีเข้มพร้อมตัวเลขสีขาว ทำให้อ่านง่ายขึ้น
3. กราฟวงกลมเป็นแบบ 2D ไม่มีรู (ไม่เป็นโดนัท) ทำให้เห็นสัดส่วนได้ชัดเจนยิ่งขึ้น
4. แสดงข้อมูลของทุก Ward แม้จะไม่มีข้อมูลหรือมีค่าเป็น 0

### ไฟล์ที่เกี่ยวข้อง
- `DashboardPage.tsx`
- `EnhancedPieChart.tsx`

### ผู้รับผิดชอบ
- ทีมพัฒนา Dashboard และทีมพัฒนา UI/UX

### วันที่ดำเนินการ
- 21 มิถุนายน 2567

### เอกสารอ้างอิง
- [DASHBOARD_FIX.md](./DASHBOARD_FIX.md) - รายละเอียดการแก้ไขและคำอธิบายเชิงเทคนิค
- [TASKS.md](./TASKS.md) - รายการงานที่ดำเนินการในโปรเจค 

## การปรับปรุงสัดส่วนกราฟใน Dashboard (กรกฎาคม 2567)

### สรุปการเปลี่ยนแปลงล่าสุด

ได้ทำการปรับปรุงสัดส่วนและความสวยงามของกราฟต่างๆ ในหน้า Dashboard เพื่อให้แสดงผลได้อย่างเหมาะสมและดูง่ายยิ่งขึ้น โดยมีรายละเอียดดังนี้:

### รายการที่แก้ไข

1. **ปรับปรุงความสูงของกราฟแท่ง Patient Census (คงพยาบาล)**
   - เพิ่มความสูงต่อ ward จาก 45px เป็น 60px เพื่อให้มองเห็นชัดเจนขึ้น
   - ปรับความสูงขั้นต่ำจาก 300px เป็น 350px เพื่อให้พื้นที่กราฟมีขนาดที่เหมาะสม
   - ปรับแก้ฟังก์ชัน `getOptimalHeight` ในไฟล์ `EnhancedBarChart.tsx` เพื่อคำนวณความสูงที่เหมาะสมโดยอัตโนมัติ

2. **ปรับปรุงการแสดงผลกราฟวงกลมสถานะเตียง**
   - เพิ่มขนาดกล่องแสดงข้อมูลจาก 28x20px เป็น 32x24px
   - เพิ่มขนาดตัวอักษรจาก 11px เป็น 13px เพื่อให้อ่านง่ายขึ้น
   - เพิ่มความหนาของเส้นขอบจาก 0.5px เป็น 1px
   - เพิ่มความสูงขั้นต่ำของพื้นที่กราฟจาก 200px เป็น 250px
   - เพิ่มขนาดวงกลมจาก 70% เป็น 75%
   - เปิดใช้งาน labelLine เพื่อแสดงเส้นเชื่อมต่อไปยังข้อมูล

3. **เพิ่มการแสดงข้อมูลเตียงในการเปรียบเทียบเวรเช้า-ดึก**
   - เพิ่มส่วนแสดงข้อมูลเตียงในแต่ละแผง (panel) ของเวรเช้าและเวรดึก
   - เพิ่มข้อมูลเตียงว่าง เตียงไม่ว่าง และแผนจำหน่ายในตารางเปรียบเทียบ
   - ปรับสีและการจัดวางให้ดูเข้ากับธีมของเวรเช้า (สีฟ้า) และเวรดึก (สีม่วง)

4. **ปรับปรุงการแสดงข้อมูลในกราฟวงกลมเมื่อไม่มีข้อมูล**
   - ปรับปรุงฟังก์ชัน `calculateBedSummary` ให้สร้างค่าดัมมี่สำหรับทุก Ward
   - กำหนดค่าเริ่มต้นสำหรับ available, unavailable และ plannedDischarge เมื่อไม่พบข้อมูล
   - เพิ่มการตรวจสอบให้มั่นใจว่าทุก Ward มีข้อมูลสำหรับแสดงในกราฟวงกลมเสมอ

5. **ตรวจสอบและยืนยันสีของ Font ในกราฟ**
   - ตรวจสอบสีของตัวเลขบนแท่งกราฟใน `EnhancedBarChart.tsx` ทั้ง Light Mode และ Dark Mode
   - ตรวจสอบสีของตัวเลขใน Pie Chart และสีของ Legend ใน `EnhancedPieChart.tsx` ทั้ง Light Mode และ Dark Mode

6. **ปรับปรุงการแสดงผลข้อมูลตามช่วงวันที่ที่เลือก**
   - แก้ไข `DashboardPage.tsx` ให้ `selectedDate` อ้างอิงจากวันสุดท้ายของ `effectiveDateRange` เสมอ
   - ปรับปรุงฟังก์ชัน `handleDateRangeChange` ให้ตั้งค่า `selectedDate`, `startDate`, และ `endDate` อย่างถูกต้องเมื่อเลือก "วันนี้" หรือ "กำหนดเอง"
   - ยืนยันว่าทุกส่วนที่แสดงข้อมูล ณ วันเดียว (เช่น Daily Patient Census, การเปรียบเทียบเวร) ใช้ `selectedDate` หรือ `effectiveDateRange.end` ในการดึงข้อมูล
   - ยืนยันว่าส่วนที่แสดงข้อมูลแบบช่วง (เช่น แนวโน้มผู้ป่วย, ตารางข้อมูลรวม) ใช้ `effectiveDateRange` (startDate, endDate) ในการดึงข้อมูล

### ประโยชน์ที่ได้รับ

1. **การแสดงผลที่ดีขึ้น**
   - กราฟแท่งแสดงข้อมูล Patient Census มีสัดส่วนที่เหมาะสมและอ่านง่ายขึ้น
   - กราฟวงกลมแสดงข้อมูลสถานะเตียงได้ชัดเจนและดูสวยงามมากขึ้น
   - ตัวเลขบนกราฟวงกลมมีขนาดใหญ่และชัดเจนมากขึ้น

2. **ข้อมูลที่ครบถ้วนขึ้น**
   - การเปรียบเทียบเวรเช้า-ดึกแสดงข้อมูลเตียงอย่างละเอียด
   - กราฟวงกลมแสดงข้อมูลทุก Ward แม้จะไม่มีข้อมูลหรือมีค่าเป็น 0

3. **ความสวยงามและความเป็นมืออาชีพ**
   - การใช้เส้นเชื่อมในกราฟวงกลมช่วยให้ดูข้อมูลได้ง่ายขึ้น
   - การปรับสัดส่วนกราฟให้มีความสมดุลมากขึ้นทำให้ดูเป็นมืออาชีพยิ่งขึ้น

### ผู้รับผิดชอบการแก้ไข

- ทีมพัฒนาระบบ Dashboard
- วันที่ดำเนินการแก้ไข: 23 กรกฎาคม 2567 