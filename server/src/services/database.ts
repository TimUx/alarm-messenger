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

// Database migration function
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
  } catch (error) {
    console.error('⚠️  Database migration warning:', error);
    // Don't fail if migration has issues, as the table might already be in the correct state
  }
}
