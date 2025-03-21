'use client';

import { logEvent as clientLogEvent } from './clientLogging';

/**
 * บันทึกเหตุการณ์ต่างๆ ในระบบ
 * @param {string} name - ชื่อเหตุการณ์
 * @param {object} properties - ข้อมูลเพิ่มเติม
 * @returns {void}
 */
export const logEvent = (name, properties = {}) => {
  try {
    // เพิ่ม timestamp โดยอัตโนมัติ
    const eventProperties = {
      ...properties,
      timestamp: properties.timestamp || new Date().toISOString(),
      eventName: name
    };
    
    clientLogEvent(name, eventProperties);
  } catch (error) {
    console.warn('Error logging event:', error);
  }
};

/**
 * เริ่มต้นการบันทึก session
 * @returns {void}
 */
export const initSessionRecording = () => {
  logEvent('session_start', {
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: new Date().toISOString()
  });
};

/**
 * ระบุตัวตนผู้ใช้สำหรับการติดตาม
 * @param {string} userId - ID ของผู้ใช้
 * @param {object} userInfo - ข้อมูลผู้ใช้เพิ่มเติม
 * @returns {void}
 */
export const identifyUser = (userId, userInfo = {}) => {
  if (!userId) return;
  
  try {
    clientLogEvent('user_identified', { 
      userId, 
      ...userInfo,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.warn('Error identifying user:', error);
  }
};
