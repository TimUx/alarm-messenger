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

/**
 * Checks if a string is Base64 encoded
 * A valid Base64 string contains only A-Z, a-z, 0-9, +, /, and = (padding)
 */
function isBase64(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }
  
  // Base64 strings should be divisible by 4 (with padding)
  if (str.length % 4 !== 0) {
    return false;
  }
  
  // Check if string contains only valid Base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str);
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
  if (isBase64(secret)) {
    try {
      const decoded = Buffer.from(secret, 'base64').toString('utf-8');
      // Additional check: decoded string should not be empty
      if (decoded && decoded.length > 0) {
        return decoded;
      }
    } catch (error) {
      // If decoding fails, treat it as plain text
      console.warn('⚠️  WARNING: Failed to decode Base64 secret, using as plain text');
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
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(length);
  const plain = randomBytes.toString('base64');
  const base64 = encodeSecret(plain);
  
  return { plain, base64 };
}
