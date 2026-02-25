import { useEffect, useMemo, useState } from "react";
import "./app.css";

/* ---------- Tiny Sound ---------- */
function ping() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.frequency.value = 880;
  g.gain.value = 0.03;
  o.start();
  setTimeout(() => {
    o.stop();
    ctx.close();
  }, 90);
}

/* ---------- Help Tooltip ---------- */
function HelpTip({ title = "Info", children }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        className="btn"
        style={{ padding: "6px 10px", borderRadius: 999 }}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        ?
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            width: 260,
            zIndex: 50
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
          <div className="sub">{children}</div>
        </div>
      )}
    </span>
  );
}

/* ---------- Onboarding Modal ---------- */
function Onboarding({ role, onDone }) {
  const steps = {
    student: [
      "Confirm your name and student ID.",
      "Tap your card once to link your UID.",
      "You are auto-enrolled by admin."
    ],
    instructor: [
      "Open a class session.",
      "Adjust late grace slider if needed.",
      "Monitor taps live."
    ],
    admin: [
      "Create classes.",
      "Enroll students.",
      "Activate devices."
    ]
  };

  return (
    <div className="card" style={{
      position:"fixed",
      inset:0,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      background:"rgba(0,0,0,.6)",
      zIndex:100
    }}>
      <div className="card" style={{ width: 420 }}>
        <div className="title">Welcome to TouchPoint</div>
        <div className="sub" style={{ marginTop: 8 }}>
          First-time setup for <b>{role}</b>
        </div>

        <ul style={{ marginTop: 16 }}>
          {(steps[role] || []).map((s, i) => (
            <li key={i} className="sub" style={{ marginBottom: 6 }}>
              {s}
            </li>
          ))}
        </ul>

        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onDone}>Get Started</button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = (status || "absent").toLowerCase();
  const cls =
    s === "present" ? "pill good" :
    s === "late" ? "pill warn" :
    s === "pending" ? "pill warn" :
    "pill bad";
  return <span className={cls}>{s}</span>;
}

