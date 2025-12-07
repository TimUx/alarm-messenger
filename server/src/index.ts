import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import emergencyRoutes from './routes/emergencies';
import deviceRoutes from './routes/devices';
import { initializeDatabase } from './services/database';
import { initializeFirebase } from './services/firebase';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/devices', deviceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and Firebase
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✓ Database initialized');
    
    await initializeFirebase();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Alarm Messenger Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Base URL: http://localhost:${PORT}/api\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
