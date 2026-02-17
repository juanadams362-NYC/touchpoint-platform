const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const JWT_SECRET = "Change_this_secret_tonight";

function isFullSailStaff(email) {
  const e = String(email || "").toLowerCase().trim();
  return e.endsWith("@fullsail.edu");
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    const r = String(req.user?.role || "").toLowerCase();
    const ok = roles.map((x) => String(x).toLowerCase()).includes(r);
    if (!ok) return res.status(403).json({ ok: false, error: "Forbidden" });
    next();
  };
}

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "touchpoint-backend", ts: new Date().toISOString() });
});

// ---------------- AUTH ----------------

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, role, fullName, studentId, orgCode } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ ok: false, error: "email, password, role required" });
  }

  const ROLE = String(role).trim();
  const EMAIL = String(email).toLowerCase().trim();
  const isStaffRole = ["instructor", "admin"].includes(ROLE.toLowerCase());

  if (isStaffRole && !isFullSailStaff(EMAIL)) {
    return res.status(403).json({
      ok: false,
      error: "Instructor/Admin must register with a @fullsail.edu email for this milestone demo."
    });
  }

  const hash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO users (email, password_hash, role, full_name, student_id, org_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [EMAIL, hash, ROLE, fullName || null, studentId || null, orgCode || null, createdAt],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(409).json({ ok: false, error: "Email already exists" });
        }
        return res.status(500).json({ ok: false, error: err.message });
      }

      const user = { id: this.lastID, email: EMAIL, role: ROLE };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: "2h" });
      res.json({ ok: true, token, user });
    }
  );
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "email and password required" });
  }

  const EMAIL = String(email).toLowerCase().trim();

  db.get(`SELECT * FROM users WHERE email = ?`, [EMAIL], async (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    if (!row) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const user = { id: row.id, email: row.email, role: row.role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "2h" });
    res.json({ ok: true, token, user });
  });
});

// ---------------- PROFILE (NEW) ----------------

