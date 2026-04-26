import crypto from 'crypto';
import { dbAll, dbRun } from './database';
import { ntfyNotificationService } from './ntfy-notification';
import { PushNotificationData } from './push-notification';
import { recordNtfyEscalationMetrics } from './dispatch-metrics';
import logger from '../utils/logger';

interface Stage2CandidateRow {
  emergency_id: string;
  device_id: string;
  emergency_number: string;
  emergency_date: string;
  emergency_keyword: string;
  emergency_description: string;
  emergency_location: string;
  groups: string | null;
}

interface NtfyRetryRow {
  id: string;
  emergency_id: string;
  device_id: string;
  retry_count: number;
  updated_at: string;
  emergency_number: string;
  emergency_date: string;
  emergency_keyword: string;
  emergency_description: string;
  emergency_location: string;
  groups: string | null;
}

class NotificationEscalationService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = Number(process.env.NTFY_CHECK_INTERVAL_MS || 5000);
  private readonly stage2DelaySeconds = Number(process.env.NTFY_STAGE2_DELAY_SECONDS || 25);
  private readonly retryScheduleSeconds = (process.env.NTFY_RETRY_SCHEDULE_SECONDS || '20,60')
    .split(',')
    .map((val) => Number(val.trim()))
    .filter((val) => Number.isFinite(val) && val >= 1);
  private readonly topicTemplate = process.env.NTFY_TOPIC_TEMPLATE || 'alarm-{deviceId}';
  private readonly clickBaseUrl = (process.env.NTFY_CLICK_BASE_URL || process.env.SERVER_URL || '').replace(/\/$/, '');
  private isRunning = false;

  start(): void {
    if (!ntfyNotificationService.isEnabled()) {
      logger.info('ntfy escalation disabled');
      return;
    }
    if (this.intervalId) {
      logger.info('Notification escalation scheduler already running');
      return;
    }
    logger.info(
      { checkIntervalMs: this.checkIntervalMs, stage2DelaySeconds: this.stage2DelaySeconds },
      'Starting ntfy escalation scheduler',
    );
    void this.processEscalations();
    this.intervalId = setInterval(() => {
      void this.processEscalations();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Notification escalation scheduler stopped');
    }
  }

  private buildTopic(deviceId: string): string {
    return this.topicTemplate.replace('{deviceId}', deviceId);
  }

  private buildClickUrl(emergencyId: string): string | undefined {
    if (!this.clickBaseUrl) {
      return undefined;
    }
    return `${this.clickBaseUrl}/admin/history.html?emergencyId=${encodeURIComponent(emergencyId)}`;
  }

  private async processStage2Candidates(): Promise<{ success: number; failed: number }> {
    const stage2Cutoff = new Date(Date.now() - this.stage2DelaySeconds * 1000).toISOString();
    const rows = await dbAll<Stage2CandidateRow>(
      `SELECT o.emergency_id, o.device_id,
              e.emergency_number, e.emergency_date, e.emergency_keyword, e.emergency_description, e.emergency_location, e.groups
         FROM notification_outbox o
         JOIN emergencies e ON e.id = o.emergency_id
        WHERE o.channel = 'websocket'
          AND o.status = 'pending'
          AND o.created_at <= ?
          AND NOT EXISTS (
            SELECT 1 FROM responses r
            WHERE r.emergency_id = o.emergency_id AND r.device_id = o.device_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM notification_outbox o2
            WHERE o2.emergency_id = o.emergency_id
              AND o2.device_id = o.device_id
              AND o2.channel = 'ntfy'
              AND o2.status IN ('delivered', 'pending')
          )`,
      [stage2Cutoff],
    );

    let success = 0;
    let failed = 0;
    for (const row of rows) {
      const now = new Date().toISOString();
      const outboxId = crypto.randomUUID();
      await dbRun(
        `INSERT INTO notification_outbox (id, emergency_id, device_id, channel, status, retry_count, created_at, updated_at)
         VALUES (?, ?, ?, 'ntfy', 'pending', 0, ?, ?)`,
        [outboxId, row.emergency_id, row.device_id, now, now],
      );

      const payload: PushNotificationData = {
        emergencyId: row.emergency_id,
        emergencyNumber: row.emergency_number,
        emergencyDate: row.emergency_date,
        emergencyKeyword: row.emergency_keyword,
        emergencyDescription: row.emergency_description,
        emergencyLocation: row.emergency_location,
        groups: row.groups ?? '',
      };

      const sent = await ntfyNotificationService.sendEmergencyNotification(
        {
          topic: this.buildTopic(row.device_id),
          title: `EINSATZ: ${row.emergency_keyword}`,
          message: `${row.emergency_location} - ${row.emergency_description}`,
          click: this.buildClickUrl(row.emergency_id),
        },
        payload,
      );

      if (sent) {
        success += 1;
        await dbRun(
          `UPDATE notification_outbox SET status = 'delivered', updated_at = ? WHERE id = ?`,
          [new Date().toISOString(), outboxId],
        );
      } else {
        failed += 1;
        await dbRun(
          `UPDATE notification_outbox
           SET status = 'failed', retry_count = retry_count + 1, last_error = ?, updated_at = ?
           WHERE id = ?`,
          ['ntfy_send_failed', new Date().toISOString(), outboxId],
        );
      }
    }

    return { success, failed };
  }

  private async processRetries(): Promise<{ success: number; failed: number }> {
    if (this.retryScheduleSeconds.length === 0) {
      return { success: 0, failed: 0 };
    }

    const maxRetries = this.retryScheduleSeconds.length;
    const rows = await dbAll<NtfyRetryRow>(
      `SELECT o.id, o.emergency_id, o.device_id, o.retry_count, o.updated_at,
              e.emergency_number, e.emergency_date, e.emergency_keyword, e.emergency_description, e.emergency_location, e.groups
         FROM notification_outbox o
         JOIN emergencies e ON e.id = o.emergency_id
        WHERE o.channel = 'ntfy'
          AND o.status = 'failed'
          AND o.retry_count > 0
          AND o.retry_count <= ?`,
      [maxRetries],
    );

    let success = 0;
    let failed = 0;
    const nowMs = Date.now();
    for (const row of rows) {
      if (row.retry_count > maxRetries) {
        continue;
      }
      const delaySeconds = this.retryScheduleSeconds[row.retry_count - 1] ?? this.retryScheduleSeconds[maxRetries - 1];
      const updatedAtMs = new Date(row.updated_at).getTime();
      if (!Number.isFinite(updatedAtMs)) {
        continue;
      }
      const readyAtMs = updatedAtMs + delaySeconds * 1000;
      if (readyAtMs > nowMs) {
        continue;
      }

      const payload: PushNotificationData = {
        emergencyId: row.emergency_id,
        emergencyNumber: row.emergency_number,
        emergencyDate: row.emergency_date,
        emergencyKeyword: row.emergency_keyword,
        emergencyDescription: row.emergency_description,
        emergencyLocation: row.emergency_location,
        groups: row.groups ?? '',
      };

      const sent = await ntfyNotificationService.sendEmergencyNotification(
        {
          topic: this.buildTopic(row.device_id),
          title: `EINSATZ: ${row.emergency_keyword}`,
          message: `${row.emergency_location} - ${row.emergency_description}`,
          click: this.buildClickUrl(row.emergency_id),
        },
        payload,
      );

      if (sent) {
        success += 1;
        await dbRun(`UPDATE notification_outbox SET status = 'delivered', updated_at = ?, last_error = NULL WHERE id = ?`, [
          new Date().toISOString(),
          row.id,
        ]);
      } else {
        failed += 1;
        const nextRetry = row.retry_count + 1;
        const finalStatus = nextRetry > maxRetries ? 'failed_final' : 'failed';
        await dbRun(
          `UPDATE notification_outbox
             SET status = ?, retry_count = ?, last_error = ?, updated_at = ?
           WHERE id = ?`,
          [finalStatus, nextRetry, 'ntfy_retry_failed', new Date().toISOString(), row.id],
        );
      }
    }

    return { success, failed };
  }

  async processEscalations(): Promise<void> {
    if (this.isRunning || !ntfyNotificationService.isEnabled()) {
      return;
    }
    this.isRunning = true;
    try {
      const stage2 = await this.processStage2Candidates();
      const retries = await this.processRetries();
      await recordNtfyEscalationMetrics({
        stage2Triggered: stage2.success + stage2.failed,
        ntfySuccess: stage2.success + retries.success,
        ntfyFailed: stage2.failed + retries.failed,
      });
    } catch (error: unknown) {
      logger.warn({ err: error }, 'Notification escalation processing failed');
    } finally {
      this.isRunning = false;
    }
  }
}

export const notificationEscalationService = new NotificationEscalationService();
