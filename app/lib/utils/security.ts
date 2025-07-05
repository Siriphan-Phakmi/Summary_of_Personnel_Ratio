/**
 * Security Utilities for Input Validation and Sanitization
 * Follows enterprise security standards to prevent XSS, injection attacks
 */

// Password strength validation rules
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

// Default password requirements (enterprise-grade) - configurable via environment variables
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
  requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
};

/**
 * Validates password strength according to enterprise security standards
 */
export function validatePasswordStrength(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validates and sanitizes username
 */
export function validateUsername(username: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!username || typeof username !== 'string') {
    return { isValid: false, sanitized: '', error: 'Username is required' };
  }

  const sanitized = sanitizeInput(username);
  
  if (sanitized.length < 3) {
    return { isValid: false, sanitized, error: 'Username must be at least 3 characters long' };
  }

  if (sanitized.length > 50) {
    return { isValid: false, sanitized, error: 'Username must not exceed 50 characters' };
  }

  // Allow only alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates and sanitizes name fields (first name, last name)
 */
export function validateName(name: string, fieldName: string = 'Name'): { isValid: boolean; sanitized: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, sanitized: '', error: `${fieldName} is required` };
  }

  const sanitized = sanitizeInput(name);
  
  if (sanitized.length < 1) {
    return { isValid: false, sanitized, error: `${fieldName} cannot be empty` };
  }

  if (sanitized.length > 100) {
    return { isValid: false, sanitized, error: `${fieldName} must not exceed 100 characters` };
  }

  // Allow letters, numbers, spaces, apostrophes, and hyphens (for hospital ward names and international names including Thai)
  // Supports: Latin (a-z, A-Z), Numbers (0-9), Extended Latin (À-ÿ), Thai (\u0E00-\u0E7F), spaces, apostrophes, hyphens
  if (!/^[a-zA-ZÀ-ÿ\u0E00-\u0E7F0-9\s'-]+$/.test(sanitized)) {
    return { isValid: false, sanitized, error: `${fieldName} can only contain letters (including Thai), numbers, spaces, apostrophes, and hyphens` };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates numeric input (for patient census, staff counts, etc.)
 */
export function validateNumericInput(value: any, fieldName: string = 'Value', min: number = 0, max: number = 9999): { isValid: boolean; sanitized: number; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, sanitized: 0, error: `${fieldName} is required` };
  }

  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, sanitized: 0, error: `${fieldName} must be a valid number` };
  }

  if (!Number.isInteger(numValue)) {
    return { isValid: false, sanitized: 0, error: `${fieldName} must be a whole number` };
  }

  if (numValue < min) {
    return { isValid: false, sanitized: numValue, error: `${fieldName} must be at least ${min}` };
  }

  if (numValue > max) {
    return { isValid: false, sanitized: numValue, error: `${fieldName} must not exceed ${max}` };
  }

  return { isValid: true, sanitized: numValue };
}

/**
 * Validates comment/text fields
 */
export function validateComment(comment: string, maxLength: number = 500): { isValid: boolean; sanitized: string; error?: string } {
  if (!comment || typeof comment !== 'string') {
    return { isValid: true, sanitized: '' }; // Comments are optional
  }

  const sanitized = sanitizeInput(comment);
  
  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized, error: `Comment must not exceed ${maxLength} characters` };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates user role
 */
export function validateUserRole(role: string): { isValid: boolean; error?: string } {
  const validRoles = ['user', 'admin', 'developer', 'approver', 'nurse'];
  
  if (!role || typeof role !== 'string') {
    return { isValid: false, error: 'Role is required' };
  }

  if (!validRoles.includes(role.toLowerCase())) {
    return { isValid: false, error: 'Invalid role specified' };
  }

  return { isValid: true };
}

/**
 * Rate limiting helper
 */
export interface RateLimitResult {
  success: boolean;
  remainingPoints: number;
  msBeforeNext: number;
}

/**
 * Simple in-memory rate limiter (for development/small-scale)
 * For production, use Redis-based rate limiting
 */
class SimpleRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  check(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): RateLimitResult {
    const now = Date.now();
    const key = identifier;
    const current = this.attempts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new entry
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return {
        success: true,
        remainingPoints: maxAttempts - 1,
        msBeforeNext: windowMs,
      };
    }

    if (current.count >= maxAttempts) {
      return {
        success: false,
        remainingPoints: 0,
        msBeforeNext: current.resetTime - now,
      };
    }

    current.count++;
    return {
      success: true,
      remainingPoints: maxAttempts - current.count,
      msBeforeNext: current.resetTime - now,
    };
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = new SimpleRateLimiter();

/**
 * CSRF Token generation and validation
 */
export function generateCSRFToken(): string {
  // Generate a random token
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates CSRF token
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  
  if (token.length !== expectedToken.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

/**
 * Applies security headers to NextResponse
 */
export function applySecurityHeaders(response: Response): Response {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}