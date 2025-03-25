# BPK Personnel Ratio Application

A comprehensive application for managing ward personnel ratios and patient census data for BPK Hospital.

## Features

- User authentication with role-based access control
- Ward data form with morning and night shift data entry
- Approval process for submitted ward data
- Dashboard for analytics and reporting
- User management for administrators
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
  /components       # UI components
    /ui             # Generic UI components
    /layout         # Layout components
    /wardForm       # Ward form specific components
  /contexts         # React contexts
  /hooks            # Custom React hooks
  /lib              # Utility libraries
  /page             # Route pages
    /approval       # Approval management
    /dashboard      # Analytics dashboard
    /user-management # User management
    /ward-form      # Ward data entry form
  /services         # API services
  /types            # TypeScript types
  /utils            # Utility functions
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
3. Once both shifts are approved, 24-hour summary is entered
4. Approved data becomes available for dashboard analytics

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
