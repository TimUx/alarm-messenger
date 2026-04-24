import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { dbRun, dbGet, dbAll } from '../services/database';
import { broadcastSseEvent } from '../services/sse';
import { verifyApiKey, verifyApiKeyOrDeviceToken, verifyDeviceToken, DeviceRequest } from '../middleware/auth';
import { mapEmergencyRow } from '../mappers';
import { EmergencyRow } from '../models/db-types';
import {
  Emergency,
  CreateEmergencyRequest,
} from '../models/types';
import { validateBody } from '../middleware/validate';
import { CreateEmergencySchema } from '../validation/schemas';
import logger from '../utils/logger';
import { findDevicesForEmergency, dispatchEmergencyNotifications } from '../services/emergency-dispatch';
import {
  sanitizeGroupsInput,
  parseListPagination,
  buildEmergencyListQueries,
  EmergencyResponseJoinRow,
  mapParticipants,
  mapResponses,
} from './emergencies/helpers';

const router = Router();

function isSqliteConstraintError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === 'SQLITE_CONSTRAINT';
}

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

    let sanitizedGroups: string | null;
    try {
      sanitizedGroups = sanitizeGroupsInput(groups);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_GROUPS_FORMAT') {
        res.status(400).json({ error: 'Groups parameter contains invalid characters. Only letters, numbers, commas, and dashes are allowed.' });
        return;
      }
      if (error instanceof Error && error.message === 'TOO_MANY_GROUPS') {
        res.status(400).json({ error: 'Too many groups specified. Maximum 50 groups allowed.' });
        return;
      }
      throw error;
    }

    // Insert emergency into database
    try {
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
    } catch (dbError: unknown) {
      if (isSqliteConstraintError(dbError)) {
        res.status(409).json({ error: 'An active emergency with this number already exists' });
        return;
      }
      throw dbError;
    }

    const devices = await findDevicesForEmergency(sanitizedGroups);

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

    await dispatchEmergencyNotifications(id, devices, notificationTitle, notificationBody, notificationData);

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
// Accepts X-Device-Token (mobile app) or X-Api-Key (server-to-server, e.g. alarm-monitor)
router.get('/', verifyApiKeyOrDeviceToken, async (req: Request, res: Response) => {
  try {
    const emergencyNumberFilter = req.query.emergencyNumber as string | undefined;
    const includeInactiveParam = req.query.includeInactive as string | undefined;
    // Compatibility: alarm-monitor resolves by emergencyNumber and should still
    // find the emergency after automatic/manual deactivation.
    const includeInactive = includeInactiveParam === 'true'
      || (includeInactiveParam === undefined && Boolean(emergencyNumberFilter));
    const { page, limit, offset } = parseListPagination(
      req.query.page as string | undefined,
      req.query.limit as string | undefined,
    );
    const { countQuery, dataQuery, countParams } = buildEmergencyListQueries(includeInactive, emergencyNumberFilter);
    const params = emergencyNumberFilter
      ? [emergencyNumberFilter, limit, offset]
      : [limit, offset];

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
// Response shape consumed by alarm-monitor:
// { emergencyId: string, totalParticipants: number, participants: [...] }
router.get('/:id/participants', verifyApiKey, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if emergency exists
    const emergency = await dbGet('SELECT * FROM emergencies WHERE id = ?', [id]);
    if (!emergency) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    const rows = await dbAll<EmergencyResponseJoinRow>(
      `SELECT r.*, d.id as device_id, d.platform, d.first_name, d.last_name,
              d.qual_machinist, d.qual_agt, d.qual_paramedic, d.leadership_role
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ? AND r.participating = 1
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const participants = mapParticipants(rows);

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

    const rows = await dbAll<EmergencyResponseJoinRow>(
      `SELECT r.*, d.platform, d.first_name, d.last_name,
              d.qual_machinist, d.qual_agt, d.qual_paramedic, d.leadership_role
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ?
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const responses = mapResponses(rows);

    res.json(responses);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching responses');
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

export default router;
