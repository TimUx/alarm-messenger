import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';

// Using var so the declaration is hoisted and accessible inside jest.mock factories
// eslint-disable-next-line no-var
var inMemoryDb: sqlite3.Database;

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
  },
}));

// Mock the database module to use the in-memory sqlite3 instance.
// The inner functions close over `inMemoryDb` (a var-hoisted reference) so they
// read the correct value once it is assigned in beforeAll.
jest.mock('../services/database', () => ({
  dbRun: (sql: string, params: any[] = []): Promise<void> =>
    new Promise((resolve, reject) =>
      inMemoryDb.run(sql, params, (err: Error | null) => (err ? reject(err) : resolve()))
    ),
  dbGet: (sql: string, params: any[] = []): Promise<any> =>
    new Promise((resolve, reject) =>
      inMemoryDb.get(sql, params, (err: Error | null, row: any) =>
        err ? reject(err) : resolve(row)
      )
    ),
  dbAll: (sql: string, params: any[] = []): Promise<any[]> =>
    new Promise((resolve, reject) =>
      inMemoryDb.all(sql, params, (err: Error | null, rows: any[]) =>
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
  inMemoryDb = new sqlite3.Database(':memory:');
  await createSchema(inMemoryDb);
});

afterAll(() => {
  inMemoryDb.close();
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
});
