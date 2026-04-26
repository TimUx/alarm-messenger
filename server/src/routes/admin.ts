import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { dbRun, dbGet, dbAll } from '../services/database';
import { generateToken, verifyAdmin, verifySession, generateCsrfToken, AuthRequest } from '../middleware/auth';
import { addToBlacklist } from '../services/token-blacklist';
import { ntfyNotificationService } from '../services/ntfy-notification';
import { mapEmergencyRow } from '../mappers';
import { EmergencyRow, AdminUserRow, DeviceRow } from '../models/db-types';
import { PushNotificationData } from '../services/push-notification';
import { validateBody } from '../middleware/validate';
import { LoginSchema } from '../validation/schemas';
import { addSseClient, removeSseClient } from '../services/sse';
import logger from '../utils/logger';
import {
  AdminEmergencyResponseJoinRow,
  isValidAdminRole,
  mapAdminUser,
  parsePagination,
  mapEmergencyResponses,
  buildEmergencySummary,
  withNotificationSummaryDefaults,
} from './admin/helpers';

const router = Router();

interface CountRow {
  count: number;
}

const ntfyTestThrottle = new Map<string, number>();
const NTFY_TEST_COOLDOWN_MS = Number(process.env.NTFY_TEST_COOLDOWN_MS || 30000);

