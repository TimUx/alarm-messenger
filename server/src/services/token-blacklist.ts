import crypto from 'crypto';
import { dbRun, dbGet } from './database';
import logger from '../utils/logger';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function cleanupExpiredTokens(): Promise<void> {
  try {
    await dbRun('DELETE FROM revoked_tokens WHERE expires_at <= ?', [new Date().toISOString()]);
  } catch (error) {
    logger.warn({ err: error }, 'Failed to cleanup expired revoked tokens');
  }
}

// Cleanup expired tokens every hour; unref() so this timer doesn't prevent process exit
setInterval(() => { cleanupExpiredTokens(); }, 60 * 60 * 1000).unref();

export async function addToBlacklist(token: string, expiresAt: number): Promise<void> {
  const hash = hashToken(token);
  const expiresAtIso = new Date(expiresAt).toISOString();
  try {
    await dbRun(
      'INSERT OR IGNORE INTO revoked_tokens (token_hash, expires_at) VALUES (?, ?)',
      [hash, expiresAtIso],
    );
  } catch (error) {
    logger.warn({ err: error }, 'Failed to add token to blacklist');
  }
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const hash = hashToken(token);
  const now = new Date().toISOString();
  try {
    const row = await dbGet<{ token_hash: string }>(
      'SELECT 1 FROM revoked_tokens WHERE token_hash = ? AND expires_at > ?',
      [hash, now],
    );
    return row !== undefined;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to check token blacklist');
    return false;
  }
}
