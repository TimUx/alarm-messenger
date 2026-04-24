import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';
import session from 'express-session';

const dbHolder: { db: sqlite3.Database | null } = { db: null };

jest.mock('express-rate-limit', () => () => (_req: unknown, _res: unknown, next: () => void) => next());

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

// Mock qrcode to avoid native dependencies in tests
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,test'),
}));

import deviceRoutes from '../routes/devices';

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }));
  app.post('/test/login-admin', (req, res) => {
    req.session.userId = 'admin-1';
    req.session.csrfToken = 'test-csrf-token';
    res.json({ ok: true });
  });
  app.use('/api/devices', deviceRoutes);
  return app;
}

function createSchema(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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
          qr_code_data TEXT,
          fcm_token TEXT,
          apns_token TEXT,
          registration_expires_at TEXT
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS device_groups (
          device_id TEXT NOT NULL,
          group_code TEXT NOT NULL,
          PRIMARY KEY (device_id, group_code)
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          role TEXT DEFAULT 'operator',
          full_name TEXT
        )
      `, (err: Error | null) => (err ? reject(err) : resolve()));
    });
  });
}

beforeAll(async () => {
  process.env.API_SECRET_KEY = 'test-api-key';
  process.env.JWT_SECRET = 'test-jwt-secret';
  dbHolder.db = new sqlite3.Database(':memory:');
  await createSchema(dbHolder.db);
  await new Promise<void>((resolve, reject) => {
    dbHolder.db!.run(
      'INSERT INTO admin_users (id, username, password_hash, created_at, role, full_name) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin-1', 'admin', 'hash', new Date().toISOString(), 'admin', 'Admin User'],
      (err: Error | null) => (err ? reject(err) : resolve()),
    );
  });
});

afterAll(() => {
  dbHolder.db?.close();
});

describe('POST /api/devices/registration-token', () => {
  const app = buildApp();

  it('returns 401 without session', async () => {
    const res = await request(app).post('/api/devices/registration-token').send({});
    expect(res.status).toBe(401);
  });

  it('returns 200 with a device token and QR code for admin session', async () => {
    const agent = request.agent(app);
    await agent.post('/test/login-admin').send({});
    const res = await agent
      .post('/api/devices/registration-token')
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({});
    expect(res.status).toBe(200);
    expect(typeof res.body.deviceToken).toBe('string');
    expect(typeof res.body.qrCode).toBe('string');
  });
});

describe('POST /api/devices/register', () => {
  const app = buildApp();

  it('returns 403 when deviceToken was not pre-registered', async () => {
    const res = await request(app)
      .post('/api/devices/register')
      .send({
        deviceToken: 'non-existent-token',
        registrationToken: 'some-token',
        platform: 'android',
      });
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/devices/register')
      .send({ platform: 'android' });
    expect(res.status).toBe(400);
  });

  it('allows registration with a valid pre-registered token', async () => {
    const agent = request.agent(app);
    await agent.post('/test/login-admin').send({});
    // First create a registration token
    const tokenRes = await agent
      .post('/api/devices/registration-token')
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({});
    expect(tokenRes.status).toBe(200);
    const { deviceToken } = tokenRes.body;

    // Now register
    const res = await request(app)
      .post('/api/devices/register')
      .send({
        deviceToken,
        registrationToken: 'reg-token-123',
        platform: 'android',
        firstName: 'Max',
        lastName: 'Mustermann',
      });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
  });

  it('returns 403 for already active device', async () => {
    const agent = request.agent(app);
    await agent.post('/test/login-admin').send({});
    const tokenRes = await agent
      .post('/api/devices/registration-token')
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({});
    const { deviceToken } = tokenRes.body;

    // First registration
    await request(app)
      .post('/api/devices/register')
      .send({ deviceToken, registrationToken: 'reg-1', platform: 'android' });

    // Second attempt should fail
    const res = await request(app)
      .post('/api/devices/register')
      .send({ deviceToken, registrationToken: 'reg-2', platform: 'android' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/devices/update-push-token', () => {
  const app = buildApp();

  async function createRegisteredDevice(registrationToken: string) {
    const agent = request.agent(app);
    await agent.post('/test/login-admin').send({});
    const tokenRes = await agent
      .post('/api/devices/registration-token')
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({});
    const { deviceToken } = tokenRes.body;
    await request(app).post('/api/devices/register').send({
      deviceToken,
      registrationToken,
      platform: 'android',
    });
    return { deviceToken };
  }

  it('returns 403 if authenticated device tries to update another device token', async () => {
    const deviceA = await createRegisteredDevice('reg-a');
    const deviceB = await createRegisteredDevice('reg-b');

    const res = await request(app)
      .post('/api/devices/update-push-token')
      .set('X-Device-Token', deviceA.deviceToken)
      .send({
        deviceToken: deviceB.deviceToken,
        fcmToken: 'new-token',
      });

    expect(res.status).toBe(403);
  });
});

describe('device self-access restrictions', () => {
  const app = buildApp();

  async function createRegisteredDevice(registrationToken: string) {
    const agent = request.agent(app);
    await agent.post('/test/login-admin').send({});
    const tokenRes = await agent
      .post('/api/devices/registration-token')
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({});
    const { deviceToken } = tokenRes.body;
    const registerRes = await request(app).post('/api/devices/register').send({
      deviceToken,
      registrationToken,
      platform: 'android',
    });
    return { deviceToken, deviceId: registerRes.body.id };
  }

  it('blocks access to another device details', async () => {
    const deviceA = await createRegisteredDevice('reg-access-a');
    const deviceB = await createRegisteredDevice('reg-access-b');

    const res = await request(app)
      .get(`/api/devices/${deviceB.deviceId}/details`)
      .set('X-Device-Token', deviceA.deviceToken);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/devices', () => {
  const app = buildApp();

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/devices');
    expect(res.status).toBe(401);
  });
});
