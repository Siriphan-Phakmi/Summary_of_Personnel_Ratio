# การใช้งานระบบ Alert ด้วย Tailwind CSS

## วิธีการใช้งาน AlertService

```javascript
import { AlertService } from '../../utils/alertService';

// ตัวอย่างการใช้งาน
const handleClick = () => {
  // แสดง confirm dialog
  AlertService.confirm(
    'คุณแน่ใจหรือไม่?', 
    'ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้', 
    {
      icon: 'warning',
      confirmText: 'ใช่, ลบเลย!',
      cancelText: 'ยกเลิก'
    }
  ).then(result => {
    if (result.isConfirmed) {
      // ผู้ใช้กดปุ่ม "ใช่, ลบเลย!"
      console.log('User confirmed deletion');
    }
  });
};

// แสดง loading
const handleLoadData = async () => {
  const loading = AlertService.loading('กำลังโหลดข้อมูล');
  try {
    await fetchData();
    AlertService.close(); // ปิด loading alert
    AlertService.success('สำเร็จ', 'โหลดข้อมูลเรียบร้อยแล้ว');
  } catch (error) {
    AlertService.close(); // ปิด loading alert
    AlertService.error('เกิดข้อผิดพลาด', error.message);
  }
};

return (
  <div>
    <button onClick={handleClick} className="bg-red-500 text-white px-4 py-2 rounded">ลบข้อมูล</button>
    <button onClick={handleLoadData} className="bg-blue-500 text-white px-4 py-2 rounded">โหลดข้อมูล</button>
  </div>
);
```

## วิธีการใช้งาน SwalAlert (SweetAlert2 Polyfill)

```javascript
import { SwalAlert } from '../../utils/alertService';
// หรือนำเข้าจาก sweetalert2-polyfill โดยตรง
// import SwalAlert from '../../utils/sweetalert2-polyfill';

const handleComplexAlert = () => {
  SwalAlert.fire({
    title: 'แจ้งเตือน',
    html: `
      <div class="text-left">
        <p>คุณกำลังจะดำเนินการที่สำคัญ</p>
        <ul class="mt-2">
          <li>การดำเนินการนี้ไม่สามารถย้อนกลับได้</li>
          <li>ข้อมูลทั้งหมดจะถูกลบออกจากระบบ</li>
        </ul>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ดำเนินการต่อ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0ab4ab',
    cancelButtonColor: '#d33',
    reverseButtons: true
  });
};
```

## ตัวอย่างการใช้งานฟังก์ชันต่างๆ

### 1. แสดง Success Alert

```javascript
SwalAlert.success('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
```

### 2. แสดง Error Alert

```javascript
SwalAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
```

### 3. แสดง Warning Alert พร้อมตัวเลือก

```javascript
SwalAlert.warning('คำเตือน', 'คุณต้องการลบข้อมูลนี้หรือไม่', true)
  .then(result => {
    if (result.isConfirmed) {
      // ผู้ใช้กดปุ่มยืนยัน
      deleteData();
    }
  });
```

### 4. แสดง Loading Alert

```javascript
const loading = SwalAlert.showLoading('กำลังประมวลผล...');
// ดำเนินการต่างๆ
// ปิด loading alert เมื่อเสร็จสิ้น
SwalAlert.close();
```