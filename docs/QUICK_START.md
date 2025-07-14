# 🚀 Quick Start Guide - Daily Census Form System

**เริ่มต้นใช้งานระบบบันทึกข้อมูลผู้ป่วยประจำวันของโรงพยาบาลบีพีเค**

---

## 🎯 สำหรับ AI Assistant ใหม่

### 📋 Flow การทำงาน (16 ข้อ)

1. **แนะนำตัว** - Claude Sonnet 4 (รุ่นล่าสุด)
2. **ค้นหาไฟล์อย่างแม่นยำ** ก่อนแก้ไข
3. **ไฟล์เกิน 500 บรรทัด** - แยกไฟล์และ import/export
4. **สรุปการแก้ไข** ลงใน docs ที่เกี่ยวข้อง
5. **ไม่กระทบโครงสร้างเดิม** และ workflow
6. **Performance + Security** เป็นมาตรฐาน
7. **เช็คการเชื่อมต่อ Firebase** ก่อนสร้างใหม่
8. **Lean Code Philosophy** - กระชับ สร้างสรรค์ สวยงาม
9. **Context Status** - แจ้งเมื่อเกิน 85%
10. **Multi-AI Compatibility** - Claude, Gemini, O3, O4Mini
11. **Tech Stack**: Next.js + TypeScript + Tailwind + ESLint
12. **ห้ามใช้ External Links** - ความปลอดภัย
13. **ไม่สร้าง Mock API** - ใช้งานจริงเท่านั้น
14. **ภาษาไทยสุภาพ** ในการสื่อสาร
15. **ไม่ต้อง npm run dev** - ถามก่อน
16. **ห้าม Hardcode Firebase Keys** - ใช้ .env.local

---

## 🏥 Project Overview

### 🔧 Technology Stack
- **Frontend**: Next.js 15.3.5 + TypeScript
- **Styling**: Tailwind CSS (Dark/Light Mode)
- **Database**: Firebase Firestore
- **Authentication**: Custom system with BCrypt
- **Design**: Responsive (Desktop/Tablet/Mobile)

### 👥 User Roles
- **Staff**: Form entry for assigned wards
- **Manager**: Data approval + Dashboard access
- **Admin**: Full system access + User management
- **Developer**: All access + Dev tools + System logs

---

## 🎯 Core Features

### 🔐 Authentication System
- Username/Password login (no registration page)
- One session per user (concurrent login = auto logout)
- Session management with Firebase
- Auto cache clear on browser close/logout

### 📝 Daily Census Form
- Ward selection based on user permissions
- Morning/Night shift data entry
- Auto-calculation of Patient Census
- Draft/Final save with validation
- Previous data integration

### ✅ Approval Workflow
- Multi-level approval system
- Real-time status tracking
- Supervisor signature requirement
- 24-hour summary data entry

### 📊 Dashboard
- Role-based data visualization
- Comparative analysis (daily/weekly/monthly)
- Export capabilities (future)
- Real-time statistics

---

## 🔄 Current Status

### ✅ Recently Completed
- **Security Migration**: localStorage → Firebase (2025-01-11)
- **Ward Access Control**: Security fixes completed
- **Form Validation**: Two-phase validation system
- **User Management**: Enhanced with dirty state detection
- **Dev Tools**: Lean code cleanup completed

### ⚠️ Known Issues
- Build errors: useEffect dependency array needs fixing
- NotificationType.INFO and WARNING already added ✅

---

## 📁 File Structure (Lean Code - Max 500 lines)

```
app/
├── (auth)/                 # Login pages
├── (main)/                 # Main application
├── api/                    # API routes
├── components/ui/          # Reusable components
├── features/               # Feature modules
│   ├── admin/              # Admin functionality
│   ├── auth/               # Authentication
│   ├── dashboard/          # Dashboard
│   ├── notifications/      # Notification system
│   └── ward-form/          # Census forms
└── lib/                    # Utilities
```

---

## 🚨 Security Standards

### 🔒 Enterprise-Grade Security
- Password validation (8+ chars, complexity)
- XSS protection with input sanitization
- Role-based access control
- Audit logging for all actions
- Firebase security rules
- No external dependencies

### 🛡️ Data Protection
- Encrypted password storage (BCrypt)
- Secure session management
- IP tracking and monitoring
- Automatic session cleanup
- Input validation at all levels

---

## 🔧 Development Guidelines

### 📋 Code Standards
- **File Size**: Maximum 500 lines per file
- **TypeScript**: Strict mode compliance
- **Performance**: Fast load times
- **Security**: Input validation required
- **Documentation**: Update docs for all changes

### 🎨 UI/UX Standards
- Responsive design (all devices)
- Dark/Light mode support
- Professional hospital interface
- Thai language interface
- English for technical terms

---

## 🔍 Quick Navigation

### 📚 Documentation Files
- **QUICK_START.md** - This file (start here)
- **PROJECT_OVERVIEW.md** - Detailed project information
- **WORKFLOW_GUIDE.md** - Hospital workflow documentation
- **TECHNICAL_SPECS.md** - Technical specifications
- **AI_GUIDELINES.md** - AI assistant guidelines

### 🔧 Setup & Configuration
- **setup/firebase_setup.md** - Firebase configuration
- **setup/network_troubleshooting.md** - Network issues

### 🐛 Fixes & History
- **fixes/** - Bug fixes and solutions
- **sessions/** - Chat session summaries
- **development/** - Development history

---

## ⚡ Getting Started

### 1. Read Project Context
```bash
# Essential reading order:
1. QUICK_START.md (this file)
2. AI_GUIDELINES.md (AI-specific rules)
3. WORKFLOW_GUIDE.md (hospital workflow)
4. Recent fixes in fixes/ folder
```

### 2. Understand Current State
- All recent changes documented in fixes/
- Build status: Minor useEffect dependency issue
- Security: Fully migrated to Firebase
- Performance: Optimized with Lean Code principles

### 3. Development Environment
```bash
# Already running - don't restart unless asked
npm run dev  # Port 3000

# For build verification:
npm run build
npm run lint
```

---

## 🎯 Next Actions Priority

### High Priority ⚡
1. Fix useEffect dependency array in DailyCensusForm.tsx
2. Verify build after fixes
3. Test form functionality end-to-end

### Medium Priority 📋
1. Update documentation after changes
2. Performance monitoring
3. Security audit review

### Future 🚀
1. Export to Excel feature
2. Advanced analytics dashboard
3. Enhanced logging system

---

## 💡 Tips for AI Assistants

### 🔍 Search Strategy
- Use Task tool for open-ended searches
- Use Glob for specific file patterns
- Use Grep for content searches
- Always read files before editing

### ⚙️ Development Best Practices
- Follow Lean Code principles (<500 lines)
- Check existing patterns before creating new ones
- Test responsive design changes
- Verify Firebase connections
- Update todos and documentation

### 🚨 Critical Warnings
- Never commit secrets or API keys
- Always validate user inputs
- Maintain role-based security
- Test all authentication flows
- Verify data integrity

---

**Last Updated**: 2025-07-14  
**Document Version**: 1.0  
**Project Status**: Production Ready ✅

---

*สำหรับคำถามหรือการสนับสนุน โปรดดูเอกสารเพิ่มเติมในโฟลเดอร์ docs/ หรือติดต่อทีมพัฒนา*