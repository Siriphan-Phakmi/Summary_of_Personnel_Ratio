/* eslint-disable no-console */

// A simple static logger class to wrap console logging.
// This provides a single point of control for logging behavior,
// such as enabling/disabling logs based on environment
// or sending logs to a third-party service in the future.

import { isProduction } from './environment';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const log = (level: LogLevel, message: string, ...optionalParams: any[]) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  // In a real app, you might check for process.env.NODE_ENV !== 'production'
  // to avoid logging in production, but for now, we log everything.
  
  if (optionalParams.length > 0) {
    console.log(prefix, message, ...optionalParams);
  } else {
    console.log(prefix, message);
  }
};

export const Logger = {
  /**
   * Logs an informational message.
   * @param message The primary message to log.
   * @param data Optional additional data to log.
   */
  info: (message: string, ...data: any[]) => {
    if (!isProduction()) {
      console.log(`[INFO] ${message}`, ...data);
    }
  },

  /**
   * Logs a warning message.
   * @param message The primary message to log.
   * @param data Optional additional data to log.
   */
  warn: (message: string, ...data: any[]) => {
    if (!isProduction()) {
      console.warn(`[WARN] ${message}`, ...data);
    }
  },

  /**
   * Logs an error message.
   * @param message The primary message to log.
   * @param data Optional additional data to log (usually an error object).
   */
  error: (message: string, ...data: any[]) => {
    if (!isProduction()) {
      console.error(`[ERROR] ${message}`, ...data);
    }
  },

  /**
   * Logs a debug message.
   * @param message The primary message to log.
   * @param data Optional additional data to log.
   */
  debug: (message: string, ...data: any[]) => {
    if (!isProduction()) {
      // In some environments, console.debug might not be available
      (console.debug || console.log)(`[DEBUG] ${message}`, ...data);
    }
  },
}; 