# 🏥 Hospital Workflow Guide

**คู่มือการทำงานสำหรับระบบบันทึกข้อมูลผู้ป่วยประจำวันโรงพยาบาลบีพีเค**

---

## 🎯 ภาพรวมระบบ

### 📊 เป้าหมายหลัก
ระบบบันทึกข้อมูลผู้ป่วยประจำวันสำหรับโรงพยาบาลขนาดกลางถึงใหญ่ เน้นความปลอดภัยสูงสุดและใช้เฉพาะในองค์กร

### 🔧 เทคโนโลยี
- **Frontend**: Next.js + TypeScript
- **Styling**: Tailwind CSS (Dark/Light Mode)
- **Database**: Firebase (ระบบปิด ปลอดภัยสูง)
- **Design**: Responsive ทุกอุปกรณ์
- **Security**: Enterprise-grade

---

## 👥 ระบบผู้ใช้งาน (User Roles)

### 1. 👩‍⚕️ User (พยาบาล)
- **สิทธิ์การเข้าถึง**: เฉพาะแผนกที่ได้รับมอบหมาย
- **Navbar แสดง**: Form, Approval, Dashboard
- **หน้าเริ่มต้น**: Form (หน้าบันทึกข้อมูล)
- **การทำงาน**: บันทึกข้อมูลผู้ป่วยรายวัน, ดูสถานะการอนุมัติ

### 2. 👨‍💼 Admin (ผู้ดูแลระบบ)
- **สิทธิ์การเข้าถึง**: ข้อมูลทุกแผนก
- **Navbar แสดง**: WardForm, Approval, Dashboard, User Management
- **หน้าเริ่มต้น**: Approval (หน้าอนุมัติข้อมูล)
- **การทำงาน**: อนุมัติข้อมูล, แก้ไขข้อมูล, จัดการผู้ใช้

### 3. 👨‍💻 Developer (นักพัฒนา)
- **สิทธิ์การเข้าถึง**: ทุกหน้า + เครื่องมือพัฒนา
- **Navbar แสดง**: Form, Approval, Dashboard, User Management, Dev-Tools
- **หน้าเริ่มต้น**: Approval
- **การทำงาน**: ทดสอบ API, ยิงข้อมูลทดสอบ, ดู System Logs

---

## 🔐 ระบบความปลอดภัย

### 🚪 การเข้าสู่ระบบ
- **ไม่มีหน้า Register** - Admin สร้างให้เท่านั้น
- **1 Username = 1 Session** - ไม่สามารถ Login พร้อมกันได้
- **Login ซ้ำ = Session เก่าหลุด** ทันที

### 🔒 การจัดการ Session
```javascript
// ระบบตรวจจับการ Login ซ้ำ:
1. สร้าง Session ID ใหม่ทุกครั้งที่ Login
2. เก็บ "currentSession" ใน Firebase
3. ติดตาม Session เปลี่ยนแปลง → Auto Logout
4. onDisconnect จัดการเมื่อปิด Browser
5. beforeunload Logout เมื่อปิดหน้าเว็บ
6. อัพเดท lastActive ทุก 5 นาทีเพื่อ Auto-logout
```

### 🗑️ การล้างข้อมูล
- **เปิด/ปิด Browser** → Clear Cache 1 รอบ
- **Logout จากระบบ** → Clear Cache 1 รอบ

---

## 📝 หน้า Ward Form (Daily Census Form)

### 📅 การเลือกวันที่และกะ

#### 🔔 Notification System
- **ตรวจสอบข้อมูลย้อนหลัง 1 วัน** เมื่อเลือกวันที่
- **มีข้อมูลกะดึกย้อนหลัง** → แจ้งเตือนและดึงข้อมูล Patient Census อัตโนมัติ
- **ไม่มีข้อมูล** → บันทึกใหม่ได้เลย

