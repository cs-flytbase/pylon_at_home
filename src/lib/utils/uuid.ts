/**
 * UUID validation and utility functions
 */

/**
 * Validates if a string is a valid UUID v4 format
 * @param str The string to validate
 * @returns True if the string is a valid UUID, false otherwise
 */
export function isValidUUID(str: string): boolean {
  if (!str) return false;
  
  // Regular expression for UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Returns a fallback UUID if the provided string is not a valid UUID
 * @param str The string to validate
 * @param fallback The fallback UUID to use if the input is invalid
 * @returns The input string if valid, or the fallback UUID
 */
export function ensureValidUUID(str: string, fallback: string): string {
  return isValidUUID(str) ? str : fallback;
}

/**
 * Generates a default system UUID for AI-related functionality
 * @returns A UUID string representing the system user
 */
export function getSystemUUID(): string {
  return '00000000-0000-0000-0000-000000000000';
}

/**
 * Default fallback AI agent UUID
 * @returns A UUID string for the default AI agent
 */
export function getDefaultAgentUUID(): string {
  return '5dc8f92e-1a42-4763-856a-1449b012ab68';
}
