import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api";

/* ========= AUTH STORE ========= */
function useAuthStore() {
  const [token, setToken] = useState(localStorage.getItem("tp_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("tp_user");
    return raw ? JSON.parse(raw) : null;
  });

  function saveAuth(t, u) {
    setToken(t);
    setUser(u);
    localStorage.setItem("tp_token", t);
    localStorage.setItem("tp_user", JSON.stringify(u));
  }

  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("tp_token");
    localStorage.removeItem("tp_user");
  }

  return { token, user, saveAuth, logout };
}

function RequireAuth({ token, children }) {
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireRoles({ role, allow, children }) {
  const r = String(role || "").toLowerCase();
  const normalized = r === "professor" ? "instructor" : r;
  const ok = allow.map(a => String(a).toLowerCase()).includes(normalized);
  if (!ok) return <Navigate to="/monitor" replace />;
  return children;
}

/* ========= UI HELPERS ========= */
function Icon({ variant = "dot" }) {
  return <div className={`navIcon ${variant}`} />;
}

function initials(nameOrEmail = "") {
  const s = String(nameOrEmail).trim();
  if (!s) return "TP";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SideNav({ role }) {
  const loc = useLocation();
  const is = (p) => loc.pathname.startsWith(p);

  const r = String(role || "").toLowerCase();
  const isStudent = r === "student";
  const isInstructor = r === "instructor";
  const isAdmin = r === "admin";

  return (
    <div className="sidebar">
      <div className="brandDot" title="TouchPoint">
        <div className="brandMark" />
      </div>

      <Link className={`navBtn ${is("/monitor") ? "active" : ""}`} to="/monitor">
        <Icon variant="monitor" /><div className="navLabel">Monitor</div>
      </Link>

      <Link className={`navBtn ${is("/data") ? "active" : ""}`} to="/data">
        <Icon variant="data" /><div className="navLabel">Data</div>
      </Link>

      <Link className={`navBtn ${is("/config") ? "active" : ""}`} to="/config">
        <Icon variant="config" /><div className="navLabel">Config</div>
      </Link>

      <Link className={`navBtn ${is("/settings") ? "active" : ""}`} to="/settings">
        <Icon variant="settings" /><div className="navLabel">Settings</div>
      </Link>

      {(isInstructor || isAdmin) && (
        <Link className={`navBtn ${is("/system") ? "active" : ""}`} to="/system">
          <Icon variant="system" /><div className="navLabel">System</div>
        </Link>
      )}

      <div className="navRole">
        <div className="navRoleLabel">Role</div>
        <div className="navRoleValue">{role || "Guest"}</div>
      </div>
    </div>
  );
}

/* ========= APP ========= */
export default function App() {
  const { token, user, saveAuth, logout } = useAuthStore();
  const role = useMemo(() => user?.role || "", [user?.role]);

  return (
    <>
      <div className="bg">
        <div className="grain" />
      </div>

      <div className="shell">
        <SideNav role={role} />

        <div className="main">
          <div className="topline">
            <div className="topLeft">
              <div className="kicker">TOUCHPOINT PLATFORM</div>
              <h1 className="h1">TouchPoint</h1>

              <div className="subline">
                <span className="subStrong">Task-based tap-to-action platform.</span>
                <span className="subDim">
                  Active module: <b>Class Attendance</b>. Event Check-In, Access Control, and Smart Automation are locked for later milestones.
                </span>
                {user?.email ? <span className="subFaint">{user.email}</span> : null}
              </div>

              <div className="pillRow">
                {!token && <Link className="pill" to="/login">Login</Link>}
                {!token && <Link className="pill" to="/register">Register</Link>}
                {token && <Link className="pill" to="/monitor">Dashboard</Link>}
                {token && <Link className="pill" to="/data">Verified Users</Link>}
                {token && <Link className="pill" to="/settings">Settings</Link>}
              </div>
            </div>

            <div className="topRight">
              {token ? (
                <button className="pill" onClick={logout}>Logout</button>
              ) : (
                <span className="badge"><span className="dot" /> Demo Mode</span>
              )}
            </div>
          </div>

          <Routes>
            <Route path="/" element={token ? <Navigate to="/monitor" replace /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={<Login saveAuth={saveAuth} />} />
            <Route path="/register" element={<Register saveAuth={saveAuth} />} />

            <Route
              path="/monitor"
              element={
                <RequireAuth token={token}>
                  <MonitorHome token={token} role={role} />
                </RequireAuth>
              }
            />

            <Route
              path="/data"
              element={
                <RequireAuth token={token}>
                  <DataHome role={role} />
                </RequireAuth>
              }
            />

            <Route
              path="/config"
              element={
                <RequireAuth token={token}>
                  <Config role={role} />
                </RequireAuth>
              }
            />

            <Route
              path="/settings"
              element={
                <RequireAuth token={token}>
                  <Settings token={token} user={user} saveAuth={saveAuth} />
                </RequireAuth>
              }
            />

            <Route
              path="/system"
              element={
                <RequireAuth token={token}>
                  <RequireRoles role={role} allow={["Instructor", "Admin"]}>
                    <System token={token} role={role} />
                  </RequireRoles>
                </RequireAuth>
              }
            />

            <Route path="*" element={<div className="card"><div className="cardInner">Not found</div></div>} />
          </Routes>
        </div>
      </div>
    </>
  );
}

/* ========= AUTH PAGES ========= */
function Login({ saveAuth }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("jc adams2@student.fullsail.edu".replace(" ", "")); // harmless default
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  return (
    <div className="card cardHover">
      <div className="cardInner">
        <h2 className="h2">Login</h2>
        {err && <div className="error"><b>Error:</b> {err}</div>}

        <div className="form">
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@student.fullsail.edu" />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="btns">
            <button className="btn btnPrimary" onClick={async () => {
              setErr("");
              try {
                const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
                saveAuth(data.token, data.user);
                nav("/monitor");
              } catch (e) {
                setErr(e.message);
              }
            }}>
              Continue
            </button>

            <Link className="btn btnGhost" to="/register">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Register({ saveAuth }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState("Student");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");

  // Milestone defaults (your exact values)
  const [orgCode, setOrgCode] = useState("FULLSAIL");
  const [classCode, setClassCode] = useState("COS349-L");

  const [err, setErr] = useState("");

  return (
    <div className="card cardHover">
      <div className="cardInner">
        <h2 className="h2">Create Account</h2>
        {err && <div className="error"><b>Error:</b> {err}</div>}

        <div className="form wide">
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@student.fullsail.edu" />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Student</option>
              <option>Instructor</option>
              <option>Admin</option>
            </select>
          </div>

          <div className="field">
            <label>Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Adams" />
          </div>

          <div className="field">
            <label>Student ID</label>
            <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="0005267305" />
          </div>

          <div className="twoCol">
            <div className="field">
              <label>Org Code</label>
              <input value={orgCode} onChange={(e) => setOrgCode(e.target.value)} />
            </div>
            <div className="field">
              <label>Class Code</label>
              <input value={classCode} onChange={(e) => setClassCode(e.target.value)} />
            </div>
          </div>

          <div className="notice">
            Instructor/Admin accounts require <b>@fullsail.edu</b> for Milestone 2 (domain authorization).
          </div>

          <div className="btns">
            <button className="btn btnPrimary" onClick={async () => {
              setErr("");
              try {
                const data = await api("/api/auth/register", {
                  method: "POST",
                  body: { email, password, role, fullName, studentId, orgCode, classCode }
                });

                saveAuth(data.token, data.user);

                // Extra safety: also join class after register (backend also tries)
                if (String(role).toLowerCase() === "student") {
                  try {
                    await api("/api/classes/join", { method: "POST", token: data.token, body: { orgCode, classCode } });
                  } catch { /* ignore */ }
                }

                nav("/monitor");
              } catch (e) {
                setErr(e.message);
              }
            }}>
              Create
            </button>

            <Link className="btn btnGhost" to="/login">I already have an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= MONITOR ========= */
function MonitorHome({ token, role }) {
  const r = String(role || "").toLowerCase();
  const isStudent = r === "student";
  const isInstructor = r === "instructor";
  const isAdmin = r === "admin";

  return (
    <>
      {isStudent && <StudentDashboard token={token} />}
      {(isInstructor || isAdmin) && <InstructorDashboard token={token} role={role} />}
    </>
  );
}

function StudentDashboard({ token }) {
  const [me, setMe] = useState(null);
  const [classes, setClasses] = useState([]);
  const [pendingMsg, setPendingMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const meRes = await api("/api/me", { token });
      setMe(meRes.me);

      const clsRes = await api("/api/classes/my", { token });
      setClasses(clsRes.classes || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  const hasNfc = !!me?.nfc_uid;
  const joined = classes.length > 0;
  const classId = joined ? classes[0].id : null;

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="kicker">STUDENT</div>
          <div className="pageTitle">My Attendance</div>
          <div className="pageSub">
            {hasNfc
              ? "NFC is linked. Tap-to-check-in is available when your device is online."
              : "No NFC linked. If you don’t have your ID, use Request Check-In for instructor approval."
            }
          </div>
        </div>
        <span className="badge"><span className="dot" /> Active</span>
      </div>

      {err && <div className="error"><b>Error:</b> {err}</div>}

      <div className="card big">
        <div className="cardInner">
          <div className="cardTop">
            <div>
              <div className="cardTitle">Today’s Status</div>
              <div className="cardSub">
                {joined ? `Joined: ${classes[0].org_code} ${classes[0].class_code}` : "No class joined yet"}
              </div>
            </div>
            <span className="badge soft"><span className="dot" /> Pending</span>
          </div>

          {!joined && (
            <div className="notice">
              You’re not enrolled yet. Register as Student with Org <b>FULLSAIL</b> and Class <b>COS349-L</b>.
            </div>
          )}

          <div className="btnRow">
            <button className="btn btnPrimary" disabled title="Use hardware tap when ESP32 + API is running">
              Tap to Check In (hardware)
            </button>

            {/* IMPORTANT: only show Request if NO NFC linked */}
            {!hasNfc && (
              <button className="btn" onClick={async () => {
                setPendingMsg("");
                setErr("");
                try {
                  if (!classId) throw new Error("Join a class first (COS349-L).");
                  const res = await api("/api/attendance/request", {
                    method: "POST",
                    token,
                    body: { classId, reason: "No physical ID available" }
                  });
                  setPendingMsg(`Request sent (ID ${res.requestId}). Waiting for instructor approval.`);
                } catch (e) {
                  setErr(e.message);
                }
              }}>
                Request Check-In
              </button>
            )}
          </div>

          {pendingMsg && <div className="notice">{pendingMsg}</div>}

          {!hasNfc && (
            <div className="tip">
              Next step: go to <b>Settings</b> and link your NFC UID (or paste it after reading it from Serial).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InstructorDashboard({ token, role }) {
  const [classes, setClasses] = useState([]);
  const [roster, setRoster] = useState([]);
  const [pending, setPending] = useState([]);
  const [err, setErr] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [query, setQuery] = useState("");

  async function load(cidOverride) {
    setErr("");
    try {
      const cls = await api("/api/classes/my", { token });
      const list = cls.classes || [];
      setClasses(list);

      const cid = cidOverride || selectedClassId || (list[0]?.id ?? null);
      setSelectedClassId(cid);

      if (cid) {
        const r = await api(`/api/roster/${cid}`, { token });
        setRoster(r.students || []);
      } else {
        setRoster([]);
      }

      const p = await api("/api/attendance/pending", { token });
      setPending(p.pending || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  const cid = selectedClassId;
  const filteredRoster = roster.filter(s => {
    const t = (s.full_name || s.email || "").toLowerCase();
    const id = (s.student_id || "").toLowerCase();
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return t.includes(q) || id.includes(q);
  });

  const verifiedCount = roster.filter(s => !!s.nfc_uid).length;
  const total = roster.length;
  const rate = total ? Math.round((verifiedCount / total) * 100) : 0;

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="kicker">{String(role || "INSTRUCTOR").toUpperCase()}</div>
          <div className="pageTitle">Class Monitor</div>
          <div className="pageSub">Monitor and manage class attendance (approvals + roster + manual override).</div>
        </div>
        <span className="badge"><span className="dot" /> Live</span>
      </div>

      {err && <div className="error"><b>Error:</b> {err}</div>}

      <div className="pillRow">
        {classes.map(c => (
          <button
            key={c.id}
            className={`pill ${cid === c.id ? "pillActive" : ""}`}
            onClick={() => load(c.id)}
          >
            {c.org_code} {c.class_code}
          </button>
        ))}
      </div>

      <div className="statsRow">
        <div className="statCard">
          <div className="statNum">{verifiedCount}/{total || 0}</div>
          <div className="statLabel">Students Verified</div>
        </div>
        <div className="statCard">
          <div className="statNum">{rate}%</div>
          <div className="statLabel">Verification Rate</div>
        </div>
        <div className="statCard">
          <div className="statNum">{pending.length}</div>
          <div className="statLabel">Pending</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card cardHover">
          <div className="cardInner">
            <div className="cardTop">
              <div>
                <div className="cardTitle">Students Awaiting Approval</div>
                <div className="cardSub">Students checked in without a physical ID (manual approval)</div>
              </div>
              <span className="badge soft"><span className="dot" /> {pending.length} Pending</span>
            </div>

            <div className="list">
              {pending.length === 0 && <div className="empty">No pending approvals.</div>}

              {pending.map(p => (
                <div key={p.id} className="rowItem">
                  <div className="rowLeft">
                    <div className="avatar">{initials(p.full_name || p.email)}</div>
                    <div>
                      <div className="rowTitle">{p.full_name || p.email}</div>
                      <div className="rowMeta">{p.org_code} {p.class_code} • {p.student_id || "No Student ID"}</div>
                      <div className="rowMeta faint">Reason: {p.reason || "—"}</div>
                    </div>
                  </div>
                  <div className="rowRight">
                    <button className="btn" onClick={async () => {
                      await api("/api/attendance/review", {
                        method: "POST",
                        token,
                        body: { requestId: p.id, decision: "APPROVE", note: "Approved (Milestone 2)" }
                      });
                      load(cid);
                    }}>Approve</button>

                    <button className="btn btnGhost" onClick={async () => {
                      await api("/api/attendance/review", {
                        method: "POST",
                        token,
                        body: { requestId: p.id, decision: "REJECT", note: "Rejected (Milestone 2)" }
                      });
                      load(cid);
                    }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card cardHover">
          <div className="cardInner">
            <div className="cardTop">
              <div>
                <div className="cardTitle">Student List</div>
                <div className="cardSub">Search by name or student ID, then mark present manually.</div>
              </div>
              <span className="badge soft">{filteredRoster.length} shown</span>
            </div>

            <div className="field compact">
              <label>Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or ID…"
              />
            </div>

            <div className="list">
              {filteredRoster.length === 0 && <div className="empty">No students enrolled yet.</div>}

              {filteredRoster.map(s => (
                <div key={s.id} className="rowItem">
                  <div className="rowLeft">
                    <div className="avatar">{initials(s.full_name || s.email)}</div>
                    <div>
                      <div className="rowTitle">{s.full_name || s.email}</div>
                      <div className="rowMeta">{s.student_id || "No Student ID"} • NFC: {s.nfc_uid ? "Linked" : "Not linked"}</div>
                    </div>
                  </div>

                  <div className="rowRight">
                    <button className="btn btnPrimary" onClick={async () => {
                      if (!cid) return;
                      await api("/api/attendance/manual", {
                        method: "POST",
                        token,
                        body: { classId: cid, userId: s.id, status: "VERIFIED", note: "Manual check-in (instructor override)" }
                      });
                      load(cid);
                    }}>
                      Mark Present
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="tip">
              Milestone 2: manual override + approvals demonstrate instructor/admin actions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= DATA / CONFIG / SETTINGS / SYSTEM ========= */
function DataHome({ role }) {
  const r = String(role || "").toLowerCase();
  const isStudent = r === "student";

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="kicker">DATA</div>
          <div className="pageTitle">{isStudent ? "Attendance Data" : "Verified Users"}</div>
          <div className="pageSub">{isStudent ? "Your attendance data view (Milestone scope)" : "View participants and module scope (Milestone 2)"}</div>
        </div>
      </div>

      <div className="card cardHover">
        <div className="cardInner">
          <div className="pillRow">
            <span className="pill pillActive">Class Attendance</span>
            <span className="pill pillDisabled">Event Check-In</span>
            <span className="pill pillDisabled">Access Control</span>
            <span className="pill pillDisabled">Smart Automation</span>
          </div>

          <div className="tip" style={{ marginTop: 12 }}>
            Milestone 2 deliverable: Attendance module is functional; other modules are locked but visible for full-scope planning.
          </div>
        </div>
      </div>
    </div>
  );
}

function Config() {
  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="kicker">BEHAVIOR RULES</div>
          <div className="pageTitle">Task Configuration</div>
          <div className="pageSub">Configure tap devices and verification rules (UI-first)</div>
        </div>
      </div>

      <div className="card cardHover">
        <div className="cardInner">
          <div className="cardTop">
            <div>
              <div className="cardTitle">Active Module</div>
              <div className="cardSub">Class Attendance is enabled for Milestone 2</div>
            </div>
            <span className="badge"><span className="dot" /> Active</span>
          </div>

          <div className="pillRow" style={{ marginTop: 12 }}>
            <span className="pill pillActive">Class Attendance</span>
            <span className="pill pillDisabled">Event Check-In</span>
            <span className="pill pillDisabled">Access Control</span>
            <span className="pill pillDisabled">Automation</span>
          </div>

          <div className="tip" style={{ marginTop: 14 }}>
            Roles enforced: Students can’t access System; Instructors/Admins can approve requests + manual override.
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({ token, user, saveAuth }) {
  const [nfc, setNfc] = useState(user?.nfc_uid || "");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  const role = String(user?.role || "").toLowerCase();
  const isStudent = role === "student";

  async function saveNfc() {
    setErr("");
    setStatus("Saving…");
    try {
      const data = await api("/api/profile/nfc", { method: "POST", token, body: { nfc_uid: nfc } });
      saveAuth(localStorage.getItem("tp_token") || token, data.user);
      setStatus("Saved");
      setTimeout(() => setStatus(""), 1400);
    } catch (e) {
      setStatus("");
      setErr(e.message);
    }
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="kicker">PROFILE</div>
          <div className="pageTitle">Settings</div>
          <div className="pageSub">Link your NFC tag and manage your attendance profile.</div>
        </div>
        {status ? <span className="badge"><span className="dot" /> {status}</span> : null}
      </div>

      {err && <div className="error"><b>Error:</b> {err}</div>}

      <div className="card cardHover">
        <div className="cardInner">
          {!isStudent && (
            <div className="notice">
              Instructor/Admin settings expand in later milestones. For Milestone 2, NFC linking is student-focused.
            </div>
          )}

          <div className="field">
            <label>NFC UID</label>
            <input
              value={nfc}
              onChange={(e) => setNfc(e.target.value)}
              placeholder="Paste UID from ESP32 Serial Monitor (or manual for demo)"
            />
            <div className="rowMeta faint" style={{ marginTop: 8 }}>
              When you tap a tag, copy the UID from Serial logs and paste it here to link.
            </div>
          </div>

          <div className="btnRow">
            <button className="btn btnPrimary" onClick={saveNfc} disabled={!nfc.trim()}>
              Save NFC UID
            </button>
          </div>

          <div className="tip">
            Milestone 2 behavior: students with NO NFC UID can request manual approval.
          </div>
        </div>
      </div>
    </div>
  );
}

function System({ token, role }) {
  const r = String(role || "").toLowerCase();
  const isAdmin = r === "admin";
  const isInstructor = r === "instructor";

  const [health, setHealth] = useState(null);
  const [devices, setDevices] = useState([]);
  const [pending, setPending] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const h = await api("/api/health");
      setHealth(h);

      const d = await api("/api/devices");
      setDevices(d.rows || []);

      const p = await api("/api/attendance/pending", { token });
      setPending(p.pending || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="kicker">PLATFORM STATUS</div>
          <div className="pageTitle">System Overview</div>
          <div className="pageSub">
            {isAdmin
              ? "Admin view: backend health, connected devices, capability status."
              : "Instructor view: backend health + approvals + devices (limited)."
            }
          </div>
        </div>
        <span className="badge"><span className="dot" /> Live</span>
      </div>

      {err && <div className="error"><b>Error:</b> {err}</div>}

      <div className="grid2">
        <div className="card cardHover">
          <div className="cardInner">
            <div className="cardTop">
              <div>
                <div className="cardTitle">API Health</div>
                <div className="cardSub">Backend status</div>
              </div>
            </div>
            <div className="monoBox">
              {health ? JSON.stringify(health) : "Loading…"}
            </div>
          </div>
        </div>

        <div className="card cardHover">
          <div className="cardInner">
            <div className="cardTop">
              <div>
                <div className="cardTitle">Approvals Queue</div>
                <div className="cardSub">Attendance operations</div>
              </div>
              <span className="badge soft">{pending.length} pending</span>
            </div>
            <div className="tip">
              Instructor access is scoped to attendance operations (no admin-only controls).
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="statsRow" style={{ marginTop: 14 }}>
          <div className="statCard">
            <div className="statNum">1</div>
            <div className="statLabel">Active Task Type</div>
          </div>
          <div className="statCard">
            <div className="statNum">3</div>
            <div className="statLabel">Locked Modules</div>
          </div>
          <div className="statCard">
            <div className="statNum">{devices.length}</div>
            <div className="statLabel">Connected Devices</div>
          </div>
        </div>
      )}

      <div className="card cardHover" style={{ marginTop: 14 }}>
        <div className="cardInner">
          <div className="cardTop">
            <div>
              <div className="cardTitle">Connected NFC Devices</div>
              <div className="cardSub">Updated by /api/tap</div>
            </div>
          </div>

          <div className="list">
            {devices.length === 0 && <div className="empty">No devices yet. (This fills in once ESP32 hits /api/tap.)</div>}
            {devices.map(d => (
              <div key={d.id} className="rowItem">
                <div className="rowLeft">
                  <div className="avatar">📶</div>
                  <div>
                    <div className="rowTitle">{d.name || d.device_id}</div>
                    <div className="rowMeta">{d.current_mode || "ATTENDANCE"} • last seen {d.last_seen || "never"}</div>
                  </div>
                </div>
                <div className="rowRight">
                  <span className="badge"><span className="dot" /> {d.last_seen ? "Online" : "Standby"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="tip">
            This page is role-protected: Students cannot access it.
          </div>
        </div>
      </div>
    </div>
  );
}
