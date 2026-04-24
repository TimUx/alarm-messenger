import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';
import session from 'express-session';
import infoRoutes from '../../routes/info';

const dbHolder: { db: sqlite3.Database | null } = { db: null };

jest.mock('../../services/database', () => ({
  dbGet: (sql: string, params: unknown[] = []): Promise<unknown> =>
    new Promise((resolve, reject) =>
      dbHolder.db!.get(sql, params, (err: Error | null, row: unknown) =>
        err ? reject(err) : resolve(row)
      )
    ),
  dbRun: jest.fn(),
  dbAll: jest.fn(),
}));

jest.mock('../../services/dispatch-metrics', () => ({
  getDispatchMetricsSnapshot: jest.fn().mockResolvedValue({
    dispatch: { total: 4, averageDurationMs: 150, lastDispatchAt: '2026-01-01T00:00:00.000Z' },
    delivery: { pushSuccess: 10, pushFailed: 1, websocketSuccess: 3, websocketFailed: 0 },
    outbox: { pending: 2, delivered: 9, failed: 1 },
  }),
}));

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }));
  app.post('/test/login-admin', (req, res) => {
    req.session.userId = 'admin-1';
    req.session.csrfToken = 'csrf';
    res.json({ ok: true });
  });
  app.use('/api/info', infoRoutes);
  return app;
}

function createSchema(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      role TEXT DEFAULT 'operator',
      full_name TEXT
    )`, (err: Error | null) => (err ? reject(err) : resolve()));
  });
}

beforeAll(async () => {
  dbHolder.db = new sqlite3.Database(':memory:');
  await createSchema(dbHolder.db);
  await new Promise<void>((resolve, reject) => {
    dbHolder.db!.run(
      `INSERT INTO admin_users (id, username, password_hash, created_at, role, full_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin-1', 'admin', 'hash', new Date().toISOString(), 'admin', 'Admin'],
      (err: Error | null) => (err ? reject(err) : resolve()),
    );
  });
});

afterAll(() => dbHolder.db?.close());

describe('info integration', () => {
  const app = buildApp();

  it('returns server metadata', async () => {
    const res = await request(app).get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('organizationName');
    expect(res.body).toHaveProperty('serverVersion');
  });

  it('returns dispatch metrics for authenticated admin session', async () => {
    const agent = request.agent(app);
    await agent.post('/test/login-admin').send({});
    const res = await agent.get('/api/info/dispatch-metrics');
    expect(res.status).toBe(200);
    expect(res.body.outbox.pending).toBe(2);
  });
});
