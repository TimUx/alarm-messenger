import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';
import session from 'express-session';
import adminRoutes from '../../routes/admin';
import devicesRoutes from '../../routes/devices';
import emergenciesRoutes from '../../routes/emergencies';

const dbHolder: { db: sqlite3.Database | null } = { db: null };

jest.mock('../../services/database', () => ({
  dbRun: (sql: string, params: unknown[] = []): Promise<void> =>
    new Promise((resolve, reject) =>
      dbHolder.db!.run(sql, params, (err: Error | null) => (err ? reject(err) : resolve()))
    ),
  dbGet: (sql: string, params: unknown[] = []): Promise<unknown> =>
    new Promise((resolve, reject) =>
      dbHolder.db!.get(sql, params, (err: Error | null, row: unknown) =>
        err ? reject(err) : resolve(row)
      )
    ),
  dbAll: (sql: string, params: unknown[] = []): Promise<unknown[]> =>
    new Promise((resolve, reject) =>
      dbHolder.db!.all(sql, params, (err: Error | null, rows: unknown[]) =>
        err ? reject(err) : resolve(rows)
      )
    ),
}));

jest.mock('../../services/sse', () => ({
  addSseClient: jest.fn(),
  removeSseClient: jest.fn(),
  broadcastSseEvent: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,e2e'),
}));

jest.mock('../../services/emergency-dispatch', () => ({
  findDevicesForEmergency: jest.fn().mockResolvedValue([]),
  dispatchEmergencyNotifications: jest.fn().mockResolvedValue(undefined),
}));

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'e2e-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }));
  app.use('/api/admin', adminRoutes);
  app.use('/api/devices', devicesRoutes);
  app.use('/api/emergencies', emergenciesRoutes);
  return app;
}

function createSchema(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        role TEXT DEFAULT 'operator',
        full_name TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS revoked_tokens (
        token_hash TEXT PRIMARY KEY,
        expires_at TEXT NOT NULL
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS emergencies (
        id TEXT PRIMARY KEY,
        emergency_number TEXT NOT NULL,
        emergency_date TEXT NOT NULL,
        emergency_keyword TEXT NOT NULL,
        emergency_description TEXT NOT NULL,
        emergency_location TEXT NOT NULL,
        created_at TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        groups TEXT
      )`);
      db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_emergencies_active_number
              ON emergencies(emergency_number) WHERE active = 1`);
      db.run(`CREATE TABLE IF NOT EXISTS devices (
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
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS device_groups (
        device_id TEXT NOT NULL,
        group_code TEXT NOT NULL,
        PRIMARY KEY (device_id, group_code)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        emergency_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        participating INTEGER NOT NULL,
        responded_at TEXT NOT NULL,
        UNIQUE(emergency_id, device_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS notification_outbox (
        id TEXT PRIMARY KEY,
        emergency_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`, (err: Error | null) => (err ? reject(err) : resolve()));
    });
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.API_SECRET_KEY = 'test-api-key';
  dbHolder.db = new sqlite3.Database(':memory:');
  await createSchema(dbHolder.db);
});

afterAll(() => dbHolder.db?.close());

describe('E2E alarm flow', () => {
  const app = buildApp();

  it('runs init -> register device -> create emergency -> respond -> admin review', async () => {
    const adminAgent = request.agent(app);

    const initRes = await adminAgent
      .post('/api/admin/init')
      .send({ username: 'admin', password: 'password123' });
    expect(initRes.status).toBe(201);
    expect(initRes.body).toHaveProperty('csrfToken');
    const csrfToken = initRes.body.csrfToken;

    const registrationRes = await adminAgent
      .post('/api/devices/registration-token')
      .set('X-CSRF-Token', csrfToken)
      .send({});
    expect(registrationRes.status).toBe(200);
    const { deviceToken } = registrationRes.body;

    const registerDeviceRes = await request(app)
      .post('/api/devices/register')
      .send({
        deviceToken,
        registrationToken: 'reg-e2e-1',
        platform: 'android',
        firstName: 'Max',
        lastName: 'Muster',
      });
    expect(registerDeviceRes.status).toBe(200);

    const createEmergencyRes = await request(app)
      .post('/api/emergencies')
      .set('x-api-key', 'test-api-key')
      .send({
        emergencyNumber: 'E2E-001',
        emergencyDate: new Date().toISOString(),
        emergencyKeyword: 'BRAND',
        emergencyDescription: 'Kellerbrand',
        emergencyLocation: 'Hauptstrasse 1',
      });
    expect(createEmergencyRes.status).toBe(201);
    const emergencyId = createEmergencyRes.body.id as string;

    const responseRes = await request(app)
      .post(`/api/emergencies/${emergencyId}/responses`)
      .set('X-Device-Token', deviceToken)
      .send({ participating: true });
    expect(responseRes.status).toBe(201);

    const detailRes = await adminAgent.get(`/api/admin/emergencies/${emergencyId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.summary).toEqual({
      totalResponses: 1,
      participants: 1,
      nonParticipants: 0,
    });
  });
});