#### ⏰ การเลือกกะตามเวลา
- **เวลา 07:00-18:59** → แนะนำกะเช้า
- **เวลา 19:00-06:59** → แนะนำกะดึก
- **ไม่บังคับ** แต่สามารถเลือกได้ตามต้องการ

#### 🎨 สถานะปุ่มกะ (3 สีแสดงสถานะ)
1. **สีที่ 1**: ยังไม่ได้บันทึกข้อมูล
2. **สีที่ 2**: บันทึก Draft แล้ว (สามารถแก้ไขได้)
3. **สีที่ 3**: บันทึก Final แล้ว (ไม่สามารถแก้ไขได้)

### 📊 ข้อมูลที่ต้องกรอก

#### 👥 ข้อมูลผู้ป่วยและเจ้าหน้าที่
```
Patient Census (คงเหลือ) - ตัวเลขเท่านั้น, placeholder: 0
Nurse Manager - ตัวเลขเท่านั้น, placeholder: 0
RN (Registered Nurse) - ตัวเลขเท่านั้น, placeholder: 0
PN (Practical Nurse) - ตัวเลขเท่านั้น, placeholder: 0
WC (Ward Clerk) - ตัวเลขเท่านั้น, placeholder: 0
```

#### 🔄 การเคลื่อนไหวผู้ป่วย (Patient Movement)
```
🟢 ค่าบวก (เพิ่มผู้ป่วย):
- New Admit - ผู้ป่วยใหม่
- Transfer In - โอนมาจากแผนกอื่น
- Refer In - ส่งต่อมาจากที่อื่น

🔴 ค่าลบ (ลดผู้ป่วย):
- Transfer Out - โอนไปแผนกอื่น
- Refer Out - ส่งต่อไปที่อื่น
- Discharge - จำหน่าย
- Dead - เสียชีวิต
```

#### 🛏️ ข้อมูลเตียง
```
Available - เตียงว่าง
Unavailable - เตียงไม่พร้อมใช้
Planned Discharge - แผนจำหน่าย
Comment - หมายเหตุ (ข้อความ)
```

#### 👨‍⚕️ เจ้าหน้าที่ผู้บันทึก
```
First Name - placeholder: "ใส่ชื่อ"
Last Name - placeholder: "ใส่นามสกุล"
```

### 💾 การบันทึกข้อมูล

#### 📝 Save Draft (บันทึกแบบร่าง)
- **ตรวจสอบข้อมูล**: ช่องที่ลืมกรอก → เคอร์เซอร์ไปที่ช่องนั้น
- **มี Draft เก่า**: Popup ให้เลือก Save ทับ หรือ ใช้ข้อมูลเดิม
- **สำเร็จ**: Popup แจ้งเตือน "Save Draft สำเร็จ"

#### ✅ Save Final (บันทึกสุดท้าย)
- **กะเช้า Save Final**: ปุ่มกะเช้าทึบ, ข้อมูลไม่สามารถแก้ไขได้
- **กะดึก**: ไม่สามารถ Save ได้ถ้ากะเช้ายังไม่ Approval
- **สำเร็จ**: Popup "Save Final สำเร็จ + ติดต่อฝ่ายการพยาบาลเพื่อแก้ไข"

### 🧮 การคำนวณ Patient Census (อัตโนมัติ)

#### 📐 สูตรการคำนวณ
```javascript
Patient Census ใหม่ = Patient Census เก่า 
                    + New Admit + Transfer In + Refer In 
                    - Transfer Out - Refer Out - Discharge - Dead
```

#### ⚙️ เงื่อนไขการคำนวณ
- **ไม่มีข้อมูลย้อนหลัง**: สามารถใส่/แก้ไข Patient Census ได้
- **มีข้อมูลกะดึกย้อนหลัง**: ดึงข้อมูลมาใส่ Patient Census อัตโนมัติ

