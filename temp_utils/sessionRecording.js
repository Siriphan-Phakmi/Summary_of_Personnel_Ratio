import { logEvent as clientLogEvent } from './clientLogging';

export const logEvent = (name, properties = {}) => {
  clientLogEvent(name, properties);
};

export const initSessionRecording = () => {
  // No initialization needed
};

export const identifyUser = (userId, userInfo = {}) => {
  clientLogEvent('user_identified', { userId, ...userInfo });
};
