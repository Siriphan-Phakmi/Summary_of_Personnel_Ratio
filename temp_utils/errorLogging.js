import { logEvent } from './clientLogging';

const logError = async (error, errorInfo = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      ...errorInfo
    },
    userInfo: {
      // เล่มข้อมูล user นี้ (ถ้ามี)
    },
    environment: process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_VERSION
  };

  try {
    // Log to clientLogging
    logEvent('error', errorLog);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Log]:', errorLog);
    }
  } catch (e) {
    console.error('Failed to log error:', e);
  }
};

export const ErrorLogger = {
  log: logError,
  
  logApiError: (endpoint, error) => {
    return logError(error, { type: 'API_ERROR', endpoint });
  },

  logFormError: (formName, error, formData) => {
    return logError(error, { 
      type: 'FORM_ERROR', 
      form: formName,
      formData: JSON.stringify(formData)
    });
  }
}; 
