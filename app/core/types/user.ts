/**
 * Basic User interface needed for AuthContext
 */
export interface User {
  uid: string;
  role: string;
  wards?: string[];
  firstName?: string;
  lastName?: string;
  username?: string;
} 