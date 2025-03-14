// Local storage key for logs
const LOGS_STORAGE_KEY = 'app_logs';
const MAX_LOGS = 1000;

// ส่ง log ไปยัง server
const sendLogToServer = async (log) => {
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.warn('Failed to send log to server:', error);
    return false;
  }
};

export const logEvent = async (name, properties = {}) => {
  try {
    const log = {
      timestamp: new Date().toISOString(),
      event: name,
      properties,
    };

    // Get existing logs
    const existingLogs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || '[]');
    
    // Add new log
    existingLogs.push(log);
    
    // Keep only the latest MAX_LOGS entries
    const trimmedLogs = existingLogs.slice(-MAX_LOGS);
    
    // Save back to localStorage
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event: ${name}]`, properties);
    }

    // ส่ง log ไปยัง server (ไม่รอการตอบกลับ)
    sendLogToServer(log).catch(error => {
      console.warn('Error sending log to server:', error);
    });

    // If you have external logging service (optional)
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_URL) {
      fetch(process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      }).catch(console.error);
    }
  } catch (error) {
    console.warn('Logging failed:', error);
  }
};

export const getLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || '[]');
  } catch (error) {
    console.warn('Failed to retrieve logs:', error);
    return [];
  }
};

export const clearLogs = () => {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, '[]');
  } catch (error) {
    console.warn('Failed to clear logs:', error);
  }
};
