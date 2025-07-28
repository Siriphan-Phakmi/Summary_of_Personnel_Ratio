import { User } from '@/app/features/auth/types/user';
import { Logger } from '@/app/lib/utils/logger';
import { getUserState, updateUserState } from '@/app/features/auth/services/userStateService';
import { getUserStateServer, updateUserStateServer } from '@/app/features/auth/services/userStateService.server';
import notificationService from './NotificationService';
import { NotificationType } from '@/app/features/notifications/types/notification';

export interface SessionNotificationState {
  hasCheckedPreviousData: boolean;
  checkedWards: string[];
  checkedDates: string[];
  sessionId: string;
  lastDataCheckTime: number;
}

export interface PreviousDataCheckResult {
  shouldNotify: boolean;
  reason: string;
}

class SessionNotificationService {
  private static instance: SessionNotificationService;
  private sessionState: SessionNotificationState | null = null;
  private notificationService: typeof notificationService;

  private constructor() {
    this.notificationService = notificationService;
  }

  public static getInstance(): SessionNotificationService {
    if (!SessionNotificationService.instance) {
      SessionNotificationService.instance = new SessionNotificationService();
    }
    return SessionNotificationService.instance;
  }

  /**
   * Initialize session state after login
   */
  public async initializeSession(user: User): Promise<void> {
    try {
      const sessionId = `session_${user.uid}_${Date.now()}`;
      
      this.sessionState = {
        hasCheckedPreviousData: false,
        checkedWards: [],
        checkedDates: [],
        sessionId,
        lastDataCheckTime: 0
      };

      // Save session state to Firebase
      await updateUserStateServer(user, 'currentSession', this.sessionState);
      
      Logger.info(`[SessionNotificationService] Session initialized for user ${user.uid}`);
    } catch (error) {
      Logger.error('[SessionNotificationService] Error initializing session:', error);
    }
  }

  /**
   * Check if previous data notification should be sent
   */
  public async shouldSendPreviousDataNotification(
    user: User,
    wardName: string,
    selectedDate: string
  ): Promise<PreviousDataCheckResult> {
    try {
      // Initialize session if not exists
      if (!this.sessionState) {
        await this.initializeSession(user);
      }

      const checkKey = `${wardName}_${selectedDate}`;
      
      // Check if already checked this ward/date combination in current session
      if (this.sessionState!.checkedWards.includes(wardName) && 
          this.sessionState!.checkedDates.includes(selectedDate)) {
        return {
          shouldNotify: false,
          reason: 'Already checked this ward/date combination in current session'
        };
      }

      // Check if global previous data check was already done
      if (this.sessionState!.hasCheckedPreviousData) {
        return {
          shouldNotify: false,
          reason: 'Previous data check already performed in current session'
        };
      }

      // Check Firebase user state for persistent session data
      const userState = await getUserStateServer(user);
      if (userState?.currentSession?.sessionId === this.sessionState!.sessionId) {
        // Same session, check if already processed
        if (userState.currentSession.hasCheckedPreviousData) {
          return {
            shouldNotify: false,
            reason: 'Previous data check already performed (persisted)'
          };
        }
      }

      // This is the first check for this session
      return {
        shouldNotify: true,
        reason: 'First previous data check for this session'
      };

    } catch (error) {
      Logger.error('[SessionNotificationService] Error checking notification eligibility:', error);
      return {
        shouldNotify: false,
        reason: 'Error occurred during check'
      };
    }
  }

  /**
   * Mark previous data notification as sent
   */
  public async markPreviousDataNotificationSent(
    user: User,
    wardName: string,
    selectedDate: string
  ): Promise<void> {
    try {
      if (!this.sessionState) {
        await this.initializeSession(user);
      }

      // Update local session state
      this.sessionState!.hasCheckedPreviousData = true;
      this.sessionState!.checkedWards.push(wardName);
      this.sessionState!.checkedDates.push(selectedDate);
      this.sessionState!.lastDataCheckTime = Date.now();

      // Update Firebase user state
      await updateUserStateServer(user, 'currentSession', this.sessionState || undefined);
      
      Logger.info(`[SessionNotificationService] Marked previous data notification as sent for ${wardName} on ${selectedDate}`);
    } catch (error) {
      Logger.error('[SessionNotificationService] Error marking notification as sent:', error);
    }
  }

