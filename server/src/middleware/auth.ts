import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import 'express-session';
import { decodeSecret, resolveSecret } from '../utils/secrets';
import { dbGet } from '../services/database';
import { isBlacklisted } from '../services/token-blacklist';
import logger from '../utils/logger';
import { enforceSecretPolicy } from './auth/secret-policy';
import { AdminUserRow } from '../models/db-types';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    csrfToken: string;
  }
}

export const JWT_SECRET = resolveSecret('JWT_SECRET') || 'change-this-secret-in-production';
const VALID_API_KEY = decodeSecret(process.env.API_SECRET_KEY) || 'change-me-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

enforceSecretPolicy({
  envName: 'JWT_SECRET',
  value: JWT_SECRET,
  defaultValue: 'change-this-secret-in-production',
  isProduction: IS_PRODUCTION,
});
enforceSecretPolicy({
  envName: 'API_SECRET_KEY',
  value: VALID_API_KEY,
  defaultValue: 'change-me-in-production',
  isProduction: IS_PRODUCTION,
});

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  userRole?: string;
}

export interface DeviceRequest extends Request {
  device?: { id: string };
}

interface DeviceAuthRow {
  id: string;
  active: number;
}

interface JwtAdminPayload {
  userId: string;
  username: string;
  role: string;
}

// Middleware to verify JWT token
export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    if (await isBlacklisted(token)) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }
  } catch (error) {
    logger.warn({ err: error }, 'Token blacklist check failed, continuing');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtAdminPayload;
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Middleware to verify API key for emergency creation
export const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = (req.headers['x-api-key'] as string) || '';

  if (!safeCompare(apiKey, VALID_API_KEY)) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  next();
};

// Generate JWT token for admin users
export const generateToken = (userId: string, username: string, role: string = 'admin'): string => {
  return jwt.sign(
    { userId, username, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Generate JWT token for device WebSocket authentication
export const generateDeviceToken = (deviceId: string): string => {
  return jwt.sign(
    { deviceId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Middleware to verify admin role
export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    return;
  }
  next();
};

// Middleware to verify browser session (HttpOnly cookie set on login)
export const verifySession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // CSRF protection for state-mutating requests (allowlist safe methods)
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (!SAFE_METHODS.has(req.method.toUpperCase())) {
    const csrfToken = req.headers['x-csrf-token'] as string | undefined;
    if (!csrfToken || csrfToken !== req.session.csrfToken) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }
  }

  try {
    const user = await dbGet<Pick<AdminUserRow, 'id' | 'username' | 'role'>>(
      'SELECT id, username, role FROM admin_users WHERE id = ?',
      [userId],
    );

    if (!user) {
      res.status(401).json({ error: 'Session invalid' });
      return;
    }

    req.userId = user.id;
    req.username = user.username;
    req.userRole = user.role || 'admin';
    next();
  } catch (error) {
    logger.error({ err: error }, 'Error verifying session');
    res.status(500).json({ error: 'Failed to verify session' });
  }
};

// Generate a cryptographically random CSRF token
export const generateCsrfToken = (): string => crypto.randomBytes(32).toString('hex');

// Accepts either a valid API key (X-Api-Key) or a valid device token (X-Device-Token).
// This allows both server-to-server calls (alarm-monitor) and mobile-app calls on the same route.
// If an X-Api-Key header is present but invalid, the request is rejected immediately.
export const verifyApiKeyOrDeviceToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey !== undefined) {
    if (safeCompare(apiKey, VALID_API_KEY)) {
      return next();
    }
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }
  return verifyDeviceToken(req, res, next);
};

// Middleware to verify device token from X-Device-Token header
export const verifyDeviceToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const deviceToken = req.headers['x-device-token'] as string | undefined;

  if (!deviceToken) {
    res.status(401).json({ error: 'Missing X-Device-Token header' });
    return;
  }

  try {
    const device = await dbGet<DeviceAuthRow>('SELECT id, active FROM devices WHERE device_token = ?', [deviceToken]);

    if (!device || device.active !== 1) {
      res.status(401).json({ error: 'Invalid or inactive device token' });
      return;
    }

    (req as DeviceRequest).device = { id: device.id };
    next();
  } catch (error) {
    logger.error({ err: error }, 'Error verifying device token');
    res.status(500).json({ error: 'Failed to verify device token' });
  }
};
