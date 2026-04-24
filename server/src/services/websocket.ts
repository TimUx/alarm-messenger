import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import jwt from 'jsonwebtoken';
import { redisPubSubService } from './redis-pubsub';
import { dbGet } from './database';
import { JWT_SECRET } from '../middleware/auth';
import logger from '../utils/logger';
import { PushNotificationData } from './push-notification';

interface Client {
  ws: WebSocket;
  deviceId: string;
  isAlive: boolean;
}

interface WebSocketAuthPayload {
  deviceId?: string;
}

interface DeviceActiveRow {
  id: string;
  active: number;
}

interface WebSocketIncomingMessage {
  type?: unknown;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();

  initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: WebSocket, req) => {
      // Authenticate via JWT provided as ?token= query parameter
      let deviceId: string | null = null;
      try {
        const token = new URL(req.url || '?', 'http://localhost').searchParams.get('token');
        if (!token) throw new Error('No token');
        const payload = jwt.verify(token, JWT_SECRET) as WebSocketAuthPayload;
        if (!payload.deviceId) throw new Error('Missing deviceId in token');
        deviceId = payload.deviceId;
      } catch {
        ws.close(4001, 'Unauthorized');
        return;
      }

      // Verify the device is active in the database
      try {
        const device = await dbGet<DeviceActiveRow>('SELECT id, active FROM devices WHERE id = ?', [deviceId]);
        if (!device || device.active !== 1) {
          ws.close(4001, 'Unauthorized');
          return;
        }
      } catch (error) {
        logger.error({ err: error }, 'Error verifying device during WebSocket upgrade');
        ws.close(1011, 'Internal error');
        return;
      }

      logger.info(`New WebSocket connection for device: ${deviceId}`);

      // Register the authenticated device immediately
      this.clients.set(deviceId, { ws, deviceId, isAlive: true });
      ws.send(JSON.stringify({ type: 'registered', deviceId }));

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (deviceId && this.clients.has(deviceId)) {
          const client = this.clients.get(deviceId);
          if (client && !client.isAlive) {
            logger.info(`Terminating inactive client: ${deviceId}`);
            clearInterval(pingInterval);
            client.ws.terminate();
            this.clients.delete(deviceId);
            return;
          }
          if (client) {
            client.isAlive = false;
            client.ws.ping();
          }
        }
      }, 30000);

      ws.on('pong', () => {
        if (deviceId && this.clients.has(deviceId)) {
          const client = this.clients.get(deviceId);
          if (client) {
            client.isAlive = true;
          }
        }
      });

      ws.on('message', async (message: RawData) => {
        try {
          const parsed: unknown = JSON.parse(message.toString());
          const data = (typeof parsed === 'object' && parsed !== null)
            ? parsed as WebSocketIncomingMessage
            : {};
          logger.debug({ type: data.type, deviceId }, 'WebSocket message received');
        } catch (error) {
          logger.error({ err: error }, 'Error processing WebSocket message');
        }
      });

      ws.on('close', () => {
        if (deviceId) {
          logger.info(`WebSocket connection closed for device: ${deviceId}`);
          this.clients.delete(deviceId);
        }
        clearInterval(pingInterval);
      });

      ws.on('error', (error) => {
        logger.error({ err: error }, 'WebSocket error');
        if (deviceId) {
          this.clients.delete(deviceId);
        }
        clearInterval(pingInterval);
      });
    });

    logger.info('✓ WebSocket server initialized on /ws');

    // Forward Redis pub/sub emergency messages to locally connected clients
    redisPubSubService.subscribe((message) => {
      this.sendBulkNotifications(message.deviceIds, message.title, message.body, message.data);
    });
  }

  async sendNotification(
    deviceId: string,
    title: string,
    body: string,
    data: PushNotificationData
  ): Promise<boolean> {
    const client = this.clients.get(deviceId);
    
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Device ${deviceId} not connected via WebSocket`);
      return false;
    }

    try {
      const message = {
        type: 'emergency', // Changed from 'notification' to 'emergency' for direct handling
        notification: {
          title,
          body,
        },
        // Emergency data fields directly at root level for easier access
        emergencyId: data.emergencyId,
        emergencyNumber: data.emergencyNumber,
        emergencyDate: data.emergencyDate,
        emergencyKeyword: data.emergencyKeyword,
        emergencyDescription: data.emergencyDescription,
        emergencyLocation: data.emergencyLocation,
        groups: data.groups,
      };

      client.ws.send(JSON.stringify(message));
      logger.info(`Notification sent to device ${deviceId}`);
      return true;
    } catch (error) {
      logger.error({ err: error }, `Error sending notification to ${deviceId}`);
      return false;
    }
  }

  async sendBulkNotifications(
    deviceIds: string[],
    title: string,
    body: string,
    data: PushNotificationData
  ): Promise<void> {
    const promises = deviceIds.map((deviceId) =>
      this.sendNotification(deviceId, title, body, data)
    );

    await Promise.allSettled(promises);
  }

  getConnectedDevices(): string[] {
    return Array.from(this.clients.keys());
  }

  isDeviceConnected(deviceId: string): boolean {
    const client = this.clients.get(deviceId);
    return client !== undefined && client.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
