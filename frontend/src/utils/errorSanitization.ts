/**
 * Error message sanitization utilities for analytics
 * Prevents sensitive information from being sent to Google Analytics
 */

// Patterns that might contain sensitive information
const SENSITIVE_PATTERNS = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers (various formats)
  /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  // Credit card numbers (simple pattern)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // Social Security Numbers
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // API keys or tokens (patterns like xxx-xxx-xxx or long alphanumeric strings)
  /\b[A-Za-z0-9]{20,}\b/g,
  // JWT tokens (three parts separated by dots)
  /\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  // IP addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // URLs with potentially sensitive query parameters
  /https?:\/\/[^\s]+\?[^\s]+/g,
];

// Common error patterns to preserve (these are safe and useful for analytics)
const SAFE_ERROR_PATTERNS = [
  'Network Error',
  'Timeout',
  'Connection refused',
  'Internal Server Error',
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Method Not Allowed',
  'Conflict',
  'Unprocessable Entity',
  'Too Many Requests',
  'Service Unavailable',
  'Gateway Timeout',
];

/**
 * Sanitizes error messages by removing sensitive information
 * @param errorMessage - The original error message
 * @param maxLength - Maximum length of the sanitized message (default: 200)
 * @returns Sanitized error message safe for analytics
 */
export const sanitizeErrorMessage = (
  errorMessage: string,
  maxLength: number = 200
): string => {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return 'Unknown error';
  }

  let sanitized = errorMessage;

  // Replace sensitive patterns with placeholders
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  // Preserve common HTTP status patterns
  const statusCodePattern = /\b[1-5]\d{2}\b/g;
  const statusCodes = errorMessage.match(statusCodePattern) || [];

  // Check if it's a safe error pattern
  const isSafePattern = SAFE_ERROR_PATTERNS.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );

  // If the message becomes too generic after sanitization, use a safe generic message
  if (
    sanitized.replace(/\[REDACTED\]/g, '').trim().length < 10 &&
    !isSafePattern
  ) {
    if (statusCodes.length > 0) {
      sanitized = `HTTP ${statusCodes[0]} Error`;
    } else {
      sanitized = 'Application Error';
    }
  }

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }

  return sanitized;
};

/**
 * Sanitizes error type/category for analytics
 * @param errorType - The error type or category
 * @returns Sanitized error type
 */
export const sanitizeErrorType = (errorType: string): string => {
  if (!errorType || typeof errorType !== 'string') {
    return 'Unknown';
  }

  // Keep only alphanumeric characters, spaces, and common punctuation
  const sanitized = errorType
    .replace(/[^a-zA-Z0-9\s\-_:.]/g, '')
    .trim()
    .substring(0, 50); // Limit length

  return sanitized || 'Unknown';
};

/**
 * Creates a safe error summary for analytics
 * @param error - Error object or string
 * @returns Safe error summary object
 */
export const createSafeErrorSummary = (
  error: unknown
): {
  type: string;
  message: string;
} => {
  let errorType = 'Unknown';
  let errorMessage = 'Unknown error';

  if (error instanceof Error) {
    errorType = error.name || 'Error';
    errorMessage = error.message || 'No message';
  } else if (typeof error === 'string') {
    errorMessage = error;
    errorType = 'String Error';
  } else if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    errorType =
      (typeof errorObj.type === 'string' ? errorObj.type : '') ||
      (typeof errorObj.name === 'string' ? errorObj.name : '') ||
      'Object Error';
    errorMessage =
      (typeof errorObj.message === 'string' ? errorObj.message : '') ||
      (typeof errorObj.error === 'string' ? errorObj.error : '') ||
      error.toString();
  }

  return {
    type: sanitizeErrorType(errorType),
    message: sanitizeErrorMessage(errorMessage),
  };
};
