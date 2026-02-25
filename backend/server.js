import express from "express";
import cors from "cors";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { EventEmitter } from "events";
import { db } from "./db.js";

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const JWT_EXPIRES_IN = "7d";

const app = express();
const PORT = 3001;
app.use(cors({ origin: true }));
app.use(express.json());

// Minimal login: accepts { email, password }
// For tonight, if password isn't stored, allow a demo password "demo123" OR blank password if user has no hash.
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email) return res.status(400).json({ ok: false, error: "Missing email" });

  const user = db.prepare(`SELECT * FROM users WHERE email=?`).get(String(email).toLowerCase());
  if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  // If password hashes, store them in users.password_hash (recommended).
  // If not, tonight-mode fallback: accept "demo123".
  let valid = false;
  const hasHash = !!user.password_hash;

  if (hasHash) {
    valid = bcrypt.compareSync(String(password || ""), user.password_hash);
  } else {
    valid = (String(password || "") === "demo123");
  }

  if (!valid) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const token = jwt.sign(
    { sub: user.id, role: user.role, subrole: user.subrole || null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      subrole: user.subrole || null,
      name: user.name,
      studentId: user.student_id
    }
  });
});

// Optional: "who am I" endpoint for your web to validate token
app.get("/api/auth/me", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(`SELECT id,email,role,subrole,name,student_id as studentId FROM users WHERE id=?`).get(payload.sub);
    if (!user) return res.status(401).json({ ok: false, error: "Invalid token" });
    res.json({ ok: true, user });
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
});

/** ---------------- REALTIME BUS ---------------- */
const bus = new EventEmitter();
bus.setMaxListeners(200);

function sseSend(res, eventName, data) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** ---------------- SSE: per session ----------------
 * Web listens to: /api/stream/sessions/:sessionId
 */
app.get("/api/stream/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  sseSend(res, "heartbeat", { type: "heartbeat", ts: new Date().toISOString() });

  const hb = setInterval(() => {
    sseSend(res, "heartbeat", { type: "heartbeat", ts: new Date().toISOString() });
  }, 25000);

  const onTap = (payload) => {
    if (payload.sessionId !== sessionId) return;
    sseSend(res, "tap", payload);
  };

  const onAttendance = (payload) => {
    if (payload.sessionId !== sessionId) return;
    sseSend(res, "attendance_updated", payload);
  };

  bus.on("tap", onTap);
  bus.on("attendance_updated", onAttendance);

  req.on("close", () => {
    clearInterval(hb);
    bus.off("tap", onTap);
    bus.off("attendance_updated", onAttendance);
    res.end();
  });
});

/** ---------------- ADMIN HELPERS (for tonight) ----------------
 * These endpoints let you create demo data without building admin UI yet.
 */

// Create demo class
app.post("/api/admin/classes", (req, res) => {
  const id = crypto.randomUUID();
  const { name = "Demo Class", term = "Spring 2026" } = req.body ?? {};
  db.prepare(`INSERT INTO classes (id, name, term) VALUES (?,?,?)`).run(id, name, term);
  res.json({ ok: true, class: { id, name, term } });
});

// Create open session (window around now)
app.post("/api/admin/classes/:classId/sessions/open", (req, res) => {
  const { classId } = req.params;
  const id = crypto.randomUUID();

  const now = Date.now();
  const starts = new Date(now - 5 * 60_000).toISOString();
  const ends = new Date(now + 55 * 60_000).toISOString();
  const open = new Date(now - 10 * 60_000).toISOString();
  const close = new Date(now + 60 * 60_000).toISOString();

  const lateGraceMinutes = Number(req.body?.lateGraceMinutes ?? 20);

  db.prepare(
    `INSERT INTO class_sessions
     (id, class_id, starts_at, ends_at, checkin_open_at, checkin_close_at, late_grace_minutes, status)
     VALUES (?,?,?,?,?,?,?, 'open')`
  ).run(id, classId, starts, ends, open, close, lateGraceMinutes);

  res.json({ ok: true, session: { id, classId } });
});

