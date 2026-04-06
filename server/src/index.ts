import connectSqlite3 from 'connect-sqlite3';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import path from 'path';
import http from 'http';
import pinoHttp from 'pino-http';
import emergencyRoutes from './routes/emergencies';
import deviceRoutes from './routes/devices';
import adminRoutes from './routes/admin';
import groupRoutes from './routes/groups';
import infoRoutes from './routes/info';
import { initializeDatabase, getDatabase } from './services/database';
import { websocketService } from './services/websocket';
import { emergencyScheduler } from './services/emergency-scheduler';
import { redisPubSubService } from './services/redis-pubsub';
import { decodeSecret } from './utils/secrets';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

dotenv.config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSION_SECRET = decodeSecret(process.env.SESSION_SECRET) || 'change-this-session-secret-in-production';

if (SESSION_SECRET === 'change-this-session-secret-in-production') {
  const message = '⚠️  WARNING: SESSION_SECRET is using default value. Set a secure SESSION_SECRET in your .env file for production!';
  logger.error(message);
  if (IS_PRODUCTION) {
    throw new Error('SESSION_SECRET must be set to a secure value in production environments');
  }
}

if (IS_PRODUCTION) {
  const serverUrl = process.env.SERVER_URL || '';
  if (!serverUrl || serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1') || serverUrl.includes('0.0.0.0') || serverUrl.includes('[::]')) {
    logger.warn('⚠️  WARNING: SERVER_URL is set to localhost in production. Make sure this is intentional and you are using a reverse proxy.');
  }
}

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
// Configure helmet to allow HTTP access (needed for local network deployment)
// Note: This configuration is designed for local network deployments where the server
// is accessed via IP addresses or hostnames without HTTPS. For production deployments
// with HTTPS, use a reverse proxy (Caddy/Nginx) that handles TLS termination.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false, // Disable all default CSP directives to have full control and prevent upgrade-insecure-requests from causing HTTP to HTTPS upgrade issues
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required by existing admin interface code
      styleSrc: ["'self'", "'unsafe-inline'"], // Required by existing admin interface code
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      scriptSrcAttr: ["'none'"],
      // Note: upgrade-insecure-requests is NOT included - allows HTTP access via IP/hostname
    },
  },
  // Don't force HTTPS upgrade - allow HTTP for local network access
  // Production deployments should use a reverse proxy with HTTPS
  hsts: false,
  // Disable COOP header - requires trustworthy origin (HTTPS or localhost) to be effective
  // Browsers ignore this header on HTTP with IP/hostname and show console warnings
  crossOriginOpenerPolicy: false,
  // Disable Origin-Agent-Cluster header - requires trustworthy origin
  // Causes warnings and potential issues on HTTP with IP/hostname access
  originAgentCluster: false,
}));

// CORS configuration - restrict in production
const corsOriginsEnv = process.env.CORS_ORIGINS || '*';

if (corsOriginsEnv === '*') {
  logger.warn('[SECURITY] CORS_ORIGINS is set to * — all origins are allowed. Restrict this in production.');
}

const corsOptions = {
  origin: corsOriginsEnv === '*' ? '*' : corsOriginsEnv.split(',').map(o => o.trim()),
  credentials: corsOriginsEnv !== '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Health check — registered before any auth middleware so the container health check always succeeds
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(pinoHttp({ logger }));

// Session middleware (HttpOnly cookie for browser-based admin routes)
const SQLiteStore = connectSqlite3(session);
const dbDir = path.dirname(process.env.DATABASE_PATH || './data/alarm-messenger.db');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new (SQLiteStore as any)({ db: 'sessions.db', dir: dbDir }),
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Redirect /admin and /admin/ to login page (server-side authentication gate)
app.get('/admin', (req, res) => {
  res.redirect('/admin/login.html');
});
app.get('/admin/', (req, res) => {
  res.redirect('/admin/login.html');
});

// Serve static files for admin UI
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Routes
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/info', infoRoutes);

// Global error handler
app.use(errorHandler);

// Initialize database and WebSocket
let server: http.Server;

async function startServer() {
  try {
    await initializeDatabase();
    logger.info('✓ Database initialized');

    // Connect Redis pub/sub (no-op when REDIS_URL is unset)
    redisPubSubService.connect();
    
    // Create HTTP server
    server = http.createServer(app);
    
    // Initialize WebSocket service
    websocketService.initialize(server);
    
    // Start emergency scheduler for auto-deactivation
    emergencyScheduler.start();
    
    server.listen(PORT, () => {
      logger.info(`Alarm Messenger Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Base URL: http://localhost:${PORT}/api`);
      logger.info(`WebSocket URL: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to start server');
    process.exit(1);
  }
}

startServer();

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  const hardKillTimer = setTimeout(() => {
    logger.error('Hard kill timeout - forcing exit');
    process.exit(1);
  }, 10000);
  server.close(async () => {
    clearTimeout(hardKillTimer);
    try {
      emergencyScheduler.stop();
      await redisPubSubService.disconnect();
      getDatabase().close();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
