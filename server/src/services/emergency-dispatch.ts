import crypto from 'crypto';
import { dbAll, dbRun } from './database';
import { websocketService } from './websocket';
import { pushNotificationService, PushNotificationData } from './push-notification';
import { redisPubSubService } from './redis-pubsub';
import { updateOutboxEntry } from './notification-outbox';
import { recordDispatchMetrics } from './dispatch-metrics';
import logger from '../utils/logger';

interface DispatchDeviceRow {
  id: string;
  platform: string;
  fcm_token: string | null;
  apns_token: string | null;
}

export async function findDevicesForEmergency(groups: string | null): Promise<DispatchDeviceRow[]> {
  if (groups) {
    const groupCodes = groups.split(',').map((group) => group.trim());
    const placeholders = groupCodes.map(() => '?').join(',');
    const devices = await dbAll<DispatchDeviceRow>(
      `SELECT DISTINCT d.id, d.platform, d.fcm_token, d.apns_token
       FROM devices d
       INNER JOIN device_groups dg ON d.id = dg.device_id
       WHERE d.active = 1 AND dg.group_code IN (${placeholders})`,
      groupCodes,
    );
    logger.info({ deviceCount: devices.length, groups }, 'Devices matched for groups');
    return devices;
  }

  const devices = await dbAll<DispatchDeviceRow>(
    'SELECT id, platform, fcm_token, apns_token FROM devices WHERE active = 1',
    [],
  );
  logger.info({ deviceCount: devices.length }, 'Notifying all active devices');
  return devices;
}

