// WebSocket service for real-time push notifications
// Uses native WebSocket API available in React Native

type MessageHandler = (message: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private deviceId: string | null = null;
  private serverUrl: string | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private isIntentionallyClosed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect(serverUrl: string, deviceId: string): void {
    this.serverUrl = serverUrl;
    this.deviceId = deviceId;
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;
    this._connect();
  }

  private _connect(): void {
    if (!this.serverUrl || !this.deviceId) {
      console.error('Cannot connect: missing serverUrl or deviceId');
      return;
    }

    // Convert http(s) URL to ws(s) URL
    const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/ws';
    
    try {
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✓ WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Register device with server
        if (this.ws && this.deviceId) {
          this.ws.send(JSON.stringify({
            type: 'register',
            deviceId: this.deviceId,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type);

          if (message.type === 'registered') {
            console.log(`✓ Device registered via WebSocket: ${message.deviceId}`);
          } else if (message.type === 'notification') {
            // Notify all registered handlers
            this.messageHandlers.forEach((handler) => {
              try {
                handler(message);
              } catch (error) {
                console.error('Error in message handler:', error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.ws = null;

        // Attempt to reconnect if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          this.reconnectInterval = setTimeout(() => {
            this._connect();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached. Please restart the app.');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
