import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { dbRun, dbGet, dbAll } from '../services/database';
import { Device } from '../models/types';

const router = Router();

// Generate a registration QR code
router.post('/registration-token', async (req: Request, res: Response) => {
  try {
    const deviceToken = uuidv4();
    
    // Generate QR code data URL
    const registrationData = {
      token: deviceToken,
      serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
    };
    
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(registrationData));
    
    res.json({
      deviceToken,
      qrCode: qrCodeDataUrl,
      registrationData,
    });
  } catch (error) {
    console.error('Error generating registration token:', error);
    res.status(500).json({ error: 'Failed to generate registration token' });
  }
});

// Register a device
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      deviceToken,
      registrationToken,
      platform,
      responderName,
      qualifications,
      isSquadLeader,
    } = req.body;

    if (!deviceToken || !registrationToken || !platform) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (platform !== 'ios' && platform !== 'android') {
      res.status(400).json({ error: 'Invalid platform. Must be ios or android' });
      return;
    }

    // Check if device token already exists
    const existing = await dbGet(
      'SELECT * FROM devices WHERE device_token = ?',
      [deviceToken]
    );

    if (existing) {
      // Update existing device
      await dbRun(
        `UPDATE devices SET 
          registration_token = ?, 
          platform = ?, 
          active = 1,
          responder_name = ?,
          qual_machinist = ?,
          qual_agt = ?,
          qual_paramedic = ?,
          qual_th_vu = ?,
          qual_th_bau = ?,
          is_squad_leader = ?
        WHERE device_token = ?`,
        [
          registrationToken, 
          platform, 
          responderName || null,
          qualifications?.machinist ? 1 : 0,
          qualifications?.agt ? 1 : 0,
          qualifications?.paramedic ? 1 : 0,
          qualifications?.thVu ? 1 : 0,
          qualifications?.thBau ? 1 : 0,
          isSquadLeader ? 1 : 0,
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
        responderName,
        qualifications,
        isSquadLeader,
      };

      res.json(device);
    } else {
      // Create new device
      const id = uuidv4();
      const registeredAt = new Date().toISOString();

      await dbRun(
        `INSERT INTO devices (
          id, device_token, registration_token, platform, registered_at, active,
          responder_name, qual_machinist, qual_agt, qual_paramedic, 
          qual_th_vu, qual_th_bau, is_squad_leader
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, deviceToken, registrationToken, platform, registeredAt, 1,
          responderName || null,
          qualifications?.machinist ? 1 : 0,
          qualifications?.agt ? 1 : 0,
          qualifications?.paramedic ? 1 : 0,
          qualifications?.thVu ? 1 : 0,
          qualifications?.thBau ? 1 : 0,
          isSquadLeader ? 1 : 0,
        ]
      );

      const device: Device = {
        id,
        deviceToken,
        registrationToken,
        platform,
        registeredAt,
        active: true,
        responderName,
        qualifications,
        isSquadLeader,
      };

      res.status(201).json(device);
    }
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Get all registered devices
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await dbAll(
      'SELECT * FROM devices WHERE active = 1 ORDER BY registered_at DESC',
      []
    );

    const devices: Device[] = rows.map((row: any) => ({
      id: row.id,
      deviceToken: row.device_token,
      registrationToken: row.registration_token,
      platform: row.platform,
      registeredAt: row.registered_at,
      active: row.active === 1,
      responderName: row.responder_name,
      qualifications: {
        machinist: row.qual_machinist === 1,
        agt: row.qual_agt === 1,
        paramedic: row.qual_paramedic === 1,
        thVu: row.qual_th_vu === 1,
        thBau: row.qual_th_bau === 1,
      },
      isSquadLeader: row.is_squad_leader === 1,
    }));

    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get a specific device
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await dbGet('SELECT * FROM devices WHERE id = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const device: Device = {
      id: row.id,
      deviceToken: row.device_token,
      registrationToken: row.registration_token,
      platform: row.platform,
      registeredAt: row.registered_at,
      active: row.active === 1,
      responderName: row.responder_name,
      qualifications: {
        machinist: row.qual_machinist === 1,
        agt: row.qual_agt === 1,
        paramedic: row.qual_paramedic === 1,
        thVu: row.qual_th_vu === 1,
        thBau: row.qual_th_bau === 1,
      },
      isSquadLeader: row.is_squad_leader === 1,
    };

    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Deactivate a device
router.delete('/:id', async (req: Request, res: Response) => {
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
    console.error('Error deactivating device:', error);
    res.status(500).json({ error: 'Failed to deactivate device' });
  }
});

export default router;
