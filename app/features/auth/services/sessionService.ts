import { ref, remove } from 'firebase/database';
import { rtdb } from '@/app/lib/firebase/firebase';

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