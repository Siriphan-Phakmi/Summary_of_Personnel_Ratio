# Architecture & Structure

## Project Structure
```
app/
├── (auth)/                 # Authentication pages
│   └── login/              # Login functionality
├── (main)/                 # Protected main application
│   ├── admin/              # Admin-only pages
│   ├── census/             # Census form and approval
│   └── dashboard/          # Data visualization
├── api/                    # Backend API routes
│   ├── auth/               # Authentication endpoints
│   ├── admin/              # Admin management
│   └── notifications/      # Notification system
├── components/ui/          # Reusable UI components
├── features/               # Feature-based modules
│   ├── admin/              # Admin functionality
│   ├── auth/               # Authentication system
│   ├── dashboard/          # Dashboard components
│   ├── notifications/      # Notification system
│   └── ward-form/          # Census form system
├── lib/                    # Utility libraries
│   ├── firebase/           # Firebase configuration
│   └── utils/              # Helper functions
└── middleware.ts           # Route protection
```

## Design Patterns
- **Feature-based Architecture**: Modular organization
- **Component Composition**: Reusable UI components
- **Custom Hooks**: Shared business logic
- **Service Layer**: API and data management
- **Type-first Development**: Comprehensive TypeScript

## Firebase Integration
- Firestore for data storage
- Real-time updates
- Security rules for access control
- Custom authentication system
- Session management