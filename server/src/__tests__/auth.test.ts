import express, { Application } from 'express';
import request from 'supertest';
import sqlite3 from 'sqlite3';
import session from 'express-session';
import { generateToken } from '../middleware/auth';

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

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }));

  // Import routes after mock setup
  const authMiddleware = require('../middleware/auth');

  app.get('/protected', authMiddleware.verifyToken, (req: any, res: any) => {
    res.json({ userId: req.userId });
  });

  app.get('/protected-session', authMiddleware.verifySession, (req: any, res: any) => {
    res.json({ userId: req.userId });
  });

  app.get('/protected-api-key', authMiddleware.verifyApiKey, (req: any, res: any) => {
    res.json({ ok: true });
  });

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
      `, (err: Error | null) => (err ? reject(err) : resolve()));
    });
  });
}

beforeAll(async () => {
  process.env.API_SECRET_KEY = 'test-api-key';
  process.env.JWT_SECRET = 'test-jwt-secret';
  dbHolder.db = new sqlite3.Database(':memory:');
  await createSchema(dbHolder.db);
});

afterAll(() => {
  dbHolder.db?.close();
});

describe('verifyToken middleware', () => {
  const app = buildApp();

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('returns 401 when an invalid token is provided', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a valid token', async () => {
    const token = generateToken('user-1', 'testuser', 'admin');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-1');
  });
});

describe('verifyApiKey middleware', () => {
  const app = buildApp();

  it('returns 401 when no API key is provided', async () => {
    const res = await request(app).get('/protected-api-key');
    expect(res.status).toBe(401);
  });

  it('returns 401 when wrong API key is provided', async () => {
    const res = await request(app)
      .get('/protected-api-key')
      .set('x-api-key', 'wrong-key');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a valid API key', async () => {
    const res = await request(app)
      .get('/protected-api-key')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
  });
});

describe('verifySession middleware', () => {
  const app = buildApp();

  it('returns 401 when no session is present', async () => {
    const res = await request(app).get('/protected-session');
    expect(res.status).toBe(401);
  });
});
