# 🏥 Daily Census Form System - BPK Hospital

## 📋 Overview
ระบบบันทึกข้อมูลผู้ป่วยประจำวันสำหรับโรงพยาบาลบีพีเค พัฒนาด้วย Next.js, TypeScript, และ Firebase

## 🚀 Features

### ✅ Recently Completed
- **Dead Code Elimination**: ลบไฟล์ที่ไม่ใช้งาน (`app/core/utils/auth.ts`, `app/core/services/AuthService.ts`)
- **File Size Optimization**: แยกไฟล์ `useLogViewer.ts` เป็น helper functions เพื่อปฏิบัติตามหลักการ "Lean Code" (<500 บรรทัด)
- **Username & Password Editing**: ระบบแก้ไข Username และ Password ใน User Management
- **Auto-refresh System**: รีเฟรชข้อมูลอัตโนมัติหลังการอัปเดต
- **Enhanced Security**: BCrypt password hashing และ Username uniqueness validation

### 🔧 Core System
- **Authentication**: Custom username/password authentication with Firebase Firestore
- **User Management**: Create, edit, and manage users with role-based access
- **Census Forms**: Daily patient census data entry and management
- **Approval System**: Multi-level approval workflow for census data
- **Dashboard**: Real-time statistics and data visualization
- **Audit Logging**: Comprehensive user activity tracking

### 👥 User Roles
- **Admin**: Full system access including user management
- **Developer**: Advanced debugging and system administration
- **Nurse**: Data entry and form management
- **Approver**: Data approval and verification

## 🏗️ Technical Architecture

### 🎯 Lean Code Principles
- **File Size Limit**: Maximum 500 lines per file
- **Dead Code Elimination**: Regular removal of unused code
- **Code Reusability**: Modular design with helper functions
- **Performance First**: Optimized loading and minimal bundle size

### 💻 Technology Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with server-side validation
- **Database**: Firebase Firestore with optimized indexes
- **Authentication**: Custom implementation with BCrypt password hashing
- **State Management**: React hooks with custom state management
- **UI/UX**: Responsive design with dark/light mode support

### 🏛️ Project Structure
```
app/
├── (auth)/                 # Authentication pages
├── (main)/                 # Main application pages
├── api/                    # API routes
├── components/             # Reusable UI components
├── features/               # Feature-specific modules
│   ├── admin/              # Admin functionality
│   ├── auth/               # Authentication system
│   ├── dashboard/          # Dashboard components
│   └── ward-form/          # Census form system
├── lib/                    # Utility libraries
└── middleware.ts           # Route protection
```

## 🔒 Security Features
- **Enterprise-grade Password Validation**: 8+ characters with complexity requirements
- **BCrypt Password Hashing**: Secure password storage
- **Username Uniqueness Validation**: Prevent duplicate usernames
- **XSS Protection**: Input sanitization and validation
- **Role-based Access Control**: Granular permissions by user role
- **Audit Trail**: Complete logging of user actions
- **Session Management**: Secure session handling

## 📊 Performance Optimizations
- **File Size Management**: All files under 500 lines following "Lean Code" principles
- **Bundle Optimization**: Modular imports and code splitting
- **Database Indexes**: Optimized Firebase queries
- **Caching Strategy**: Smart data caching and refresh mechanisms
- **Loading States**: Non-blocking UI with proper loading indicators

## 🔥 Latest Updates (2025-01-03)

### Dead Code Elimination & File Size Optimization
- **Removed Dead Files**: Eliminated unused `auth.ts` and `AuthService.ts` files
- **File Size Compliance**: Split `useLogViewer.ts` (544 lines) into:
  - `logViewerHelpers.ts` - Helper functions and types
  - `useLogViewer.ts` - Main hook logic (466 lines)
- **Import/Export Management**: Proper modular structure with named imports
- **Performance Gains**: Reduced bundle size and improved maintainability

### User Management Enhancement
- **Username Editing**: Inline editing with uniqueness validation
- **Password Management**: Secure password change with confirmation
- **Auto-refresh**: Real-time data updates after modifications
- **Enhanced Security**: Enterprise-grade validation and BCrypt hashing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore enabled

### Installation
```bash
git clone [repository-url]
cd Summary_of_Personnel_Ratio
npm install
```

### Environment Setup
Create `.env.local` file with Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Running the Application
```bash
npm run dev
# Application will be available at http://localhost:3000
```

## 📁 Key Files

### Core System Files
- `app/middleware.ts` - Route protection and authentication
- `app/lib/firebase/firebase.ts` - Firebase configuration
- `app/features/auth/` - Authentication system
- `app/features/admin/` - Admin functionality

### Recently Modified Files
- `app/features/admin/utils/logViewerHelpers.ts` - **NEW**: Helper functions for log viewer
- `app/features/admin/hooks/useLogViewer.ts` - **OPTIMIZED**: Main hook (466 lines)
- `app/features/admin/components/EditUserModal.tsx` - Enhanced with username/password editing
- `app/api/admin/users/[uid]/route.ts` - Enhanced API with security validation

## 🔧 Development Guidelines

### Code Standards
- **Maximum 500 lines per file** (Lean Code principle)
- **TypeScript strict mode** with comprehensive type safety
- **ESLint configuration** for code quality
- **Proper error handling** with user-friendly messages
- **Security-first approach** with input validation

### Multi-AI Model Compatibility
- **Cross-model standards** for Claude Sonnet 4, 3.7, Gemini Pro 2.5, O3, O4Mini
- **Context management** for optimal AI assistant performance
- **Consistent coding patterns** across different AI models

## 📚 Documentation
- `REFACTORING_CHANGES.md` - Detailed change log and technical decisions
- `CLAUDE.md` - AI assistant session summaries and guidelines
- `README.md` - This file with project overview

## 🔄 Continuous Improvement
- **Regular code reviews** for quality assurance
- **Performance monitoring** and optimization
- **Security updates** and vulnerability assessments
- **User feedback integration** for feature enhancements

## 🤝 Contributing
Follow the established patterns and maintain the "Lean Code" philosophy:
1. Keep files under 500 lines
2. Remove unused code regularly
3. Maintain type safety
4. Document all changes
5. Test thoroughly before deployment

## 📞 Support
For technical issues or questions, refer to the documentation files or contact the development team.

---

**Last Updated**: January 3, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅
