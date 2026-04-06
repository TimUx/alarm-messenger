import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { dbRun, dbGet, dbAll } from '../services/database';
import { websocketService } from '../services/websocket';
import { pushNotificationService } from '../services/push-notification';
import { redisPubSubService } from '../services/redis-pubsub';
import { broadcastSseEvent } from '../services/sse';
import { verifyApiKey, verifyDeviceToken, DeviceRequest } from '../middleware/auth';
import { mapEmergencyRow, mapResponderDetails } from '../mappers';
import { EmergencyRow, DeviceRow } from '../models/db-types';
import {
  Emergency,
  CreateEmergencyRequest,
  EmergencyResponseRequest,
} from '../models/types';
import { validateBody } from '../middleware/validate';
import { CreateEmergencySchema } from '../validation/schemas';
import logger from '../utils/logger';

const router = Router();

// Create a new emergency and trigger push notifications (protected with API key)
router.post('/', verifyApiKey, validateBody(CreateEmergencySchema), async (req: Request, res: Response) => {
  try {
    const {
      emergencyNumber,
      emergencyDate,
      emergencyKeyword,
      emergencyDescription,
      emergencyLocation,
      groups,
    }: CreateEmergencyRequest = req.body;

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Validate and sanitize groups parameter
    let sanitizedGroups = null;
    if (groups) {
      // Remove whitespace and validate format (only alphanumeric, comma, and dash allowed)
      const cleanedGroups = groups.trim().toUpperCase();
      if (!/^[A-Z0-9,-]+$/.test(cleanedGroups)) {
        res.status(400).json({ error: 'Groups parameter contains invalid characters. Only letters, numbers, commas, and dashes are allowed.' });
        return;
      }
      
      // Limit number of groups to prevent DoS
      const groupArray = cleanedGroups.split(',').filter(g => g.trim());
      if (groupArray.length > 50) {
        res.status(400).json({ error: 'Too many groups specified. Maximum 50 groups allowed.' });
        return;
      }
      
      sanitizedGroups = groupArray.join(',');
    }

    // Insert emergency into database
    await dbRun(
      `INSERT INTO emergencies (id, emergency_number, emergency_date, emergency_keyword, emergency_description, emergency_location, created_at, active, groups)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        emergencyNumber,
        emergencyDate,
        emergencyKeyword,
        emergencyDescription,
        emergencyLocation,
        createdAt,
        1,
        sanitizedGroups,
      ]
    );

    // Get devices to notify based on groups
    let devices;
    if (sanitizedGroups) {
      // If groups are specified, only notify devices assigned to those groups
      const groupCodes = sanitizedGroups.split(',').map(g => g.trim());
      const placeholders = groupCodes.map(() => '?').join(',');
      
      devices = await dbAll(
        `SELECT DISTINCT d.id, d.platform, d.fcm_token, d.apns_token 
         FROM devices d
         INNER JOIN device_groups dg ON d.id = dg.device_id
         WHERE d.active = 1 AND dg.group_code IN (${placeholders})`,
        groupCodes
      );
      
      logger.info(`✓ Found ${devices.length} devices matching groups: ${sanitizedGroups}`);
    } else {
      // If no groups specified, notify all active devices
      devices = await dbAll(
        'SELECT id, platform, fcm_token, apns_token FROM devices WHERE active = 1',
        []
      );
      logger.info(`✓ No groups specified, notifying all ${devices.length} active devices`);
    }

    // Prepare notification data
    const notificationTitle = `EINSATZ: ${emergencyKeyword}`;
    const notificationBody = `${emergencyLocation} - ${emergencyDescription}`;
    const notificationData = {
      emergencyId: id,
      emergencyNumber,
      emergencyDate,
      emergencyKeyword,
      emergencyDescription,
      emergencyLocation,
      groups: sanitizedGroups || '',
    };

    // Send notifications via push services (FCM/APNs) and WebSocket
    const deviceIds = devices.map((device: any) => device.id);
    let pushSuccessCount = 0;
    let websocketSuccessCount = 0;
    
    if (deviceIds.length > 0) {
      // Try push notifications first (FCM bulk for Android, APNs per-device for iOS)
      if (pushNotificationService.isPushEnabled()) {
        // FCM bulk notifications for Android devices
        const fcmDevices = devices.filter((d: any) => d.platform === 'android' && d.fcm_token);
        const fcmTokens = fcmDevices.map((d: any) => d.fcm_token as string);
        if (fcmTokens.length > 0) {
          const fcmSuccess = await pushNotificationService.sendBulkFCMNotification(
            fcmTokens,
            notificationTitle,
            notificationBody,
            notificationData
          );
          pushSuccessCount += fcmSuccess;
        }

        // APNs per-device for iOS (no bulk API)
        const apnsDevices = devices.filter((d: any) => d.platform === 'ios' && d.apns_token);
        if (apnsDevices.length > 0) {
          const apnsResults = await Promise.allSettled(
            apnsDevices.map((device: any) =>
              pushNotificationService.sendAPNsNotification(
                device.apns_token,
                notificationTitle,
                notificationBody,
                notificationData
              )
            )
          );
          pushSuccessCount += apnsResults.filter(
            (r) => r.status === 'fulfilled' && r.value === true
          ).length;
        }

        if (pushSuccessCount > 0) {
          logger.info(`✓ Push notifications sent to ${pushSuccessCount}/${devices.length} devices`);
        }
      }
      
      // Send WebSocket notifications via Redis pub/sub (or directly as fallback)
      if (redisPubSubService.isEnabled()) {
        await redisPubSubService.publish({
          deviceIds,
          title: notificationTitle,
          body: notificationBody,
          data: notificationData,
        });
      } else {
        await websocketService.sendBulkNotifications(
          deviceIds,
          notificationTitle,
          notificationBody,
          notificationData
        );
      }
      
      // Count WebSocket connected devices
      websocketSuccessCount = deviceIds.filter(id => 
        websocketService.isDeviceConnected(id)
      ).length;
      
      logger.info(`✓ WebSocket notifications sent to ${websocketSuccessCount}/${devices.length} connected devices`);
      logger.info(`📊 Notification summary: Push=${pushSuccessCount}, WebSocket=${websocketSuccessCount}, Total devices=${devices.length}`);
    }

    const emergency: Emergency = {
      id,
      emergencyNumber,
      emergencyDate,
      emergencyKeyword,
      emergencyDescription,
      emergencyLocation,
      createdAt,
      active: true,
      groups: sanitizedGroups,
    };

    res.status(201).json(emergency);
  } catch (error) {
    logger.error({ err: error }, 'Error creating emergency');
    res.status(500).json({ error: 'Failed to create emergency' });
  }
});

// Get all emergencies (only active ones by default, with pagination)
router.get('/', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const emergencyNumberFilter = req.query.emergencyNumber as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    let countQuery: string;
    let dataQuery: string;
    let params: (string | number)[];
    let countParams: (string | number)[];

    if (emergencyNumberFilter) {
      if (includeInactive) {
        countQuery = 'SELECT COUNT(*) as total FROM emergencies WHERE emergency_number = ?';
        dataQuery = 'SELECT * FROM emergencies WHERE emergency_number = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      } else {
        countQuery = 'SELECT COUNT(*) as total FROM emergencies WHERE active = 1 AND emergency_number = ?';
        dataQuery = 'SELECT * FROM emergencies WHERE active = 1 AND emergency_number = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      }
      countParams = [emergencyNumberFilter];
      params = [emergencyNumberFilter, limit, offset];
    } else {
      if (includeInactive) {
        countQuery = 'SELECT COUNT(*) as total FROM emergencies';
        dataQuery = 'SELECT * FROM emergencies ORDER BY created_at DESC LIMIT ? OFFSET ?';
      } else {
        countQuery = 'SELECT COUNT(*) as total FROM emergencies WHERE active = 1';
        dataQuery = 'SELECT * FROM emergencies WHERE active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?';
      }
      countParams = [];
      params = [limit, offset];
    }

    const countResult = await dbGet(countQuery, countParams);
    const total = countResult?.total || 0;
    const rows = await dbAll(dataQuery, params);

    const emergencies = rows.map((row: EmergencyRow) => mapEmergencyRow(row));

    res.json({
      data: emergencies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching emergencies');
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
});

// Get a specific emergency
router.get('/:id', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await dbGet<EmergencyRow>('SELECT * FROM emergencies WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    res.json(mapEmergencyRow(row));
  } catch (error) {
    logger.error({ err: error }, 'Error fetching emergency');
    res.status(500).json({ error: 'Failed to fetch emergency' });
  }
});

// Submit response to an emergency
router.post('/:id/responses', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { id: emergencyId } = req.params;
    const { participating }: { participating: boolean } = req.body;
    const deviceId = (req as DeviceRequest).device!.id;

    if (participating === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if emergency exists
    const emergency = await dbGet('SELECT * FROM emergencies WHERE id = ?', [
      emergencyId,
    ]);
    if (!emergency) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    const responseId = crypto.randomUUID();
    const respondedAt = new Date().toISOString();

    // Insert or update response
    await dbRun(
      `INSERT OR REPLACE INTO responses (id, emergency_id, device_id, participating, responded_at)
       VALUES (?, ?, ?, ?, ?)`,
      [responseId, emergencyId, deviceId, participating ? 1 : 0, respondedAt]
    );

    res.status(201).json({
      id: responseId,
      emergencyId,
      deviceId,
      participating,
      respondedAt,
    });

    try {
      broadcastSseEvent('response', {
        id: responseId,
        emergencyId,
        deviceId,
        participating,
        respondedAt,
      });
    } catch (sseError) {
      logger.error({ err: sseError }, 'Error broadcasting SSE response event');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error submitting response');
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// Get participants for an emergency with full responder details (protected with API key)
router.get('/:id/participants', verifyApiKey, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if emergency exists
    const emergency = await dbGet('SELECT * FROM emergencies WHERE id = ?', [id]);
    if (!emergency) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    const rows = await dbAll(
      `SELECT r.*, d.id as device_id, d.platform, d.first_name, d.last_name,
              d.qual_machinist, d.qual_agt, d.qual_paramedic, d.leadership_role
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ? AND r.participating = 1
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const participants = rows.map((row: DeviceRow & any) => ({
      id: row.id,
      deviceId: row.device_id,
      platform: row.platform,
      respondedAt: row.responded_at,
      // Responder details from devices table
      responder: mapResponderDetails(row as DeviceRow),
    }));

    res.json({
      emergencyId: id,
      totalParticipants: participants.length,
      participants,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching participants');
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Get all responses for an emergency with full responder details (protected with API key)
router.get('/:id/responses', verifyApiKey, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await dbAll(
      `SELECT r.*, d.platform, d.first_name, d.last_name,
              d.qual_machinist, d.qual_agt, d.qual_paramedic, d.leadership_role
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ?
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const responses = rows.map((row: DeviceRow & any) => ({
      id: row.id,
      emergencyId: row.emergency_id,
      deviceId: row.device_id,
      platform: row.platform,
      participating: row.participating === 1,
      respondedAt: row.responded_at,
      // Responder details from devices table
      responder: mapResponderDetails(row as DeviceRow),
    }));

    res.json(responses);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching responses');
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

export default router;
