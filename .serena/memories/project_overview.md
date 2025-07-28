# Project Overview - Daily Census Form System

## Purpose
Hospital personnel ratio และ patient census management system สำหรับโรงพยาบาลบีพีเค

## Technology Stack
- **Frontend**: Next.js 15.3.5 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Firebase Firestore
- **Authentication**: Custom system with BCrypt
- **Styling**: Tailwind CSS with Dark/Light mode
- **Database**: Firebase Firestore with security rules
- **Language**: TypeScript (strict mode)

## User Roles
- **Staff**: Form entry for assigned wards only
- **Manager**: Data approval + dashboard access  
- **Admin**: Full system access + user management
- **Developer**: All access + dev tools + system logs

## Core Features
- Daily census form entry (morning/night shifts)
- Multi-level approval workflow
- Real-time dashboard with analytics
- Role-based access control
- Session management
- Audit logging