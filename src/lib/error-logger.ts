/**
 * Error logger utility for consistent error handling across the application
 * Provides special handling for Supabase and database-related errors
 */

type ErrorSource = 'database' | 'auth' | 'api' | 'ui' | 'unknown';

interface LoggedError {
  message: string;
  source: ErrorSource;
  code?: string | number;
  details?: any;
  timestamp: string;
}

// Keep a record of recent errors for debugging
const recentErrors: LoggedError[] = [];
const MAX_RECENT_ERRORS = 10;

/**
 * Log an error with detailed information
 */
export function logError(error: any, source: ErrorSource = 'unknown', context?: string) {
  // Format the error
  const loggedError: LoggedError = {
    message: error?.message || 'Unknown error',
    source,
    timestamp: new Date().toISOString(),
  };

  // Add Supabase specific error information if available
  if (error?.code) {
    loggedError.code = error.code;
  }

  // Add additional details for database errors
  if (source === 'database') {
    loggedError.details = {
      hint: error?.hint,
      details: error?.details,
      table: context, // Often the table name
    };
    
    // Parse PostgreSQL error codes
    // https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (typeof error?.code === 'string' && error.code.match(/^[0-9A-Z]{5}$/)) {
      const pgCode = error.code;
      const pgErrors: Record<string, string> = {
        '23505': 'Unique constraint violation',
        '23503': 'Foreign key constraint violation',
        '23502': 'Not null constraint violation',
        '23514': 'Check constraint violation',
        '42P01': 'Table does not exist',
        '42703': 'Column does not exist',
        // Add more as needed
      };
      
      loggedError.details.explanation = pgErrors[pgCode] || 'Database error';
    }
  }

  // Store for later reference
  recentErrors.unshift(loggedError);
  if (recentErrors.length > MAX_RECENT_ERRORS) {
    recentErrors.pop();
  }

  // Console output with special formatting for database errors
  if (source === 'database') {
    console.error(
      `%c[DATABASE ERROR] ${loggedError.message}`,
      'color: red; font-weight: bold;',
      {
        code: loggedError.code,
        context: context || 'Unknown operation', 
        details: loggedError.details,
        timestamp: loggedError.timestamp
      }
    );
  } else {
    console.error(
      `%c[${source.toUpperCase()} ERROR] ${loggedError.message}`,
      'color: orange; font-weight: bold;',
      { 
        code: loggedError.code,
        context: context || 'Unknown context',
        timestamp: loggedError.timestamp
      }
    );
  }

  return loggedError;
}

/**
 * Get recent errors for debugging
 */
export function getRecentErrors() {
  return [...recentErrors];
}

/**
 * Log a specific database error
 */
export function logDatabaseError(error: any, table: string, operation: string) {
  return logError(error, 'database', `${table}.${operation}`);
}

/**
 * Format an error message for user display
 */
export function formatErrorForUser(error: any, defaultMessage = 'An unexpected error occurred'): string {
  if (!error) return defaultMessage;
  
  // Handle Supabase/database errors with user-friendly messages
  if (error.code) {
    const errorMessages: Record<string, string> = {
      '23505': 'This record already exists.',
      '23503': 'This operation references a record that doesn\'t exist.',
      '23502': 'A required field is missing.',
      'PGRST301': 'The resource you requested doesn\'t exist.',
      // Add more user-friendly messages as needed
    };
    
    if (errorMessages[error.code]) {
      return errorMessages[error.code];
    }
  }
  
  // Return the error message or a fallback
  return error.message || defaultMessage;
}
