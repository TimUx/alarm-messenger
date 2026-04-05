import { Response } from 'express';
import logger from '../utils/logger';

const clients = new Set<Response>();

export function addSseClient(res: Response): void {
  clients.add(res);
}

export function removeSseClient(res: Response): void {
  clients.delete(res);
}

export function broadcastSseEvent(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch (error) {
      logger.error({ err: error }, 'Error writing to SSE client; removing from pool');
      clients.delete(res);
    }
  }
}
