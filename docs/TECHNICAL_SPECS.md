# ⚙️ Technical Specifications

**ข้อกำหนดทางเทคนิคและมาตรฐานการพัฒนา Daily Census Form System**

---

## 🏗️ System Architecture

### 💻 Core Technology Stack

#### Frontend Layer
```typescript
Framework: Next.js 15.3.5
├── App Router (Latest routing system)
├── Server Components (Default)
├── Client Components (Interactive UI)
└── Middleware (Route protection)

Language: TypeScript 5.0+
├── Strict mode enabled
├── Path mapping configured
├── Comprehensive type definitions
└── Runtime type validation

Styling: Tailwind CSS 3.0+
├── Custom design system
├── Dark/Light mode support
├── Responsive breakpoints
├── Component utilities
└── Performance optimizations
```

#### Backend Layer
```typescript
API: Next.js API Routes
├── RESTful endpoints
├── Server-side validation
├── Error handling middleware
├── Rate limiting
└── Request logging

Database: Firebase Firestore
├── NoSQL document database
├── Real-time synchronization
├── Security rules implementation
├── Indexed queries
└── Automated backups

Authentication: Custom Implementation
├── BCrypt password hashing
├── JWT token management
├── Session-based auth
├── Role-based access control
└── Multi-device management
```

### 🔧 Development Tools

#### Code Quality
```typescript
ESLint Configuration:
├── TypeScript ESLint rules
├── React/Next.js specific rules
├── Custom hospital-domain rules
├── Import/export organization
└── Performance optimizations

Code Standards:
├── File size limit: 500 lines max
├── Function complexity limits
├── Consistent naming conventions
├── Documentation requirements
└── Test coverage targets
```

#### Build & Deployment
```typescript
Build System: Next.js built-in
├── Webpack bundling
├── Tree shaking enabled
├── Code splitting
├── Asset optimization
└── Environment-specific builds

Deployment: Vercel Platform
├── Git-based deployments
├── Preview deployments
├── Edge functions
├── Performance monitoring
└── Analytics integration
```

---

## 📊 Database Schema

### 🔥 Firebase Collections

#### Users Collection
```typescript
/users/{userId}
{
  id: string;                    // Unique user identifier
  username: string;              // Login username (unique)
  password: string;              // BCrypt hashed password
  role: 'staff' | 'manager' | 'admin' | 'developer';
  firstName: string;
  lastName: string;
  assignedWardId?: string;       // Primary ward assignment
  approveWardIds?: string[];     // Wards user can approve
  isActive: boolean;             // Account status
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  loginHistory: LoginRecord[];   // Recent login attempts
}

type LoginRecord = {
  timestamp: Timestamp;
  ipAddress: string;
  userAgent: string;
  success: boolean;
};
```

#### Sessions Collection
```typescript
/sessions/{sessionId}
{
  id: string;                    // Session identifier
  userId: string;                // Reference to user
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    location?: string;
  };
  createdAt: Timestamp;
  lastActivity: Timestamp;
  expiresAt: Timestamp;
  isActive: boolean;
}
```

#### Ward Forms Collection
```typescript
/wardForms/{formId}
{
  id: string;                    // Auto-generated form ID
  wardId: string;                // Ward identifier
  date: string;                  // Date in YYYY-MM-DD format
  shift: 'morning' | 'night';    // Shift type
  
  // Patient Data
  patientCensus: number;         // Current patient count
  nurseManager: number;          // Nurse manager count
  rn: number;                    // Registered nurses
  pn: number;                    // Practical nurses
  wc: number;                    // Ward clerks
  
  // Patient Movement
  newAdmit: number;              // New admissions
  transferIn: number;            // Transfers in
  referIn: number;               // Referrals in
  transferOut: number;           // Transfers out
  referOut: number;              // Referrals out
  discharge: number;             // Discharges
  dead: number;                  // Deaths
  
  // Bed Management
  available: number;             // Available beds
  unavailable: number;           // Unavailable beds
  plannedDischarge: number;      // Planned discharges
  
  // Metadata
  comment?: string;              // Additional notes
  staffFirstName: string;        // Recording staff first name
  staffLastName: string;         // Recording staff last name
  
  // Status Tracking
  status: 'draft' | 'final' | 'approved';
  isApproved: boolean;
  approvedBy?: string;           // User ID of approver
  approvedAt?: Timestamp;
  supervisorSignature?: {
    firstName: string;
    lastName: string;
    timestamp: Timestamp;
  };
  
  // Audit Trail
  createdBy: string;             // User ID of creator
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;               // For optimistic locking
  editHistory: EditRecord[];     // Change tracking
}

type EditRecord = {
  userId: string;
  timestamp: Timestamp;
  changes: Record<string, any>;
  reason?: string;
};
```

