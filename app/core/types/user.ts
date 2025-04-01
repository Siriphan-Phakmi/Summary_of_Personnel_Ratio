/**
 * Basic User interface needed for AuthContext
 */
export interface User {
  uid: string;
  role: string;
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