import { dbGet } from './database';
import logger from '../utils/logger';

interface DispatchMetricsState {
  totalDispatches: number;
  totalDurationMs: number;
  pushSuccess: number;
  pushFailed: number;
  wsSuccess: number;
  wsFailed: number;
  lastDispatchAt: string | null;
}

const state: DispatchMetricsState = {
  totalDispatches: 0,
  totalDurationMs: 0,
  pushSuccess: 0,
  pushFailed: 0,
  wsSuccess: 0,
  wsFailed: 0,
  lastDispatchAt: null,
};

export interface DispatchResultStats {
  pushSuccess: number;
  pushFailed: number;
  wsSuccess: number;
  wsFailed: number;
  durationMs: number;
}

export interface DispatchMetricsSnapshot {
  dispatch: {
    total: number;
    averageDurationMs: number;
    lastDispatchAt: string | null;
  };
  delivery: {
    pushSuccess: number;
    pushFailed: number;
    websocketSuccess: number;
    websocketFailed: number;
  };
  outbox: {
    pending: number;
    delivered: number;
    failed: number;
  };
}

export async function recordDispatchMetrics(stats: DispatchResultStats): Promise<void> {
  state.totalDispatches += 1;
  state.totalDurationMs += stats.durationMs;
  state.pushSuccess += stats.pushSuccess;
  state.pushFailed += stats.pushFailed;
  state.wsSuccess += stats.wsSuccess;
  state.wsFailed += stats.wsFailed;
  state.lastDispatchAt = new Date().toISOString();
}

export async function getDispatchMetricsSnapshot(): Promise<DispatchMetricsSnapshot> {
  const avgDurationMs = state.totalDispatches > 0
    ? Math.round(state.totalDurationMs / state.totalDispatches)
    : 0;

  try {
    const outbox = await dbGet<{ pending: number; delivered: number; failed: number }>(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM notification_outbox`,
      [],
    );

    return {
      dispatch: {
        total: state.totalDispatches,
        averageDurationMs: avgDurationMs,
        lastDispatchAt: state.lastDispatchAt,
      },
      delivery: {
        pushSuccess: state.pushSuccess,
        pushFailed: state.pushFailed,
        websocketSuccess: state.wsSuccess,
        websocketFailed: state.wsFailed,
      },
      outbox: {
        pending: outbox?.pending ?? 0,
        delivered: outbox?.delivered ?? 0,
        failed: outbox?.failed ?? 0,
      },
    };
  } catch (error: unknown) {
    logger.warn({ err: error }, 'Failed to build dispatch metrics snapshot');
    return {
      dispatch: {
        total: state.totalDispatches,
        averageDurationMs: avgDurationMs,
        lastDispatchAt: state.lastDispatchAt,
      },
      delivery: {
        pushSuccess: state.pushSuccess,
        pushFailed: state.pushFailed,
        websocketSuccess: state.wsSuccess,
        websocketFailed: state.wsFailed,
      },
      outbox: { pending: 0, delivered: 0, failed: 0 },
    };
  }
}