function buildNtfyTopic(deviceId: string): string {
  const template = process.env.NTFY_TOPIC_TEMPLATE || 'alarm-{deviceId}';
  return template.replace('{deviceId}', deviceId);
}

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// Login endpoint
router.post('/login', loginRateLimiter, validateBody(LoginSchema), async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await dbGet<Pick<AdminUserRow, 'id' | 'username' | 'password_hash' | 'role' | 'full_name'>>(
      'SELECT id, username, password_hash, role, full_name FROM admin_users WHERE username = ?',
      [username]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id, user.username, user.role || 'admin');
    const csrfToken = generateCsrfToken();

    req.session.userId = user.id;
    req.session.csrfToken = csrfToken;

    res.json({
      token,
      csrfToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'admin',
        fullName: user.full_name,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error during login');
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint - destroy session
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 3600 * 1000;
    await addToBlacklist(token, expiresAt);
  }
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Error destroying session');
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Create admin user (protected - only for admins)
router.post('/users', verifySession, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, fullName, role } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Validate role
    if (role && !isValidAdminRole(role)) {
      res.status(400).json({ error: 'Invalid role. Must be "admin" or "operator"' });
      return;
    }

    // Check if user already exists
    const existing = await dbGet<AdminUserRow>(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );

    if (existing) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const userRole = role || 'operator';

    await dbRun(
      'INSERT INTO admin_users (id, username, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, passwordHash, fullName || null, userRole, createdAt]
    );

    res.status(201).json({
      id,
      username,
      fullName: fullName || null,
      role: userRole,
      createdAt,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating admin user');
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Initialize first admin user (unprotected - only works if no users exist)
router.post('/init', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Check if any admin users exist
    const existingUsers = await dbAll<CountRow>('SELECT COUNT(*) as count FROM admin_users', []);
    
    if (!existingUsers || existingUsers.length === 0) {
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    
    if (existingUsers[0].count > 0) {
      res.status(403).json({ error: 'Admin users already exist. Use /admin/users endpoint.' });
      return;
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    await dbRun(
      'INSERT INTO admin_users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, username, passwordHash, 'admin', createdAt]
    );

    const token = generateToken(id, username, 'admin');
    const csrfToken = generateCsrfToken();

    req.session.userId = id;
    req.session.csrfToken = csrfToken;

    res.status(201).json({
      token,
      csrfToken,
      user: {
        id,
        username,
        createdAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error initializing admin');
    res.status(500).json({ error: 'Failed to initialize admin' });
  }
});

// Get all users (protected - admin only)
router.get('/users', verifySession, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await dbAll<AdminUserRow>(
      'SELECT id, username, full_name, role, created_at FROM admin_users ORDER BY created_at DESC',
      []
    );

    res.json({
      users: users.map(mapAdminUser),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching users');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user (protected - admin only)
router.put('/users/:id', verifySession, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, fullName, role } = req.body;

    // Cannot edit yourself
    if (id === req.userId) {
      res.status(400).json({ error: 'Cannot edit your own user. Use profile endpoint instead.' });
      return;
    }

    // Validate role
    if (role && !isValidAdminRole(role)) {
      res.status(400).json({ error: 'Invalid role. Must be "admin" or "operator"' });
      return;
    }

    const user = await dbGet<AdminUserRow>('SELECT * FROM admin_users WHERE id = ?', [id]);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if username is already taken by another user
    if (username && username !== user.username) {
      const existing = await dbGet<AdminUserRow>(
        'SELECT * FROM admin_users WHERE username = ? AND id != ?',
        [username, id]
      );

      if (existing) {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
    }

    await dbRun(
      'UPDATE admin_users SET username = ?, full_name = ?, role = ? WHERE id = ?',
      [username || user.username, fullName || null, role || user.role, id]
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error updating user');
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (protected - admin only)
router.delete('/users/:id', verifySession, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cannot delete yourself
    if (id === req.userId) {
      res.status(400).json({ error: 'Cannot delete your own user account' });
      return;
    }

    const user = await dbGet<AdminUserRow>('SELECT * FROM admin_users WHERE id = ?', [id]);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await dbRun('DELETE FROM admin_users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting user');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change password (protected - any authenticated user)
router.put('/users/:id/password', verifySession, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Users can only change their own password unless they are admin
    if (id !== req.userId && req.userRole !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!newPassword) {
      res.status(400).json({ error: 'New password is required' });
      return;
    }

    const user = await dbGet<AdminUserRow>('SELECT * FROM admin_users WHERE id = ?', [id]);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // If changing own password, verify current password
    if (id === req.userId) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required' });
        return;
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newPasswordHash, id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error changing password');
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get current user profile
router.get('/profile', verifySession, async (req: AuthRequest, res: Response) => {
  try {
    const user = await dbGet<AdminUserRow>(
      'SELECT id, username, full_name, role, created_at FROM admin_users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(mapAdminUser(user));
  } catch (error) {
    logger.error({ err: error }, 'Error fetching profile');
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update device/responder information
router.put('/devices/:id', verifySession, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      qualifications,
      leadershipRole,
    } = req.body;

    const device = await dbGet<DeviceRow>('SELECT * FROM devices WHERE id = ?', [id]);
    
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    await dbRun(
      `UPDATE devices SET 
        first_name = ?,
        last_name = ?,
        qual_machinist = ?,
        qual_agt = ?,
        qual_paramedic = ?,
        leadership_role = ?
      WHERE id = ?`,
      [
        firstName || null,
        lastName || null,
        qualifications?.machinist ? 1 : 0,
        qualifications?.agt ? 1 : 0,
        qualifications?.paramedic ? 1 : 0,
        leadershipRole || 'none',
        id,
      ]
    );

    res.json({ message: 'Device updated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error updating device');
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// Get ntfy provisioning data for a specific device (admin only)
router.get('/devices/:id/ntfy-config', verifySession, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const baseUrl = (process.env.NTFY_BASE_URL || '').replace(/\/$/, '');

    if (!baseUrl) {
      res.status(400).json({ error: 'NTFY_BASE_URL is not configured' });
      return;
    }

    const device = await dbGet<DeviceRow>('SELECT id FROM devices WHERE id = ? AND active = 1', [id]);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const topic = buildNtfyTopic(id);
    const subscribeUrl = `${baseUrl}/${encodeURIComponent(topic)}`;
    const qrCode = await QRCode.toDataURL(subscribeUrl);

    res.json({
      deviceId: id,
      topic,
      subscribeUrl,
      qrCode,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ntfy config for device');
    res.status(500).json({ error: 'Failed to fetch ntfy config' });
  }
});

// Send a test ntfy message for a specific device (admin only)
router.post('/devices/:id/ntfy-test', verifySession, verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cooldownKey = `${req.userId ?? 'unknown'}:${id}`;
    const nowMs = Date.now();
    const lastSentMs = ntfyTestThrottle.get(cooldownKey) ?? 0;
    const elapsedMs = nowMs - lastSentMs;
    if (elapsedMs < NTFY_TEST_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((NTFY_TEST_COOLDOWN_MS - elapsedMs) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Bitte warten (${retryAfterSec}s), bevor Sie erneut einen ntfy-Test senden.`,
      });
      return;
    }

    if (!ntfyNotificationService.isEnabled()) {
      res.status(400).json({ error: 'ntfy escalation is not enabled or configured' });
      return;
    }

    const device = await dbGet<DeviceRow>('SELECT id FROM devices WHERE id = ? AND active = 1', [id]);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const now = new Date().toISOString();
    const testData: PushNotificationData = {
      emergencyId: crypto.randomUUID(),
      emergencyNumber: `TEST-${now.substring(0, 19).replace(/[:T-]/g, '')}`,
      emergencyDate: now,
      emergencyKeyword: 'NTFY TEST',
      emergencyDescription: 'Dies ist eine Testnachricht aus dem Admin-Interface.',
      emergencyLocation: 'Alarm Messenger',
      groups: '',
    };

    const topic = buildNtfyTopic(id);
    const sent = await ntfyNotificationService.sendEmergencyNotification(
      {
        topic,
        title: 'EINSATZ TEST: NTFY',
        message: 'Testalarm aus Alarm Messenger Admin',
      },
      testData,
    );

    if (!sent) {
      res.status(502).json({ error: 'Failed to publish ntfy test message' });
      return;
    }

    ntfyTestThrottle.set(cooldownKey, nowMs);
    res.json({ success: true, topic });
  } catch (error) {
    logger.error({ err: error }, 'Error sending ntfy test message');
    res.status(500).json({ error: 'Failed to send ntfy test message' });
  }
});

// Manually end an emergency (set active = 0)
router.patch('/emergencies/:id', verifySession, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const emergency = await dbGet<EmergencyRow>('SELECT * FROM emergencies WHERE id = ?', [id]);
    if (!emergency) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    await dbRun(
      'UPDATE emergencies SET active = ? WHERE id = ?',
      [active ? 1 : 0, id]
    );

    res.json({ message: 'Emergency updated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error updating emergency');
    res.status(500).json({ error: 'Failed to update emergency' });
  }
});

// Get emergency history with pagination
router.get('/emergencies', verifySession, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(
      req.query.page as string | undefined,
      req.query.limit as string | undefined,
      100,
      20
    );

    // Get total count
    const countResult = await dbGet<{ total: number }>('SELECT COUNT(*) as total FROM emergencies', []);
    const total = countResult.total;

    // Get paginated emergencies
    const rows = await dbAll<EmergencyRow>(
      'SELECT * FROM emergencies ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const emergencies = rows.map((row) => mapEmergencyRow(row));

    res.json({
      emergencies,
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

// Get detailed emergency information with all responses
router.get('/emergencies/:id', verifySession, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get emergency details
    const emergency = await dbGet<EmergencyRow>('SELECT * FROM emergencies WHERE id = ?', [id]);
    
    if (!emergency) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    // Get all responses with responder details
    const responseRows = await dbAll<AdminEmergencyResponseJoinRow>(
      `SELECT r.*, d.platform, d.first_name, d.last_name,
              d.qual_machinist, d.qual_agt, d.qual_paramedic, d.leadership_role
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ?
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const responses = mapEmergencyResponses(responseRows);

    // Aggregate delivery summary from notification_outbox
    const outboxSummary = await dbGet<{
      total: number; delivered: number; failed: number; pending: number;
    }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
         SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending
       FROM notification_outbox
       WHERE emergency_id = ?`,
      [id],
    );

    res.json({
      emergency: mapEmergencyRow(emergency),
      responses,
      summary: buildEmergencySummary(responses),
      notificationSummary: withNotificationSummaryDefaults(outboxSummary),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching emergency details');
    res.status(500).json({ error: 'Failed to fetch emergency details' });
  }
});

// Server-Sent Events endpoint for real-time updates (protected)
router.get('/events', verifySession, (req: AuthRequest, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    addSseClient(res);

    req.on('close', () => {
      removeSseClient(res);
    });
  } catch (error) {
    logger.error({ err: error }, 'Error setting up SSE connection');
    removeSseClient(res);
  }
});

export default router;
