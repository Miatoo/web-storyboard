const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'app.db');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function openDB() {
  ensureDir();
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT,
      email TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verify_code_hash TEXT,
      email_verify_expires_at TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin','user')),
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      max_uses INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, client_id)
    );
  `);

  // Backward-compatible migration: add `salt` column if it doesn't exist.
  try {
    const cols = db.prepare(`PRAGMA table_info(users)`).all();
    const has = (name) => Array.isArray(cols) && cols.some((c) => c && c.name === name);
    if (!has('salt')) db.exec(`ALTER TABLE users ADD COLUMN salt TEXT;`);
    if (!has('email')) db.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
    if (!has('email_verified')) db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;`);
    if (!has('email_verify_code_hash')) db.exec(`ALTER TABLE users ADD COLUMN email_verify_code_hash TEXT;`);
    if (!has('email_verify_expires_at')) db.exec(`ALTER TABLE users ADD COLUMN email_verify_expires_at TEXT;`);
  } catch {
    // ignore migration errors (e.g., during fresh init)
  }
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  openDB,
  migrate,
  nowIso,
  DB_FILE,
};


