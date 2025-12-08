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
      responderName,
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
        responder_name = ?,
        qual_machinist = ?,
        qual_agt = ?,
        qual_paramedic = ?,
        leadership_role = ?
      WHERE id = ?`,
      [
        responderName || null,
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

export default router;
