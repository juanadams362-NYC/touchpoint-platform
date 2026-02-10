const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// 1) Health check (quick proof server is alive)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "touchpoint-backend", ts: new Date().toISOString() });
});

// 2) ESP32 -> backend tap endpoint
// Body: { deviceId: "DEVICE_001", uid: "04A1B2C3D4", mode: "ENTRY" }
app.post("/api/tap", (req, res) => {
  const { deviceId, uid, mode } = req.body || {};

  if (!deviceId || !uid || !mode) {
    return res.status(400).json({
      ok: false,
      error: "deviceId, uid, and mode are required"
    });
  }

  const ts = new Date().toISOString();
  const UID = String(uid).toUpperCase();
  const MODE = String(mode).toUpperCase();

  // Upsert device (track mode + last_seen)
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

      // Insert tap event
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

// 3) Admin page pulls logs
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

// 4) Optional: change device mode from admin
app.post("/api/device/mode", (req, res) => {
  const { deviceId, mode } = req.body || {};
  if (!deviceId || !mode) {
    return res.status(400).json({ ok: false, error: "deviceId and mode are required" });
  }

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
  db.get(
    `SELECT id, current_mode, last_seen FROM devices WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      if (!row) return res.json({ ok: true, id, current_mode: "ENTRY" }); // default
      res.json({ ok: true, ...row });
    }
  );
});

// Device status for admin panel
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



app.listen(PORT, () => {
  console.log(`TouchPoint backend running on http://localhost:${PORT}`);
});
