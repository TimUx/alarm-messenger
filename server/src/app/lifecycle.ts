import http from 'http';
import { Application } from 'express';
import { initializeDatabase, getDatabase } from '../services/database';
import { websocketService } from '../services/websocket';
import { emergencyScheduler } from '../services/emergency-scheduler';
import { notificationEscalationService } from '../services/notification-escalation';
import { redisPubSubService } from '../services/redis-pubsub';
import logger from '../utils/logger';

export interface ServerRuntime {
  server: http.Server;
}

export async function startRuntime(app: Application, port: number): Promise<ServerRuntime> {
  await initializeDatabase();
  logger.info('✓ Database initialized');

  redisPubSubService.connect();
  const server = http.createServer(app);
  websocketService.initialize(server);
  emergencyScheduler.start();
  notificationEscalationService.start();

  server.listen(port, () => {
    logger.info(`Alarm Messenger Server running on port ${port}`);
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`API Base URL: http://localhost:${port}/api`);
    logger.info(`WebSocket URL: ws://localhost:${port}/ws`);
  });

  return { server };
}

export async function shutdownRuntime(server: http.Server, signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  const hardKillTimer = setTimeout(() => {
    logger.error('Hard kill timeout - forcing exit');
    process.exit(1);
  }, 10000);

  server.close(async () => {
    clearTimeout(hardKillTimer);
    try {
      emergencyScheduler.stop();
      notificationEscalationService.stop();
      await redisPubSubService.disconnect();
      getDatabase().close();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error: unknown) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  });
}
