import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { dbRun, dbGet, dbAll } from '../services/database';
import { generateToken, verifyAdmin, verifySession, generateCsrfToken, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// Login endpoint
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await dbGet(
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
router.post('/logout', (req: Request, res: Response) => {
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
    if (role && role !== 'admin' && role !== 'operator') {
      res.status(400).json({ error: 'Invalid role. Must be "admin" or "operator"' });
      return;
    }

    // Check if user already exists
    const existing = await dbGet(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );

    if (existing) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const id = uuidv4();
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
    const existingUsers = await dbAll('SELECT COUNT(*) as count FROM admin_users', []);
    
    if (!existingUsers || existingUsers.length === 0) {
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    
    if (existingUsers[0].count > 0) {
      res.status(403).json({ error: 'Admin users already exist. Use /admin/users endpoint.' });
      return;
    }

    const id = uuidv4();
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
    const users = await dbAll(
      'SELECT id, username, full_name, role, created_at FROM admin_users ORDER BY created_at DESC',
      []
    );

    res.json({
      users: users.map((user: any) => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role || 'admin',
        createdAt: user.created_at,
      })),
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
    if (role && role !== 'admin' && role !== 'operator') {
      res.status(400).json({ error: 'Invalid role. Must be "admin" or "operator"' });
      return;
    }

    const user = await dbGet('SELECT * FROM admin_users WHERE id = ?', [id]);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if username is already taken by another user
    if (username && username !== user.username) {
      const existing = await dbGet(
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

    const user = await dbGet('SELECT * FROM admin_users WHERE id = ?', [id]);
    
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

    const user = await dbGet('SELECT * FROM admin_users WHERE id = ?', [id]);
    
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
    const user = await dbGet(
      'SELECT id, username, full_name, role, created_at FROM admin_users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role || 'admin',
      createdAt: user.created_at,
    });
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

    const device = await dbGet('SELECT * FROM devices WHERE id = ?', [id]);
    
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

// Get emergency history with pagination
router.get('/emergencies', verifySession, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await dbGet('SELECT COUNT(*) as total FROM emergencies', []);
    const total = countResult.total;

    // Get paginated emergencies
    const rows = await dbAll(
      'SELECT * FROM emergencies ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const emergencies = rows.map((row: any) => ({
      id: row.id,
      emergencyNumber: row.emergency_number,
      emergencyDate: row.emergency_date,
      emergencyKeyword: row.emergency_keyword,
      emergencyDescription: row.emergency_description,
      emergencyLocation: row.emergency_location,
      createdAt: row.created_at,
      active: row.active === 1,
      groups: row.groups,
    }));

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
    const emergency = await dbGet('SELECT * FROM emergencies WHERE id = ?', [id]);
    
    if (!emergency) {
      res.status(404).json({ error: 'Emergency not found' });
      return;
    }

    // Get all responses with responder details
    const responseRows = await dbAll(
      `SELECT r.*, d.platform, d.first_name, d.last_name,
              d.qual_machinist, d.qual_agt, d.qual_paramedic, d.leadership_role
       FROM responses r
       JOIN devices d ON r.device_id = d.id
       WHERE r.emergency_id = ?
       ORDER BY r.responded_at ASC`,
      [id]
    );

    const responses = responseRows.map((row: any) => ({
      id: row.id,
      deviceId: row.device_id,
      platform: row.platform,
      participating: row.participating === 1,
      respondedAt: row.responded_at,
      responder: {
        firstName: row.first_name,
        lastName: row.last_name,
        qualifications: {
          machinist: row.qual_machinist === 1,
          agt: row.qual_agt === 1,
          paramedic: row.qual_paramedic === 1,
        },
        leadershipRole: row.leadership_role || 'none',
      },
    }));

    // Count participants
    const participantsCount = responses.filter(r => r.participating).length;
    const nonParticipantsCount = responses.filter(r => !r.participating).length;

    res.json({
      emergency: {
        id: emergency.id,
        emergencyNumber: emergency.emergency_number,
        emergencyDate: emergency.emergency_date,
        emergencyKeyword: emergency.emergency_keyword,
        emergencyDescription: emergency.emergency_description,
        emergencyLocation: emergency.emergency_location,
        createdAt: emergency.created_at,
        active: emergency.active === 1,
        groups: emergency.groups,
      },
      responses,
      summary: {
        totalResponses: responses.length,
        participants: participantsCount,
        nonParticipants: nonParticipantsCount,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching emergency details');
    res.status(500).json({ error: 'Failed to fetch emergency details' });
  }
});

export default router;
