'use client';

/**
 * Utility function to safely execute asynchronous functions with proper error handling
 * @param {Function} fn - The async function to execute
 * @param {Array} params - Parameters to pass to the function
 * @param {Object} options - Additional options
 * @returns {Promise} - The result of the function or error
 */
export const safeExecute = async (fn, params = [], options = {}) => {
  const { 
    functionName = fn.name || 'anonymous function',
    errorMessage = 'Function execution failed',
    defaultValue = null,
    shouldThrow = false,
    logging = true
  } = options;

  try {
    // Check if function is actually a function
    if (typeof fn !== 'function') {
      const error = new Error(`${functionName} is not a function`);
      if (logging) {
        console.error(`${errorMessage}: `, error);
      }
      
      if (shouldThrow) {
        throw error;
      }
      return defaultValue;
    }

    // Execute function with provided parameters
    return await fn(...params);
  } catch (error) {
    // Log the error if logging is enabled
    if (logging) {
      console.error(`${errorMessage}: `, error);
    }
    
    // Throw error if required
    if (shouldThrow) {
      throw error;
    }
    
    // Return default value otherwise
    return defaultValue;
  }
};

/**
 * Validates required parameters for functions
 * @param {Object} params - Object containing parameter values
 * @param {Array} requiredParams - Array of required parameter names
 * @param {string} functionName - Name of the function for error reporting
 * @returns {boolean} - True if all required parameters are present
 * @throws {Error} - If any required parameter is missing
 */
export const validateParams = (params, requiredParams, functionName) => {
  const missingParams = [];
  
  for (const param of requiredParams) {
    if (params[param] === undefined || params[param] === null) {
      missingParams.push(param);
    }
  }
  
  if (missingParams.length > 0) {
    const error = `${functionName}: Missing required parameters: ${missingParams.join(', ')}`;
    console.error(error, params);
    throw new Error(error);
  }
  
  return true;
};

/**
 * Function wrapper that adds parameter validation
 * @param {Function} fn - The function to wrap
 * @param {Array} requiredParams - Array of required parameter names
 * @returns {Function} - The wrapped function with validation
 */
export const withParamValidation = (fn, requiredParams) => {
  return (...args) => {
    const functionName = fn.name || 'anonymous function';
    
    // Create params object from args
    const params = {};
    requiredParams.forEach((name, index) => {
      params[name] = args[index];
    });
    
    // Validate parameters
    validateParams(params, requiredParams, functionName);
    
    // Call original function
    return fn(...args);
  };
};