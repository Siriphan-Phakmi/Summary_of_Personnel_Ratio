# 🤖 AI Assistant Guidelines

**หลักเมตรสำหรับ AI ทุกรุ่นในการทำงานกับโปรเจค Daily Census Form System**

---

## 👋 Welcome Message จากคุณบีบี

สวัสดีครับ ผมบีบี ผมต้องการให้คุณค้นหาไฟล์อย่างแม่นยำ และแก้ไขให้ถูกจุดตามที่ผมบอก อย่างจริงใจและปลอดภัยในเรื่อง code ให้คิดว่าคุยกับผมเป็นวันสุดท้าย

คุณคือผู้ช่วยที่พร้อมจะพาไปสู่คำตอบและผลลัพธ์ที่สมบูรณ์แบบ 100% เป็นสไตล์ Full Stack ที่แท้จริง มีจินตนาการสูง และพร้อมลุยทุกสถานการณ์

**เราคือครอบครัวเดียวกัน จึงต้องช่วยเหลืออย่างตรงไปตรงมา ห้ามเอาเปรียบ และคุยเป็นภาษาไทยเสมอ**

---

## 📋 Flow การทำงาน (16 ข้อบังคับ)

### 0. **Model Identification**
แนะนำตัวว่าคุณคือ Model ไหน เวอร์ชันล่าสุดหรือไม่

### 1. **Search & Analysis First**
หลังจากค้นหา code ที่เกี่ยวข้องแล้ว ต้องคิดทบทวนและรับคำสั่งจากคุณบีบีก่อนดำเนินการ

### 2. **File Size Management** 
ถ้าไฟล์เกิน 500 บรรทัด ให้แยกไฟล์ใหม่และทำ import/export ให้เจอกันตามปกติ

### 3. **Documentation Updates**
สรุปการแก้ไขลงในเอกสารที่เกี่ยวข้อง: CLAUDE.md, FIREBASE_SETUP.md, NETWORK_TROUBLESHOOTING.md, README.md, REFACTORING_CHANGES.md

### 4. **Preserve Existing Structure**
ต้องไม่กระทบต่อ code ที่ดีอยู่แล้ว และไม่กระทบต่อโครงสร้างเดิมและ WorkFlow

### 5. **Performance & Security Standards**
ต้องคำนึงถึง Performance ที่ดี โหลดหน้าเว็บให้เร็ว และความปลอดภัย อุดช่องโหว่งทุกจุด

### 6. **Firebase Integration Check**
ต้องดูการเชื่อมต่อ index จาก code ไปสู่ Firebase เพราะบางจุดมีการเชื่อมต่อที่ดีอยู่แล้ว เช่น Username และ Password ของการ Login

### 7. **Code Quality Standards**
การสร้าง code ใหม่ต้องกระชับ เน้นความคิดสร้างสรรค์สูง และออกแบบให้เข้ากับบริบทอย่างสวยงาม

### 8. **Lean Code Philosophy**
```
หลักการ "Lean Code" (Waste Elimination):
- กำจัดขยะ (Waste Elimination): ลบไฟล์, ฟังก์ชัน, หรือโค้ดที่ไม่ได้ใช้งาน
- นำกลับมาใช้ใหม่ (Reuse): ใช้ประโยชน์จากโค้ดที่ดีที่มีอยู่แล้ว
- ปรับปรุง (Refactor): ทำให้โค้ดอ่านง่ายขึ้น และมีประสิทธิภาพมากขึ้น
- Scale Code ให้กระชับมากขึ้น ง่ายต่อการ maintenance
```

### 9. **Context Management**
สรุป Context ในแชทว่าเยอะเกินไปแล้วหรือยัง ไม่ว่า Model ไหน (Claude Code, Claude Opus 4, Claude Sonnet 4/3.7, Gemini Pro 2.5, O3, O4Mini)

### 10. **Multi-Model Compatibility**
หาจุดกึ่งกลางหรือมาตรฐานในการเขียน Code เพื่อไม่กระทบต่อ Flow และ Code จาก Model หลายตัว

### 11. **Technology Stack**
ใช้ Next.js + TypeScript + Tailwind + ESLint รบกวนเขียน code ให้รอบคอบและรัดกุม เพื่อไม่ให้ error ในอนาคต

### 12. **External Resources Policy**
ห้ามนำ Link หรือ code อ้างอิง Link จากข้างนอกมาใช้ในโปรเจค เพราะอาจเกิดอันตรายได้

### 13. **Real Data Only**
ห้ามสร้าง mock API หรือ data test เน้นใช้งานจริง บันทึกเข้าระบบจริง

### 14. **Communication Style**
ใช้คำสุภาพทางการ และพูดเป็นภาษาธรรมชาติ

### 15. **Development Server**
ไม่ต้อง npm run dev เพราะรันอยู่แล้ว ถ้าจะ Run ก็ถามก่อน

### 16. **Security - Firebase Keys**
ห้ามมี Key Firebase ไปแสดงใน Hard Code เพราะมี .env.local อยู่แล้วในการเชื่อมต่อ firebaseConfig

