import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  UserPlus,
  Waves,
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const AUTH_STORAGE_KEY = 'civicpulse-session';

function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [complaints, setComplaints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [question, setQuestion] = useState('Which wards had the most water complaints this month?');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState({
    text: 'Water pipe is leaking near the bus stop and flooding the lane.',
    ward: 'Ward 12',
    lat: '28.6141',
    lng: '77.2092',
    voice_transcript: '',
  });

  const metrics = useMemo(() => {
    const active = complaints.filter((item) => !item.duplicate_of);
    const critical = active.filter((item) => ['high', 'critical'].includes(item.classification.priority)).length;
    const resolved = complaints.filter((item) => item.status === 'resolved').length;
    return { total: complaints.length, active: active.length, critical, resolved };
  }, [complaints]);

  async function refresh() {
    if (!session?.token) return;
    try {
      const [complaintsRes, hotspotsRes] = await Promise.all([
        fetch(`${API_BASE}/complaints`, { headers: authHeaders(session.token) }),
        fetch(`${API_BASE}/hotspots`, { headers: authHeaders(session.token) }),
      ]);
      if (!complaintsRes.ok || !hotspotsRes.ok) {
        throw new Error('API responded with an error.');
      }
      setComplaints(await complaintsRes.json());
      setHotspots(await hotspotsRes.json());
      setNotice(null);
    } catch (error) {
      setNotice({
        type: 'error',
        text: `Backend is not reachable at ${API_BASE}. Start the FastAPI server, then refresh.`,
      });
      throw error;
    }
  }

  useEffect(() => {
    if (!session?.token) return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    refresh().catch(console.error);
  }, [session?.token]);

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const body =
        authMode === 'register'
          ? authForm
          : { username: authForm.username, password: authForm.password };
      const res = await fetch(`${API_BASE}/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Authentication failed.');
      }
      const data = await res.json();
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      setSession(data);
      setNotice({ type: 'success', text: `Welcome, ${data.user.full_name}.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Unable to authenticate.' });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    setComplaints([]);
    setHotspots([]);
    setAnalytics(null);
    setNotice(null);
  }

  async function submitComplaint(event) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (String(value).trim() !== '') payload.append(key, value);
      });
      const fileInput = event.currentTarget.elements.namedItem('photo');
      const file = fileInput?.files?.[0];
      if (file) payload.append('photo', file);

      const res = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: authHeaders(session.token),
        body: payload,
      });
      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Complaint could not be submitted.');
      }
      await refresh();
      setNotice({ type: 'success', text: 'Complaint classified and routed.' });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || `Unable to submit complaint to ${API_BASE}.`,
      });
    } finally {
      setLoading(false);
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/analytics/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session.token) },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Analytics request failed.');
      }
      setAnalytics(await res.json());
    } catch (error) {
      setNotice({ type: 'error', text: error.message || `Unable to reach ${API_BASE}.` });
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        form={authForm}
        setForm={setAuthForm}
        loading={loading}
        notice={notice}
        onSubmit={handleAuth}
      />
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI grievance redressal</p>
          <h1>CivicPulse</h1>
        </div>
        <div className="topActions">
          <div className="accountBadge">
            <ShieldCheck size={17} />
            <span>{session.user.username}</span>
          </div>
          <button className="iconButton" onClick={refresh} title="Refresh dashboard">
            <RefreshCw size={18} />
          </button>
          <button className="iconButton" onClick={logout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="metrics">
        <Metric icon={<MessageSquare />} label="Reports" value={metrics.total} />
        <Metric icon={<Activity />} label="Active cases" value={metrics.active} />
        <Metric icon={<AlertTriangle />} label="High priority" value={metrics.critical} />
        <Metric icon={<CheckCircle2 />} label="Resolved" value={metrics.resolved} />
      </section>
      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      <section className="workspace">
        <form className="panel intake" onSubmit={submitComplaint}>
          <div className="panelTitle">
            <Send size={18} />
            <h2>Citizen Intake</h2>
          </div>
          <label>
            Complaint
            <textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} />
          </label>
          <div className="split">
            <label>
              Ward
              <input value={form.ward} onChange={(event) => setForm({ ...form, ward: event.target.value })} />
            </label>
            <label>
              Notify phone
              <input value={session.user.phone} readOnly />
            </label>
          </div>
          <div className="split">
            <label>
              Latitude
              <input value={form.lat} onChange={(event) => setForm({ ...form, lat: event.target.value })} />
            </label>
            <label>
              Longitude
              <input value={form.lng} onChange={(event) => setForm({ ...form, lng: event.target.value })} />
            </label>
          </div>
          <label>
            Voice transcript
            <input
              value={form.voice_transcript}
              onChange={(event) => setForm({ ...form, voice_transcript: event.target.value })}
              placeholder="Optional speech-to-text transcript"
            />
          </label>
          <label className="fileInput">
            <Upload size={18} />
            <span>Attach photo</span>
            <input name="photo" type="file" accept="image/*" />
          </label>
          <button className="primary" disabled={loading}>
            <Send size={18} />
            Submit and classify
          </button>
        </form>

        <section className="panel">
          <div className="panelTitle">
            <MapPin size={18} />
            <h2>Hotspots</h2>
          </div>
          <div className="hotspotList">
            {hotspots.length === 0 && <p className="muted">No hotspots yet.</p>}
            {hotspots.map((hotspot) => (
              <article className="hotspot" key={`${hotspot.ward}-${hotspot.category}`}>
                <div>
                  <strong>{hotspot.ward}</strong>
                  <span>{hotspot.category.replace('_', ' ')}</span>
                </div>
                <div className={`pill ${hotspot.priority}`}>{hotspot.priority}</div>
                <b>{hotspot.count}</b>
              </article>
            ))}
          </div>
        </section>

        <section className="panel analytics">
          <div className="panelTitle">
            <BarChart3 size={18} />
            <h2>Conversational Analytics</h2>
          </div>
          <form onSubmit={askQuestion} className="ask">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} />
            <button className="iconButton" disabled={loading} title="Ask analytics question">
              <Send size={18} />
            </button>
          </form>
          {analytics && (
            <div className="answer">
              <p>{analytics.answer}</p>
              <small>{analytics.source}</small>
              {analytics.rows.length > 0 && (
                <table>
                  <tbody>
                    {analytics.rows.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex}>{String(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </section>

      <section className="panel queue">
        <div className="panelTitle">
          <Waves size={18} />
          <h2>Live Complaint Queue</h2>
        </div>
        <div className="table">
          {complaints.map((complaint) => (
            <article className="row" key={complaint.id}>
              <div>
                <strong>{complaint.classification.summary}</strong>
                <span>
                  {complaint.ward} / {complaint.classification.department} / {complaint.reporter_username || 'citizen'}
                </span>
              </div>
              <span>{complaint.classification.category.replace('_', ' ')}</span>
              <span className={`pill ${complaint.classification.priority}`}>{complaint.classification.priority}</span>
              <span>{complaint.duplicate_of ? `Duplicate of ${complaint.duplicate_of}` : complaint.status}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AuthScreen({ mode, setMode, form, setForm, loading, notice, onSubmit }) {
  return (
    <main className="authShell">
      <section className="authPanel">
        <div>
          <p className="eyebrow">CivicPulse account</p>
          <h1>CivicPulse</h1>
        </div>
        <div className="modeSwitch" role="tablist" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            <ShieldCheck size={17} />
            Login
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            <UserPlus size={17} />
            Register
          </button>
        </div>
        {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
        <form onSubmit={onSubmit}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              autoComplete="username"
              required
            />
          </label>
          {mode === 'register' && (
            <>
              <label>
                Full name
                <input
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Phone number
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  autoComplete="tel"
                  required
                />
              </label>
            </>
          )}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />
          </label>
          <button className="primary" disabled={loading}>
            {mode === 'register' ? <UserPlus size={18} /> : <ShieldCheck size={18} />}
            {mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric">
      {React.cloneElement(icon, { size: 20 })}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

async function readError(response) {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((item) => item.msg).join(' ');
    return data.message || JSON.stringify(data);
  } catch {
    return response.statusText;
  }
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

createRoot(document.getElementById('root')).render(<App />);