// Create student + enroll
app.post("/api/admin/classes/:classId/enroll-student", (req, res) => {
  const { classId } = req.params;
  const { name, email, studentId } = req.body ?? {};
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO users (id, email, role, name, student_id) VALUES (?,?,?,?,?)`
  ).run(id, email ?? `${id}@demo.local`, "student", name ?? "Student", studentId ?? `S-${id.slice(0,6)}`);

  db.prepare(
    `INSERT INTO enrollments (class_id, student_id, status) VALUES (?,?, 'active')`
  ).run(classId, id);

  res.json({ ok: true, student: { id } });
});

app.post("/api/admin/users/demo", (req, res) => {
  const id = crypto.randomUUID();
  const email = "admin@demo.local";
  db.prepare(
    `INSERT INTO users (id,email,role,name) VALUES (?,?,?,?)`
  ).run(id, email, "admin", "Demo Admin");
  res.json({ ok: true, email, password: "demo123" });
});

app.post("/api/admin/migrate/add-password", (req, res) => {
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN password_hash TEXT`).run();
    res.json({ ok: true, message: "password_hash column added" });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Link UID to student (auto-link simulation)
app.post("/api/admin/students/:studentId/link-uid", (req, res) => {
  const { studentId } = req.params;
  const { uid, label = "card" } = req.body ?? {};
  const id = crypto.randomUUID();
  db.prepare(`INSERT OR REPLACE INTO student_uids (id, student_id, uid, label, active) VALUES (?,?,?,?,1)`)
    .run(id, studentId, uid, label);
  res.json({ ok: true });
});

/** ---------------- SESSION API (web uses these) ---------------- */

app.get("/api/classes", (req, res) => {
  const rows = db.prepare(`SELECT * FROM classes ORDER BY name ASC`).all();
  res.json({ ok: true, classes: rows });
});

app.get("/api/classes/:classId/sessions/open", (req, res) => {
  const { classId } = req.params;
  const row = db.prepare(
    `SELECT * FROM class_sessions WHERE class_id=? AND status='open' ORDER BY checkin_open_at DESC LIMIT 1`
  ).get(classId);
  res.json({ ok: true, session: row ?? null });
});

app.get("/api/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = db.prepare(`SELECT * FROM class_sessions WHERE id=?`).get(sessionId);
  if (!session) return res.status(404).json({ ok: false, error: "Session not found" });

  const total = db.prepare(`SELECT COUNT(*) as c FROM enrollments WHERE class_id=?`).get(session.class_id).c;
  const present = db.prepare(
    `SELECT COUNT(*) as c FROM attendance_records WHERE class_session_id=? AND status IN ('present','late')`
  ).get(sessionId).c;

  res.json({ ok: true, session, progress: { presentOrLate: present, totalEnrolled: total } });
});

app.patch("/api/sessions/:sessionId/late", (req, res) => {
  const { sessionId } = req.params;
  const lateGraceMinutes = Number(req.body?.lateGraceMinutes ?? 0);
  db.prepare(`UPDATE class_sessions SET late_grace_minutes=? WHERE id=?`).run(lateGraceMinutes, sessionId);
  const session = db.prepare(`SELECT * FROM class_sessions WHERE id=?`).get(sessionId);
  res.json({ ok: true, session });
});

app.get("/api/roster/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = db.prepare(`SELECT * FROM class_sessions WHERE id=?`).get(sessionId);
  if (!session) return res.status(404).json({ ok: false, error: "Session not found" });

  const roster = db.prepare(
    `SELECT
       u.id as studentId,
       u.name,
       u.student_id as studentNumber,
       u.photo_url as photoUrl,
       COALESCE(ar.status, 'absent') as status,
       ar.checked_in_at as checkedInAt
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     LEFT JOIN attendance_records ar
       ON ar.student_id=u.id AND ar.class_session_id=?
     WHERE e.class_id=?
     ORDER BY u.name ASC`
  ).all(sessionId, session.class_id);

  res.json({ ok: true, roster });
});

/** ---------------- DEVICE ACTIVATION + AUTH ---------------- */

function randomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function makeDeviceKey() {
  return `tp_devkey_${crypto.randomBytes(24).toString("hex")}`;
}

