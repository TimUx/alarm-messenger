import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import 'express-session';
import { decodeSecret, resolveSecret } from '../utils/secrets';
import { dbGet } from '../services/database';
import { isBlacklisted } from '../services/token-blacklist';
import logger from '../utils/logger';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    csrfToken: string;
  }
}

export const JWT_SECRET = resolveSecret('JWT_SECRET') || 'change-this-secret-in-production';
const VALID_API_KEY = decodeSecret(process.env.API_SECRET_KEY) || 'change-me-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (JWT_SECRET === 'change-this-secret-in-production') {
  const message = '⚠️  WARNING: JWT_SECRET is using default value. Set a secure JWT_SECRET in your .env file for production!';
  logger.error(message);
  if (IS_PRODUCTION) {
    throw new Error('JWT_SECRET must be set to a secure value in production environments');
  }
} else if (JWT_SECRET.length < 32) {
  const message = '⚠️  WARNING: JWT_SECRET is too short (minimum 32 characters). Set a longer JWT_SECRET in your .env file!';
  logger.error(message);
  if (IS_PRODUCTION) {
    logger.error('[FATAL] JWT_SECRET is missing or too short (minimum 32 characters). Exiting.');
    process.exit(1);
  }
}

if (VALID_API_KEY === 'change-me-in-production') {
  const message = '⚠️  WARNING: API_SECRET_KEY is using default value. Set a secure API_SECRET_KEY in your .env file for production!';
  logger.error(message);
  if (IS_PRODUCTION) {
    throw new Error('API_SECRET_KEY must be set to a secure value in production environments');
  }
} else if (VALID_API_KEY.length < 32) {
  const message = '⚠️  WARNING: API_SECRET_KEY is too short (minimum 32 characters). Set a longer API_SECRET_KEY in your .env file!';
  logger.error(message);
  if (IS_PRODUCTION) {
    logger.error('[FATAL] API_SECRET_KEY is missing or too short (minimum 32 characters). Exiting.');
    process.exit(1);
  }
}

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  userRole?: string;
}

export interface DeviceRequest extends Request {
  device?: { id: string };
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
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
    const user = await dbGet('SELECT id, username, role FROM admin_users WHERE id = ?', [userId]);

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

// Middleware to verify device token from X-Device-Token header
export const verifyDeviceToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const deviceToken = req.headers['x-device-token'] as string | undefined;

  if (!deviceToken) {
    res.status(401).json({ error: 'Missing X-Device-Token header' });
    return;
  }

  try {
    const device = await dbGet('SELECT id, active FROM devices WHERE device_token = ?', [deviceToken]);

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
