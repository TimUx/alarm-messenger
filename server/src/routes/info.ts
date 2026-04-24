import { Router, Request, Response } from 'express';
import { version } from '../../package.json';
import logger from '../utils/logger';
import { verifySession, verifyAdmin } from '../middleware/auth';
import { getDispatchMetricsSnapshot } from '../services/dispatch-metrics';
import { ServerInfo } from '../models/types';

const router = Router();

// Get server information
router.get('/', async (req: Request, res: Response) => {
  try {
    const serverInfo: ServerInfo = {
      organizationName: process.env.ORGANIZATION_NAME || 'Alarm Messenger',
      serverVersion: version,
      serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
    };

    res.json(serverInfo);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error fetching server info');
    res.status(500).json({ error: 'Failed to fetch server info' });
  }
});

// Get dispatch/outbox runtime metrics (admin only)
router.get('/dispatch-metrics', verifySession, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const metrics = await getDispatchMetricsSnapshot();
    res.json(metrics);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error fetching dispatch metrics');
    res.status(500).json({ error: 'Failed to fetch dispatch metrics' });
  }
});

export default router;
