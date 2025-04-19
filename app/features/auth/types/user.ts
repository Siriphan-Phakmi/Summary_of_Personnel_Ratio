export enum UserRole {
  ADMIN = 'admin',
  WARD_CLERK = 'ward_clerk',
  HEAD_NURSE = 'head_nurse',
  SUPERVISOR = 'supervisor',
  VIEWER = 'viewer',
  SUPER_ADMIN = 'super_admin',
  DEVELOPER = 'developer'
}

export interface User {
  uid: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  floor?: string;
  active?: boolean;
  password?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLogin?: any;
  lastActive?: any;
} 