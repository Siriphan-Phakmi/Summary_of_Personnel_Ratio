import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

// Collection for system logs
export const SYSTEM_LOGS_COLLECTION = 'systemLogs';

// Log types for different actions
export enum LogType {
  // Authentication logs
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_LOGOUT = 'auth.logout',
  
  // Session logs
  SESSION_CREATED = 'session.created',
  SESSION_TERMINATED = 'session.terminated',
  SESSION_DUPLICATE = 'session.duplicate_login',
  
  // Ward form logs
  WARD_DRAFT_SAVED = 'ward.draft_saved',
  WARD_FORM_SUBMITTED = 'ward.form_submitted',
  WARD_FORM_APPROVED = 'ward.form_approved',
  WARD_FORM_REJECTED = 'ward.form_rejected',
  WARD_FORM_UPDATED = 'ward.form_updated',
  
  // User management logs
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ACCOUNT_LOCKED = 'user.account_locked',
  USER_ACCOUNT_UNLOCKED = 'user.account_unlocked',
  USER_ACCOUNT_ENABLED = 'user.account_enabled',
  USER_ACCOUNT_DISABLED = 'user.account_disabled',
  USER_PASSWORD_RESET = 'user.password_reset',
  USER_PROFILE_UPDATED = 'user.profile_updated',
  
  // System logs
  SYSTEM_ERROR = 'system.error',
  SYSTEM_CONFIG_UPDATED = 'system.config_updated'
}

// Log entry interface
export interface LogEntry {
  type: string;
  userId: string;
  username: string;
  details?: any;
  createdAt?: any;
  userAgent?: string;
  ipAddress?: string;
  environment?: string;
}

/**
 * Add a log entry to the database
 * This is the base function for all logging
 */
export const addLogEntry = async (logEntry: LogEntry): Promise<string | null> => {
  try {
    // Get environment info
    const environment = process.env.NODE_ENV || 'development';
    
    // Make sure we don't have undefined values (especially for userAgent)
    // This will prevent Firebase errors with undefined values
    const sanitizedEntry: Record<string, any> = {};
    
    // Copy all defined values to sanitized entry
    Object.entries(logEntry).forEach(([key, value]) => {
      if (value !== undefined) {
        sanitizedEntry[key] = value;
      }
    });
    
    // Add timestamp and environment
    const entry = {
      ...sanitizedEntry,
      createdAt: serverTimestamp(),
      environment
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, SYSTEM_LOGS_COLLECTION), entry);
    return docRef.id;
  } catch (error) {
    // Don't throw errors from logging - just log to console
    console.error('Error adding log entry:', error);
    return null;
  }
};

/**
 * Get browser user agent safely
 * Ensures we always return a string, never undefined
 */
export const getSafeUserAgent = (): string => {
  // For server-side rendering, window will not be defined
  if (typeof window === 'undefined') {
    return 'Server Side Rendering';
  }
  
  try {
    // Check if navigator exists and get user agent safely
    if (window && window.navigator) {
      const ua = window.navigator.userAgent;
      return ua || 'Browser (Unknown UA)'; 
    }
    
    // Handle edge cases
    return 'Unknown Environment';
  } catch (error) {
    // Return a default value if any error occurs
    console.error('Error getting user agent:', error);
    return 'Error Getting User Agent';
  }
};

/**
 * Detect device type
 * @returns Device type (Mobile, Tablet, Desktop) and browser info
 */
export const getDeviceInfo = (): { deviceType: string; browserName: string } => {
  try {
    if (typeof window === 'undefined') {
      return { deviceType: 'Server', browserName: 'None' };
    }

    const ua = window.navigator.userAgent.toLowerCase();
    
    // Detect browser
    let browserName = 'Unknown';
    if (ua.indexOf('edge') > -1 || ua.indexOf('edg') > -1) {
      browserName = 'Edge';
    } else if (ua.indexOf('chrome') > -1 && ua.indexOf('chromium') === -1) {
      browserName = 'Chrome';
    } else if (ua.indexOf('firefox') > -1) {
      browserName = 'Firefox';
    } else if (ua.indexOf('safari') > -1 && ua.indexOf('chrome') === -1) {
      browserName = 'Safari';
    } else if (ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1) {
      browserName = 'Internet Explorer';
    } else if (ua.indexOf('opera') > -1 || ua.indexOf('opr') > -1) {
      browserName = 'Opera';
    }

    // Detect device type
    let deviceType = 'Desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'Tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      deviceType = 'Mobile';
    }

    return { deviceType, browserName };
  } catch (error) {
    console.error('Error detecting device:', error);
    return { deviceType: 'Unknown', browserName: 'Unknown' };
  }
};

