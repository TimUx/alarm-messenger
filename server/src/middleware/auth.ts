import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { decodeSecret } from '../utils/secrets';
import { dbGet } from '../services/database';

const JWT_SECRET = decodeSecret(process.env.JWT_SECRET) || 'change-this-secret-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (JWT_SECRET === 'change-this-secret-in-production') {
  const message = '⚠️  WARNING: JWT_SECRET is using default value. Set a secure JWT_SECRET in your .env file for production!';
  console.error(message);
  if (IS_PRODUCTION) {
    throw new Error('JWT_SECRET must be set to a secure value in production environments');
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
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

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

// Middleware to verify API key for emergency creation
export const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = decodeSecret(process.env.API_SECRET_KEY) || 'change-me-in-production';

  if (validApiKey === 'change-me-in-production') {
    const message = '⚠️  WARNING: API_SECRET_KEY is using default value. Set a secure API_SECRET_KEY in your .env file for production!';
    console.error(message);
    if (IS_PRODUCTION) {
      res.status(500).json({ error: 'Server configuration error: API_SECRET_KEY not properly configured' });
      return;
    }
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  next();
};

// Generate JWT token
export const generateToken = (userId: string, username: string, role: string = 'admin'): string => {
  return jwt.sign(
    { userId, username, role },
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
    console.error('Error verifying device token:', error);
    res.status(500).json({ error: 'Failed to verify device token' });
  }
};
