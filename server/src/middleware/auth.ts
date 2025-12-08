import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { decodeSecret } from '../utils/secrets';

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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    req.userId = decoded.userId;
    req.username = decoded.username;
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
export const generateToken = (userId: string, username: string): string => {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};
