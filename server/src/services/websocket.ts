import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { redisPubSubService } from './redis-pubsub';
import { dbGet } from './database';
import logger from '../utils/logger';

interface Client {
  ws: WebSocket;
  deviceId: string;
  isAlive: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();

  initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket connection');
      let deviceId: string | null = null;

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

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'register' && data.deviceToken) {
            const device = await dbGet(
              'SELECT id, active FROM devices WHERE device_token = ?',
              [data.deviceToken]
            );

            if (!device || device.active !== 1) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid or inactive device token' }));
              ws.close();
              return;
            }

            const registeredDeviceId = device.id;
            deviceId = registeredDeviceId;
            logger.info(`Device registered via WebSocket: ${registeredDeviceId}`);

            // Store the client connection
            this.clients.set(registeredDeviceId, {
              ws,
              deviceId: registeredDeviceId,
              isAlive: true,
            });

            // Send confirmation
            ws.send(JSON.stringify({
              type: 'registered',
              deviceId: registeredDeviceId,
            }));
          }
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
    data: any
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
        groups: data.groups || '',
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
    data: any
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
