/**
 * Utility functions for handling secrets from environment variables and files
 *
 * ## Base64 encoding
 * Secrets can optionally be stored as Base64 in environment variables.
 * **Important:** Base64 is obfuscation only — it is NOT encryption and provides
 * no additional security. Anyone with access to the encoded value can trivially
 * decode it. The sole benefit is reducing accidental plain-text exposure in logs
 * or screenshots. Secrets must still be protected using proper access controls
 * (e.g. restricted file permissions, secrets managers, Docker secrets).
 *
 * ## Docker / file-based secrets
 * Use `resolveSecret(envVarName)` to support Docker secrets (or any file-based
 * secret). If an environment variable named `<NAME>_FILE` is set, the secret is
 * read from that file path (trailing whitespace stripped). Otherwise the function
 * falls back to decoding `process.env[envVarName]` as a plain or Base64 value.
 */

import fs from 'fs';
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
  // Valid Base64 can have 0, 1, or 2 padding characters at the end
  const base64Regex = /^[A-Za-z0-9+/]+(={0,2})$/;
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
      // Silent fallback for security reasons (avoid leaking implementation details)
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  DEBUG: Failed to decode potential Base64 secret, using as plain text');
      }
    }
  }
  
  // Return as-is if not Base64 or decoding failed (backward compatibility)
  return secret;
}

/**
 * Resolves a secret by name, supporting Docker / file-based secrets.
 *
 * Resolution order:
 * 1. If `process.env[envVarName + '_FILE']` is set, read the secret from that
 *    file path (trailing whitespace is stripped). This is the standard Docker
 *    secrets convention where secrets are mounted as files.
 * 2. Otherwise, decode `process.env[envVarName]` via `decodeSecret` (supports
 *    both plain text and Base64-obfuscated values).
 *
 * @param envVarName - The base environment variable name (e.g. 'JWT_SECRET')
 * @returns Resolved secret string, or `undefined` if neither source is set
 */
export function resolveSecret(envVarName: string): string | undefined {
  const fileEnvVar = `${envVarName}_FILE`;
  const filePath = process.env[fileEnvVar];

  if (filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8').trimEnd();
    } catch (error) {
      throw new Error(
        `Failed to read secret from file specified by ${fileEnvVar} ("${filePath}"): ${(error as NodeJS.ErrnoException).message}`
      );
    }
  }

  return decodeSecret(process.env[envVarName]);
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
