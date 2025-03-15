# Summary of Personnel Ratio

ระบบบันทึกและติดตามอัตราส่วนบุคลากรและจำนวนผู้ป่วยประจำวัน พัฒนาด้วย Next.js และ Firebase

## คุณสมบัติหลัก

- บันทึกข้อมูลบุคลากรและผู้ป่วยตามวอร์ด
- เลือกวันที่และกะการทำงาน (เช้า 07:00-19:00, ดึก)
- คำนวณ Patient Census และ Overall Data อัตโนมัติ
- บันทึกและโหลดข้อมูลฉบับร่าง
- ตรวจสอบการเปลี่ยนแปลงข้อมูลและแจ้งเตือน
- ระบบอนุมัติข้อมูลโดยผู้มีสิทธิ์
- แสดงสถานะการอนุมัติ (อนุมัติแล้ว, ฉบับร่าง, รอการอนุมัติ)

## การติดตั้ง

1. ติดตั้ง Node.js 18 ขึ้นไป และ npm 9 ขึ้นไป
2. Clone repository นี้
3. ติดตั้ง dependencies:
   ```bash
   npm install
   ```
4. สร้างไฟล์ `.env.local` โดยใช้ตัวอย่างจาก `.env.example`
5. เริ่มการพัฒนาโดยใช้คำสั่ง:
   ```bash
   npm run dev
   ```

## การ Build สำหรับ Production

```bash
npm run build
npm run start
```

## การ Deploy

โปรเจคนี้ใช้ Firebase Hosting สำหรับการ deploy:

```bash
npm run export
firebase deploy
```

## เทคโนโลยีที่ใช้

- Next.js - React Framework
- Firebase - Authentication, Firestore, Hosting
- Tailwind CSS - Utility-first CSS framework
- Chart.js - สำหรับการแสดงกราฟและสถิติ
- SweetAlert2 - สำหรับการแสดง dialog ที่สวยงาม

## โครงสร้างโปรเจค

- `/app` - หน้าและคอมโพเนนต์หลัก
- `/app/page` - หน้าต่างๆ ของแอปพลิเคชัน
- `/app/components` - React components
- `/app/contexts` - React contexts สำหรับการจัดการ state
- `/app/utils` - Utility functions
- `/app/styles` - CSS และ Tailwind utilities
- `/public` - Assets สาธารณะ

## การขอความช่วยเหลือ

หากพบปัญหาหรือต้องการความช่วยเหลือ โปรดติดต่อ [admin@example.com]
