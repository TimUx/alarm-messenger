/**
 * Utility functions for handling Base64-encoded secrets
 * 
 * This module provides functions to decode Base64-encoded secrets from environment variables.
 * Secrets can be stored in Base64 format to avoid plain text storage in configuration files.
 * 
 * Benefits:
 * - Secrets are not immediately readable in config files
 * - Reduces risk of accidental exposure in logs or screenshots
 * - Maintains compatibility with plain text secrets (automatic fallback)
 */

import crypto from 'crypto';

/**
 * Checks if a string looks like Base64 encoded
 * This is a conservative heuristic - when in doubt, treat as plain text
 * The actual decoding attempt is the final validation
 */
function looksLikeBase64(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }
  
  // Must contain only Base64 characters (including padding)
  const base64Regex = /^[A-Za-z0-9+/]+(={0,2})?$/;
  if (!base64Regex.test(str)) {
    return false;
  }
  
  // Conservative length check: properly padded Base64 should be divisible by 4
  // This helps distinguish between Base64 and plain hex/alphanumeric strings
  if (str.length % 4 !== 0) {
    return false;
  }
  
  // Additional heuristic: Base64 typically has a mix of cases or special chars
  // Plain passwords like "password123" or "admin" rarely look like valid Base64
  // Check if it has at least one of: uppercase, special chars (+, /, =)
  const hasUpperCase = /[A-Z]/.test(str);
  const hasLowerCase = /[a-z]/.test(str);
  const hasSpecialChars = /[+/=]/.test(str);
  
  // If it has padding, it's likely Base64
  if (str.endsWith('=')) {
    return true;
  }
  
  // If it has both cases or has special Base64 chars, likely Base64
  // Otherwise, treat as plain text (conservative approach)
  return (hasUpperCase && hasLowerCase) || hasSpecialChars;
}

/**
 * Decodes a Base64-encoded secret
 * If the secret is not Base64-encoded, returns it as-is (backward compatibility)
 * 
 * @param secret - The secret string, either Base64-encoded or plain text
 * @returns Decoded secret string
 */
export function decodeSecret(secret: string | undefined): string | undefined {
  if (!secret) {
    return undefined;
  }
  
  // If the secret looks like Base64, try to decode it
  if (looksLikeBase64(secret)) {
    try {
      const decoded = Buffer.from(secret, 'base64').toString('utf-8');
      // Ensure decoded string contains meaningful content (not just whitespace)
      if (decoded.trim().length > 0) {
        return decoded;
      }
    } catch (error) {
      // If decoding fails, treat it as plain text (backward compatibility)
      // Use a generic message to avoid leaking implementation details
    }
  }
  
  // Return as-is if not Base64 or decoding failed (backward compatibility)
  return secret;
}

/**
 * Encodes a secret to Base64 format
 * Useful for generating Base64-encoded secrets for configuration files
 * 
 * @param secret - Plain text secret
 * @returns Base64-encoded secret
 */
export function encodeSecret(secret: string): string {
  return Buffer.from(secret, 'utf-8').toString('base64');
}

/**
 * Generates a random secret and returns both plain and Base64-encoded versions
 * Useful for initial setup or secret rotation
 * 
 * @param length - Length of the random secret in bytes (default: 32)
 * @returns Object with plain and base64 encoded secret
 */
export function generateSecret(length: number = 32): { plain: string; base64: string } {
  const randomBytes = crypto.randomBytes(length);
  const plain = randomBytes.toString('hex');
  const base64 = encodeSecret(plain);
  
  return { plain, base64 };
}
