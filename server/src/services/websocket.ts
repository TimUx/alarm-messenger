import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

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
      console.log('New WebSocket connection');
      let deviceId: string | null = null;

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (deviceId && this.clients.has(deviceId)) {
          const client = this.clients.get(deviceId);
          if (client && !client.isAlive) {
            console.log(`Terminating inactive client: ${deviceId}`);
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

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'register' && data.deviceId) {
            const registeredDeviceId = data.deviceId;
            deviceId = registeredDeviceId;
            console.log(`Device registered via WebSocket: ${registeredDeviceId}`);
            
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
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        if (deviceId) {
          console.log(`WebSocket connection closed for device: ${deviceId}`);
          this.clients.delete(deviceId);
        }
        clearInterval(pingInterval);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (deviceId) {
          this.clients.delete(deviceId);
        }
        clearInterval(pingInterval);
      });
    });

    console.log('✓ WebSocket server initialized on /ws');
  }

  async sendNotification(
    deviceId: string,
    title: string,
    body: string,
    data: any
  ): Promise<boolean> {
    const client = this.clients.get(deviceId);
    
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      console.warn(`Device ${deviceId} not connected via WebSocket`);
      return false;
    }

    try {
      const message = {
        type: 'notification',
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          type: 'emergency_alert',
        },
      };

      client.ws.send(JSON.stringify(message));
      console.log(`Notification sent to device ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Error sending notification to ${deviceId}:`, error);
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