// Get my profile (frontend uses this to see if student has NFC linked)
app.get("/api/me", requireAuth, (req, res) => {
  db.get(
    `SELECT id, email, role, full_name, student_id, org_code
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, me: row });
    }
  );
});

// Student links their NFC UID to their profile (one-time setup)
app.post("/api/me/link-nfc", requireAuth, requireRole(["Student"]), (req, res) => {
  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ ok: false, error: "uid required" });

  const UID = String(uid).toUpperCase().trim();

  // Prevent same UID being assigned to multiple users
  db.get(`SELECT id, email FROM users WHERE nfc_uid = ?`, [UID], (err, existing) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ ok: false, error: "That NFC UID is already linked to another account." });
    }

    db.run(
      `UPDATE users SET nfc_uid = ? WHERE id = ?`,
      [UID, req.user.id],
      (err2) => {
        if (err2) return res.status(500).json({ ok: false, error: err2.message });
        res.json({ ok: true, uid: UID });
      }
    );
  });
});

// Optional: student can unlink their own UID (lost card scenario)
// If you don't want this, delete this route.
app.post("/api/me/unlink-nfc", requireAuth, requireRole(["Student"]), (req, res) => {
  db.run(`UPDATE users SET nfc_uid = NULL WHERE id = ?`, [req.user.id], (err) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true });
  });
});

// Optional: staff can reset a student's UID (admin/instructor helpdesk)
// If you don't want this, delete this route.
app.post("/api/admin/reset-nfc", requireAuth, requireRole(["Instructor", "Admin"]), (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  db.run(`UPDATE users SET nfc_uid = NULL WHERE id = ?`, [userId], (err) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true });
  });
});

// ---------------- TAP + EVENTS ----------------

// Protected: last 50 tap events (JWT)
app.get("/api/events", requireAuth, (req, res) => {
  db.all(`SELECT * FROM tap_events ORDER BY ts DESC LIMIT 50`, [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, events: rows });
  });
});

// ESP32 -> backend tap endpoint (raw log)
app.post("/api/tap", (req, res) => {
  const { deviceId, uid, mode } = req.body || {};
  if (!deviceId || !uid || !mode) {
    return res.status(400).json({ ok: false, error: "deviceId, uid, and mode are required" });
  }

  const ts = new Date().toISOString();
  const UID = String(uid).toUpperCase();
  const MODE = String(mode).toUpperCase();

  db.run(
    `
    INSERT INTO devices (id, name, current_mode, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      current_mode=excluded.current_mode,
      last_seen=excluded.last_seen
    `,
    [deviceId, deviceId, MODE, ts],
    (err) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });

      db.run(
        `INSERT INTO tap_events (device_id, uid, mode, ts) VALUES (?, ?, ?, ?)`,
        [deviceId, UID, MODE, ts],
        function (err2) {
          if (err2) return res.status(500).json({ ok: false, error: err2.message });
          res.json({ ok: true, eventId: this.lastID, ts, deviceId, uid: UID, mode: MODE });
        }
      );
    }
  );
});

// Admin-ish logs (demo)
app.get("/api/logs", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "25", 10), 200);
  db.all(
    `SELECT id, device_id, uid, mode, ts FROM tap_events ORDER BY id DESC LIMIT ?`,
    [limit],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, rows });
    }
  );
});

// Optional: change device mode
app.post("/api/device/mode", (req, res) => {
  const { deviceId, mode } = req.body || {};
  if (!deviceId || !mode) return res.status(400).json({ ok: false, error: "deviceId and mode are required" });

  const ts = new Date().toISOString();
  const MODE = String(mode).toUpperCase();

  db.run(
    `
    INSERT INTO devices (id, name, current_mode, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      current_mode=excluded.current_mode,
      last_seen=excluded.last_seen
    `,
    [deviceId, deviceId, MODE, ts],
    (err) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, deviceId, mode: MODE, ts });
    }
  );
});

app.get("/api/device/:id", (req, res) => {
  const id = req.params.id;
  db.get(`SELECT id, current_mode, last_seen FROM devices WHERE id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    if (!row) return res.json({ ok: true, id, current_mode: "ENTRY" });
    res.json({ ok: true, ...row });
  });
});

app.get("/api/devices", (req, res) => {
  db.all(
    `SELECT id, name, current_mode, last_seen
     FROM devices
     ORDER BY COALESCE(last_seen, '') DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, rows });
    }
  );
});

// ----------------- Attendance Module -----------------

async function ensureDemoClass(instructorUserId) {
  const now = new Date().toISOString();
  const org = "FULLSAIL";
  const code = "COS349-L";

  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM classes WHERE org_code = ? AND class_code = ?`, [org, code], (err, row) => {
      if (err) return reject(err);
      if (row) return resolve(row);

      db.run(
        `INSERT INTO classes (org_code, class_code, title, location, start_time, end_time, instructor_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [org, code, "COS349-L (Demo)", "Full Sail", "14:00", "16:00", instructorUserId, now],
        function (err2) {
          if (err2) return reject(err2);
          db.get(`SELECT * FROM classes WHERE id = ?`, [this.lastID], (err3, created) => {
            if (err3) return reject(err3);
            resolve(created);
          });
        }
      );
    });
  });
}

// Create or ensure class (Instructor/Admin)
app.post("/api/classes/create", requireAuth, requireRole(["Instructor", "Admin"]), (req, res) => {
  const { orgCode, classCode, title, location, startTime, endTime } = req.body || {};
  const org = String(orgCode || "FULLSAIL").toUpperCase();
  const code = String(classCode || "COS349-L").toUpperCase();
  const now = new Date().toISOString();

  db.run(
    `INSERT OR IGNORE INTO classes (org_code, class_code, title, location, start_time, end_time, instructor_user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [org, code, title || "Demo Class", location || "Room TBD", startTime || "14:00", endTime || "16:00", req.user.id, now],
    (err) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      db.get(`SELECT * FROM classes WHERE org_code = ? AND class_code = ?`, [org, code], (err2, row) => {
        if (err2) return res.status(500).json({ ok: false, error: err2.message });
        res.json({ ok: true, class: row });
      });
    }
  );
});

// Student join class by code
app.post("/api/classes/join", requireAuth, requireRole(["Student"]), (req, res) => {
  const { orgCode, classCode } = req.body || {};
  const org = String(orgCode || "").toUpperCase().trim();
  const code = String(classCode || "").toUpperCase().trim();
  if (!org || !code) return res.status(400).json({ ok: false, error: "orgCode and classCode required" });

  db.get(`SELECT * FROM classes WHERE org_code = ? AND class_code = ?`, [org, code], (err, cls) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    if (!cls) return res.status(404).json({ ok: false, error: "Class not found" });

    const now = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO enrollments (class_id, user_id, created_at) VALUES (?, ?, ?)`,
      [cls.id, req.user.id, now],
      (err2) => {
        if (err2) return res.status(500).json({ ok: false, error: err2.message });
        res.json({ ok: true, class: cls });
      }
    );
  });
});

// Get my classes
app.get("/api/classes/my", requireAuth, (req, res) => {
  const role = String(req.user.role || "").toLowerCase();

  if (role === "student") {
    db.all(
      `SELECT c.* FROM classes c
       JOIN enrollments e ON e.class_id = c.id
       WHERE e.user_id = ?
       ORDER BY c.id DESC`,
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        res.json({ ok: true, classes: rows });
      }
    );
    return;
  }

  db.all(
    `SELECT * FROM classes WHERE instructor_user_id = ? ORDER BY id DESC`,
    [req.user.id],
    async (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      if (rows.length === 0) {
        try {
          const demo = await ensureDemoClass(req.user.id);
          return res.json({ ok: true, classes: [demo] });
        } catch (e) {
          return res.status(500).json({ ok: false, error: String(e.message || e) });
        }
      }
      res.json({ ok: true, classes: rows });
    }
  );
});

// Instructor roster
app.get("/api/roster/:classId", requireAuth, requireRole(["Instructor", "Admin"]), (req, res) => {
  const classId = parseInt(req.params.classId, 10);
  db.all(
    `SELECT u.id, u.full_name, u.student_id, u.email, u.nfc_uid
     FROM enrollments e
     JOIN users u ON u.id = e.user_id
     WHERE e.class_id = ?
     ORDER BY COALESCE(u.full_name, u.email) ASC`,
    [classId],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, roster: rows });
    }
  );
});

// Student requests check-in (ONLY allowed if student has NO nfc_uid)
app.post("/api/attendance/request", requireAuth, requireRole(["Student"]), (req, res) => {
  const { classId, reason } = req.body || {};
  if (!classId) return res.status(400).json({ ok: false, error: "classId required" });

  db.get(`SELECT nfc_uid FROM users WHERE id = ?`, [req.user.id], (err, u) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });

    const hasNfc = !!u?.nfc_uid;
    if (hasNfc) {
      return res.status(409).json({
        ok: false,
        error: "NFC is linked to your account. Use Tap to Check In instead of requesting."
      });
    }

    const now = new Date().toISOString();
    db.run(
      `INSERT INTO pending_approvals (class_id, user_id, requested_at, reason, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [classId, req.user.id, now, reason || "Demo request"],
      function (err2) {
        if (err2) return res.status(500).json({ ok: false, error: err2.message });
        res.json({ ok: true, requestId: this.lastID, requested_at: now });
      }
    );
  });
});

// Instructor sees pending
app.get("/api/attendance/pending", requireAuth, requireRole(["Instructor", "Admin"]), (req, res) => {
  db.all(
    `SELECT p.id, p.class_id, p.user_id, p.requested_at, p.reason, p.status,
            u.full_name, u.student_id, u.email,
            c.org_code, c.class_code, c.title
     FROM pending_approvals p
     JOIN users u ON u.id = p.user_id
     JOIN classes c ON c.id = p.class_id
     WHERE p.status = 'PENDING'
     ORDER BY p.requested_at DESC
     LIMIT 50`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, pending: rows });
    }
  );
});