  /**
   * Handle data deletion - reset check state for affected ward/date
   */
  public async handleDataDeletion(
    user: User,
    wardName: string,
    selectedDate: string
  ): Promise<void> {
    try {
      if (!this.sessionState) {
        return;
      }

      // Remove from checked arrays to allow re-checking
      this.sessionState.checkedWards = this.sessionState.checkedWards.filter(w => w !== wardName);
      this.sessionState.checkedDates = this.sessionState.checkedDates.filter(d => d !== selectedDate);
      
      // If this was the only checked item, reset the global check flag
      if (this.sessionState.checkedWards.length === 0 && this.sessionState.checkedDates.length === 0) {
        this.sessionState.hasCheckedPreviousData = false;
      }

      // Update Firebase user state
      await updateUserStateServer(user, 'currentSession', this.sessionState);
      
      Logger.info(`[SessionNotificationService] Reset check state for ${wardName} on ${selectedDate} due to data deletion`);
    } catch (error) {
      Logger.error('[SessionNotificationService] Error handling data deletion:', error);
    }
  }

  /**
   * Create previous data notification with session tracking
   */
  public async createPreviousDataNotification({
    user,
    wardName,
    selectedDate,
    hasPreviousData,
    hasCurrentData = false
  }: {
    user: User;
    wardName: string;
    selectedDate: string;
    hasPreviousData: boolean;
    hasCurrentData?: boolean;
  }): Promise<void> {
    try {
      // ✅ ถ้ามีข้อมูลปัจจุบันแล้ว ไม่ต้องแจ้งเตือนเรื่องข้อมูลย้อนหลัง
      if (hasCurrentData) {
        Logger.info(`[SessionNotificationService] Skipping notification: Current data exists for ${wardName} on ${selectedDate}`);
        return;
      }

      // Check if notification should be sent
      const checkResult = await this.shouldSendPreviousDataNotification(user, wardName, selectedDate);
      
      if (!checkResult.shouldNotify) {
        Logger.info(`[SessionNotificationService] Skipping notification: ${checkResult.reason}`);
        return;
      }

      // Calculate previous date for display
      const previousDate = new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000);
      const previousDateStr = previousDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create notification data
      const notificationData = {
        title: hasPreviousData ? 'พบข้อมูลกะดึกย้อนหลัง' : 'ไม่พบข้อมูลกะดึกย้อนหลัง',
        message: hasPreviousData 
          ? `มีข้อมูลกะดึกของวันที่ ${previousDateStr} ของ${wardName} จำนวนผู้ป่วยคงเหลือจะถูกนำมาคำนวณอัตโนมัติ`
          : `ไม่มีข้อมูลกะดึกของวันที่ ${previousDateStr} ของ${wardName} จำนวนผู้ป่วยคงเหลือจะต้องกรอกเอง หรือเริ่มต้นจากศูนย์`,
        type: hasPreviousData ? NotificationType.INFO : NotificationType.WARNING,
        recipientIds: [user.uid],
        sender: {
          id: 'system',
          name: 'System'
        },
        actionUrl: `/census/form`
      };

      // Create the notification
      await this.notificationService.createNotification(notificationData);
      
      // Mark as sent
      await this.markPreviousDataNotificationSent(user, wardName, selectedDate);
      
      Logger.info(`[SessionNotificationService] Created previous data notification for user ${user.uid}: ${notificationData.title}`);
    } catch (error) {
      Logger.error('[SessionNotificationService] Failed to create notification:', error);
    }
  }

  /**
   * Clear session state (called on logout)
   */
  public async clearSession(user: User): Promise<void> {
    try {
      this.sessionState = null;
      await updateUserStateServer(user, 'currentSession', undefined);
      
      Logger.info(`[SessionNotificationService] Session cleared for user ${user.uid}`);
    } catch (error) {
      Logger.error('[SessionNotificationService] Error clearing session:', error);
    }
  }

  /**
   * Get current session state (for debugging)
   */
  public getSessionState(): SessionNotificationState | null {
    return this.sessionState;
  }
}

export default SessionNotificationService;