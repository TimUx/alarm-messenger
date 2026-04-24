import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { buildMigrations, Migration } from './database/migrations';

const dbPath = process.env.DATABASE_PATH || './data/alarm-messenger.db';
let db: sqlite3.Database;

type SqlParam = unknown;

// ---------------------------------------------------------------------------
// Versioned migrations
// Each entry runs exactly once, in order, when the stored schema version is
// lower than the entry's version number.
// ---------------------------------------------------------------------------

export async function initializeDatabase(): Promise<void> {
  // Ensure data directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create base tables (all fully-featured from the start so that fresh
      // installs never need to run the ALTER TABLE migrations above).
      db.serialize(() => {
        db.run('PRAGMA journal_mode=WAL');
        db.run('PRAGMA synchronous=NORMAL');

        // Schema migrations tracking table
        db.run(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER NOT NULL
          )
        `);

        // Emergencies table
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

        // Devices table
        db.run(`
          CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            device_token TEXT UNIQUE NOT NULL,
            registration_token TEXT NOT NULL,
            platform TEXT NOT NULL,
            registered_at TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            responder_name TEXT,
            qual_machinist INTEGER DEFAULT 0,
            qual_agt INTEGER DEFAULT 0,
            qual_paramedic INTEGER DEFAULT 0,
            leadership_role TEXT DEFAULT 'none',
            first_name TEXT,
            last_name TEXT,
            qr_code_data TEXT,
            fcm_token TEXT,
            apns_token TEXT,
            registration_expires_at TEXT
          )
        `);

        // Groups table
        db.run(`
          CREATE TABLE IF NOT EXISTS groups (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
          )
        `);

        // Device-Groups association table
        db.run(`
          CREATE TABLE IF NOT EXISTS device_groups (
            device_id TEXT NOT NULL,
            group_code TEXT NOT NULL,
            PRIMARY KEY (device_id, group_code),
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
            FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE
          )
        `);

        // Responses table
        db.run(`
          CREATE TABLE IF NOT EXISTS responses (
            id TEXT PRIMARY KEY,
            emergency_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            participating INTEGER NOT NULL,
            responded_at TEXT NOT NULL,
            FOREIGN KEY (emergency_id) REFERENCES emergencies(id),
            FOREIGN KEY (device_id) REFERENCES devices(id),
            UNIQUE(emergency_id, device_id)
          )
        `);

        // Indexes for common query patterns
        db.run(`CREATE INDEX IF NOT EXISTS idx_emergencies_active ON emergencies(active, created_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_devices_device_token ON devices(device_token)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_responses_emergency_id ON responses(emergency_id)`);

        // Admin users table
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

        // Revoked tokens table (persistent JWT blacklist)
        db.run(`
          CREATE TABLE IF NOT EXISTS revoked_tokens (
            token_hash TEXT PRIMARY KEY,
            expires_at TEXT NOT NULL
          )
        `);
        db.run(`CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at)`);

        // Notification outbox table (per-device delivery tracking)
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
            updated_at TEXT NOT NULL,
            FOREIGN KEY (emergency_id) REFERENCES emergencies(id),
            FOREIGN KEY (device_id) REFERENCES devices(id)
          )
        `);
        db.run(`CREATE INDEX IF NOT EXISTS idx_outbox_status ON notification_outbox(status, created_at)`);

        // Partial unique index to prevent duplicate active emergencies
        db.run(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_emergencies_active_number
          ON emergencies(emergency_number) WHERE active = 1
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            runMigrations().then(resolve).catch(reject);
          }
        });
      });
    });
  });
}

export function getDatabase(): sqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Helper functions with promises
export const dbRun = (sql: string, params: SqlParam[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const dbGet = <T = any>(sql: string, params: SqlParam[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};

export const dbAll = <T = any>(sql: string, params: SqlParam[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

/**
 * Runs pending versioned migrations sequentially.
 *
 * The `schema_migrations` table holds a single row with the current schema
 * version (0 if the table is empty / freshly created).  Only migrations whose
 * version number exceeds the stored version are executed, in ascending order.
 * The stored version is updated after each successful migration so that a
 * crash mid-way will resume from the right point on the next startup.
 */
async function runMigrations(): Promise<void> {
  try {
    const migrations: Migration[] = buildMigrations({ dbRun, dbAll });
    // Initialize the version row if the table is empty (brand-new database or
    // a database that predates this migration system).
    const row = await dbGet<{ version: number } | undefined>('SELECT version FROM schema_migrations LIMIT 1');
    let currentVersion = row ? row.version : 0;

    if (!row) {
      await dbRun('INSERT INTO schema_migrations (version) VALUES (?)', [0]);
    }

    const pending = migrations.filter((m) => m.version > currentVersion);

    if (pending.length === 0) {
      return;
    }

    logger.info(`🔄 Running ${pending.length} database migration(s)…`);

    for (const migration of pending) {
      logger.info(`   ↳ v${migration.version}: ${migration.description}`);
      await migration.run();
      await dbRun('UPDATE schema_migrations SET version = ?', [migration.version]);
      currentVersion = migration.version;
    }

    logger.info('✓ Database migrations completed');
  } catch (error: unknown) {
    logger.error({ err: error }, '⚠️  Database migration warning');
    // Don't fail startup if a migration has issues (e.g. column already exists
    // from a partial previous run).
  }
}
