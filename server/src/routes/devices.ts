import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { signRegistrationInvite } from '../services/registration-invite';
import rateLimit from 'express-rate-limit';
import { dbRun, dbGet, dbAll } from '../services/database';
import { verifyToken, verifyAdmin, verifySession, AuthRequest, DeviceRequest, verifyDeviceToken, generateDeviceToken } from '../middleware/auth';
import { Device } from '../models/types';
import { DeviceRow } from '../models/db-types';
import { mapDeviceRow, mapGroupRow } from '../mappers';
import { GroupRow } from '../models/db-types';
import { validateBody } from '../middleware/validate';
import {
  DeviceRegistrationSchema,
  RegistrationInviteEmailSchema,
  UpdatePushTokenSchema,
} from '../validation/schemas';
import logger from '../utils/logger';
import {
  parseDevicesPagination,
  buildGroupCodes,
  buildRegistrationDevicePayload,
  buildPushTokenUpdatePlan,
} from './devices/helpers';
import { createPendingRegistrationDevice } from '../services/pending-device-registration';
import { sendRegistrationInviteEmail, isMailConfigured } from '../services/mail';

const router = Router();

interface DevicesCountRow {
  total: number;
}

interface DeviceIdRow {
  id: string;
}

interface DeviceTokenRow {
  device_token: string;
}

interface DeviceGroupCodeRow {
  group_code: string;
}

function ensureAuthenticatedDeviceAccess(req: Request, targetDeviceId: string): boolean {
  return (req as DeviceRequest).device?.id === targetDeviceId;
}

const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