#### Daily Summary Collection
```typescript
/dailySummary/{summaryId}
{
  id: string;                    // Auto-generated summary ID
  date: string;                  // Date in YYYY-MM-DD format
  hospitalId: string;            // Hospital identifier
  
  // 24-hour Summary Data
  opd24hr: number;               // OPD patients in 24hrs
  oldPatient: number;            // Existing patients
  newPatient: number;            // New patients
  admit24hr: number;             // Admissions in 24hrs
  
  // Supervisor Information
  supervisorFirstName: string;
  supervisorLastName: string;
  supervisorSignature: string;   // Digital signature
  
  // Metadata
  completedAt: Timestamp;
  completedBy: string;           // User ID
  wardFormsIncluded: string[];   // Form IDs included in summary
  
  // Approval Status
  allWardsApproved: boolean;
  totalWards: number;
  approvedWards: number;
}
```

#### Audit Logs Collection
```typescript
/auditLogs/{logId}
{
  id: string;                    // Auto-generated log ID
  userId: string;                // User performing action
  action: string;                // Action description
  entityType: string;            // Type of entity affected
  entityId: string;              // ID of affected entity
  
  // Change Details
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Context Information
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  
  // Timestamp
  timestamp: Timestamp;
  
  // Security Classification
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'data_access' | 'data_modification' | 'system';
}
```

### 🗂️ Firestore Indexes

#### Required Indexes
```typescript
Composite Indexes:
1. wardForms: [wardId, date, shift]
2. wardForms: [createdBy, createdAt]
3. wardForms: [status, updatedAt]
4. auditLogs: [userId, timestamp]
5. auditLogs: [entityType, timestamp]
6. sessions: [userId, isActive, lastActivity]

Single Field Indexes:
- All timestamp fields (automatic)
- All string fields used in queries
- Boolean fields for filtering
```

#### Security Rules
```typescript
// Example Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'developer'];
    }
    
    // Ward forms access based on user role and ward assignment
    match /wardForms/{formId} {
      allow read, write: if request.auth != null && 
        (
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'developer'] ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedWardId == resource.data.wardId ||
          resource.data.wardId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.approveWardIds
        );
    }
    
    // Audit logs - read only for admins/developers
    match /auditLogs/{logId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'developer'];
      allow create: if request.auth != null;
    }
  }
}
```

---

## 🔒 Security Implementation

### 🛡️ Authentication Security

#### Password Security
```typescript
Password Requirements:
├── Minimum 8 characters
├── At least 1 uppercase letter
├── At least 1 lowercase letter
├── At least 1 number
├── At least 1 special character
└── Not common dictionary words

Hashing Implementation:
├── BCrypt with salt rounds: 12
├── Unique salt per password
├── Constant-time comparison
└── Password reset token expiry: 1 hour
```

#### Session Management
```typescript
Session Security:
├── HTTP-only cookies
├── Secure flag for HTTPS
├── SameSite=Strict
├── Session timeout: 8 hours
├── Sliding expiration
├── Concurrent session limit: 1
└── Session invalidation on logout

JWT Implementation:
├── RS256 algorithm
├── Short expiry: 15 minutes
├── Refresh token: 7 days
├── Automatic rotation
└── Revocation list maintenance
```

### 🔐 Input Validation & Sanitization

#### Client-side Validation
```typescript
Validation Rules:
├── Real-time input validation
├── Form submission prevention
├── Data type enforcement
├── Range validation
└── Pattern matching

TypeScript Schemas:
├── Zod validation library
├── Runtime type checking
├── Automatic error messages
├── Schema composition
└── Custom validation rules
```

#### Server-side Validation
```typescript
API Route Protection:
├── Input sanitization (DOMPurify)
├── SQL injection prevention
├── XSS protection
├── CSRF token validation
├── Rate limiting per endpoint
└── Request size limits

Data Validation:
├── Schema validation on all inputs
├── Business rule enforcement
├── Data consistency checks
├── Referential integrity
└── Audit trail generation
```

