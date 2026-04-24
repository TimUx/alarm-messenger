export interface Migration {
  version: number;
  description: string;
  run: () => Promise<void>;
}

interface MigrationDependencies {
  dbRun: (sql: string, params?: any[]) => Promise<void>;
  dbAll: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
}

export function buildMigrations({ dbRun, dbAll }: MigrationDependencies): Migration[] {
  return [
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
          if (!device.responder_name) continue;
          const nameParts = device.responder_name.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          await dbRun('UPDATE devices SET first_name = ?, last_name = ? WHERE id = ?', [firstName, lastName, device.id]);
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
}