// Generate a registration QR code
router.post('/registration-token', verifySession, verifyAdmin, registrationRateLimiter, async (req: Request, res: Response) => {
  try {
    const pending = await createPendingRegistrationDevice();

    res.json({
      deviceToken: pending.deviceToken,
      qrCode: pending.qrCodeDataUrl,
      registrationData: pending.registrationData,
      registrationLink: pending.registrationLink,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error generating registration token');
    res.status(500).json({ error: 'Failed to generate registration token' });
  }
});

// Create pending device and email registration link (optional SMTP)
router.post(
  '/registration-token/email',
  verifySession,
  verifyAdmin,
  registrationRateLimiter,
  validateBody(RegistrationInviteEmailSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, deviceToken: existingDeviceToken } = req.body as {
        email: string;
        deviceToken?: string;
      };

      let pending: Awaited<ReturnType<typeof createPendingRegistrationDevice>>;

      if (existingDeviceToken) {
        const row = await dbGet<DeviceRow>(
          'SELECT * FROM devices WHERE device_token = ? AND active = 0',
          [existingDeviceToken],
        );
        if (!row) {
          res.status(404).json({ error: 'Device token not found or already registered' });
          return;
        }
        if (row.registration_expires_at) {
          const exp = new Date(row.registration_expires_at).getTime();
          if (Number.isFinite(exp) && exp < Date.now()) {
            res.status(410).json({ error: 'Registration invite expired' });
            return;
          }
        }
        const serverUrl = (process.env.SERVER_URL || 'http://localhost:3000').replace(/\/$/, '');
        const registrationData = { token: existingDeviceToken, serverUrl };
        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(registrationData));
        const registrationInviteToken = signRegistrationInvite(existingDeviceToken, serverUrl);
        const registrationLink = `${serverUrl}/register?token=${encodeURIComponent(registrationInviteToken)}`;
        pending = {
          id: row.id,
          deviceToken: existingDeviceToken,
          qrCodeDataUrl,
          registrationData,
          registrationLink,
          registrationInviteToken,
        };
      } else {
        pending = await createPendingRegistrationDevice();
      }

      const registrationJson = JSON.stringify(pending.registrationData);

      let emailResult: { sent: boolean; reason?: string } = { sent: false, reason: 'smtp_not_configured' };
      if (isMailConfigured()) {
        const subject = 'Alarm Messenger — Geräteregistrierung';
        const text = [
          'Sie wurden eingeladen, ein Gerät in Alarm Messenger zu registrieren.',
          '',
          `Registrierungs-Link (48h gültig): ${pending.registrationLink}`,
          '',
          'Alternativ können Sie diese JSON-Daten in der App unter „Manuelle Registrierung“ einfügen:',
          registrationJson,
        ].join('\n');

        const html = `<p>Sie wurden eingeladen, ein Gerät in <strong>Alarm Messenger</strong> zu registrieren.</p>
<p><a href="${pending.registrationLink}">Registrierung im Browser öffnen</a> (48&nbsp;Stunden gültig)</p>
<p>Alternativ JSON in der App unter „Manuelle Registrierung“ einfügen:</p>
<pre style="white-space:pre-wrap">${registrationJson.replace(/</g, '&lt;')}</pre>`;

        emailResult = await sendRegistrationInviteEmail(email, { subject, text, html });
      }

      res.json({
        deviceToken: pending.deviceToken,
        qrCode: pending.qrCodeDataUrl,
        registrationData: pending.registrationData,
        registrationLink: pending.registrationLink,
        email: emailResult,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error generating registration token email');
      res.status(500).json({ error: 'Failed to generate registration invite email' });
    }
  },
);

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
    const existing = await dbGet<DeviceRow>(
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
        fcmToken || null,
        apnsToken || null,
        deviceToken
      ]
    );

    const device: Device = buildRegistrationDevicePayload({
      existingId: existing.id,
      deviceToken,
      registrationToken,
      platform,
      registeredAt: existing.registered_at,
      firstName,
      lastName,
      qualifications,
      leadershipRole,
    });

    // Issue a WebSocket JWT so the device can authenticate the /ws connection
    const wsToken = generateDeviceToken(existing.id);

    res.json({ ...device, wsToken });
  } catch (error) {
    logger.error({ err: error }, 'Error registering device');
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Update push notification tokens (FCM/APNs)
router.post('/update-push-token', verifyDeviceToken, validateBody(UpdatePushTokenSchema), async (req: Request, res: Response) => {
  try {
    const { deviceToken, fcmToken, apnsToken } = req.body;
    const authenticatedDeviceId = (req as DeviceRequest).device?.id;

    // Check if device exists
    const existing = await dbGet<DeviceIdRow>(
      'SELECT id FROM devices WHERE device_token = ?',
      [deviceToken]
    );

    if (!existing) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    if (!authenticatedDeviceId || existing.id !== authenticatedDeviceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { updates, params } = buildPushTokenUpdatePlan(fcmToken, apnsToken);
    
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

// Get all registered devices (with pagination)
router.get('/', verifySession, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parseDevicesPagination(
      req.query.page as string | undefined,
      req.query.limit as string | undefined
    );

    const countResult = await dbGet<DevicesCountRow>('SELECT COUNT(*) as total FROM devices WHERE active = 1', []);
    const total = countResult?.total || 0;

    const rows = await dbAll<DeviceRow>(
      `SELECT d.*, GROUP_CONCAT(dg.group_code) as group_codes FROM devices d LEFT JOIN device_groups dg ON d.id = dg.device_id WHERE d.active = 1 GROUP BY d.id ORDER BY d.registered_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const devices = rows.map((row) => mapDeviceRow(row, false));

    res.json({
      data: devices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching devices');
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get a specific device
router.get('/:id', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!ensureAuthenticatedDeviceAccess(req, id)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const row = await dbGet<DeviceRow>('SELECT * FROM devices WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    // Get assigned groups
    const groupRows = await dbAll<DeviceGroupCodeRow>(
      'SELECT group_code FROM device_groups WHERE device_id = ?',
      [id]
    );
    const rowWithGroups: DeviceRow = { ...row, group_codes: buildGroupCodes(groupRows) };

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
    if (!ensureAuthenticatedDeviceAccess(req, id)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
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

    const rowWithGroups: DeviceRow = { ...row, group_codes: buildGroupCodes(groupRows) };
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

// Get QR code for a specific device (always generated on-the-fly)
router.get('/:id/qr-code', verifyDeviceToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!ensureAuthenticatedDeviceAccess(req, id)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const row = await dbGet<DeviceTokenRow>('SELECT device_token FROM devices WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const registrationData = {
      token: row.device_token,
      serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(registrationData));

    res.setHeader('Cache-Control', 'max-age=3600');
    res.json({
      deviceToken: row.device_token,
      qrCode: qrCodeDataUrl,
      registrationData,
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
    
    const device = await dbGet<DeviceRow>('SELECT * FROM devices WHERE id = ?', [id]);
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