### 🚨 Security Monitoring

#### Intrusion Detection
```typescript
Monitoring Features:
├── Failed login attempt tracking
├── Unusual access pattern detection
├── Privilege escalation monitoring
├── Data exfiltration detection
└── Real-time alerting

Log Analysis:
├── Security event aggregation
├── Anomaly detection algorithms
├── Threat intelligence integration
├── Automated response triggers
└── Incident escalation procedures
```

---

## ⚡ Performance Specifications

### 🚀 Frontend Performance

#### Loading Performance
```typescript
Performance Targets:
├── First Contentful Paint (FCP): < 1.5s
├── Largest Contentful Paint (LCP): < 2.5s
├── First Input Delay (FID): < 100ms
├── Cumulative Layout Shift (CLS): < 0.1
└── Time to Interactive (TTI): < 3s

Optimization Strategies:
├── Code splitting by route
├── Component lazy loading
├── Image optimization
├── Font preloading
├── Critical CSS inlining
└── Service worker caching
```

#### Runtime Performance
```typescript
React Performance:
├── Component memoization
├── Virtual scrolling for large lists
├── Debounced user inputs
├── Optimistic UI updates
├── Efficient re-rendering
└── Memory leak prevention

Bundle Optimization:
├── Tree shaking enabled
├── Dynamic imports
├── Module federation ready
├── Webpack optimizations
└── Asset compression
```

### 🗄️ Backend Performance

#### Database Performance
```typescript
Firestore Optimization:
├── Efficient query patterns
├── Proper indexing strategy
├── Pagination for large datasets
├── Caching frequently accessed data
├── Connection pooling
└── Query optimization monitoring

Real-time Performance:
├── Selective data synchronization
├── Client-side data caching
├── Optimistic updates
├── Conflict resolution
└── Bandwidth optimization
```

#### API Performance
```typescript
API Optimization:
├── Response compression (gzip)
├── Efficient serialization
├── Caching strategies
├── Rate limiting
├── Request batching
└── Error handling optimization

Monitoring Metrics:
├── Response time tracking
├── Error rate monitoring
├── Throughput measurement
├── Resource utilization
└── User experience metrics
```

---

## 📱 Responsive Design Specifications

### 🖥️ Breakpoint System

#### Screen Size Definitions
```typescript
Breakpoints:
├── xs: 0px - 374px (Small mobile)
├── sm: 375px - 767px (Mobile)
├── md: 768px - 1023px (Tablet)
├── lg: 1024px - 1439px (Desktop)
└── xl: 1440px+ (Large desktop)

Layout Strategy:
├── Mobile-first approach
├── Progressive enhancement
├── Fluid typography
├── Flexible layouts
└── Touch-friendly interactions
```

#### Component Responsiveness
```typescript
Responsive Components:
├── Adaptive navigation (hamburger on mobile)
├── Flexible grid systems
├── Scalable data tables
├── Contextual content hiding
├── Touch gesture support
└── Accessibility compliance

UI Adaptations:
├── Sidebar → Bottom navigation (mobile)
├── Table → Card layout (mobile)
├── Modal → Full screen (mobile)
├── Dropdown → Native select (mobile)
└── Tooltip → Press hint (mobile)
```

### 🎨 Design System

#### Color Palette
```typescript
Colors:
├── Primary: Blue (#2563eb)
├── Secondary: Indigo (#4f46e5)
├── Success: Green (#10b981)
├── Warning: Amber (#f59e0b)
├── Error: Red (#ef4444)
├── Neutral: Gray (#6b7280)
└── Background: White/Dark (#ffffff/#1f2937)

Semantic Colors:
├── Draft: Yellow (#fbbf24)
├── Final: Blue (#3b82f6)
├── Approved: Green (#10b981)
├── Pending: Orange (#f97316)
└── Rejected: Red (#ef4444)
```

#### Typography
```typescript
Font System:
├── Primary: Inter (Google Fonts)
├── Monospace: Fira Code
├── Font sizes: 12px - 48px
├── Line heights: 1.2 - 1.8
├── Font weights: 400, 500, 600, 700
└── Letter spacing: -0.025em to 0.1em

Text Hierarchy:
├── h1: 36px/44px, font-weight: 700
├── h2: 30px/36px, font-weight: 600
├── h3: 24px/32px, font-weight: 600
├── body: 16px/24px, font-weight: 400
└── caption: 14px/20px, font-weight: 400
```

