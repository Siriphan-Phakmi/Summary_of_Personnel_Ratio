import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import toast from 'react-hot-toast';

  /**
 * A centralized logging utility for the application.
 * It handles logging to the console during development,
 * showing user-facing toasts, and sending error reports
 * to a monitoring service in production.
 */
export class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * Logs informational messages. Only outputs to the console in development.
   * @param message The main message to log.
   * @param data Additional data to log with the message.
   */
  static info(message: string, ...data: any[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, ...data);
    }
  }

  /**
   * Logs error messages.
   * In development, it logs to the console.
   * It can optionally show a toast to the user.
   * @param message The user-friendly error message to display.
   * @param error The actual error object or details.
   * @param options Configuration for the log, e.g., { showToast: true }.
   */
  static error(message: string, error?: any, options?: { showToast?: boolean }): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, { error: errorMessage, details: error });
      }

    if (options?.showToast) {
      toast.error(message);
    }
    
    // In a real production environment, this is where you would send
    // the error to a service like Sentry, LogRocket, or a custom backend.
    // this.sendToMonitoringService(message, error);
  }

  /**
   * Logs success messages.
   * Can optionally show a success toast to the user.
   * @param message The success message to display.
   * @param options Configuration for the log, e.g., { showToast: true }.
   */
  static success(message: string, options?: { showToast?: boolean }): void {
    if (this.isDevelopment) {
      console.log(`[SUCCESS] ${message}`);
    }
    if (options?.showToast) {
      toast.success(message);
    }
  }
}

/**
 * Logs a detailed system-level error to Firestore for backend monitoring.
 * This should be used in catch blocks for critical operations.
 * @param error The Error object that was caught.
 * @param component The name of the component or function where the error occurred.
 * @param context Additional context (e.g., user ID, state) to aid in debugging.
 */
export const logSystemError = (error: Error, component: string, context?: Record<string, any>) => {
  const message = `An unexpected error occurred in ${component}.`;
  // Log the error to the console for immediate visibility during development
  Logger.error(message, error, { showToast: false }); 
    
  // Send the detailed error to Firestore for persistent logging
  if (process.env.NEXT_PUBLIC_ERROR_LOGGING === 'true') {
      try {
      addDoc(collection(db, 'systemErrorLogs'), {
        component,
        errorMessage: error.message,
        stack: error.stack,
        context: context || {},
        timestamp: Timestamp.now(),
      }).catch(logError => {
        // This is a critical failure in the logging system itself
        console.error('[Logger] CRITICAL: Failed to log system error to Firestore:', logError);
        });
    } catch (logError) {
      console.error('[Logger] CRITICAL: Exception during system error logging:', logError);
    }
  }
}; 