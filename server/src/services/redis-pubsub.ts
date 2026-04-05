import Redis from 'ioredis';

const EMERGENCY_CHANNEL = 'emergency:created';

export interface EmergencyMessage {
  deviceIds: string[];
  title: string;
  body: string;
  data: {
    emergencyId: string;
    emergencyNumber: string;
    emergencyDate: string;
    emergencyKeyword: string;
    emergencyDescription: string;
    emergencyLocation: string;
    groups: string;
  };
}

class RedisPubSubService {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private enabled = false;

  connect(): void {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log('ℹ Redis pub/sub disabled (REDIS_URL not set)');
      return;
    }

    try {
      this.publisher = new Redis(redisUrl, { lazyConnect: false });
      this.subscriber = new Redis(redisUrl, { lazyConnect: false });
      this.enabled = true;

      this.publisher.on('error', (err) => {
        console.error('Redis publisher error:', err);
      });
      this.subscriber.on('error', (err) => {
        console.error('Redis subscriber error:', err);
      });

      console.log('✓ Redis pub/sub connected');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  async publish(message: EmergencyMessage): Promise<void> {
    if (!this.enabled || !this.publisher) {
      return;
    }
    try {
      await this.publisher.publish(EMERGENCY_CHANNEL, JSON.stringify(message));
    } catch (error) {
      console.error('Error publishing to Redis:', error);
    }
  }

  subscribe(handler: (message: EmergencyMessage) => void): void {
    if (!this.enabled || !this.subscriber) {
      return;
    }
    this.subscriber.subscribe(EMERGENCY_CHANNEL, (err) => {
      if (err) {
        console.error(`Failed to subscribe to Redis channel "${EMERGENCY_CHANNEL}":`, err);
      }
    });
    this.subscriber.on('message', (channel: string, payload: string) => {
      if (channel !== EMERGENCY_CHANNEL) {
        return;
      }
      try {
        const message: EmergencyMessage = JSON.parse(payload);
        handler(message);
      } catch (error) {
        console.error('Error parsing Redis emergency message:', error);
      }
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const redisPubSubService = new RedisPubSubService();