### 🌙 การจัดการกะดึก
- **Patient Census**: ไม่สามารถแก้ไขได้ (รอข้อมูลจากกะเช้า + Approval)
- **ข้อมูลอื่น**: กรอกได้ปกติ
- **เงื่อนไข**: ต้อง Approval กะเช้าก่อน ถึงจะบันทึกกะดึกได้

---

## ✅ หน้า Approval (การอนุมัติ)

### 👀 สิทธิ์การเข้าถึง

#### 👩‍⚕️ User (พยาบาล)
- **ดูได้**: เฉพาะแผนกตัวเอง
- **ข้อมูลที่เห็น**: สถานะการอนุมัติ (อนุมัติแล้ว/รออนุมัติ)
- **ไม่สามารถ**: แก้ไขหรืออนุมัติข้อมูล

#### 👨‍💼 Admin (ผู้ดูแลระบบ)
- **ดูได้**: ทุกแผนกทั้งหมด
- **แสดงผล**: ตารางเปรียบเทียบกะเช้า-กะดึก แยกตามแผนก
- **ปุ่มที่มี**:
  - 🔧 **ปุ่ม "แก้ไข"** → ต้องใส่รหัสผ่านยืนยันตัวตน
  - ✅ **ปุ่ม "Approval"** → ต้องใส่ Supervisor Signature

### 📋 ข้อมูลสรุป 24 ชั่วโมง
**เมื่อ Approval ครบทุกกะทุกแผนก จะแจ้งเตือนให้ใส่ข้อมูล:**
```
📊 ข้อมูลสรุปโรงพยาบาล:
- OPD 24hr - ผู้ป่วยนอก 24 ชั่วโมง
- Old Patient - ผู้ป่วยเก่า
- New Patient - ผู้ป่วยใหม่
- Admit 24hr - รับใหม่ 24 ชั่วโมง

✍️ Supervisor Signature:
- First Name - ชื่อผู้ดูแล
- Last Name - นามสกุลผู้ดูแล
```

---

## 📊 หน้า Dashboard (แดชบอร์ด)

### 👩‍⚕️ User Dashboard
- **ข้อมูลที่เห็น**: เฉพาะแผนกตัวเอง (กะเช้า + กะดึก + ประวัติ)
- **ฟีเจอร์การดู**:
  - 📅 สรุปข้อมูล: 1 วัน, 7 วัน, 1 เดือน, 1 ปี
  - 📈 เปรียบเทียบข้อมูลระหว่างช่วงเวลา
  - 📁 Export Excel (ฟีเจอร์อนาคต)

### 👨‍💼 Admin Dashboard
- **ข้อมูลที่เห็น**: ทุกแผนกแบบภาพรวม
- **การแสดงผล**: ใช้โค้ดเดิมพัฒนาต่อยอด
- **ความสามารถ**: วิเคราะห์ข้อมูลขั้นสูง, ติดตามแนวโน้ม

---

## 🗄️ ระบบฐานข้อมูล (Firebase)

### 🔐 1. Authentication & Session
```javascript
- Login/Logout History
- currentSession Management  
- Session Tracking & Auto-logout
- User Activity Logs
- IP Tracking
```

### 📝 2. Form Data Management
```javascript
- Save Draft Data (ข้อมูลร่าง)
- Save Final Data (ข้อมูลสุดท้าย)
- Admin Edit Records (การแก้ไขจาก Admin)
- Approval Records (บันทึกการอนุมัติ)
```

### 🏥 3. Ward Data Structure
```javascript
วันที่, เวลา, กะ, แผนก
Patient Census, Nurse Manager, RN, PN, WC
New Admit, Transfer In, Refer In
Transfer Out, Refer Out, Discharge, Dead
Available, Unavailable, Planned Discharge
Comment, Timestamp, User Info
```

### 👨‍⚕️ 4. Staff Information
```javascript
เจ้าหน้าที่ผู้บันทึก:
- First Name, Last Name
- User ID, Role, Ward Assignment

Supervisor Signature:
- First Name, Last Name  
- Approval Timestamp, Digital Signature
```

