# คู่มือการใช้งาน Firebase Indexes

## ปัญหา Indexes หายไปหมด

หากพบว่า Indexes ใน Firebase Console หายไปหมด ให้ทำตามขั้นตอนต่อไปนี้เพื่อสร้าง Indexes ใหม่

## วิธีการสร้าง Indexes ใหม่

### 1. ใช้ Firebase CLI

Firebase CLI เป็นวิธีที่ดีที่สุดในการจัดการ Indexes เพราะคุณสามารถสร้าง Indexes ทั้งหมดพร้อมกันได้:

```bash
# ติดตั้ง Firebase CLI
npm install -g firebase-tools

# Login เข้า Firebase
firebase login

# เลือกโปรเจค
firebase use manpower-patient-summary

# Deploy Indexes จากไฟล์ firestore.indexes.json
firebase deploy --only firestore:indexes
```

### 2. สร้างผ่าน Firebase Console

คุณสามารถสร้าง Indexes ผ่าน Firebase Console ได้โดยตรง:

1. เปิด [Firebase Console](https://console.firebase.google.com)
2. เลือกโปรเจค **manpower-patient-summary**
3. ไปที่ **Firestore Database**
4. เลือกแท็บ **Indexes**
5. คลิก **Create Index**
6. ใส่ข้อมูลตามที่ต้องการ

### 3. สร้างจาก Error Message

เมื่อเกิด Error เกี่ยวกับ Index ขณะใช้งานแอป คุณจะเห็นลิงก์สำหรับสร้าง Index โดยตรงใน Console:

```
Error: 9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

คลิกที่ลิงก์เพื่อสร้าง Index ที่จำเป็นทันที

## Indexes ที่จำเป็นสำหรับแอปพลิเคชัน

รายการ Indexes ทั้งหมดที่จำเป็นสำหรับแอปพลิเคชันนี้:

### Collection: wardForms

1. **wardId (ASC), date (DESC)**  
   สำหรับดึงข้อมูลตาม ward และเรียงตามวันที่

2. **status (ASC), dateString (DESC)**  
   สำหรับดึงข้อมูลตามสถานะและเรียงตามวันที่

3. **wardId (ASC), status (ASC), dateString (DESC)**  
   สำหรับดึงข้อมูลตาม ward และสถานะ และเรียงตามวันที่

4. **wardId (ASC), shift (ASC), date (DESC)**  
   สำหรับดึงข้อมูลตาม ward และกะ และเรียงตามวันที่

5. **wardId (ASC), shift (ASC), status (ASC), date (DESC)**  
   สำหรับดึงข้อมูลตาม ward, กะ, และสถานะ และเรียงตามวันที่

6. **dateString (ASC), wardId (ASC), shift (ASC)**  
   สำหรับดึงข้อมูลตามวันที่, ward, และกะ

7. **dateString (ASC), status (ASC)**  
   สำหรับดึงข้อมูลตามวันที่และสถานะ

### Collection: users

1. **username (ASC)**  
   สำหรับค้นหาผู้ใช้ตาม username

2. **email (ASC)**  
   สำหรับค้นหาผู้ใช้ตาม email

3. **role (ASC)**  
   สำหรับค้นหาผู้ใช้ตาม role

### Collection: wards

1. **active (ASC), wardOrder (ASC)**  
   สำหรับดึงรายการ ward ที่มีสถานะ active และเรียงตามลำดับ

### Collection: userSessions

1. **userId (ASC), createdAt (DESC)**  
   สำหรับดึงข้อมูล session ของผู้ใช้และเรียงตามเวลาที่สร้าง

### Collection: approvalHistory

1. **formId (ASC), approvedAt (DESC)**  
   สำหรับดึงประวัติการอนุมัติแบบฟอร์มและเรียงตามเวลาที่อนุมัติ

### Collection: wardAccess

1. **userId (ASC), wardId (ASC)**  
   สำหรับตรวจสอบการเข้าถึง ward ของผู้ใช้ 