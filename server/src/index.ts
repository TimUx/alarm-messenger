import dotenv from 'dotenv';
import http from 'http';
import { createConfiguredApp } from './app/setup';
import { startRuntime, shutdownRuntime } from './app/lifecycle';
import logger from './utils/logger';

dotenv.config();

const { app, port } = createConfiguredApp();

// Initialize database and WebSocket
let server: http.Server;

async function startServer() {
  try {
    ({ server } = await startRuntime(app, port));
  } catch (error: unknown) {
    logger.error({ err: error }, '❌ Failed to start server');
    process.exit(1);
  }
}

startServer();

async function shutdown(signal: string): Promise<void> {
  if (!server) {
    logger.warn({ signal }, 'Shutdown requested before server startup completed');
    return;
  }
  await shutdownRuntime(server, signal);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
