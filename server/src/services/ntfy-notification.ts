import logger from '../utils/logger';
import { PushNotificationData } from './push-notification';

interface NtfyPayload {
  topic: string;
  title: string;
  message: string;
  priority?: number;
  tags?: string[];
  click?: string;
}

class NtfyNotificationService {
  private readonly enabled = process.env.ENABLE_NTFY_ESCALATION === 'true';
  private readonly baseUrl = (process.env.NTFY_BASE_URL || '').replace(/\/$/, '');
  private readonly authToken = process.env.NTFY_AUTH_TOKEN || '';
  private readonly username = process.env.NTFY_USERNAME || '';
  private readonly password = process.env.NTFY_PASSWORD || '';
  private readonly defaultPriority = Number(process.env.NTFY_PRIORITY || 5);
  private readonly defaultTags = (process.env.NTFY_TAGS || 'rotating_light,fire_engine')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  isEnabled(): boolean {
    return this.enabled && this.baseUrl.length > 0;
  }

  private buildAuthHeader(): string | null {
    if (this.authToken) {
      return `Bearer ${this.authToken}`;
    }
    if (this.username && this.password) {
      return `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
    }
    return null;
  }

  async sendEmergencyNotification(payload: NtfyPayload, data: PushNotificationData): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Title': payload.title,
      Priority: String(payload.priority ?? this.defaultPriority),
      Tags: (payload.tags ?? this.defaultTags).join(','),
    };
    const authHeader = this.buildAuthHeader();
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    if (payload.click) {
      headers.Click = payload.click;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(payload.topic)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'alarm_escalation',
          emergencyId: data.emergencyId,
          emergencyNumber: data.emergencyNumber,
          emergencyKeyword: data.emergencyKeyword,
          emergencyDate: data.emergencyDate,
          emergencyLocation: data.emergencyLocation,
          groups: data.groups,
          message: payload.message,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.warn(
          { status: response.status, topic: payload.topic, errText },
          'ntfy escalation publish failed',
        );
        return false;
      }

      return true;
    } catch (error: unknown) {
      logger.warn({ err: error, topic: payload.topic }, 'ntfy escalation publish error');
      return false;
    }
  }
}

export const ntfyNotificationService = new NtfyNotificationService();
