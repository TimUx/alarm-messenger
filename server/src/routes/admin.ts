import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { dbRun, dbGet, dbAll } from '../services/database';
import { verifyToken, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await dbGet(
      'SELECT * FROM admin_users WHERE username = ?',
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

    const token = generateToken(user.id, user.username);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create admin user (protected - only for initial setup or existing admins)
router.post('/users', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
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

    await dbRun(
      'INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [id, username, passwordHash, createdAt]
    );

    res.status(201).json({
      id,
      username,
      createdAt,
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
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
      'INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [id, username, passwordHash, createdAt]
    );

    const token = generateToken(id, username);

    res.status(201).json({
      token,
      user: {
        id,
        username,
        createdAt,
      },
    });
  } catch (error) {
    console.error('Error initializing admin:', error);
    res.status(500).json({ error: 'Failed to initialize admin' });
  }
});

// Update device/responder information
router.put('/devices/:id', verifyToken, async (req: AuthRequest, res: Response) => {
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
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// Get emergency history with pagination
router.get('/emergencies', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
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
    console.error('Error fetching emergencies:', error);
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
});

// Get detailed emergency information with all responses
router.get('/emergencies/:id', verifyToken, async (req: AuthRequest, res: Response) => {
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
    console.error('Error fetching emergency details:', error);
    res.status(500).json({ error: 'Failed to fetch emergency details' });
  }
});

export default router;
