# BPK Personnel Ratio Application

A comprehensive application for managing ward personnel ratios and patient census data for BPK Hospital.

## Features

- User authentication with role-based access control
- Ward data form with morning and night shift data entry
- Approval process for submitted ward data
- Dashboard for analytics and reporting
- **Enhanced User Management** with username/password editing capabilities
- **Dev-Tools System Logs** with advanced filtering and management
- Dark mode support
- Responsive design for desktop, tablet, and mobile

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Realtime Database)
- **State Management**: React Context API
- **UI Components**: Custom components with Tailwind CSS
- **Icons**: React Icons

## Project Structure

```
/app
  /features             # Feature-based organization
    /auth               # Authentication system
    /ward-form          # Ward form data entry
    /approval           # Approval system
    /dashboard          # Dashboard and analytics
    /user-management    # User management
    /notifications      # Notification system
      
  /core                 # Shared code base
    /ui                 # Core UI components
    /hooks              # Common React hooks
    /utils              # Utility functions
    /firebase           # Firebase connection
    /types              # Common TypeScript types
    /constants          # Constants
    
  /api                  # Next.js API Routes
    /ward-form          # Form APIs
    /approval           # Approval APIs
    /dashboard          # Dashboard APIs
    /users              # User APIs
    /dev-tools          # Development tools APIs
    
  /dev-tools            # Developer tools
    /log-viewer         # Log viewer
    /database-manager   # Database management tools
    
  /docs                 # Project documentation

  # Next.js App Router folders
  /login                # Login page
  /census               # Census pages
    /ward-form          # Ward form page
    /approval           # Approval page
    /dashboard          # Dashboard page
  /admin                # Admin pages
    /user-management    # User management page
    /database           # Database management page
```

## Key Workflows

### Ward Form Data Entry
1. User logs in and navigates to the Ward Form
2. Selects date and shift (morning/night)
3. Enters patient census data, staff counts and other metrics
4. Can save as draft or submit final data
5. Morning shift must be completed before night shift

### Approval Process
1. Supervisors/admins review submitted ward data
2. Morning and night shifts must be approved separately
3. **Rejection Handling:** If a form is rejected by an admin (with a reason), its status changes to 'REJECTED'. The user can then reload the form, see the rejection reason, edit the data, and resubmit it as 'FINAL' for re-approval.
4. Once both shifts are approved, 24-hour summary is entered
5. Approved data becomes available for dashboard analytics

### User Session Management
1. Only one active session per user is allowed
2. When a user logs in on a new device, previous sessions are terminated
3. Session tracking with Firebase Realtime Database

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Firebase configuration in `.env.local`
4. Run the development server: `npm run dev`
5. Access the application at `http://localhost:3000`

## Environment Variables

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your-database-url
```

## Project Status (อัปเดต 2024-05-10)

### Recently Completed
- ✅ ระบบการจัดการแบบฟอร์มและอนุมัติ
- ✅ Flow การ Reject แบบฟอร์ม (ผู้ใช้สามารถแก้ไขและส่งใหม่ได้)
- ✅ ระบบคำนวณ Patient Census อัตโนมัติ
- ✅ ระบบป้องกันการล็อกอินซ้ำซ้อน
- ✅ พัฒนาระบบแจ้งเตือนเบื้องต้น (NotificationBell)
- ✅ ปรับปรุงแบบฟอร์มบันทึกข้อมูลกะเช้า/กะดึก
- ✅ การจัดการสิทธิ์และการเข้าถึงตาม Role
- ✅ ปรับโครงสร้างโค้ดใหม่ตามฟีเจอร์ (Feature-based organization)
- ✅ **Enhanced User Management System** (2025-01-03)
  - Username editing with uniqueness validation
  - Password editing with BCrypt encryption
  - Ward assignment management
  - Auto-refresh after updates
- ✅ **Dev-Tools System Logs Enhancement** (2025-01-03)
  - Bulk delete functionality with security validation
  - Selective delete with checkbox system
  - Advanced pagination with cursor-based navigation
  - Role-based access control (DEVELOPER/ADMIN)

### In Progress
- 🔄 การเชื่อมต่อระบบแจ้งเตือนกับการอนุมัติ/ปฏิเสธแบบฟอร์ม
- 🔄 การปรับปรุงหน้า Dashboard
- 🔄 การปรับปรุงประสิทธิภาพและการแสดงผลบนอุปกรณ์มือถือ
- 🔄 การแก้ไขปัญหาการแสดงสถานะแบบฟอร์มในหน้า DailyCensusForm
- 🔄 ปรับปรุง imports หลังการปรับโครงสร้างโค้ด

### Upcoming
- 📅 ระบบจัดการผู้ใช้งาน
- 📅 การพัฒนาส่วน Export รายงาน
- 📅 ส่วนบันทึกข้อมูลสรุป 24 ชั่วโมง
- 📅 ระบบตรวจสอบความปลอดภัยเพิ่มเติม

## Developer Notes

หากพบปัญหาเกี่ยวกับ Firebase Indexes กรุณาดูไฟล์ `app/docs/FIRESTORE_INDEXES.md` สำหรับคำแนะนำในการสร้าง Indexes ที่จำเป็น

สำหรับรายละเอียดเพิ่มเติมเกี่ยวกับงานที่ต้องดำเนินการและความคืบหน้าของโครงการ กรุณาดูไฟล์ `app/docs/TASKS.md`

สำหรับข้อมูลเกี่ยวกับการปรับโครงสร้างโค้ดล่าสุด กรุณาดูไฟล์ `app/docs/RESTRUCTURING.md`
