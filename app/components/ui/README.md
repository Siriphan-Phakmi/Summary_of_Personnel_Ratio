# UI Components

## TailwindAlert

`TailwindAlert` เป็น component ที่ใช้ทดแทน SweetAlert2 โดยใช้ Tailwind CSS ในการจัดการรูปแบบ

### วิธีการใช้งาน

มี 2 วิธีในการใช้งาน TailwindAlert:

#### 1. ใช้ผ่าน useAlert Hook

```jsx
import { useAlert } from '@/app/utils/alertService';

function MyComponent() {
  const { addAlert } = useAlert();
  
  const handleShowAlert = () => {
    addAlert({
      title: 'สำเร็จ!',
      message: 'บันทึกข้อมูลเรียบร้อยแล้ว',
      type: 'success'
    });
  };
  
  return (
    <button onClick={handleShowAlert}>
      บันทึกข้อมูล
    </button>
  );
}
```

#### 2. ใช้ผ่าน Swal (เหมือน SweetAlert2)

```jsx
import { Swal } from '@/app/utils/alertService';

function MyComponent() {
  const handleSaveWithConfirm = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการบันทึก',
      text: 'คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึกเลย',
      cancelButtonText: 'ยกเลิก'
    });
    
    if (result.isConfirmed) {
      // ดำเนินการบันทึกข้อมูล
      await saveData();
      
      Swal.success('สำเร็จ!', 'บันทึกข้อมูลเรียบร้อยแล้ว');
    }
  };
  
  return (
    <button onClick={handleSaveWithConfirm}>
      บันทึกข้อมูล
    </button>
  );
}
```

### Methods ที่รองรับ (เหมือน SweetAlert2)

- `Swal.fire(options)` - แสดง alert พร้อมตัวเลือกหลายรูปแบบ
- `Swal.success(title, text)` - แสดง alert ประเภทสำเร็จ
- `Swal.error(title, text)` - แสดง alert ประเภทผิดพลาด
- `Swal.warning(title, text)` - แสดง alert ประเภทเตือน
- `Swal.info(title, text)` - แสดง alert ประเภทข้อมูล
- `Swal.question(title, text)` - แสดง alert ประเภทคำถาม
- `Swal.showLoading()` - แสดงหน้าต่าง loading
- `Swal.close()` - ปิดหน้าต่าง loading

### Props ของ TailwindAlert

| Prop | ประเภท | ค่าเริ่มต้น | คำอธิบาย |
|------|--------|------------|----------|
| isOpen | boolean | false | สถานะการแสดงผล Alert |
| onClose | function | - | ฟังก์ชันที่จะทำงานเมื่อ Alert ถูกปิด |
| title | string | - | หัวข้อของ Alert |
| message | string/node | - | ข้อความหรือ React Node ที่จะแสดงใน Alert |
| type | string | 'info' | ประเภทของ Alert ('success', 'error', 'warning', 'info', 'question') |
| confirmText | string | 'ตกลง' | ข้อความบนปุ่มยืนยัน |
| cancelText | string | 'ยกเลิก' | ข้อความบนปุ่มยกเลิก |
| onConfirm | function | - | ฟังก์ชันที่จะทำงานเมื่อกดปุ่มยืนยัน |
| onCancel | function | - | ฟังก์ชันที่จะทำงานเมื่อกดปุ่มยกเลิก |
| showCancel | boolean | false | แสดงปุ่มยกเลิกหรือไม่ |
| allowOutsideClick | boolean | true | อนุญาตให้คลิกภายนอกเพื่อปิด Alert หรือไม่ |
| timer | number | 0 | เวลา (ms) ก่อนที่ Alert จะปิดอัตโนมัติ (0 = ไม่ปิดอัตโนมัติ) |

### การติดตั้งใน Layout

ต้องครอบ Component ด้วย `AlertProvider` เพื่อให้สามารถใช้งาน `useAlert` ได้:

```jsx
// app/ClientLayout.js
import { AlertProvider } from './utils/alertService';

export default function ClientLayout({ children }) {
  return (
    <AlertProvider>
      <Navbar />
      {children}
    </AlertProvider>
  );
}
``` 