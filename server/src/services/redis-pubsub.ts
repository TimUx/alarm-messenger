import Redis from 'ioredis';
import logger from '../utils/logger';

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
      logger.info('ℹ Redis pub/sub disabled (REDIS_URL not set)');
      return;
    }

    try {
      this.publisher = new Redis(redisUrl, { lazyConnect: false });
      this.subscriber = new Redis(redisUrl, { lazyConnect: false });
      this.enabled = true;

      this.publisher.on('error', (err) => {
        logger.error({ err }, 'Redis publisher error');
      });
      this.subscriber.on('error', (err) => {
        logger.error({ err }, 'Redis subscriber error');
      });

      logger.info('✓ Redis pub/sub connected');
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect to Redis');
    }
  }

  async publish(message: EmergencyMessage): Promise<void> {
    if (!this.enabled || !this.publisher) {
      return;
    }
    try {
      await this.publisher.publish(EMERGENCY_CHANNEL, JSON.stringify(message));
    } catch (error) {
      logger.error({ err: error }, 'Error publishing to Redis');
    }
  }

  subscribe(handler: (message: EmergencyMessage) => void): void {
    if (!this.enabled || !this.subscriber) {
      return;
    }
    this.subscriber.subscribe(EMERGENCY_CHANNEL, (err) => {
      if (err) {
        logger.error({ err }, `Failed to subscribe to Redis channel "${EMERGENCY_CHANNEL}"`);
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
        logger.error({ err: error }, 'Error parsing Redis emergency message');
      }
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async disconnect(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      if (this.publisher) {
        await this.publisher.quit();
        this.publisher = null;
      }
      this.enabled = false;
      logger.info('Redis pub/sub disconnected');
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting Redis');
    }
  }
}

export const redisPubSubService = new RedisPubSubService();