---

## 🧪 Testing Specifications

### 🔍 Testing Strategy

#### Unit Testing
```typescript
Testing Framework: Jest + React Testing Library
├── Component testing
├── Hook testing
├── Utility function testing
├── Service layer testing
└── Integration testing

Coverage Targets:
├── Statements: 90%+
├── Branches: 85%+
├── Functions: 90%+
├── Lines: 90%+
└── Critical paths: 100%
```

#### End-to-End Testing
```typescript
E2E Framework: Playwright
├── User journey testing
├── Cross-browser testing
├── Performance testing
├── Accessibility testing
└── Visual regression testing

Test Scenarios:
├── Complete user workflows
├── Error handling paths
├── Security boundary testing
├── Performance benchmarks
└── Mobile responsiveness
```

### 🔒 Security Testing

#### Vulnerability Testing
```typescript
Security Tests:
├── OWASP Top 10 compliance
├── Input validation testing
├── Authentication bypass attempts
├── Authorization boundary testing
├── Session management testing
└── Data exposure testing

Automated Scanning:
├── Static code analysis
├── Dependency vulnerability scanning
├── Container security scanning
├── Infrastructure security testing
└── Penetration testing (quarterly)
```

---

## 📊 Monitoring & Analytics

### 📈 Application Monitoring

#### Performance Monitoring
```typescript
Metrics Collection:
├── Core Web Vitals
├── Custom performance metrics
├── Error tracking and reporting
├── User session analytics
├── API performance metrics
└── Database query performance

Monitoring Tools:
├── Vercel Analytics (built-in)
├── Custom logging system
├── Error boundary reporting
├── Performance budget alerts
└── Real user monitoring
```

#### Business Metrics
```typescript
Healthcare KPIs:
├── Form completion rates
├── Approval workflow efficiency
├── Data accuracy metrics
├── User adoption rates
├── System uptime
└── Response time percentiles

Dashboard Metrics:
├── Daily active users
├── Data entry patterns
├── Ward utilization trends
├── Staff efficiency metrics
└── System performance trends
```

### 🚨 Alerting System

#### Alert Categories
```typescript
Critical Alerts:
├── System downtime
├── Security breaches
├── Data corruption
├── Authentication failures
└── Performance degradation

Warning Alerts:
├── High error rates
├── Slow response times
├── Unusual usage patterns
├── Resource constraints
└── Backup failures

Notification Channels:
├── Email notifications
├── Slack integration
├── SMS alerts (critical)
├── Dashboard notifications
└── Mobile push notifications
```

---

## 🔧 Development Environment

### 💻 Local Development Setup

#### Required Software
```bash
# Core Requirements
Node.js 18.17.0 LTS or higher
npm 9.0.0 or higher
Git 2.40.0 or higher
VS Code (recommended)

# Firebase Tools
Firebase CLI 12.0.0+
Firebase Emulator Suite

# Development Tools
ESLint
Prettier
TypeScript
Tailwind CSS IntelliSense
```

#### Environment Configuration
```typescript
// .env.local structure
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

// Development only
FIREBASE_SERVICE_ACCOUNT_KEY=
NEXT_PUBLIC_ENVIRONMENT=development
```

### 🚀 Production Deployment

#### Build Configuration
```typescript
Production Build:
├── TypeScript compilation
├── Asset optimization
├── Bundle analysis
├── Performance budgets
├── Security scanning
└── Accessibility testing

Deployment Pipeline:
├── Git commit → Vercel build
├── Automated testing
├── Security scanning
├── Performance testing
├── Staging deployment
└── Production deployment
```

#### Infrastructure Requirements
```typescript
Hosting Platform: Vercel
├── Edge functions support
├── Automatic HTTPS
├── Global CDN
├── DDoS protection
└── Analytics integration

Database: Firebase Firestore
├── Multi-region setup
├── Automated backups
├── Security rules
├── Monitoring
└── Scaling configuration
```

---

**Last Updated**: 2025-07-14  
**Document Version**: 1.0  
**Review Cycle**: Quarterly  
**Next Review**: 2025-10-14

---

*ข้อกำหนดทางเทคนิคนี้เป็นเอกสารอ้างอิงสำหรับการพัฒนาและบำรุงรักษาระบบ กรุณาปฏิบัติตามเพื่อความสม่ำเสมอและคุณภาพของระบบ*