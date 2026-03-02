import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || './data/agentspark.db';

let db = null;

export async function initDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
      } else {
        console.log('✓ Connected to SQLite database:', dbPath);
        createTables().then(resolve).catch(reject);
      }
    });
  });
}

async function createTables() {
  const run = promisify(db.run.bind(db));

  try {
    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        provider TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    await run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        topic TEXT,
        level TEXT,
        description TEXT,
        agents TEXT,
        files TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Project shares (for collaboration v1.4.0)
    await run(`
      CREATE TABLE IF NOT EXISTS project_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectId TEXT NOT NULL,
        userId TEXT NOT NULL,
        role TEXT CHECK(role IN ('owner', 'editor', 'viewer')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(projectId, userId)
      )
    `);

    // Audit log (security)
    await run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        action TEXT,
        resource TEXT,
        details TEXT,
        ipAddress TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `);

    // Community templates (v1.4.0)
    await run(`
      CREATE TABLE IF NOT EXISTS community_templates (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        difficulty TEXT,
        agents TEXT,
        approved BOOLEAN DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `);

    // Refresh tokens
    await run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await run('CREATE INDEX IF NOT EXISTS idx_projects_userId ON projects(userId)');
    await run('CREATE INDEX IF NOT EXISTS idx_projects_updatedAt ON projects(updatedAt)');
    await run('CREATE INDEX IF NOT EXISTS idx_audit_userId ON audit_log(userId)');
    await run('CREATE INDEX IF NOT EXISTS idx_shares_projectId ON project_shares(projectId)');
    await run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)');

    console.log('✓ All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

// Promise wrapper for database operations
export function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function getDatabase() {
  return db;
}

export async function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          console.log('✓ Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
