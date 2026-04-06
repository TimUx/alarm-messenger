import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';
import session from 'express-session';

const dbHolder: { db: sqlite3.Database | null } = { db: null };

jest.mock('../services/database', () => ({
  dbRun: (sql: string, params: any[] = []): Promise<void> =>
    new Promise((resolve, reject) =>
      dbHolder.db!.run(sql, params, (err: Error | null) => (err ? reject(err) : resolve()))
    ),
  dbGet: (sql: string, params: any[] = []): Promise<any> =>
    new Promise((resolve, reject) =>
      dbHolder.db!.get(sql, params, (err: Error | null, row: any) =>
        err ? reject(err) : resolve(row)
      )
    ),
  dbAll: (sql: string, params: any[] = []): Promise<any[]> =>
    new Promise((resolve, reject) =>
      dbHolder.db!.all(sql, params, (err: Error | null, rows: any[]) =>
        err ? reject(err) : resolve(rows)
      )
    ),
}));

import adminRoutes from '../routes/admin';

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }));
  app.use('/api/admin', adminRoutes);
  return app;
}

function createSchema(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          role TEXT DEFAULT 'operator',
          full_name TEXT
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS emergencies (
          id TEXT PRIMARY KEY,
          emergency_number TEXT NOT NULL,
          emergency_date TEXT NOT NULL,
          emergency_keyword TEXT NOT NULL,
          emergency_description TEXT NOT NULL,
          emergency_location TEXT NOT NULL,
          created_at TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          groups TEXT
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          device_token TEXT UNIQUE NOT NULL,
          registration_token TEXT NOT NULL,
          platform TEXT NOT NULL,
          registered_at TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          first_name TEXT,
          last_name TEXT,
          qual_machinist INTEGER DEFAULT 0,
          qual_agt INTEGER DEFAULT 0,
          qual_paramedic INTEGER DEFAULT 0,
          leadership_role TEXT DEFAULT 'none',
          fcm_token TEXT,
          apns_token TEXT,
          registration_expires_at TEXT
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS responses (
          id TEXT PRIMARY KEY,
          emergency_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          participating INTEGER NOT NULL,
          responded_at TEXT NOT NULL
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS revoked_tokens (
          token_hash TEXT PRIMARY KEY,
          expires_at TEXT NOT NULL
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS notification_outbox (
          id TEXT PRIMARY KEY,
          emergency_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          channel TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `, (err: Error | null) => (err ? reject(err) : resolve()));
    });
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  dbHolder.db = new sqlite3.Database(':memory:');
  await createSchema(dbHolder.db);
});

afterAll(() => {
  dbHolder.db?.close();
});

describe('POST /api/admin/init', () => {
  const app = buildApp();

  it('creates the first admin user', async () => {
    const res = await request(app)
      .post('/api/admin/init')
      .send({ username: 'admin', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('admin');
  });

  it('returns 403 when admin users already exist', async () => {
    const res = await request(app)
      .post('/api/admin/init')
      .send({ username: 'admin2', password: 'password123' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/login', () => {
  const app = buildApp();

  it('returns 400 when credentials are missing', async () => {
    const res = await request(app).post('/api/admin/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with correct credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('csrfToken');
  });
});

describe('GET /api/admin/profile', () => {
  const app = buildApp();

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/admin/profile');
    expect(res.status).toBe(401);
  });

  it('returns profile when authenticated via session', async () => {
    // Login to get session cookie
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'password123' });
    expect(loginRes.status).toBe(200);

    const cookies = loginRes.headers['set-cookie'];

    const profileRes = await request(app)
      .get('/api/admin/profile')
      .set('Cookie', cookies);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.username).toBe('admin');
  });
});

describe('GET /api/admin/emergencies/:id – notificationSummary', () => {
  const app = buildApp();
  let sessionCookie: string[];

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'password123' });
    sessionCookie = (loginRes.headers['set-cookie'] as unknown) as string[];
  });

  it('returns notificationSummary with all-zero counts when no outbox entries exist', async () => {
    // Insert a test emergency directly into the in-memory DB
    const emergencyId = 'test-emergency-summary-001';
    await new Promise<void>((resolve, reject) => {
      dbHolder.db!.run(
        `INSERT INTO emergencies (id, emergency_number, emergency_date, emergency_keyword,
          emergency_description, emergency_location, created_at, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [emergencyId, 'E-SUM-001', new Date().toISOString(), 'TEST', 'desc', 'loc',
         new Date().toISOString(), 1],
        (err: Error | null) => (err ? reject(err) : resolve()),
      );
    });

    const res = await request(app)
      .get(`/api/admin/emergencies/${emergencyId}`)
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notificationSummary');
    expect(res.body.notificationSummary).toEqual({
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
    });
  });

  it('returns aggregated notificationSummary when outbox entries exist', async () => {
    const emergencyId = 'test-emergency-summary-002';
    const deviceId = 'test-device-summary-001';

    await new Promise<void>((resolve, reject) => {
      dbHolder.db!.run(
        `INSERT INTO emergencies (id, emergency_number, emergency_date, emergency_keyword,
          emergency_description, emergency_location, created_at, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [emergencyId, 'E-SUM-002', new Date().toISOString(), 'TEST2', 'desc', 'loc',
         new Date().toISOString(), 1],
        (err: Error | null) => (err ? reject(err) : resolve()),
      );
    });

    // Insert outbox entries: 1 delivered, 1 failed, 1 pending
    const entries = [
      ['outbox-1', emergencyId, deviceId, 'fcm', 'delivered'],
      ['outbox-2', emergencyId, deviceId, 'apns', 'failed'],
      ['outbox-3', emergencyId, deviceId, 'websocket', 'pending'],
    ];
    const now = new Date().toISOString();
    for (const [id, eid, did, ch, st] of entries) {
      await new Promise<void>((resolve, reject) => {
        dbHolder.db!.run(
          `INSERT INTO notification_outbox (id, emergency_id, device_id, channel, status, retry_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
          [id, eid, did, ch, st, now, now],
          (err: Error | null) => (err ? reject(err) : resolve()),
        );
      });
    }

    const res = await request(app)
      .get(`/api/admin/emergencies/${emergencyId}`)
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.notificationSummary).toEqual({
      total: 3,
      delivered: 1,
      failed: 1,
      pending: 1,
    });
  });
});
