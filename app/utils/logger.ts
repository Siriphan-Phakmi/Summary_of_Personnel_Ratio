/* eslint-disable no-console */

// A simple logger utility to standardize console output.
// This can be expanded later to integrate with a logging service.
export class Logger {
  private static logWithLevel(level: 'log' | 'warn' | 'error', message: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${level.toUpperCase()}] ${timestamp}:`;

    if (process.env.NODE_ENV !== 'production' || level === 'error') {
        console[level](prefix, message, ...optionalParams);
    }
  }

  /**
   * Logs a standard informational message.
   * (Does not log in production environment)
   */
  static log(message: string, ...optionalParams: any[]) {
    this.logWithLevel('log', message, ...optionalParams);
  }

  /**
   * Logs a warning message.
   * (Does not log in production environment)
   */
  static warn(message: string, ...optionalParams: any[]) {
    this.logWithLevel('warn', message, ...optionalParams);
  }

  /**
   * Logs an error message.
   * (Always logs, regardless of environment)
   */
  static error(message: string, ...optionalParams: any[]) {
    this.logWithLevel('error', message, ...optionalParams);
  }
} 