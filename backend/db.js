const path = require("path");
const sqlite3 = require("sqlite3").verbose();


const DB_PATH = path.join(__dirname, "data", "touchpoint.db");
const db = new sqlite3.Database(DB_PATH);

// Create tables if they do not exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      current_mode TEXT NOT NULL DEFAULT 'ENTRY',
      last_seen TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tap_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      uid TEXT NOT NULL,
      mode TEXT NOT NULL,
      ts TEXT NOT NULL
    )
  `);
});

module.exports = db;
