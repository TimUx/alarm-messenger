import { Router, Request, Response } from 'express';
import { dbRun, dbGet, dbAll } from '../services/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { Group, CreateGroupRequest, ImportGroupsRequest } from '../models/types';

const router = Router();

// Get all groups
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await dbAll(
      'SELECT * FROM groups ORDER BY code ASC',
      []
    );

    const groups: Group[] = rows.map((row: any) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
    }));

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get a specific group
router.get('/:code', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const row = await dbGet('SELECT * FROM groups WHERE code = ?', [code]);

    if (!row) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const group: Group = {
      code: row.code,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
    };

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Create a new group
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, description }: CreateGroupRequest = req.body;

    if (!code || !name) {
      res.status(400).json({ error: 'Code and name are required' });
      return;
    }

    // Validate code format (only alphanumeric and dash, max 20 chars)
    const upperCode = code.toUpperCase();
    if (!/^[A-Z0-9-]{1,20}$/.test(upperCode)) {
      res.status(400).json({ error: 'Invalid group code format. Use only letters, numbers, and dashes (max 20 characters).' });
      return;
    }

    // Check if group already exists
    const existing = await dbGet('SELECT * FROM groups WHERE code = ?', [upperCode]);
    if (existing) {
      res.status(409).json({ error: 'Group with this code already exists' });
      return;
    }

    const createdAt = new Date().toISOString();

    await dbRun(
      'INSERT INTO groups (code, name, description, created_at) VALUES (?, ?, ?, ?)',
      [upperCode, name, description || null, createdAt]
    );

    const group: Group = {
      code: upperCode,
      name,
      description,
      createdAt,
    };

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Update a group
router.put('/:code', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const existing = await dbGet('SELECT * FROM groups WHERE code = ?', [code]);
    if (!existing) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    await dbRun(
      'UPDATE groups SET name = ?, description = ? WHERE code = ?',
      [name, description || null, code]
    );

    res.json({ message: 'Group updated successfully' });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete a group
router.delete('/:code', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;

    const existing = await dbGet('SELECT * FROM groups WHERE code = ?', [code]);
    if (!existing) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Delete group (cascade will remove device_groups associations)
    await dbRun('DELETE FROM groups WHERE code = ?', [code]);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Import multiple groups from CSV
router.post('/import', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { groups }: ImportGroupsRequest = req.body;

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      res.status(400).json({ error: 'Groups array is required' });
      return;
    }

    const createdAt = new Date().toISOString();
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const group of groups) {
      if (!group.code || !group.name) {
        results.errors.push(`Invalid group: missing code or name`);
        continue;
      }

      try {
        const existing = await dbGet('SELECT * FROM groups WHERE code = ?', [group.code.toUpperCase()]);
        
        if (existing) {
          // Update existing group
          await dbRun(
            'UPDATE groups SET name = ?, description = ? WHERE code = ?',
            [group.name, group.description || null, group.code.toUpperCase()]
          );
          results.updated++;
        } else {
          // Create new group
          await dbRun(
            'INSERT INTO groups (code, name, description, created_at) VALUES (?, ?, ?, ?)',
            [group.code.toUpperCase(), group.name, group.description || null, createdAt]
          );
          results.created++;
        }
      } catch (error) {
        results.errors.push(`Error processing group ${group.code}: ${error}`);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error importing groups:', error);
    res.status(500).json({ error: 'Failed to import groups' });
  }
});

// Get groups assigned to a device
router.get('/device/:deviceId', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;

    const rows = await dbAll(
      `SELECT g.* FROM groups g
       INNER JOIN device_groups dg ON g.code = dg.group_code
       WHERE dg.device_id = ?
       ORDER BY g.code ASC`,
      [deviceId]
    );

    const groups: Group[] = rows.map((row: any) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
    }));

    res.json(groups);
  } catch (error) {
    console.error('Error fetching device groups:', error);
    res.status(500).json({ error: 'Failed to fetch device groups' });
  }
});

// Assign groups to a device
router.put('/device/:deviceId', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { groupCodes } = req.body;

    if (!Array.isArray(groupCodes)) {
      res.status(400).json({ error: 'groupCodes must be an array' });
      return;
    }

    // Verify device exists
    const device = await dbGet('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    // Remove all existing group assignments
    await dbRun('DELETE FROM device_groups WHERE device_id = ?', [deviceId]);

    // Add new group assignments
    for (const code of groupCodes) {
      // Verify group exists
      const group = await dbGet('SELECT * FROM groups WHERE code = ?', [code]);
      if (group) {
        await dbRun(
          'INSERT INTO device_groups (device_id, group_code) VALUES (?, ?)',
          [deviceId, code]
        );
      }
    }

    res.json({ message: 'Device groups updated successfully' });
  } catch (error) {
    console.error('Error updating device groups:', error);
    res.status(500).json({ error: 'Failed to update device groups' });
  }
});

export default router;
