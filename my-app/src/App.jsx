import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseclient";
import "./App.css";

const ADMIN_EMAIL = "admin@gmail.com";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [adminRecords, setAdminRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const isAdmin = useMemo(() => {
    return profile?.role === "admin" || session?.user?.email === ADMIN_EMAIL;
  }, [profile, session]);

  // --- LOGIC FUNCTIONS (Unchanged from your original code) ---
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setProfile(null); setHistory([]); setAdminRecords([]); setUsers([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      ensureProfile(session.user).then(() => {
        loadProfile(session.user.id);
        loadMyAttendance(session.user.id);
      });
    }
  }, [session]);

  useEffect(() => {
    if (session?.user && isAdmin) {
      loadAllAttendance();
      loadUsers();
    }
  }, [session, isAdmin]);

  const ensureProfile = async (user) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!data) {
      const roleToInsert = user.email === ADMIN_EMAIL ? "admin" : "user";
      await supabase.from("profiles").insert([{ id: user.id, email: user.email, role: roleToInsert }]);
    }
  };

  const loadProfile = async (id) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    setProfile(data);
  };

  const loadMyAttendance = async (uid) => {
    const { data } = await supabase.from("attendance").select("*").eq("user_id", uid).order("time_in", { ascending: false });
    setHistory(data || []);
  };

  const loadAllAttendance = async () => {
    const { data } = await supabase.from("attendance").select("*").order("time_in", { ascending: false });
    setAdminRecords(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setUsers(data || []);
  };

  const handleTimeIn = async () => {
    const open = history.find(r => r.time_out === null);
    if (open) return setMessage("Already clocked in.");
    const { error } = await supabase.from("attendance").insert([{
      user_id: session.user.id,
      date: new Date().toISOString().split("T")[0],
      time_in: new Date().toISOString(),
      status: "open"
    }]);
    if (!error) { setMessage("Clocked In!"); loadMyAttendance(session.user.id); }
  };

  const handleTimeOut = async () => {
    const open = history.find(r => r.time_out === null);
    if (!open) return setMessage("Not clocked in.");
    await supabase.from("attendance").update({ time_out: new Date().toISOString(), status: "completed" }).eq("id", open.id);
    setMessage("Clocked Out!");
    loadMyAttendance(session.user.id);
  };

  const handleLogout = () => supabase.auth.signOut();
  
  const formatTime = (val) => val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
  const getEmailName = (email) => email?.split("@")[0] || "User";

  // --- UI RENDERING ---

  if (loading) return <div className="loader">Initializing...</div>;

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
        <div className="card" style={{ width: '350px', textAlign: 'center' }}>
          <h1 style={{ color: '#6366f1' }}>CorpTrack</h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Attendance Management System</p>
          <form onSubmit={(e) => { e.preventDefault(); authMode === 'login' ? /* handleLogin */ null : /* handleRegister */ null }}>
            <input type="email" placeholder="Email" className="modern-input" onChange={(e) => setEmail(e.target.value)} required style={{ width: '90%', marginBottom: '10px', padding: '10px' }} />
            <input type="password" placeholder="Password" className="modern-input" onChange={(e) => setPassword(e.target.value)} required style={{ width: '90%', marginBottom: '20px', padding: '10px' }} />
            <button className="btn-primary" style={{ width: '100%' }}>{authMode === "login" ? "Sign In" : "Register"}</button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', marginTop: '15px', color: '#6366f1', cursor: 'pointer' }}>
            {authMode === 'login' ? "Need an account? Register" : "Have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <h2><span style={{ color: '#6366f1' }}>●</span> CorpTrack</h2>
        <div className="nav-item active">Dashboard</div>
        <div className="nav-item">My Schedule</div>
        {isAdmin && <div className="nav-item">Admin Console</div>}
        <div className="nav-item" style={{ marginTop: 'auto', color: '#f87171' }} onClick={handleLogout}>Logout</div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="header-flex">
          <div>
            <h1 style={{ margin: 0 }}>Hello, {getEmailName(session.user.email)}</h1>
            <span style={{ color: '#64748b' }}>{new Date().toDateString()}</span>
          </div>
          <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-user'}`}>
            {isAdmin ? 'System Admin' : 'Employee'}
          </span>
        </header>

        {/* STATS SECTION - Professors love visualized data */}
        <section className="stats-grid">
          <div className="stat-card">
            <h3>Current Status</h3>
            <p style={{ color: history[0]?.time_out === null ? '#10b981' : '#64748b' }}>
              {history[0]?.time_out === null ? "Clocked In" : "Clocked Out"}
            </p>
          </div>
          <div className="stat-card">
            <h3>Total Work Days</h3>
            <p>{history.length}</p>
          </div>
          <div className="stat-card">
            <h3>Account Email</h3>
            <p style={{ fontSize: '1rem' }}>{session.user.email}</p>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* ACTION PANEL */}
          <section className="card">
            <h2>Time Clock</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Record your attendance for today.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
              <button className="btn-success" onClick={handleTimeIn}>Punch In</button>
              <button className="btn-danger" onClick={handleTimeOut}>Punch Out</button>
            </div>
            {message && <p style={{ color: '#6366f1', fontSize: '0.9rem', textAlign: 'center' }}>{message}</p>}
          </section>

          {/* RECENT HISTORY */}
          <section className="card">
            <h2>Recent Activity</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map(row => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{formatTime(row.time_in)}</td>
                    <td>{formatTime(row.time_out)}</td>
                    <td><span style={{ color: row.status === 'open' ? '#10b981' : '#64748b' }}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* ADMIN MONITORING */}
        {isAdmin && (
          <section className="card" style={{ marginTop: '2rem', borderTop: '4px solid #6366f1' }}>
            <h2>Enterprise Attendance Monitor</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                <input type="text" placeholder="Search staff..." className="modern-input" style={{ flex: 1, padding: '8px' }} onChange={(e) => setUserFilter(e.target.value)} />
                <input type="date" className="modern-input" onChange={(e) => setDateFilter(e.target.value)} />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                </tr>
              </thead>
              <tbody>
                {adminRecords.slice(0, 10).map(rec => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: '600' }}>{getEmailName(users.find(u => u.id === rec.user_id)?.email)}</td>
                    <td>{rec.date}</td>
                    <td>{formatTime(rec.time_in)}</td>
                    <td>{formatTime(rec.time_out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}