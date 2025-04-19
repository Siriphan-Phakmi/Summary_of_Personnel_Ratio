import { rtdb } from "@/app/core/firebase/firebase";
import { ref, serverTimestamp, update } from "firebase/database";

export const updateSessionForRefresh = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  try {
    const sessionRef = ref(rtdb , `sessions/${userId}/${sessionId}`);
    await update(sessionRef, {
      lastActive: serverTimestamp(),
      wasRefreshed: true
    });
    console.log(`[SESSION] Updated session ${sessionId} for refresh`);
  } catch (error) {
    console.error('[SESSION] Error updating session for refresh:', error);
    throw error;
  }
}; 