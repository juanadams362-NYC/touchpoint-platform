PRAGMA foreign_keys = ON;

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT NOT NULL,                -- student | instructor | admin | alumni
  subrole TEXT,                      -- optional (ex: alumni)
  name TEXT,
  student_id TEXT,
  photo_url TEXT,
  password_hash TEXT                 -- needed for auth
);

-- =========================
-- CLASSES
-- =========================
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  term TEXT
);

-- =========================
-- ENROLLMENTS
-- =========================
CREATE TABLE IF NOT EXISTS enrollments (
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  PRIMARY KEY (class_id, student_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- CLASS SESSIONS
-- =========================
CREATE TABLE IF NOT EXISTS class_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  checkin_open_at TEXT NOT NULL,
  checkin_close_at TEXT NOT NULL,
  late_grace_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',        -- open | closed
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- =========================
-- STUDENT UID LINKS
-- =========================
CREATE TABLE IF NOT EXISTS student_uids (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  uid TEXT NOT NULL UNIQUE,
  label TEXT,
  active INTEGER DEFAULT 1,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- ATTENDANCE RECORDS
-- =========================
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  class_session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL,              -- present | late | absent | pending | excused
  source TEXT NOT NULL,              -- tap | manual | override
  checked_in_at TEXT,
  UNIQUE (class_session_id, student_id),
  FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- TAP EVENTS
-- =========================
CREATE TABLE IF NOT EXISTS tap_events (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  uid TEXT NOT NULL,
  mode TEXT,
  tapped_at TEXT NOT NULL,
  class_session_id TEXT,
  resolved_status TEXT,
  resolved_student_id TEXT
);

-- =========================
-- DEVICES
-- =========================
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location_label TEXT,
  assigned_class_id TEXT,
  status TEXT DEFAULT 'active',      -- active | disabled
  last_seen_at TEXT,
  FOREIGN KEY (assigned_class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- =========================
-- DEVICE ACTIVATION CODES
-- =========================
CREATE TABLE IF NOT EXISTS device_activation_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  claimed_at TEXT,
  device_id TEXT NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- =========================
-- DEVICE KEYS
-- =========================
CREATE TABLE IF NOT EXISTS device_keys (
  device_id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);