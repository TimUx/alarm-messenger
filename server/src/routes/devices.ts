import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { dbRun, dbGet, dbAll } from '../services/database';
import { verifyToken, verifyAdmin, verifySession, AuthRequest, verifyDeviceToken } from '../middleware/auth';
import { Device } from '../models/types';
import { DeviceRow } from '../models/db-types';
import { mapDeviceRow, mapGroupRow } from '../mappers';
import { GroupRow } from '../models/db-types';
import { validateBody } from '../middleware/validate';
import { DeviceRegistrationSchema } from '../validation/schemas';
import logger from '../utils/logger';

const router = Router();

const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

// Generate a registration QR code
router.post('/registration-token', registrationRateLimiter, async (req: Request, res: Response) => {
  try {
    const deviceToken = crypto.randomUUID();
    
    // Generate QR code data URL
    const registrationData = {
      token: deviceToken,
      serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
    };
    
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(registrationData));
    
    // Store the device token with QR code in database (not yet registered)
    // This allows later retrieval of the QR code
    const id = crypto.randomUUID();
    const registeredAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    
    await dbRun(
      `INSERT INTO devices (
        id, device_token, registration_token, platform, registered_at, active, qr_code_data, registration_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        deviceToken,
        '', // Empty registration token until registered
        'android', // Default platform, will be updated on registration
        registeredAt,
        0, // Not active until registered
        qrCodeDataUrl,
        expiresAt,
      ]
    );
    
    res.json({
      deviceToken,
      qrCode: qrCodeDataUrl,
      registrationData,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error generating registration token');
    res.status(500).json({ error: 'Failed to generate registration token' });
  }
});

// Register a device
router.post('/register', registrationRateLimiter, validateBody(DeviceRegistrationSchema), async (req: Request, res: Response) => {
  try {
    const {
      deviceToken,
      registrationToken,
      platform,
      firstName,
      lastName,
      qualifications,
      leadershipRole,
      fcmToken, // Optional FCM token for Android
      apnsToken, // Optional APNs token for iOS
    } = req.body;

    // Check if device token already exists
    const existing = await dbGet(
      'SELECT * FROM devices WHERE device_token = ?',
      [deviceToken]
    );

    // Only allow updating a pre-registered (not-yet-active) device
    if (!existing) {
      logger.warn({ deviceToken: deviceToken.substring(0, 20) }, 'Registration attempt with unknown device token');
      res.status(403).json({ error: 'Invalid or expired registration token' });
      return;
    }

    if (existing.active === 1) {
      logger.warn({ deviceId: existing.id }, 'Registration attempt for already active device');
      res.status(403).json({ error: 'Invalid or expired registration token' });
      return;
    }

    if (existing.registration_expires_at && new Date(existing.registration_expires_at) < new Date()) {
      logger.warn({ deviceId: existing.id }, 'Registration attempt with expired token');
      res.status(403).json({ error: 'Invalid or expired registration token' });
      return;
    }

    // Update existing device
    await dbRun(
      `UPDATE devices SET 
        registration_token = ?, 
        platform = ?, 
        active = 1,
        first_name = ?,
        last_name = ?,
        qual_machinist = ?,
        qual_agt = ?,
        qual_paramedic = ?,
        leadership_role = ?,
        qr_code_data = ?,
        fcm_token = ?,
        apns_token = ?
      WHERE device_token = ?`,
      [
        registrationToken, 
        platform, 
        firstName || null,
        lastName || null,
        qualifications?.machinist ? 1 : 0,
        qualifications?.agt ? 1 : 0,
        qualifications?.paramedic ? 1 : 0,
        leadershipRole || 'none',
        existing.qr_code_data || null,
        fcmToken || null,
        apnsToken || null,
        deviceToken
      ]
    );

    const device: Device = {
      id: existing.id,
      deviceToken,
      registrationToken,
      platform,
      registeredAt: existing.registered_at,
      active: true,
      firstName,
      lastName,
      qualifications,
      leadershipRole: leadershipRole || 'none',
    };

    res.json(device);
  } catch (error) {
    logger.error({ err: error }, 'Error registering device');
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Update push notification tokens (FCM/APNs)
router.post('/update-push-token', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { deviceToken, fcmToken, apnsToken } = req.body;

    if (!deviceToken) {
      res.status(400).json({ error: 'deviceToken is required' });
      return;
    }

    if (!fcmToken && !apnsToken) {
      res.status(400).json({ error: 'At least one of fcmToken or apnsToken is required' });
      return;
    }

    // Check if device exists
    const existing = await dbGet(
      'SELECT * FROM devices WHERE device_token = ?',
      [deviceToken]
    );

    if (!existing) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    // Update push tokens
    const updates = [];
    const params = [];
    
    if (fcmToken !== undefined && fcmToken !== null) {
      updates.push('fcm_token = ?');
      params.push(fcmToken);
    }
    
    if (apnsToken !== undefined && apnsToken !== null) {
      updates.push('apns_token = ?');
      params.push(apnsToken);
    }
    
    // If no tokens to update, return success without DB call
    if (updates.length === 0) {
      res.json({ 
        success: true, 
        message: 'No push tokens to update',
        fcmTokenUpdated: false,
        apnsTokenUpdated: false,
      });
      return;
    }
    
    params.push(deviceToken);
    
    await dbRun(
      `UPDATE devices SET ${updates.join(', ')} WHERE device_token = ?`,
      params
    );

    logger.info(`✓ Push tokens updated for device: ${deviceToken.substring(0, 20)}...`);
    
    res.json({ 
      success: true, 
      message: 'Push tokens updated',
      fcmTokenUpdated: fcmToken !== undefined,
      apnsTokenUpdated: apnsToken !== undefined,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating push tokens');
    res.status(500).json({ error: 'Failed to update push tokens' });
  }
});

// Get all registered devices
router.get('/', verifySession, async (req: Request, res: Response) => {
  try {
    const rows = await dbAll<DeviceRow>(
      `SELECT d.*, GROUP_CONCAT(dg.group_code) as group_codes FROM devices d LEFT JOIN device_groups dg ON d.id = dg.device_id WHERE d.active = 1 GROUP BY d.id ORDER BY d.registered_at DESC`,
      []
    );

    const devices = rows.map((row) => mapDeviceRow(row));

    res.json(devices);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching devices');
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get a specific device
router.get('/:id', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await dbGet<DeviceRow>('SELECT * FROM devices WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    // Get assigned groups
    const groupRows = await dbAll(
      'SELECT group_code FROM device_groups WHERE device_id = ?',
      [id]
    );
    const rowWithGroups: DeviceRow = { ...row, group_codes: groupRows.map((g: any) => g.group_code).join(',') || null };

    res.json(mapDeviceRow(rowWithGroups, true));
  } catch (error) {
    logger.error({ err: error }, 'Error fetching device');
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Get device details with full group information
router.get('/:id/details', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await dbGet<DeviceRow>('SELECT * FROM devices WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    // Get assigned groups with full details
    const groupRows = await dbAll<GroupRow>(
      `SELECT g.code, g.name, g.description, g.created_at 
       FROM groups g
       INNER JOIN device_groups dg ON g.code = dg.group_code
       WHERE dg.device_id = ?`,
      [id]
    );

    const rowWithGroups: DeviceRow = { ...row, group_codes: groupRows.map((g) => g.code).join(',') || null };
    const device = mapDeviceRow(rowWithGroups, true);
    const assignedGroups = groupRows.map(mapGroupRow);

    res.json({
      device,
      assignedGroups,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching device details');
    res.status(500).json({ error: 'Failed to fetch device details' });
  }
});

// Get QR code for a specific device
router.get('/:id/qr-code', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await dbGet('SELECT device_token, qr_code_data FROM devices WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    // If QR code is not stored, regenerate it
    let qrCodeDataUrl = row.qr_code_data;
    
    if (!qrCodeDataUrl) {
      const registrationData = {
        token: row.device_token,
        serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
      };
      
      qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(registrationData));
      
      // Save it for future use
      await dbRun(
        'UPDATE devices SET qr_code_data = ? WHERE id = ?',
        [qrCodeDataUrl, id]
      );
    }

    res.json({
      deviceToken: row.device_token,
      qrCode: qrCodeDataUrl,
      registrationData: {
        token: row.device_token,
        serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching QR code');
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

// Deactivate a device
router.delete('/:id', verifyToken, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const device = await dbGet('SELECT * FROM devices WHERE id = ?', [id]);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    await dbRun('UPDATE devices SET active = 0 WHERE id = ?', [id]);
    res.json({ message: 'Device deactivated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error deactivating device');
    res.status(500).json({ error: 'Failed to deactivate device' });
  }
});

export default router;
