const dbGetMock = jest.fn();

jest.mock('../../services/database', () => ({
  dbGet: (...args: unknown[]) => dbGetMock(...args),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
  },
}));

describe('dispatch-metrics unit', () => {
  beforeEach(() => {
    jest.resetModules();
    dbGetMock.mockReset();
  });

  it('aggregates runtime metrics and outbox snapshot', async () => {
    dbGetMock.mockResolvedValue({ pending: 2, delivered: 5, failed: 1 });
    const metrics = await import('../../services/dispatch-metrics');

    await metrics.recordDispatchMetrics({
      pushSuccess: 3,
      pushFailed: 1,
      wsSuccess: 2,
      wsFailed: 0,
      durationMs: 120,
    });

    const snapshot = await metrics.getDispatchMetricsSnapshot();
    expect(snapshot.dispatch.total).toBe(1);
    expect(snapshot.dispatch.averageDurationMs).toBe(120);
    expect(snapshot.delivery.pushSuccess).toBe(3);
    expect(snapshot.outbox).toEqual({ pending: 2, delivered: 5, failed: 1 });
  });

  it('falls back to zeroed outbox metrics when DB query fails', async () => {
    dbGetMock.mockRejectedValue(new Error('db unavailable'));
    const metrics = await import('../../services/dispatch-metrics');
    const snapshot = await metrics.getDispatchMetricsSnapshot();
    expect(snapshot.outbox).toEqual({ pending: 0, delivered: 0, failed: 0 });
  });
});
