import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

const dbPath = process.env.DATABASE_PATH || './data/alarm-messenger.db';
let db: sqlite3.Database;

// ---------------------------------------------------------------------------
// Versioned migrations
// Each entry runs exactly once, in order, when the stored schema version is
// lower than the entry's version number.
// ---------------------------------------------------------------------------
const MIGRATIONS: { version: number; description: string; run: () => Promise<void> }[] = [
  {
    version: 1,
    description: 'Add leadership_role column; migrate is_squad_leader',
    async run() {
      await dbRun('ALTER TABLE devices ADD COLUMN leadership_role TEXT DEFAULT "none"');
      await dbRun(`UPDATE devices SET leadership_role = 'groupLeader' WHERE is_squad_leader = 1`);
    },
  },
  {
    version: 2,
    description: 'Add groups column to emergencies',
    async run() {
      await dbRun('ALTER TABLE emergencies ADD COLUMN groups TEXT');
    },
  },
  {
    version: 3,
    description: 'Add first_name and last_name columns; migrate responder_name',
    async run() {
      await dbRun('ALTER TABLE devices ADD COLUMN first_name TEXT');
      await dbRun('ALTER TABLE devices ADD COLUMN last_name TEXT');
      const devices = await dbAll<{ id: string; responder_name: string | null }>(
        'SELECT id, responder_name FROM devices WHERE responder_name IS NOT NULL',
      );
      for (const device of devices) {
        if (device.responder_name) {
          const nameParts = device.responder_name.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          await dbRun('UPDATE devices SET first_name = ?, last_name = ? WHERE id = ?', [firstName, lastName, device.id]);
        }
      }
    },
  },
  {
    version: 4,
    description: 'Add qr_code_data column to devices',
    async run() {
      await dbRun('ALTER TABLE devices ADD COLUMN qr_code_data TEXT');
    },
  },
  {
    version: 5,
    description: 'Add role and full_name columns to admin_users',
    async run() {
      await dbRun('ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT "operator"');
      await dbRun('UPDATE admin_users SET role = "admin" WHERE role = "operator"');
      await dbRun('ALTER TABLE admin_users ADD COLUMN full_name TEXT');
    },
  },
  {
    version: 6,
    description: 'Add fcm_token and apns_token columns to devices',
    async run() {
      await dbRun('ALTER TABLE devices ADD COLUMN fcm_token TEXT');
      await dbRun('ALTER TABLE devices ADD COLUMN apns_token TEXT');
    },
  },
  {
    version: 7,
    description: 'Add registration_expires_at column to devices',
    async run() {
      await dbRun('ALTER TABLE devices ADD COLUMN registration_expires_at TEXT');
    },
  },
  {
    version: 8,
    description: 'Add partial unique index to prevent duplicate active emergencies with the same number',
    async run() {
      await dbRun(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_emergencies_active_number
        ON emergencies(emergency_number) WHERE active = 1
      `);
    },
  },
  {
    version: 9,
    description: 'Add notification_outbox table for per-device delivery tracking',
    async run() {
      await dbRun(`
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
      await dbRun(`
        CREATE INDEX IF NOT EXISTS idx_outbox_status
        ON notification_outbox(status, created_at)
      `);
    },
  },
  {
    version: 10,
    description: 'Add revoked_tokens table for persistent JWT blacklist',
    async run() {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS revoked_tokens (
          token_hash TEXT PRIMARY KEY,
          expires_at TEXT NOT NULL
        )
      `);
      await dbRun(`
        CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires
        ON revoked_tokens(expires_at)
      `);
    },
  },
];

export async function initializeDatabase(): Promise<void> {
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

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
export const dbRun = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const dbGet = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};

export const dbAll = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
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
    // Initialize the version row if the table is empty (brand-new database or
    // a database that predates this migration system).
    const row = await dbGet<{ version: number } | undefined>('SELECT version FROM schema_migrations LIMIT 1');
    let currentVersion = row ? row.version : 0;

    if (!row) {
      await dbRun('INSERT INTO schema_migrations (version) VALUES (?)', [0]);
    }

    const pending = MIGRATIONS.filter((m) => m.version > currentVersion);

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
  } catch (error) {
    logger.error({ err: error }, '⚠️  Database migration warning');
    // Don't fail startup if a migration has issues (e.g. column already exists
    // from a partial previous run).
  }
}
