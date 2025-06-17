/**
 * Checks if the current environment is production.
 * @returns {boolean} True if the environment is production, false otherwise.
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Checks if the current environment is development.
 * @returns {boolean} True if the environment is development, false otherwise.
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
}; 