async function insertPendingOutboxEntries(emergencyId: string, devices: DispatchDeviceRow[]): Promise<void> {
  if (devices.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const valuePlaceholders = devices.map(() => '(?, ?, ?, ?, ?, 0, ?, ?)').join(',');
  const valueParams: Array<string> = [];

  for (const device of devices) {
    let channel: 'fcm' | 'apns' | 'websocket';
    if (device.platform === 'android' && device.fcm_token) {
      channel = 'fcm';
    } else if (device.platform === 'ios' && device.apns_token) {
      channel = 'apns';
    } else {
      channel = 'websocket';
    }
    valueParams.push(crypto.randomUUID(), emergencyId, device.id, channel, 'pending', now, now);
  }

  await dbRun(
    `INSERT INTO notification_outbox (id, emergency_id, device_id, channel, status, retry_count, created_at, updated_at) VALUES ${valuePlaceholders}`,
    valueParams,
  );
}

export async function dispatchEmergencyNotifications(
  emergencyId: string,
  devices: DispatchDeviceRow[],
  notificationTitle: string,
  notificationBody: string,
  notificationData: PushNotificationData,
): Promise<void> {
  const deviceIds = devices.map((device) => device.id);
  const startTime = Date.now();
  let pushSuccessCount = 0;
  let pushFailedCount = 0;
  let websocketSuccessCount = 0;
  let websocketFailedCount = 0;

  if (deviceIds.length === 0) {
    return;
  }

  await insertPendingOutboxEntries(emergencyId, devices);

  if (pushNotificationService.isPushEnabled()) {
    const fcmDevices = devices.filter((device) => device.platform === 'android' && device.fcm_token);
    const fcmTokens = fcmDevices.map((device) => device.fcm_token as string);

    if (fcmTokens.length > 0) {
      const { successCount, results } = await pushNotificationService.sendBulkFCMNotification(
        fcmTokens,
        notificationTitle,
        notificationBody,
        notificationData,
      );
      pushSuccessCount += successCount;
      pushFailedCount += fcmTokens.length - successCount;

      const tokenToDevice = new Map<string, string>(
        fcmDevices.map((device) => [device.fcm_token as string, device.id]),
      );
      const deliveredIds: string[] = [];
      const failedEntries: Array<{ deviceId: string; errorCode?: string }> = [];

      for (const result of results) {
        const deviceId = tokenToDevice.get(result.token);
        if (!deviceId) continue;
        if (result.success) {
          deliveredIds.push(deviceId);
        } else {
          failedEntries.push({ deviceId, errorCode: result.errorCode });
        }
      }

      if (deliveredIds.length > 0) {
        const ph = deliveredIds.map(() => '?').join(',');
        await dbRun(
          `UPDATE notification_outbox SET status = 'delivered', updated_at = ? WHERE emergency_id = ? AND channel = 'fcm' AND device_id IN (${ph})`,
          [new Date().toISOString(), emergencyId, ...deliveredIds],
        );
      }
      for (const { deviceId, errorCode } of failedEntries) {
        await updateOutboxEntry(emergencyId, deviceId, 'fcm', 'failed', errorCode);
      }
    }

    const apnsDevices = devices.filter((device) => device.platform === 'ios' && device.apns_token);
    if (apnsDevices.length > 0) {
      const apnsResults = await Promise.allSettled(
        apnsDevices.map((device) =>
          pushNotificationService.sendAPNsNotification(
            device.apns_token as string,
            notificationTitle,
            notificationBody,
            notificationData,
          ),
        ),
      );

      const apnsDeliveredIds: string[] = [];
      const apnsFailedEntries: Array<{ deviceId: string; err?: string }> = [];
      for (let i = 0; i < apnsResults.length; i++) {
        const result = apnsResults[i];
        const device = apnsDevices[i];
        const success = result.status === 'fulfilled' && result.value === true;
        if (success) {
          pushSuccessCount += 1;
          apnsDeliveredIds.push(device.id);
        } else {
          pushFailedCount += 1;
          apnsFailedEntries.push({
            deviceId: device.id,
            err: result.status === 'rejected' ? String(result.reason) : undefined,
          });
        }
      }

      if (apnsDeliveredIds.length > 0) {
        const ph = apnsDeliveredIds.map(() => '?').join(',');
        await dbRun(
          `UPDATE notification_outbox SET status = 'delivered', updated_at = ? WHERE emergency_id = ? AND channel = 'apns' AND device_id IN (${ph})`,
          [new Date().toISOString(), emergencyId, ...apnsDeliveredIds],
        );
      }
      for (const { deviceId, err } of apnsFailedEntries) {
        await updateOutboxEntry(emergencyId, deviceId, 'apns', 'failed', err);
      }
    }
  }

  if (redisPubSubService.isEnabled()) {
    await redisPubSubService.publish({
      deviceIds,
      title: notificationTitle,
      body: notificationBody,
      data: notificationData,
    });
  } else {
    await websocketService.sendBulkNotifications(deviceIds, notificationTitle, notificationBody, notificationData);
  }

  const wsDevices = devices.filter(
    (device) => !(device.platform === 'android' && device.fcm_token) && !(device.platform === 'ios' && device.apns_token),
  );
  if (wsDevices.length > 0) {
    const wsDeliveredIds = wsDevices
      .filter((device) => websocketService.isDeviceConnected(device.id))
      .map((device) => device.id);
    websocketSuccessCount = wsDeliveredIds.length;
    websocketFailedCount = wsDevices.length - wsDeliveredIds.length;
    if (wsDeliveredIds.length > 0) {
      const ph = wsDeliveredIds.map(() => '?').join(',');
      await dbRun(
        `UPDATE notification_outbox SET status = 'delivered', updated_at = ? WHERE emergency_id = ? AND channel = 'websocket' AND device_id IN (${ph})`,
        [new Date().toISOString(), emergencyId, ...wsDeliveredIds],
      );
    }
  } else {
    websocketSuccessCount = devices.filter((device) => websocketService.isDeviceConnected(device.id)).length;
  }

  const durationMs = Date.now() - startTime;
  await recordDispatchMetrics({
    pushSuccess: pushSuccessCount,
    pushFailed: pushFailedCount,
    wsSuccess: websocketSuccessCount,
    wsFailed: websocketFailedCount,
    durationMs,
  });

  logger.info(
    {
      emergencyId,
      pushSuccess: pushSuccessCount,
      pushFailed: pushFailedCount,
      wsSuccess: websocketSuccessCount,
      wsFailed: websocketFailedCount,
      totalDevices: devices.length,
      durationMs,
    },
    'Notification dispatch complete',
  );
}
