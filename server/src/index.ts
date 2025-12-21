import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import http from 'http';
import emergencyRoutes from './routes/emergencies';
import deviceRoutes from './routes/devices';
import adminRoutes from './routes/admin';
import groupRoutes from './routes/groups';
import infoRoutes from './routes/info';
import { initializeDatabase } from './services/database';
import { websocketService } from './services/websocket';
import { emergencyScheduler } from './services/emergency-scheduler';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
// Configure helmet to allow HTTP access (needed for local network deployment)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Don't force HTTPS upgrade - allow HTTP for local network access
  hsts: false,
}));

// CORS configuration - restrict in production
const corsOptions = {
  origin: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for admin UI
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Routes
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/info', infoRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and WebSocket
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✓ Database initialized');
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize WebSocket service
    websocketService.initialize(server);
    
    // Start emergency scheduler for auto-deactivation
    emergencyScheduler.start();
    
    server.listen(PORT, () => {
      console.log(`\n🚀 Alarm Messenger Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket URL: ws://localhost:${PORT}/ws\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
