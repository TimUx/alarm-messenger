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
            active INTEGER DEFAULT 1
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
            qual_th_vu INTEGER DEFAULT 0,
            qual_th_bau INTEGER DEFAULT 0,
            is_squad_leader INTEGER DEFAULT 0
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
        `, (err) => {
          if (err) {
            reject(err);
          } else {
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
