const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = path.join(__dirname, "data", "touchpoint.db");
const db = new sqlite3.Database(DB_PATH);

// ---- Helpers ----
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function ensureColumn(table, column, typeSql) {
  const cols = await all(`PRAGMA table_info(${table})`);
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
    console.log(`DB migration: added ${table}.${column}`);
  }
}

// ---- Schema + migrations ----
db.serialize(async () => {
  try {
    // Users (auth + profiles)
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // Add missing columns for Milestone 2 UI/profile fields (SAFE to run multiple times)
    await ensureColumn("users", "full_name", "TEXT");
    await ensureColumn("users", "student_id", "TEXT");
    await ensureColumn("users", "org_code", "TEXT");
    await ensureColumn("users", "class_code", "TEXT");
    await ensureColumn("users", "nfc_uid", "TEXT"); // <-- THIS fixes your u.nfc_uid crash everywhere

    // Classes
    await run(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_code TEXT NOT NULL,
        class_code TEXT NOT NULL,
        section TEXT,
        name TEXT,
        UNIQUE(org_code, class_code, section)
      )
    `);

    // Enrollments (user -> class)
    await run(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        role TEXT NOT NULL,        -- Student / Instructor / Admin
        created_at TEXT NOT NULL,
        UNIQUE(user_id, class_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(class_id) REFERENCES classes(id)
      )
    `);

    // Check-in requests (manual approval flow when no NFC linked)
    await run(`
      CREATE TABLE IF NOT EXISTS checkin_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        student_user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',   -- PENDING/APPROVED/DENIED
        note TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by INTEGER,
        FOREIGN KEY(class_id) REFERENCES classes(id),
        FOREIGN KEY(student_user_id) REFERENCES users(id)
      )
    `);

    // Devices (your existing table)
    await run(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        current_mode TEXT NOT NULL DEFAULT 'ENTRY',
        last_seen TEXT
      )
    `);

    // Tap events (your existing table)
    await run(`
      CREATE TABLE IF NOT EXISTS tap_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        uid TEXT NOT NULL,
        mode TEXT NOT NULL,
        ts TEXT NOT NULL
      )
    `);

    console.log("DB ready:", DB_PATH);
  } catch (e) {
    console.error("DB init/migration error:", e.message);
  }
});

module.exports = db;
