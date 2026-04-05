import { Router, Request, Response } from 'express';
import { version } from '../../package.json';
import logger from '../utils/logger';

const router = Router();

// Get server information
router.get('/', async (req: Request, res: Response) => {
  try {
    const serverInfo = {
      organizationName: process.env.ORGANIZATION_NAME || 'Alarm Messenger',
      serverVersion: version,
      serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
    };

    res.json(serverInfo);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching server info');
    res.status(500).json({ error: 'Failed to fetch server info' });
  }
});

export default router;