// Admin start activation (for tonight: no auth, just use it)
app.post("/api/devices/activate/start", (req, res) => {
  const deviceId = crypto.randomUUID();
  const { name="Door Reader", locationLabel="Room 204", assignedClassId=null } = req.body ?? {};

  db.prepare(`INSERT INTO devices (id,name,location_label,assigned_class_id,status) VALUES (?,?,?,?, 'active')`)
    .run(deviceId, name, locationLabel, assignedClassId);

  const code = randomCode(6);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10*60*1000).toISOString();

  db.prepare(`INSERT INTO device_activation_codes (id, code, expires_at, device_id) VALUES (?,?,?,?)`)
    .run(id, code, expiresAt, deviceId);

  res.json({ ok:true, code, expiresAt, deviceId });
});

// Device claim activation
app.post("/api/devices/activate/claim", (req, res) => {
  const { code } = req.body ?? {};
  if (!code) return res.status(400).json({ ok:false, error:"Missing code" });

  const row = db.prepare(`SELECT * FROM device_activation_codes WHERE code=?`).get(String(code));
  if (!row) return res.status(404).json({ ok:false, error:"Invalid code" });
  if (row.claimed_at) return res.status(409).json({ ok:false, error:"Already claimed" });
  if (new Date(row.expires_at) < new Date()) return res.status(410).json({ ok:false, error:"Expired" });

  const deviceKey = makeDeviceKey();
  const keyHash = bcrypt.hashSync(deviceKey, 10);

  db.prepare(`UPDATE device_activation_codes SET claimed_at=? WHERE id=?`).run(new Date().toISOString(), row.id);
  db.prepare(`INSERT OR REPLACE INTO device_keys (device_id, key_hash) VALUES (?,?)`).run(row.device_id, keyHash);

  res.json({ ok:true, device: { id: row.device_id }, deviceKey });
});

// Device auth middleware for /api/tap
function requireDevice(req, res, next) {
  const deviceId = req.headers["x-device-id"];
  const auth = req.headers["authorization"] || "";
  const deviceKey = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!deviceId || !deviceKey) return res.status(401).json({ ok:false, error:"Missing device auth" });

  const keyRow = db.prepare(`SELECT * FROM device_keys WHERE device_id=?`).get(String(deviceId));
  if (!keyRow) return res.status(401).json({ ok:false, error:"Unknown device" });

  const ok = bcrypt.compareSync(String(deviceKey), keyRow.key_hash);
  if (!ok) return res.status(401).json({ ok:false, error:"Bad device key" });

  const device = db.prepare(`SELECT * FROM devices WHERE id=?`).get(String(deviceId));
  if (!device || device.status !== "active") return res.status(403).json({ ok:false, error:"Device disabled" });

  req.device = device;
  next();
}
app.post("/api/auth/register", (req, res) => {
  const { email, password, name, role = "student", studentId, subrole = null } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Missing email or password" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  // Prevent duplicate email
  const existing = db.prepare(`SELECT id FROM users WHERE email=?`).get(normalizedEmail);
  if (existing) return res.status(409).json({ ok: false, error: "Email already registered" });

  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(String(password), 10);

  // Try insert with password_hash + subrole (if your schema has them)
  try {
    db.prepare(
      `INSERT INTO users (id, email, role, subrole, name, student_id, password_hash)
       VALUES (?,?,?,?,?,?,?)`
    ).run(
      id,
      normalizedEmail,
      role,
      subrole,
      name ?? "User",
      studentId ?? null,
      passwordHash
    );
  } catch (err) {
    // Fallback if your users table doesn't have password_hash or subrole yet
    try {
      db.prepare(
        `INSERT INTO users (id, email, role, name, student_id)
         VALUES (?,?,?,?,?)`
      ).run(
        id,
        normalizedEmail,
        role,
        name ?? "User",
        studentId ?? null
      );
    } catch (err2) {
      return res.status(500).json({ ok: false, error: err2.message });
    }
  }

  // Issue token immediately after register (common frontend expectation)
  const token = jwt.sign({ sub: id, role }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    ok: true,
    token,
    user: { id, email: normalizedEmail, role, subrole, name: name ?? "User", studentId: studentId ?? null }
  });
});

