// สามารถใช้ service อื่นๆ เช่น Sentry, LogRocket ได้
const logError = async (error, errorInfo = {}) => {
  // ส่งข้อมูล error ไปยัง API หรือ logging service
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      ...errorInfo
    },
    userInfo: {
      // เพิ่มข้อมูล user ที่นี่ (ถ้ามี)
    },
    environment: process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_VERSION
  };

  try {
    // ตัวอย่างการส่ง error ไปยัง API
    if (process.env.NODE_ENV === 'production') {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog)
      });
    }
    
    // Log to console in development
    console.error('[Error Log]:', errorLog);
  } catch (e) {
    console.error('Failed to log error:', e);
  }
};

export const ErrorLogger = {
  log: logError,
  
  // Utility method สำหรับ log error ที่มาจาก API
  logApiError: (endpoint, error) => {
    return logError(error, { type: 'API_ERROR', endpoint });
  },

  // Utility method สำหรับ log error ที่เกี่ยวกับ form
  logFormError: (formName, error, formData) => {
    return logError(error, { 
      type: 'FORM_ERROR', 
      form: formName,
      formData: JSON.stringify(formData)
    });
  }
}; 