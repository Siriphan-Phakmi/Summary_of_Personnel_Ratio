# แก้ไขปัญหาการแสดงพื้นหลังสีเหลืองสำหรับ Draft Data

## ปัญหาที่พบ
เมื่อผู้ใช้:
1. บันทึกข้อมูลเป็น Draft บนหน้าแบบฟอร์ม
2. ไปหน้าอื่น (Navigation ออกจากหน้า)
3. กลับมาเลือกวันที่ที่มีข้อมูล Draft

**ผลลัพธ์**: Input fields ไม่แสดงพื้นหลังสีเหลือง (bg-yellow-100) ที่ควรจะปรากฏ

## สาเหตุของปัญหา

### 1. In-Memory Cache Missing isDraft Information
- `formDataCache` (Map) เก็บเฉพาะ `data` และ `timestamp`
- ไม่มีการเก็บข้อมูล `isDraft` status ใน in-memory cache
- เมื่อผู้ใช้กลับมา cache จะ return `isDraft: false` เสมอ

### 2. localStorage Data Loading Logic
- เมื่อ in-memory cache expire หรือไม่มี
- ระบบจะโหลดจาก localStorage ที่มี `isDraft` ถูกต้อง
- แต่เมื่อ in-memory cache ยังไม่ expire จะใช้ cache ที่ไม่มี isDraft info

### 3. State Management Issues
- `setIsDraftLoaded()` ไม่ถูกตั้งค่าอย่างถูกต้องจาก cached data
- `isFinalDataFound` และ `isFormReadOnly` states ไม่สอดคล้องกับ draft status

## การแก้ไข

### 1. ปรับปรุง getCachedData() Function
```typescript
// ✅ **FIX: เช็ค localStorage เพื่อหา isDraft status ที่ถูกต้อง**
if (selectedBusinessWardId && selectedDate) {
  const localData = loadFromLocalStorage(selectedBusinessWardId, selectedShift, selectedDate);
  if (localData?.data) {
    return { data: cached.data, isDraft: localData.isDraft || false };
  }
}
```

### 2. แก้ไข Cache Loading Logic
```typescript
// ✅ **FIX: ตั้งค่า isFinalDataFound ให้ถูกต้อง**
setIsFinalDataFound(!cachedResult.isDraft); // ถ้าไม่ใช่ draft แสดงว่าเป็น final data

// ✅ **FIX: ตั้งค่า isFormReadOnly ตาม draft status**  
const isAdminOrDeveloper = user?.role === UserRole.ADMIN || user?.role === UserRole.DEVELOPER;
setIsFormReadOnly(!cachedResult.isDraft ? !isAdminOrDeveloper : false);
```

### 3. เพิ่ม UserRole Import
```typescript
import { User, UserRole } from '@/app/features/auth/types/user';
```

## ไฟล์ที่แก้ไข

### `app/features/ward-form/hooks/helpers/useFormDataLoader.ts`
- แก้ไข `getCachedData()` เพื่อดึง isDraft จาก localStorage
- ปรับปรุง cache loading logic ในส่วน `loadData()`
- แก้ไข state management สำหรับ `isDraftLoaded`, `isFinalDataFound`, `isFormReadOnly`

## Flow การทำงานหลังแก้ไข

1. **First Load**: โหลดข้อมูลจาก Firebase → บันทึกลง localStorage (พร้อม isDraft status)
2. **Navigation Away**: in-memory cache ยังคงอยู่ชั่วคราว
3. **Return to Page**: 
   - ถ้า in-memory cache ยังใช้ได้ → เช็ค localStorage เพื่อหา isDraft status
   - ถ้า in-memory cache หมดอายุ → ใช้ localStorage โดยตรง (พร้อม isDraft)
4. **UI Rendering**: `isDraftLoaded=true` → CensusInputFields แสดงพื้นหลังสีเหลือง

## การทดสอบ

### Test Case 1: Draft Data Loading
1. บันทึกข้อมูลเป็น Draft
2. ไปหน้าอื่น (เช่น Dashboard)
3. กลับมาเลือกวันที่ที่มี Draft
4. **ผลลัพธ์ที่คาดหวัง**: Input fields แสดงพื้นหลังสีเหลือง

### Test Case 2: Final Data Loading  
1. บันทึกข้อมูลเป็น Final
2. ไปหน้าอื่น
3. กลับมาเลือกวันที่ที่มี Final data
4. **ผลลัพธ์ที่คาดหวัง**: Input fields ไม่แสดงพื้นหลังสีเหลือง (สีปกติ)

### Test Case 3: New Data
1. เลือกวันที่ที่ไม่มีข้อมูล
2. **ผลลัพธ์ที่คาดหวัง**: Input fields ว่างเปล่า ไม่มีพื้นหลังสีเหลือง

## Performance Impact
- ✅ ไม่กระทบ performance เนื่องจากเป็นการเช็ค localStorage เพิ่มเติมเพียงเล็กน้อย
- ✅ ยังคงใช้ in-memory cache เป็นหลัก (30 วินาที)
- ✅ localStorage cache ยังคงมี expiration (60 นาที)

## Security & Compatibility
- ✅ ไม่มีการเปลี่ยนแปลง Firebase rules หรือ API endpoints
- ✅ ไม่กระทบการทำงานของระบบ authentication
- ✅ Backward compatible กับ code เดิม
- ✅ ไม่มี hardcoded API keys หรือ sensitive data

## บันทึกเพิ่มเติม
- การแก้ไขนี้เป็นส่วนหึ่งของหลักการ "Lean Code" ที่ใช้ code ที่มีอยู่ให้เกิดประสิทธิภาพสูงสุด
- ไม่มีการสร้างไฟล์ใหม่ เพราะ logic ทั้งหมดอยู่ในไฟล์เดิมแล้ว
- รักษา modular structure และ separation of concerns ไว้อย่างดี

---
**แก้ไขโดย**: Cascade AI Assistant  
**วันที่**: 2025-07-11  
**เวอร์ชัน**: 1.0  
