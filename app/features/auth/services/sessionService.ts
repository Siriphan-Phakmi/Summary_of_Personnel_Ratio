import { cookies } from 'next/headers';
import { User } from '@/app/features/auth/types/user';
import SessionNotificationService from '@/app/features/notifications/services/SessionNotificationService';

// Note: Session cleanup is now handled by FirestoreSessionManager

export const initializeUserSession = async (user: User): Promise<void> => {
  try {
    const sessionNotificationService = SessionNotificationService.getInstance();
    await sessionNotificationService.initializeSession(user);
  } catch (error) {
    console.error('Error initializing user session:', error);
  }
};

export const clearUserSession = async (user: User): Promise<void> => {
  try {
    const sessionNotificationService = SessionNotificationService.getInstance();
    await sessionNotificationService.clearSession(user);
  } catch (error) {
    console.error('Error clearing user session:', error);
  }
};

export const getSession = async (): Promise<User | null> => {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    const userCookie = cookieStore.get('user_data')?.value;

    if (!authToken || !userCookie) {
      return null;
    }

    const user = JSON.parse(decodeURIComponent(userCookie));
    
    // Ensure user object has required fields for Firebase logging
    if (user && typeof user.isActive === 'undefined') {
      user.isActive = true; // Default to active if not specified
    }
    
    return user;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}; 