/**
 * Log successful login
 */
export const logLogin = async (
  userId: string,
  username: string,
  email: string,
  userAgent?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  
  return addLogEntry({
    type: LogType.AUTH_LOGIN,
    userId,
    username,
    details: {
      email,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: userAgent || getSafeUserAgent()
  });
};

/**
 * Log failed login attempt
 */
export const logLoginFailed = async (
  username: string,
  reason: string,
  userAgent?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  
  return addLogEntry({
    type: LogType.AUTH_LOGIN_FAILED,
    userId: 'unknown',
    username,
    details: {
      reason,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: userAgent || getSafeUserAgent()
  });
};

/**
 * Log logout
 */
export const logLogout = async (
  userId: string,
  username: string,
  userAgent?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  
  return addLogEntry({
    type: LogType.AUTH_LOGOUT,
    userId,
    username,
    details: {
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: userAgent || getSafeUserAgent()
  });
};

/**
 * Log user login success
 * @param userId User ID
 * @param username Username or email
 * @param sessionInfo Additional session info
 */
export const logSessionCreated = async (
  userId: string, 
  username: string, 
  sessionInfo: any
): Promise<void> => {
  try {
    const logEntry: LogEntry = {
      type: sessionInfo.type === 'session_ended' ? 'auth.logout' : 'auth.login',
      userId,
      username,
      details: {
        success: true,
        sessionId: sessionInfo.sessionId,
        browser: sessionInfo.browser,
        device: sessionInfo.deviceName,
        userAgent: getSafeUserAgent(),
        ...getDeviceInfo()
      },
      createdAt: new Date().toISOString()
    };
    
    await addLogEntry(logEntry);
  } catch (error) {
    console.error('Error logging session created:', error);
  }
};

/**
 * Log session termination
 */
export const logSessionTerminated = async (
  userId: string,
  userEmail: string,
  sessionId: string,
  browser: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  
  return addLogEntry({
    type: LogType.SESSION_TERMINATED,
    userId,
    username: userEmail,
    details: {
      sessionId,
      browser,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: getSafeUserAgent()
  });
};

/**
 * Log duplicate login
 */
export const logDuplicateLogin = async (
  userId: string,
  userEmail: string,
  oldBrowser: string,
  newBrowser: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  
  return addLogEntry({
    type: LogType.SESSION_DUPLICATE,
    userId,
    username: userEmail,
    details: {
      oldBrowser,
      newBrowser,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: getSafeUserAgent()
  });
};

/**
 * Log ward form actions
 */
export const logWardFormAction = async (
  userId: string,
  username: string,
  action: string,
  details: {
    wardId: string;
    wardName: string;
    formId?: string;
    date?: string;
    [key: string]: any;
  }
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  const enhancedDetails = {
    ...details,
    timestamp: new Date().toISOString(),
    deviceType: deviceInfo.deviceType,
    browserName: deviceInfo.browserName
  };
  
  return addLogEntry({
    type: action,
    userId,
    username,
    details: enhancedDetails,
    userAgent: getSafeUserAgent()
  });
};

/**
 * Log general user action
 */
export const logUserAction = async (
  userId: string,
  username: string,
  action: string,
  details?: any
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  const enhancedDetails = {
    ...(details || {}),
    timestamp: new Date().toISOString(),
    deviceType: deviceInfo.deviceType,
    browserName: deviceInfo.browserName
  };
  
  return addLogEntry({
    type: action,
    userId,
    username,
    details: enhancedDetails,
    userAgent: getSafeUserAgent()
  });
};

/**
 * Log system error
 */
export const logSystemError = async (
  error: Error,
  componentName: string,
  userId?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  
  return addLogEntry({
    type: LogType.SYSTEM_ERROR,
    userId: userId || 'system',
    username: 'system',
    details: {
      errorMessage: error.message,
      stack: error.stack,
      componentName,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: getSafeUserAgent()
  });
}; 