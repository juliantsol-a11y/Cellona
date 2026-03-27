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

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [userSearch, setUserSearch] = useState("");

  // ✅ FIXED ADMIN CHECK
  const isAdmin = useMemo(() => {
    return profile?.role === "admin" || session?.user?.email === ADMIN_EMAIL;
  }, [profile, session]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setMessage("");

      if (!session) {
        setProfile(null);
        setHistory([]);
        setAdminRecords([]);
        setUsers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!session?.user) return;

      await ensureProfile(session.user);
      await loadProfile(session.user.id);
      await loadMyAttendance(session.user.id);
    };

    loadUserData();
  }, [session]);

  useEffect(() => {
    if (session?.user && isAdmin) {
      loadAllAttendance();
      loadUsers();
    }
  }, [session, isAdmin]);

  const ensureProfile = async (user) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) {
      const role = user.email === ADMIN_EMAIL ? "admin" : "user";

      await supabase.from("profiles").insert([
        {
          id: user.id,
          email: user.email,
          role: role,
        },
      ]);
    }
  };

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    console.log("PROFILE DATA:", data); // ✅ DEBUG

    if (!error) {
      setProfile(data);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Registered successfully!");
    setEmail("");
    setPassword("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setEmail("");
    setPassword("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const loadMyAttendance = async (userId) => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    setHistory(data || []);
  };

  const loadAllAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .order("date", { ascending: false });

    setAdminRecords(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
  };

  const getTodayDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().split("T")[0];
  };

  const handleTimeIn = async () => {
    const today = getTodayDate();

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .maybeSingle();

    if (existing?.time_in) {
      setMessage("Already timed in.");
      return;
    }

    await supabase.from("attendance").insert([
      {
        user_id: session.user.id,
        date: today,
        time_in: new Date().toISOString(),
      },
    ]);

    loadMyAttendance(session.user.id);
  };

  const handleTimeOut = async () => {
    const today = getTodayDate();

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .maybeSingle();

    if (!existing) return;

    await supabase
      .from("attendance")
      .update({ time_out: new Date().toISOString() })
      .eq("id", existing.id);

    loadMyAttendance(session.user.id);
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  if (loading) {
    return <div className="center-box">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="auth-page">
        <div className="card">
          <h1>Attendance Tracking System</h1>

          <form onSubmit={authMode === "login" ? handleLogin : handleRegister}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">
              {authMode === "login" ? "Login" : "Register"}
            </button>
          </form>

          <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
            Switch to {authMode === "login" ? "Register" : "Login"}
          </button>

          {message && <p>{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Attendance Tracking System</h1>

      {/* ✅ FIXED DISPLAY */}
      <p>
        Logged in as: {session.user.email} (
        {isAdmin ? "admin" : profile?.role || "user"})
      </p>

      <button onClick={handleLogout}>Logout</button>

      <h2>User Panel</h2>
      <button onClick={handleTimeIn}>Time In</button>
      <button onClick={handleTimeOut}>Time Out</button>

      <h2>My Attendance History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time In</th>
            <th>Time Out</th>
          </tr>
        </thead>
        <tbody>
          {history.length > 0 ? (
            history.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{formatDateTime(item.time_in)}</td>
                <td>{formatDateTime(item.time_out)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">No records</td>
            </tr>
          )}
        </tbody>
      </table>

      {isAdmin && (
        <>
          <h2>Admin Panel</h2>

          <h3>All Attendance</h3>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
              </tr>
            </thead>
            <tbody>
              {adminRecords.map((r) => (
                <tr key={r.id}>
                  <td>{r.user_id}</td>
                  <td>{r.date}</td>
                  <td>{formatDateTime(r.time_in)}</td>
                  <td>{formatDateTime(r.time_out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}