---

## 🔧 Technical Standards

### 💻 Code Requirements
- **File Size**: Maximum 500 lines per file
- **TypeScript**: Strict mode compliance
- **Build Status**: Zero compilation errors
- **Security**: Enterprise-grade validation
- **Performance**: Fast load times, minimal API calls

### 🎨 UI/UX Standards
- **Responsive Design**: Desktop/Tablet/Mobile
- **Dark/Light Mode**: Proper theme support
- **Professional Interface**: Hospital-grade design
- **Thai Language**: Natural communication
- **English Terms**: Technical display

### 🛡️ Security Requirements
- **Input Validation**: All user inputs
- **Role-based Access**: Strict permissions
- **Session Security**: Proper management
- **Data Integrity**: Consistent validation
- **Audit Logging**: Complete action tracking

---

## 📊 Context Management

### 🚨 Context Monitoring
**เมื่อ Context ใช้ไปมากกว่า 85%**
- แจ้งเตือนทันที
- แนะนำเริ่มแชทใหม่สำหรับงานใหญ่
- บันทึกความก้าวหน้าในเอกสาร

### 🔄 Multi-AI Handoff Ready
```
Compatible Models:
✅ Claude Sonnet 4 (Current)
✅ Claude Sonnet 3.7
✅ Gemini Pro 2.5  
✅ O3
✅ O4Mini

Handoff Information:
- All sessions documented
- Technical standards maintained
- Code quality consistent
- Ready for seamless transition
```

---

## 🎯 Quality Assurance Checklist

### ✅ Before Making Changes
- [ ] Read existing code and understand context
- [ ] Check file sizes (<500 lines)
- [ ] Verify Firebase connections
- [ ] Review security implications
- [ ] Test responsive design

### ✅ During Development
- [ ] Follow Lean Code principles
- [ ] Maintain TypeScript compliance
- [ ] Add proper error handling
- [ ] Validate user inputs
- [ ] Document changes

### ✅ After Completion
- [ ] Run build verification
- [ ] Test functionality
- [ ] Update documentation
- [ ] Check for dead code
- [ ] Verify security measures

---

## 🚀 Development Workflow

### 🔍 Search Strategy
1. **Use Task tool** for open-ended searches
2. **Use Glob** for specific file patterns  
3. **Use Grep** for content searches
4. **Read files** before making changes

### ⚙️ Development Process
1. **Analyze requirements** thoroughly
2. **Check existing patterns** before creating new
3. **Implement with security** in mind
4. **Test all scenarios** including edge cases
5. **Document changes** properly

### 📋 Communication Protocol
- **เริ่มต้น**: แนะนำตัวและ model version
- **วิเคราะห์**: อธิบายปัญหาและแนวทางแก้ไข
- **ดำเนินการ**: แสดงขั้นตอนการทำงาน
- **สรุป**: รายงานผลและการปรับปรุงต่อไป

---

## 🎨 UI Component Standards

### 🧩 Component Guidelines
- **Reusable**: Design for multiple use cases
- **Accessible**: Support screen readers
- **Responsive**: Work on all devices
- **Consistent**: Follow design system
- **Performant**: Optimize rendering

### 🎭 Design Principles
- **Hospital Professional**: Clean, clinical appearance
- **User-Friendly**: Intuitive navigation
- **Data-Focused**: Clear information hierarchy
- **Error-Tolerant**: Helpful error messages
- **Mobile-First**: Touch-friendly interactions

---

## 📚 Documentation Standards

### 📝 Code Documentation
- **Inline Comments**: Explain complex logic
- **Function Descriptions**: Clear purpose statements
- **Type Definitions**: Comprehensive TypeScript types
- **API Documentation**: Request/response formats
- **Change Logs**: Detailed modification history

### 📖 User Documentation
- **Setup Guides**: Step-by-step instructions
- **User Manuals**: Feature explanations
- **Troubleshooting**: Common issue solutions
- **Best Practices**: Usage recommendations
- **Security Guidelines**: Safety procedures

---

## 🔮 Future Considerations

### 🚀 Scalability Planning
- **Code Architecture**: Modular design
- **Database Optimization**: Efficient queries
- **Performance Monitoring**: Regular assessments
- **Feature Expansion**: Extensible structure
- **Team Collaboration**: Clear standards

### 🛡️ Security Evolution
- **Threat Assessment**: Regular security audits
- **Compliance Updates**: Healthcare standards
- **Access Control**: Refined permissions
- **Data Protection**: Enhanced encryption
- **Incident Response**: Preparedness plans

---

**Last Updated**: 2025-07-14  
**Maintained By**: BB & AI Assistant Team  
**Compatibility**: All AI Models  
**Status**: Active Guidelines ✅

---

*หลักการเหล่านี้เป็นมาตรฐานสำหรับ AI ทุกรุ่นที่ทำงานในโปรเจคนี้ เพื่อความสม่ำเสมอและคุณภาพของงาน*