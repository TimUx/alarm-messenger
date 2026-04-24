import connectSqlite3 from 'connect-sqlite3';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import path from 'path';
import pinoHttp from 'pino-http';
import emergencyRoutes from '../routes/emergencies';
import deviceRoutes from '../routes/devices';
import adminRoutes from '../routes/admin';
import groupRoutes from '../routes/groups';
import infoRoutes from '../routes/info';
import registrationPublicRouter from '../routes/registration-public';
import { decodeSecret } from '../utils/secrets';
import { errorHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface AppSetupResult {
  app: Application;
  isProduction: boolean;
  port: number;
}

interface CorsOptions {
  origin: '*' | string[];
  credentials: boolean;
  optionsSuccessStatus: number;
}

type SessionStoreCtor = new (options: { db: string; dir: string }) => session.Store;

function getCorsOptions(): CorsOptions {
  const corsOriginsEnv = process.env.CORS_ORIGINS || '*';
  if (corsOriginsEnv === '*') {
    logger.warn('[SECURITY] CORS_ORIGINS is set to * — all origins are allowed. Restrict this in production.');
  }
  return {
    origin: corsOriginsEnv === '*' ? '*' : corsOriginsEnv.split(',').map((origin) => origin.trim()),
    credentials: corsOriginsEnv !== '*',
    optionsSuccessStatus: 200,
  };
}

function validateSessionAndServerConfiguration(isProduction: boolean, sessionSecret: string) {
  if (sessionSecret === 'change-this-session-secret-in-production') {
    const message = '⚠️  WARNING: SESSION_SECRET is using default value. Set a secure SESSION_SECRET in your .env file for production!';
    logger.error(message);
    if (isProduction) {
      throw new Error('SESSION_SECRET must be set to a secure value in production environments');
    }
  }

  if (!isProduction) {
    return;
  }

  const serverUrl = process.env.SERVER_URL || '';
  if (!serverUrl || serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1') || serverUrl.includes('0.0.0.0') || serverUrl.includes('[::]')) {
    logger.warn('⚠️  WARNING: SERVER_URL is set to localhost in production. Make sure this is intentional and you are using a reverse proxy.');
  }
}

function applySecurityMiddleware(app: Application) {
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        scriptSrcAttr: ["'none'"],
        workerSrc: ["'self'"],
      },
    },
    hsts: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
  }));
}

function applySessionMiddleware(app: Application, sessionSecret: string, isProduction: boolean) {
  const SQLiteStore = connectSqlite3(session);
  const dbDir = path.dirname(process.env.DATABASE_PATH || './data/alarm-messenger.db');
  const SessionStore = SQLiteStore as unknown as SessionStoreCtor;
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({ db: 'sessions.db', dir: dbDir }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));
}

function applyRoutes(app: Application) {
  app.use(registrationPublicRouter);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/admin', (req, res) => {
    res.redirect('/admin/login.html');
  });
  app.get('/admin/', (req, res) => {
    res.redirect('/admin/login.html');
  });

  app.use('/admin', express.static(path.join(__dirname, '../../public/admin')));
  app.use('/api/emergencies', emergencyRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/info', infoRoutes);
}

export function createConfiguredApp(): AppSetupResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = decodeSecret(process.env.SESSION_SECRET) || 'change-this-session-secret-in-production';
  validateSessionAndServerConfiguration(isProduction, sessionSecret);

  const app: Application = express();
  const parsedPort = Number(process.env.PORT || 3000);
  const port = Number.isFinite(parsedPort) ? parsedPort : 3000;

  applySecurityMiddleware(app);
  app.use(cors(getCorsOptions()));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));
  applySessionMiddleware(app, sessionSecret, isProduction);
  applyRoutes(app);
  app.use(errorHandler);

  return { app, isProduction, port };
}
