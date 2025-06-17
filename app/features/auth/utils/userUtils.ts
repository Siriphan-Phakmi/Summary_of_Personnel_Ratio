import { User } from '@/app/features/auth/types/user';

/**
 * Creates a safe user object for server actions (no complex objects).
 * Merges logic from both logService and logServerAction.
 * @param user The partial user object.
 * @returns A plain record object or null.
 */
export function createSafeUserObject(user: Partial<User> | null): Record<string, any> | null {
  if (!user) return null;

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'unknown';
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp instanceof Date) return timestamp.toISOString();
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
    if (timestamp && 'seconds' in timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000).toISOString();
    }
    return 'unknown';
  };

  return {
    uid: user.uid,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
    active: user.isActive,
    createdAt: user.createdAt ? formatTimestamp(user.createdAt) : undefined,
    lastLogin: user.lastLogin ? formatTimestamp(user.lastLogin) : undefined,
  };
} 