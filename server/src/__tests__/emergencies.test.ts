import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';

// Container object for the in-memory database instance.
// Using an object instead of a plain variable lets the jest.mock factories below
// close over the container reference (set at module load) and read the .db property
// lazily at call time, after beforeAll has assigned it.
const dbHolder: { db: sqlite3.Database | null } = { db: null };

// Mock the websocket and push-notification services before importing routes
jest.mock('../services/websocket', () => ({
  websocketService: {
    sendBulkNotifications: jest.fn().mockResolvedValue(undefined),
    isDeviceConnected: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('../services/push-notification', () => ({
  pushNotificationService: {
    isPushEnabled: jest.fn().mockReturnValue(false),
    sendPushNotification: jest.fn().mockResolvedValue(false),
    sendBulkFCMNotification: jest.fn().mockResolvedValue({ successCount: 0, results: [] }),
  },
}));

// Mock the database module to delegate to the in-memory sqlite3 instance stored in
// dbHolder. The factory closes over dbHolder (a const object) so the reference is
// stable; the actual db is assigned in beforeAll before any test runs.
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

// Import routes AFTER mocks are registered
import emergencyRoutes from '../routes/emergencies';

const TEST_API_KEY = 'test-api-key';

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/emergencies', emergencyRoutes);
  return app;
}

function createSchema(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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
        CREATE UNIQUE INDEX IF NOT EXISTS idx_emergencies_active_number
        ON emergencies(emergency_number) WHERE active = 1
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          device_token TEXT UNIQUE NOT NULL,
          registration_token TEXT NOT NULL,
          platform TEXT NOT NULL,
          registered_at TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          fcm_token TEXT,
          apns_token TEXT
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
      `);
      db.run(
        `CREATE TABLE IF NOT EXISTS device_groups (
          device_id TEXT NOT NULL,
          group_code TEXT NOT NULL,
          PRIMARY KEY (device_id, group_code)
        )`,
        (err: Error | null) => (err ? reject(err) : resolve())
      );
    });
  });
}

beforeAll(async () => {
  // Set the API key used by verifyApiKey middleware
  process.env.API_SECRET_KEY = TEST_API_KEY;

  // Create an in-memory SQLite database and build the schema
  dbHolder.db = new sqlite3.Database(':memory:');
  await createSchema(dbHolder.db);
});

afterAll(() => {
  dbHolder.db?.close();
});

describe('POST /api/emergencies', () => {
  const app = buildApp();

  const validBody = {
    emergencyNumber: 'E-001',
    emergencyDate: new Date().toISOString(),
    emergencyKeyword: 'FEUER',
    emergencyDescription: 'Building on fire',
    emergencyLocation: 'Main Street 1',
  };

  it('returns 401 when no API key is provided', async () => {
    const res = await request(app).post('/api/emergencies').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 201 and an emergency object with a valid API key and all required fields', async () => {
    const res = await request(app)
      .post('/api/emergencies')
      .set('x-api-key', TEST_API_KEY)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      emergencyNumber: validBody.emergencyNumber,
      emergencyKeyword: validBody.emergencyKeyword,
      emergencyDescription: validBody.emergencyDescription,
      emergencyLocation: validBody.emergencyLocation,
      active: true,
    });
    expect(typeof res.body.id).toBe('string');
    expect(typeof res.body.createdAt).toBe('string');
  });

  it('returns 400 when emergencyKeyword is missing', async () => {
    const { emergencyKeyword, ...bodyWithoutKeyword } = validBody;
    const res = await request(app)
      .post('/api/emergencies')
      .set('x-api-key', TEST_API_KEY)
      .send(bodyWithoutKeyword);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 409 when creating a duplicate active emergency with the same number', async () => {
    const duplicateBody = {
      emergencyNumber: 'E-DUP-001',
      emergencyDate: new Date().toISOString(),
      emergencyKeyword: 'FEUER',
      emergencyDescription: 'First alarm',
      emergencyLocation: 'Test Street 1',
    };

    // First creation should succeed
    const first = await request(app)
      .post('/api/emergencies')
      .set('x-api-key', TEST_API_KEY)
      .send(duplicateBody);
    expect(first.status).toBe(201);

    // Second creation with same emergencyNumber while first is still active should be rejected
    const second = await request(app)
      .post('/api/emergencies')
      .set('x-api-key', TEST_API_KEY)
      .send({ ...duplicateBody, emergencyDescription: 'Second alarm' });
    expect(second.status).toBe(409);
    expect(second.body).toHaveProperty('error');
  });
});
