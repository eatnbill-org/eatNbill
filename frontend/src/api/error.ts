/**
 * Phase 0 - Global Error Model
 * 
 * Centralized error handling for all API requests.
 * All errors from Axios/backend are normalized into this shape.
 * 
 * Usage:
 *   - Stores receive ApiError instances only
 *   - Components display error.message via toast
 *   - Status codes enable conditional handling (401 → logout, 403 → permission denied)
 */

import { AxiosError } from 'axios';

/**
 * Standardized API error shape.
 * All API errors must be transformed into this interface.
 */
export interface ApiError {
  /** Human-readable error message for display */
  message: string;
  
  /** Backend error code (e.g., 'AUTH_INVALID_CREDENTIALS', 'VALIDATION_ERROR') */
  code?: string;
  
  /** HTTP status code (401, 403, 404, 500, etc.) */
  status?: number;
  
  /** Additional error context (validation errors, stack traces in dev, etc.) */
  details?: unknown;
}

/**
 * Expected backend error response shape.
 * Backend should return errors in this format.
 */
interface BackendErrorResponse {
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
  message?: string; // Fallback for non-standard responses
}

/**
 * Normalizes any error into ApiError format.
 * 
 * Handles:
 * - AxiosError (network, timeout, HTTP errors)
 * - Backend error responses
 * - JavaScript Error objects
 * - Unknown error types
 * 
 * @param error - Any error type from try/catch or promise rejection
 * @param fallbackMessage - Default message if error has no message
 * @returns Normalized ApiError object
 */
export function normalizeError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): ApiError {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data as BackendErrorResponse | undefined;

    // Backend provided structured error
    if (data?.error) {
      return {
        message: data.error.message || fallbackMessage,
        code: data.error.code,
        status,
        details: data.error.details,
      };
    }

    // Backend provided simple message
    if (data?.message) {
      return {
        message: data.message,
        status,
      };
    }

    // Network/timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Request timeout. Please try again.',
        code: 'NETWORK_TIMEOUT',
        status,
      };
    }

    if (error.code === 'ERR_NETWORK') {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status,
      };
    }

    // Generic Axios error with status code
    if (status) {
      return {
        message: getHttpStatusMessage(status),
        code: `HTTP_${status}`,
        status,
      };
    }

    // Axios error without response (e.g., request never sent)
    return {
      message: error.message || fallbackMessage,
      code: error.code,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error || fallbackMessage,
    };
  }

  // Unknown error type
  return {
    message: fallbackMessage,
    details: error,
  };
}

/**
 * Maps HTTP status codes to user-friendly messages.
 */
function getHttpStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'Validation failed. Please check your input.';
    case 429:
      return 'Too many requests. Please slow down.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. The server took too long to respond.';
    default:
      return `An error occurred (${status}). Please try again.`;
  }
}

/**
 * Checks if an error is a specific HTTP status code.
 * 
 * @example
 * if (isErrorStatus(error, 401)) {
 *   // Handle unauthorized
 * }
 */
export function isErrorStatus(error: ApiError, status: number): boolean {
  return error.status === status;
}

/**
 * Checks if an error is a specific error code.
 * 
 * @example
 * if (isErrorCode(error, 'AUTH_INVALID_CREDENTIALS')) {
 *   // Handle invalid credentials
 * }
 */
export function isErrorCode(error: ApiError, code: string): boolean {
  return error.code === code;
}

/**
 * Checks if an error is a network/connectivity error.
 */
export function isNetworkError(error: ApiError): boolean {
  return (
    error.code === 'NETWORK_ERROR' ||
    error.code === 'NETWORK_TIMEOUT' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK'
  );
}
