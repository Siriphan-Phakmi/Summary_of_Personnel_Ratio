/**
 * User roles for role-based access control
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  DEVELOPER = 'developer'
}

/**
 * Basic User interface needed for AuthContext
 */
export interface User {
  uid: string;
  role: UserRole | string;
  location?: string[];
  firstName?: string;
  username?: string;
  lastName?: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUpdated?: string;
  active?: boolean;
}