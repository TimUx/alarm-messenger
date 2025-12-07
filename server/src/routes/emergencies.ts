import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../services/database';
import { websocketService } from '../services/websocket';
import { verifyApiKey } from '../middleware/auth';
import {
  Emergency,
  CreateEmergencyRequest,
  EmergencyResponseRequest,
} from '../models/types';

const router = Router();

// Create a new emergency and trigger push notifications (protected with API key)
router.post('/', verifyApiKey, async (req: Request, res: Response) => {
  try {
    const {
      emergencyNumber,
      emergencyDate,
      emergencyKeyword,
      emergencyDescription,
      emergencyLocation,
    }: CreateEmergencyRequest = req.body;

    // Validate required fields
    if (
      !emergencyNumber ||
      !emergencyDate ||
      !emergencyKeyword ||
      !emergencyDescription ||
      !emergencyLocation
    ) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    // Insert emergency into database
    await dbRun(
      `INSERT INTO emergencies (id, emergency_number, emergency_date, emergency_keyword, emergency_description, emergency_location, created_at, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        emergencyNumber,
        emergencyDate,
        emergencyKeyword,
        emergencyDescription,
        emergencyLocation,
        createdAt,
        1,
      ]
    );

    // Get all active devices for push notifications
    const devices = await dbAll(
      'SELECT id FROM devices WHERE active = 1',
      []
    );

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
    };

    // Send notifications via WebSocket
    const deviceIds = devices.map((device: any) => device.id);
    if (deviceIds.length > 0) {
      await websocketService.sendBulkNotifications(
        deviceIds,
        notificationTitle,
        notificationBody,
        notificationData
      );
      console.log(`✓ Notifications sent to ${deviceIds.length} devices via WebSocket`);
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
    };

    res.status(201).json(emergency);
  } catch (error) {
    console.error('Error creating emergency:', error);
    res.status(500).json({ error: 'Failed to create emergency' });
  }
});

// Get all emergencies
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await dbAll(
      'SELECT * FROM emergencies ORDER BY created_at DESC',
      []
    );

    const emergencies: Emergency[] = rows.map((row: any) => ({
      id: row.id,
      emergencyNumber: row.emergency_number,
      emergencyDate: row.emergency_date,
      emergencyKeyword: row.emergency_keyword,
      emergencyDescription: row.emergency_description,
      emergencyLocation: row.emergency_location,
      createdAt: row.created_at,
      active: row.active === 1,
    }));

    res.json(emergencies);
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
});

// Get a specific emergency
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await dbGet('SELECT * FROM emergencies WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    const emergency: Emergency = {
      id: row.id,
      emergencyNumber: row.emergency_number,
      emergencyDate: row.emergency_date,
      emergencyKeyword: row.emergency_keyword,
      emergencyDescription: row.emergency_description,
      emergencyLocation: row.emergency_location,
      createdAt: row.created_at,
      active: row.active === 1,
    };

    res.json(emergency);
  } catch (error) {
    console.error('Error fetching emergency:', error);
    res.status(500).json({ error: 'Failed to fetch emergency' });
  }
});

// Submit response to an emergency
router.post('/:id/responses', async (req: Request, res: Response) => {
  try {
    const { id: emergencyId } = req.params;
    const { deviceId, participating }: EmergencyResponseRequest = req.body;

    if (!deviceId || participating === undefined) {
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

    // Check if device exists
    const device = await dbGet('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const responseId = uuidv4();
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
  } catch (error) {
    console.error('Error submitting response:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// Get participants for an emergency
router.get('/:id/participants', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if emergency exists
    const emergency = await dbGet('SELECT * FROM emergencies WHERE id = ?', [id]);
    if (!emergency) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    const rows = await dbAll(
      `SELECT r.*, d.id as device_id, d.platform
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ? AND r.participating = 1
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const participants = rows.map((row: any) => ({
      id: row.id,
      deviceId: row.device_id,
      platform: row.platform,
      respondedAt: row.responded_at,
    }));

    res.json({
      emergencyId: id,
      totalParticipants: participants.length,
      participants,
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Get all responses for an emergency
router.get('/:id/responses', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await dbAll(
      `SELECT r.*, d.platform
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ?
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const responses = rows.map((row: any) => ({
      id: row.id,
      emergencyId: row.emergency_id,
      deviceId: row.device_id,
      platform: row.platform,
      participating: row.participating === 1,
      respondedAt: row.responded_at,
    }));

    res.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

export default router;