### 📊 5. Summary Data (24hr)
```javascript
ข้อมูลสรุป 24 ชั่วโมง:
- OPD 24hr, Old Patient, New Patient, Admit 24hr
- Hospital-wide Statistics
- Trend Analysis Data
- Performance Metrics
```

---

## 🔄 Workflow การทำงานหลัก

### 🚀 1. Login Flow
```
1. User Login → Role Detection → Page Redirect
   ├── User → Form Page (บันทึกข้อมูล)
   ├── Admin → Approval Page (อนุมัติข้อมูล)
   └── Developer → Approval Page + Dev Tools
```

### 📝 2. Data Entry Flow
```
2. Form Entry → Draft → Final → Approval
   ├── กรอกข้อมูล → Validation
   ├── Save Draft → สามารถแก้ไขได้
   ├── Save Final → ไม่สามารถแก้ไขได้
   └── รอ Admin Approval
```

### ✅ 3. Approval Flow
```
3. Admin Approval → Summary → Dashboard
   ├── Review Data → Password Confirm
   ├── Approve → Supervisor Signature
   ├── 24hr Summary → All Wards Complete
   └── Display in Dashboard
```

### 📊 4. Dashboard Flow
```
4. Data Display → Analysis → Export
   ├── Real-time Updates
   ├── Historical Comparison
   ├── Trend Analysis
   └── Report Generation
```

---

## ⚠️ เงื่อนไขและข้อจำกัด

### 🔒 ข้อจำกัดความปลอดภัย
- **กะเช้าต้อง Final** ก่อนจึงจะทำกะดึกได้
- **ต้อง Approval กะเช้า** ก่อนจึงจะ Save กะดึกได้
- **Patient Census** คำนวณอัตโนมัติตามสูตรเท่านั้น
- **Session เดียว** ต่อ User เท่านั้น

### 📋 ข้อจำกัดการใช้งาน
- **ไม่มีหน้า Register** - Admin สร้างให้เท่านั้น
- **ข้อมูลต้อง Approval** ก่อนแสดงใน Dashboard
- **Draft ต้องเสร็จ** ก่อน Final
- **Final แล้วไม่สามารถแก้ไข** (ติดต่อ Admin)

### 🎯 การพัฒนาอนาคต
- **Log System**: ติดตาม ใครบันทึก ใครอนุมัติ
- **Export Excel**: ส่งออกข้อมูลเป็น Excel
- **Advanced Analytics**: วิเคราะห์ข้อมูลขั้นสูง
- **Mobile App**: แอปพลิเคชันมือถือ

---

## 📱 การออกแบบ Responsive

### 💻 Desktop (1200px+)
- Full sidebar navigation
- Multi-column layout
- Comprehensive data tables
- Advanced chart displays

### 📱 Tablet (768px - 1199px)
- Collapsible sidebar
- Responsive grid layout
- Touch-friendly controls
- Optimized form layouts

### 📱 Mobile (< 768px)
- Bottom navigation
- Stack layout
- Swipe gestures
- Simplified data views

---

## 🎯 เป้าหมายสุดท้าย

### ✅ ระบบที่สมบูรณ์แบบ
- **ปลอดภัยและเสถียร** - Enterprise-grade security
- **ใช้งานง่ายและสวยงาม** - Professional hospital interface
- **ตอบสนองทุกอุปกรณ์** - Full responsive design
- **ประสิทธิภาพสูง** - Fast load times, optimized performance
- **รองรับการขยายงาน** - Scalable architecture for future needs

---

**Last Updated**: 2025-07-14  
**Document Version**: 1.0  
**Project Phase**: Production Ready ✅

---

*คู่มือนี้เป็นเอกสารหลักสำหรับทีมพัฒนาและผู้ใช้งานระบบ กรุณาปฏิบัติตามเพื่อความสมบูรณ์และความปลอดภัยของระบบ*