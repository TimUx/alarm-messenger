import crypto from 'crypto';
import { dbRun, dbAll } from './database';
import { NotificationOutboxRow } from '../models/db-types';
import logger from '../utils/logger';

type NotificationChannel = 'fcm' | 'apns' | 'websocket';
type OutboxStatus = 'pending' | 'delivered' | 'failed';

export async function insertOutboxEntry(
  emergencyId: string,
  deviceId: string,
  channel: NotificationChannel,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await dbRun(
      `INSERT INTO notification_outbox (id, emergency_id, device_id, channel, status, retry_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
      [id, emergencyId, deviceId, channel, now, now],
    );
  } catch (error) {
    logger.warn({ err: error, emergencyId, deviceId, channel }, 'Failed to insert outbox entry');
  }
  return id;
}

export async function updateOutboxEntry(
  emergencyId: string,
  deviceId: string,
  channel: NotificationChannel,
  status: OutboxStatus,
  lastError?: string,
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await dbRun(
      `UPDATE notification_outbox
       SET status = ?, last_error = ?, updated_at = ?,
           retry_count = retry_count + CASE WHEN ? = 'failed' THEN 1 ELSE 0 END
       WHERE emergency_id = ? AND device_id = ? AND channel = ?`,
      [status, lastError ?? null, now, status, emergencyId, deviceId, channel],
    );
  } catch (error) {
    logger.warn({ err: error, emergencyId, deviceId, channel, status }, 'Failed to update outbox entry');
  }
}

/**
 * Returns all pending outbox entries.
 * Stub for a future background worker that retries failed notifications.
 */
export async function getPendingOutboxEntries(): Promise<NotificationOutboxRow[]> {
  try {
    return await dbAll<NotificationOutboxRow>(
      `SELECT * FROM notification_outbox WHERE status = 'pending' ORDER BY created_at ASC`,
    );
  } catch (error) {
    logger.warn({ err: error }, 'Failed to fetch pending outbox entries');
    return [];
  }
}
