import { ref, remove } from 'firebase/database';
import { rtdb } from '@/app/lib/firebase/firebase';
import { cookies } from 'next/headers';
import { User } from '@/app/features/auth/types/user';
import SessionNotificationService from '@/app/features/notifications/services/SessionNotificationService';

export const clearAllUserSessions = async (userId: string): Promise<void> => {
  try {
    // Remove all sessions for the user
    const sessionsRef = ref(rtdb, `sessions/${userId}`);
    await remove(sessionsRef);

    // Also remove current session if exists
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    await remove(currentSessionRef);
  } catch (error) {
    console.error('Error clearing user sessions:', error);
    throw error;
  }
};

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