function Drawer({ open, onClose, student, onOverride }) {
  if (!open) return null;
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="card modal" onClick={(e)=>e.stopPropagation()}>
        <div className="row">
          <div>
            <div className="title" style={{fontSize:18}}>{student?.name || "Student"}</div>
            <div className="sub">{student?.studentNumber || ""}</div>
          </div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        <div className="row" style={{marginTop:12}}>
          <span className="pill">Status</span>
          <StatusPill status={student?.status} />
        </div>

        <div className="row" style={{marginTop:12}}>
          <button className="btn" onClick={()=>onOverride("present")}>Mark Present</button>
          <button className="btn" onClick={()=>onOverride("late")}>Mark Late</button>
          <button className="btn" onClick={()=>onOverride("absent")}>Mark Absent</button>
        </div>

        <div className="sub" style={{marginTop:10}}>
          Overrides are tracked as instructor/admin actions (Milestone 3: UI stub, API next).
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("monitor");
  const [role] = useState("admin"); // change if needed

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [roster, setRoster] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);
  const [progress, setProgress] = useState({ presentOrLate: 0, totalEnrolled: 0 });
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [late, setLate] = useState(20);
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem("tp_onboarded")
  );

  async function api(path, opts) {
    const res = await fetch(path, opts);
    return res.json();
  }

  async function refreshClasses() {
    const data = await api("/api/classes");
    if (data.ok) setClasses(data.classes);
  }

  async function loadOpenSession(classId) {
    const data = await api(`/api/classes/${classId}/sessions/open`);
    if (data.ok) setSessionId(data.session?.id || "");
  }

  async function loadSession(sessionId) {
    if (!sessionId) return;

    const s = await api(`/api/sessions/${sessionId}`);
    if (s.ok) setProgress(s.progress);

    const r = await api(`/api/roster/sessions/${sessionId}`);
    if (r.ok) setRoster(r.roster);
  }

  useEffect(() => { refreshClasses(); }, []);

  useEffect(() => {
    if (!sessionId) return;
    loadSession(sessionId);
  }, [sessionId]);

  /* ---------- SSE ---------- */
  useEffect(() => {
    if (!sessionId) return;

    setEvents([]);
    setConnected(false);

    const es = new EventSource(`/api/stream/sessions/${sessionId}`);

    es.addEventListener("heartbeat", () => setConnected(true));

    es.addEventListener("tap", (e) => {
      const payload = JSON.parse(e.data);
      setEvents((prev) => [payload, ...prev].slice(0, 30));
      if (soundOn) ping();
    });

    es.addEventListener("attendance_updated", (e) => {
      const payload = JSON.parse(e.data);
      setProgress(payload.progress);
      setRoster((prev) =>
        prev.map((r) =>
          r.studentId === payload.studentId
            ? { ...r, status: payload.attendance.status }
            : r
        )
      );
    });

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [sessionId, soundOn]);

  const remaining = useMemo(
    () => roster.filter((r) => (r.status || "absent") === "absent").length,
    [roster]
  );

  function finishOnboarding() {
    localStorage.setItem("tp_onboarded", "1");
    setShowOnboarding(false);
  }

  return (
    <div className="bg">
      <div className="grain" />

      {showOnboarding && (
        <Onboarding role={role} onDone={finishOnboarding} />
      )}

      {/* Header */}
      <div className="card">
        <div className="row">
          <div>
            <div className="title">TouchPoint</div>
            <div className="sub">
              Live Stream: {connected ? "Connected" : "Reconnecting…"}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill">
              {progress.presentOrLate}/{progress.totalEnrolled}
            </span>
            <span className="pill">
              Remaining: {remaining}
            </span>
            <button className="btn" onClick={() => setSoundOn(s => !s)}>
              🔊 {soundOn ? "On" : "Off"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ marginTop: 16 }}>
        {["monitor", "roster", "setup", "device"].map(t => (
          <button
            key={t}
            className="btn"
            style={{
              background: tab === t ? "rgba(255,255,255,.2)" : undefined
            }}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Monitor Tab */}
      {tab === "monitor" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row">
            <div className="title" style={{ fontSize: 18 }}>
              Live Tap Feed
            </div>
            <HelpTip title="Tap Feed">
              Every NFC tap appears instantly via SSE.
            </HelpTip>
          </div>

          <div className="list">
            {events.length === 0 ? (
              <div className="item">Waiting for taps…</div>
            ) : (
              events.map((ev, idx) => (
              <div key={ev.tapEventId}
                className={"item" + (idx === 0 ? " pop" : "")}>
                  <div style={{ fontWeight: 700 }}>
                    {ev.student?.name || "Unknown UID"}
                  </div>
                  <div className="sub">
                    UID: {ev.uid}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Roster Tab */}
      {tab === "roster" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="title" style={{ fontSize: 18 }}>
            Roster
          </div>
          <div className="list">
            {roster.map(r => (
          <div key={r.studentId}
          className="item"
          onClick={() => { setActiveStudent(r); setDrawerOpen(true); }}
          style={{ cursor:"pointer" }}>
            <div className="row">
              <div>
                <div style={{ fontWeight: 800 }}>
                  {r.name}
                  <span style={{ marginLeft: 8 }}>
                    <StatusPill status={r.status} />
                    </span>
                    </div>
                    <div className="sub">
                      {r.studentNumber || ""}
                      {r.checkedInAt ? ` • ${new Date(r.checkedInAt).toLocaleTimeString()}` : ""}
                      </div>
                    </div>
                  <span className="pill">View</span>
                </div>
                  <Drawer open={drawerOpen}
                  student={activeStudent}
                  onClose={() => setDrawerOpen(false)}
                  onOverride={(newStatus) => alert(`Override to ${newStatus} (API next)`)}
                  />
              </div>
))}
</div>
</div>
      )}

      {/* Setup Tab */}
      {tab === "setup" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row">
            <div className="title" style={{ fontSize: 18 }}>
              Session Setup
            </div>
            <HelpTip title="Session Setup">
              Admin creates class and opens attendance window.
            </HelpTip>
          </div>

          <select
            className="input"
            value={selectedClassId}
            onChange={async (e) => {
              const v = e.target.value;
              setSelectedClassId(v);
              await loadOpenSession(v);
            }}
          >
            <option value="">Select Class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="sub" style={{ marginTop: 8 }}>
            Late Grace: {late} min
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={late}
            onChange={(e) => setLate(Number(e.target.value))}
          />
        </div>
      )}

      {/* Device Tab */}
      {tab === "device" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row">
            <div className="title" style={{ fontSize: 18 }}>
              Device Activation
            </div>
            <HelpTip title="Activation">
              Generate code → Claim on ESP32 → Send taps securely.
            </HelpTip>
          </div>
          <div className="sub">
            Use activation panel to connect new hardware.
          </div>
        </div>
      )}

    </div>
  );
}