// Instructor approves/rejects
app.post("/api/attendance/review", requireAuth, requireRole(["Instructor", "Admin"]), (req, res) => {
  const { requestId, decision, note } = req.body || {};
  if (!requestId || !decision) return res.status(400).json({ ok: false, error: "requestId and decision required" });

  const DEC = String(decision).toUpperCase(); // APPROVE / REJECT
  if (!["APPROVE", "REJECT"].includes(DEC)) return res.status(400).json({ ok: false, error: "decision must be APPROVE or REJECT" });

  const reviewedAt = new Date().toISOString();
  const newStatus = DEC === "APPROVE" ? "APPROVED" : "REJECTED";

  db.get(`SELECT * FROM pending_approvals WHERE id = ?`, [requestId], (err, reqRow) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    if (!reqRow) return res.status(404).json({ ok: false, error: "Request not found" });

    db.run(
      `UPDATE pending_approvals
       SET status = ?, reviewed_by_user_id = ?, reviewed_at = ?
       WHERE id = ?`,
      [newStatus, req.user.id, reviewedAt, requestId],
      (err2) => {
        if (err2) return res.status(500).json({ ok: false, error: err2.message });

        if (newStatus === "APPROVED") {
          db.run(
            `INSERT INTO attendance_records (class_id, user_id, status, source, ts, note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [reqRow.class_id, reqRow.user_id, "VERIFIED", "REQUEST", reviewedAt, note || "Approved by instructor"],
            function (err3) {
              if (err3) return res.status(500).json({ ok: false, error: err3.message });
              return res.json({ ok: true, status: newStatus, attendanceRecordId: this.lastID });
            }
          );
        } else {
          return res.json({ ok: true, status: newStatus });
        }
      }
    );
  });
});

// Instructor/Admin manual override
app.post("/api/attendance/manual", requireAuth, requireRole(["Instructor", "Admin"]), (req, res) => {
  const { classId, userId, status, note } = req.body || {};
  if (!classId || !userId) return res.status(400).json({ ok: false, error: "classId and userId required" });

  const now = new Date().toISOString();
  const STATUS = String(status || "VERIFIED").toUpperCase();

  db.run(
    `INSERT INTO attendance_records (class_id, user_id, status, source, ts, note)
     VALUES (?, ?, ?, 'MANUAL', ?, ?)`,
    [classId, userId, STATUS, now, note || "Manual override"],
    function (err) {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, attendanceRecordId: this.lastID, ts: now });
    }
  );
});

// Student attendance history
app.get("/api/attendance/me", requireAuth, requireRole(["Student"]), (req, res) => {
  db.all(
    `SELECT a.id, a.status, a.source, a.ts, a.note, c.org_code, c.class_code, c.title
     FROM attendance_records a
     JOIN classes c ON c.id = a.class_id
     WHERE a.user_id = ?
     ORDER BY a.ts DESC
     LIMIT 50`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, records: rows });
    }
  );
});

app.listen(PORT, () => {
  console.log(`TouchPoint backend running on http://localhost:${PORT}`);
});
