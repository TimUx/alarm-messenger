import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';
import groupsRoutes from '../../routes/groups';
import { generateToken } from '../../middleware/auth';

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

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/groups', groupsRoutes);
  return app;
}

function createSchema(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS groups (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        device_token TEXT UNIQUE NOT NULL,
        registration_token TEXT NOT NULL,
        platform TEXT NOT NULL,
        registered_at TEXT NOT NULL,
        active INTEGER DEFAULT 1
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS device_groups (
        device_id TEXT NOT NULL,
        group_code TEXT NOT NULL,
        PRIMARY KEY (device_id, group_code)
      )`, (err: Error | null) => (err ? reject(err) : resolve()));
    });
  });
}

beforeAll(async () => {
  dbHolder.db = new sqlite3.Database(':memory:');
  await createSchema(dbHolder.db);
  await new Promise<void>((resolve, reject) => {
    dbHolder.db!.run(
      `INSERT INTO devices (id, device_token, registration_token, platform, registered_at, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      ['dev-1', 'dev-token-1', 'reg-1', 'android', new Date().toISOString()],
      (err: Error | null) => (err ? reject(err) : resolve()),
    );
  });
});

afterAll(() => dbHolder.db?.close());

describe('groups integration', () => {
  const app = buildApp();
  const adminToken = generateToken('admin-1', 'admin', 'admin');
  const operatorToken = generateToken('op-1', 'operator', 'operator');

  it('creates and lists groups', async () => {
    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'wil26', name: 'Wache 26', description: 'Bereich Nord' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.code).toBe('WIL26');

    const listRes = await request(app)
      .get('/api/groups')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((group: { code: string }) => group.code === 'WIL26')).toBe(true);
  });

  it('assigns groups to a device and returns assignments', async () => {
    await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'SWA11', name: 'SWA 11' });

    const assignRes = await request(app)
      .put('/api/groups/device/dev-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupCodes: ['WIL26', 'SWA11'] });
    expect(assignRes.status).toBe(200);

    const getRes = await request(app)
      .get('/api/groups/device/dev-1')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.map((group: { code: string }) => group.code)).toEqual(['SWA11', 'WIL26']);
  });
});
