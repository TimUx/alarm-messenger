import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/alarm-messenger.db';
let db: sqlite3.Database;

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

      // Create tables
      db.serialize(() => {
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
            leadership_role TEXT DEFAULT 'none'
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
        
        // Admin users table
        db.run(`
          CREATE TABLE IF NOT EXISTS admin_users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        `, async (err) => {
          if (err) {
            reject(err);
          } else {
            // Run migration to update existing database
            await migrateDatabase();
            resolve();
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

export const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

/**
 * Database migration function
 * 
 * Performs the following migrations if needed:
 * 1. Adds 'leadership_role' column to devices table (replaces is_squad_leader)
 * 2. Migrates existing is_squad_leader values to leadership_role='groupLeader'
 * 3. Adds 'groups' column to emergencies table for comma-separated group codes
 * 4. Adds 'first_name' and 'last_name' columns to devices table (replaces responder_name)
 * 5. Migrates existing responder_name values by splitting into first and last name
 * 6. Adds 'qr_code_data' column to devices table to store QR code for re-scanning
 * 7. Adds 'role' and 'full_name' columns to admin_users table for user management
 * 
 * Note: Old columns (qual_th_vu, qual_th_bau, is_squad_leader, responder_name) are not dropped
 * to maintain backward compatibility with existing data. They are simply ignored
 * by the application code.
 */
async function migrateDatabase(): Promise<void> {
  try {
    // Check if migration is needed by checking for old columns
    const tableInfo = await dbAll("PRAGMA table_info(devices)", []);
    
    const hasOldColumns = tableInfo.some((col: any) => 
      col.name === 'qual_th_vu' || 
      col.name === 'qual_th_bau' || 
      col.name === 'is_squad_leader'
    );
    
    const hasNewColumn = tableInfo.some((col: any) => col.name === 'leadership_role');
    
    if (hasOldColumns && !hasNewColumn) {
      console.log('🔄 Running database migration...');
      
      // Add new column
      await dbRun('ALTER TABLE devices ADD COLUMN leadership_role TEXT DEFAULT "none"');
      
      // Migrate is_squad_leader to leadership_role (default to groupLeader if was true)
      await dbRun(`UPDATE devices SET leadership_role = 'groupLeader' WHERE is_squad_leader = 1`);
      
      console.log('✓ Database migration completed');
    }
    
    // Check if emergencies table needs groups column
    const emergencyTableInfo = await dbAll("PRAGMA table_info(emergencies)", []);
    const hasGroupsColumn = emergencyTableInfo.some((col: any) => col.name === 'groups');
    
    if (!hasGroupsColumn) {
      console.log('🔄 Adding groups column to emergencies...');
      await dbRun('ALTER TABLE emergencies ADD COLUMN groups TEXT');
      console.log('✓ Groups column added');
    }
    
    // Check if devices table needs first_name and last_name columns
    const hasFirstNameColumn = tableInfo.some((col: any) => col.name === 'first_name');
    const hasLastNameColumn = tableInfo.some((col: any) => col.name === 'last_name');
    
    if (!hasFirstNameColumn || !hasLastNameColumn) {
      console.log('🔄 Adding first_name and last_name columns to devices...');
      
      if (!hasFirstNameColumn) {
        await dbRun('ALTER TABLE devices ADD COLUMN first_name TEXT');
      }
      if (!hasLastNameColumn) {
        await dbRun('ALTER TABLE devices ADD COLUMN last_name TEXT');
      }
      
      // Migrate existing responder_name values by splitting into first and last name
      const devices = await dbAll("SELECT id, responder_name FROM devices WHERE responder_name IS NOT NULL", []);
      for (const device of devices) {
        if (device.responder_name) {
          const nameParts = device.responder_name.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          await dbRun('UPDATE devices SET first_name = ?, last_name = ? WHERE id = ?', [firstName, lastName, device.id]);
        }
      }
      
      console.log('✓ first_name and last_name columns added and data migrated');
    }
    
    // Check if devices table needs qr_code_data column
    const hasQRCodeColumn = tableInfo.some((col: any) => col.name === 'qr_code_data');
    
    if (!hasQRCodeColumn) {
      console.log('🔄 Adding qr_code_data column to devices...');
      await dbRun('ALTER TABLE devices ADD COLUMN qr_code_data TEXT');
      console.log('✓ qr_code_data column added');
    }
    
    // Check if admin_users table needs role and full_name columns
    const adminUsersTableInfo = await dbAll("PRAGMA table_info(admin_users)", []);
    const hasRoleColumn = adminUsersTableInfo.some((col: any) => col.name === 'role');
    const hasFullNameColumn = adminUsersTableInfo.some((col: any) => col.name === 'full_name');
    
    if (!hasRoleColumn || !hasFullNameColumn) {
      console.log('🔄 Adding role and full_name columns to admin_users...');
      
      if (!hasRoleColumn) {
        await dbRun('ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT "operator"');
        // Set existing users to admin role (they were created before roles existed)
        await dbRun('UPDATE admin_users SET role = "admin" WHERE role IS NULL OR role = "operator"');
      }
      if (!hasFullNameColumn) {
        await dbRun('ALTER TABLE admin_users ADD COLUMN full_name TEXT');
      }
      
      console.log('✓ role and full_name columns added to admin_users');
    }
    
    // Check if devices table needs fcm_token and apns_token columns for push notifications
    const hasFcmTokenColumn = tableInfo.some((col: any) => col.name === 'fcm_token');
    const hasApnsTokenColumn = tableInfo.some((col: any) => col.name === 'apns_token');
    
    if (!hasFcmTokenColumn || !hasApnsTokenColumn) {
      console.log('🔄 Adding push notification token columns to devices...');
      
      if (!hasFcmTokenColumn) {
        await dbRun('ALTER TABLE devices ADD COLUMN fcm_token TEXT');
      }
      if (!hasApnsTokenColumn) {
        await dbRun('ALTER TABLE devices ADD COLUMN apns_token TEXT');
      }
      
      console.log('✓ Push notification token columns added to devices');
    }
  } catch (error) {
    console.error('⚠️  Database migration warning:', error);
    // Don't fail if migration has issues, as the table might already be in the correct state
  }
}
