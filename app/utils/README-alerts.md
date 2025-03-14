# การใช้งานระบบ Alert ด้วย Tailwind CSS

ระบบ Alert นี้ถูกพัฒนาขึ้นเพื่อทดแทนการใช้งาน SweetAlert2 โดยใช้ Tailwind CSS ซึ่งช่วยให้:
1. ลดขนาดของแอพพลิเคชัน (ไม่ต้องโหลด library เพิ่ม)
2. สามารถปรับแต่ง UI ได้ตามต้องการ
3. สอดคล้องกับ design system ของแอพพลิเคชันที่ใช้ Tailwind CSS

## โครงสร้างระบบ Alert

ระบบ Alert ประกอบด้วย 3 ส่วนหลัก:
1. **Alert Component** - คอมโพเนนต์ UI ที่แสดงการแจ้งเตือน
2. **AlertProvider** - Context Provider ที่ใช้สำหรับจัดการระบบ Alert ทั้งหมด
3. **alertAPI** - API สำหรับเรียกใช้ Alert จากทุกส่วนของแอพพลิเคชัน

## การเรียกใช้งาน Alert

### 1. การใช้งานผ่าน alertAPI (แนะนำ)

```javascript
import { alertAPI } from '../../utils/alertService';

// แสดง Alert แบบ Success
alertAPI.success('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');

// แสดง Alert แบบ Error
alertAPI.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');

// แสดง Alert แบบ Warning พร้อมปุ่มยกเลิก
alertAPI.warning('คำเตือน', 'ต้องการลบข้อมูลนี้หรือไม่?')
  .then(result => {
    if (result.isConfirmed) {
      // ผู้ใช้กดปุ่ม "ตกลง"
      console.log('User confirmed');
    } else {
      // ผู้ใช้กดปุ่ม "ยกเลิก"
      console.log('User canceled');
    }
  });

// แสดง Alert แบบ Confirm
alertAPI.confirm('ยืนยัน', 'ต้องการยืนยันการส่งข้อมูลหรือไม่?', 'ยืนยัน', 'ยกเลิก')
  .then(result => {
    if (result.isConfirmed) {
      // ผู้ใช้กดปุ่ม "ยืนยัน"
      console.log('User confirmed');
    }
  });

// แสดงหน้าต่าง Loading
alertAPI.showLoading('กำลังโหลดข้อมูล...');

// ปิดหน้าต่าง Alert ทั้งหมด
alertAPI.close();
```

### 2. การใช้งานผ่าน Swal (สำหรับโค้ดเดิมที่ใช้ SweetAlert2)

```javascript
import { Swal } from '../../utils/alertService';

// ใช้งานเหมือน SweetAlert2
Swal.fire({
  title: 'สำเร็จ',
  text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
  icon: 'success'
}).then(result => {
  if (result.isConfirmed) {
    console.log('Alert closed');
  }
});

// แสดงหน้าต่าง Loading
Swal.showLoading();

// ปิดหน้าต่าง Alert ทั้งหมด
Swal.close();
```

### 3. การใช้งานผ่าน useAlert hook (สำหรับคอมโพเนนต์ที่ต้องการจัดการ Alert เอง)

```javascript
import { useAlert } from '../../utils/alertService';

function MyComponent() {
  const { showAlert, showLoading, closeAll } = useAlert();
  
  const handleClick = () => {
    showAlert({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'การกระทำนี้ไม่สามารถเปลี่ยนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then(result => {
      if (result.isConfirmed) {
        // ผู้ใช้กดปุ่ม "ใช่, ลบเลย!"
        console.log('User confirmed deletion');
      }
    });
  };
  
  return (
    <button onClick={handleClick}>ลบข้อมูล</button>
  );
}
```

## การแสดง Alert ด้วยอนิเมชัน

Alert Component มีการใช้ CSS transitions ให้เกิดอนิเมชันการแสดงและซ่อน ช่วยให้ UI มีความสวยงามและน่าใช้งานมากขึ้น

## การปรับแต่ง UI

สามารถปรับแต่ง UI ของ Alert ได้โดยการส่ง options `customClass`:

```javascript
alertAPI.fire({
  title: 'แจ้งเตือน',
  text: 'ข้อความแจ้งเตือน',
  icon: 'info',
  customClass: {
    container: 'my-custom-container-class',
    title: 'text-red-500 font-bold',
    text: 'text-sm',
    confirmButton: 'bg-blue-500 hover:bg-blue-600',
    cancelButton: 'bg-gray-300 hover:bg-gray-400'
  }
});
```

## การแปลงจาก SweetAlert2 เป็น alertAPI

หากคุณมีโค้ดเดิมที่ใช้ SweetAlert2 คุณสามารถแปลงมาใช้ alertAPI ได้ โดยเปลี่ยนจาก:

```javascript
import Swal from 'sweetalert2';

Swal.fire({
  title: 'คุณแน่ใจหรือไม่?',
  text: 'การกระทำนี้ไม่สามารถเปลี่ยนกลับได้',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonText: 'ใช่, ลบเลย!',
  cancelButtonText: 'ยกเลิก'
}).then((result) => {
  if (result.isConfirmed) {
    Swal.fire('ลบแล้ว!', 'ข้อมูลถูกลบเรียบร้อยแล้ว', 'success');
  }
});
```

เป็น:

```javascript
import { alertAPI } from '../../utils/alertService';

alertAPI.fire({
  title: 'คุณแน่ใจหรือไม่?',
  text: 'การกระทำนี้ไม่สามารถเปลี่ยนกลับได้',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonText: 'ใช่, ลบเลย!',
  cancelButtonText: 'ยกเลิก'
}).then((result) => {
  if (result.isConfirmed) {
    alertAPI.success('ลบแล้ว!', 'ข้อมูลถูกลบเรียบร้อยแล้ว');
  }
});
```

หรือง่ายกว่านั้น:

```javascript
import { alertAPI } from '../../utils/alertService';

alertAPI.warning('คุณแน่ใจหรือไม่?', 'การกระทำนี้ไม่สามารถเปลี่ยนกลับได้')
  .then((result) => {
    if (result.isConfirmed) {
      alertAPI.success('ลบแล้ว!', 'ข้อมูลถูกลบเรียบร้อยแล้ว');
    }
  });
``` 