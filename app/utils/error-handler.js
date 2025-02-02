// Custom error classes
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DataFetchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataFetchError';
  }
}

// Error messages
export const ERROR_MESSAGES = {
  INVALID_DATA: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ป้อน',
  FETCH_ERROR: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
  NETWORK_ERROR: 'เกิดปัญหาการเชื่อมต่อ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
  SERVER_ERROR: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแลระบบ',
  UNAUTHORIZED: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
};

// Error handler function
export const handleError = (error) => {
  console.error('Error occurred:', error);

  if (error instanceof ValidationError) {
    return {
      type: 'validation',
      message: error.message || ERROR_MESSAGES.INVALID_DATA
    };
  }

  if (error instanceof DataFetchError) {
    return {
      type: 'fetch',
      message: error.message || ERROR_MESSAGES.FETCH_ERROR
    };
  }

  if (error.name === 'FirebaseError') {
    switch (error.code) {
      case 'permission-denied':
        return {
          type: 'auth',
          message: ERROR_MESSAGES.UNAUTHORIZED
        };
      case 'unavailable':
        return {
          type: 'network',
          message: ERROR_MESSAGES.NETWORK_ERROR
        };
      default:
        return {
          type: 'server',
          message: ERROR_MESSAGES.SERVER_ERROR
        };
    }
  }

  return {
    type: 'unknown',
    message: ERROR_MESSAGES.SERVER_ERROR
  };
};