/** ---------------- TAP -> ATTENDANCE + SSE ---------------- */
app.post("/api/tap", requireDevice, (req, res) => {
  const { uid, mode="A" } = req.body ?? {};
  if (!uid) return res.status(400).json({ ok:false, error:"Missing uid" });

  const device = req.device;
  const tappedAt = new Date().toISOString();

  // Find active session for device.assigned_class_id
  let session = null;
  if (device.assigned_class_id) {
    session = db.prepare(
      `SELECT * FROM class_sessions
       WHERE class_id=?
         AND status='open'
         AND checkin_open_at <= ?
         AND checkin_close_at >= ?
       ORDER BY checkin_open_at DESC
       LIMIT 1`
    ).get(device.assigned_class_id, tappedAt, tappedAt);
  }

  const sessionId = session?.id ?? null;

  // Find student by UID
  const uidRow = db.prepare(`SELECT student_id FROM student_uids WHERE uid=? AND active=1`).get(uid);
  const studentId = uidRow?.student_id ?? null;

  let resolvedStatus = "unknown_uid";
  if (!sessionId) resolvedStatus = "no_active_session";
  if (sessionId && studentId) resolvedStatus = "matched_student";
  if (!sessionId && studentId) resolvedStatus = "matched_student_no_session";

  const tapEventId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO tap_events (id, device_id, uid, mode, tapped_at, class_session_id, resolved_status, resolved_student_id)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(tapEventId, device.id, uid, mode, tappedAt, sessionId, resolvedStatus, studentId);

  db.prepare(`UPDATE devices SET last_seen_at=? WHERE id=?`).run(tappedAt, device.id);

  // Emit tap event (so UI shows it immediately)
  bus.emit("tap", {
    type: "tap",
    tapEventId,
    sessionId,
    uid,
    mode,
    tappedAt,
    device: { id: device.id, name: device.name, location: device.location_label },
    resolution: { status: resolvedStatus },
    student: studentId
      ? db.prepare(`SELECT id, name, student_id as studentNumber, photo_url as photoUrl FROM users WHERE id=?`).get(studentId)
      : null
  });

  // If we can count attendance
  if (sessionId && studentId) {
    const grace = Number(session.late_grace_minutes ?? 0);
    const startMs = new Date(session.starts_at).getTime();
    const tapMs = new Date(tappedAt).getTime();
    const lateCutoff = startMs + grace * 60_000;
    const status = tapMs <= lateCutoff ? "present" : "late";

    // Upsert attendance
    const existing = db.prepare(
      `SELECT id FROM attendance_records WHERE class_session_id=? AND student_id=?`
    ).get(sessionId, studentId);

    if (!existing) {
  db.prepare(
    `INSERT INTO attendance_records (id, class_session_id, student_id, status, source, checked_in_at)
     VALUES (?,?,?,?,?,?)`
  ).run(crypto.randomUUID(), sessionId, studentId, status, "tap", tappedAt);
} else {
  db.prepare(
    `UPDATE attendance_records
     SET status=?, source=?, checked_in_at=?
     WHERE class_session_id=? AND student_id=?`
  ).run(status, "tap", tappedAt, sessionId, studentId);
}

    // Progress
    const total = db.prepare(`SELECT COUNT(*) as c FROM enrollments WHERE class_id=?`).get(session.class_id).c;
    const presentOrLate = db.prepare(
      `SELECT COUNT(*) as c FROM attendance_records WHERE class_session_id=? AND status IN ('present','late')`
    ).get(sessionId).c;

    bus.emit("attendance_updated", {
      type: "attendance_updated",
      sessionId,
      studentId,
      attendance: { status, checkedInAt: tappedAt, source: "tap" },
      progress: { presentOrLate, totalEnrolled: total }
    });
  }

  res.json({ ok:true });
});

app.get("/api/health", (req, res) => res.json({ ok:true }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TouchPoint M3 backend: http://localhost:${PORT}`);
  console.log(`LAN health: http://192.168.1.180:${PORT}/api/health`);
});