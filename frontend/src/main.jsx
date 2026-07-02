import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Compass,
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
function HotspotMap({ hotspots }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);

  React.useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current) return;
      if (mapInstanceRef.current) return;

      const validHotspot = hotspots.find(h => h.centroid_lat && h.centroid_lng);
      const centerLat = validHotspot ? validHotspot.centroid_lat : 28.6139;
      const centerLng = validHotspot ? validHotspot.centroid_lng : 77.2090;

      const map = window.L.map(mapRef.current).setView([centerLat, centerLng], 12);
      mapInstanceRef.current = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      updateMarkers();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (window.L && mapInstanceRef.current) {
      updateMarkers();
    }
  }, [hotspots]);

  function updateMarkers() {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const PRIORITY_COLOR = {
      low: '#2e7d32',
      medium: '#fbc02d',
      high: '#d32f2f',
      critical: '#c2185b'
    };

    hotspots.forEach(hotspot => {
      const { place, category, count, centroid_lat, centroid_lng, priority } = hotspot;
      if (centroid_lat && centroid_lng) {
        const color = PRIORITY_COLOR[priority] || '#fbc02d';
        const marker = window.L.circleMarker([centroid_lat, centroid_lng], {
          radius: Math.min(24, 7 + count * 2.5),
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.65
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 13px; padding: 4px;">
            <strong style="font-size: 14px; color: #1f3431;">${place}</strong><br/>
            <span style="color: #697875; text-transform: capitalize;">Issue: ${category.replace('_', ' ')}</span><br/>
            <span style="font-weight: 750; color: ${color}; font-size: 12.5px;">Count: ${count} complaints</span>
          </div>
        `);

        markersRef.current.push(marker);
      }
    });

    if (markersRef.current.length > 0) {
      const group = new window.L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '290px', 
        borderRadius: '8px', 
        border: '1px solid #cbd8d5',
        marginTop: '10px'
      }} 
    />
  );
}

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
  const [question, setQuestion] = useState('Which places had the most water complaints this month?');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState({
    text: 'Water pipe is leaking near the bus stop and flooding the lane.',
    place: 'Metro Gate 12',
    state: 'Delhi',
    lat: '28.6141',
    lng: '77.2092',
    voice_transcript: '',
  });

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'success' | 'error' | 'manually_edited'
  const [locationError, setLocationError] = useState('');
  const [hotspotViewMode, setHotspotViewMode] = useState('list'); // 'list' | 'map'

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation unsupported.');
      return;
    }

    setDetectingLocation(true);
    setLocationStatus('idle');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let detectedPlace = 'Unassigned';
        let detectedState = '';

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            detectedState = address.state || address.region || address.state_district || '';
            detectedPlace =
              address.suburb ||
              address.neighbourhood ||
              address.residential ||
              address.city_district ||
              address.village ||
              address.subdistrict ||
              address.county ||
              address.municipality ||
              'Unassigned';
          }
        } catch (e) {
          console.error("Failed reverse geocoding:", e);
        }

        setForm((prev) => ({
          ...prev,
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
          place: detectedPlace !== 'Unassigned' ? detectedPlace : prev.place,
          state: detectedState !== '' ? detectedState : prev.state,
        }));
        setLocationStatus('success');
        setDetectingLocation(false);
      },
      (error) => {
        let msg = 'Failed to get location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permission denied.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Position unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Timeout.';
        }
        setLocationStatus('error');
        setLocationError(msg);
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

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
              Place
              <input value={form.place || ''} onChange={(event) => setForm({ ...form, place: event.target.value })} />
            </label>
            <label>
              State
              <input value={form.state || ''} onChange={(event) => setForm({ ...form, state: event.target.value })} />
            </label>
          </div>
          <label>
            Notify phone
            <input value={session.user.phone} readOnly />
          </label>
          <div className="location-row-container">
            <div className="location-header">
              <span className="location-title">Coordinates</span>
              <button
                type="button"
                className={`location-detect-btn ${detectingLocation ? 'loading' : ''} ${locationStatus === 'success' ? 'success' : ''}`}
                onClick={detectLocation}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <RefreshCw className="spin" size={14} />
                ) : (
                  <Compass size={14} />
                )}
                {detectingLocation ? 'Accessing GPS...' : locationStatus === 'success' ? 'GPS Locked' : 'Use Device GPS'}
              </button>
            </div>
            
            <div className="split">
              <label>
                Latitude
                <input
                  value={form.lat}
                  onChange={(event) => {
                    setForm({ ...form, lat: event.target.value });
                    setLocationStatus('manually_edited');
                  }}
                />
              </label>
              <label>
                Longitude
                <input
                  value={form.lng}
                  onChange={(event) => {
                    setForm({ ...form, lng: event.target.value });
                    setLocationStatus('manually_edited');
                  }}
                />
              </label>
            </div>

            {locationStatus === 'success' && (
              <div className="location-status-badge success-badge">
                <Compass size={14} className="pulse-icon" />
                <span>Device GPS active and location locked.</span>
              </div>
            )}
            {locationStatus === 'manually_edited' && (
              <div className="location-status-badge info-badge">
                <span>Coordinates modified manually.</span>
                <button
                  type="button"
                  className="location-text-btn"
                  onClick={() => {
                    setForm({ ...form, lat: '28.6141', lng: '77.2092', place: 'Metro Gate 12', state: 'Delhi' });
                    setLocationStatus('idle');
                  }}
                >
                  Reset Default
                </button>
              </div>
            )}
            {locationStatus === 'error' && (
              <div className="location-status-badge error-badge">
                <span>⚠️ {locationError}</span>
                <button type="button" className="location-text-btn" onClick={detectLocation}>Retry</button>
              </div>
            )}
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
          <div className="panelTitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} />
              <h2>Hotspots</h2>
            </div>
            <div className="map-view-toggle">
              <button 
                type="button" 
                className={hotspotViewMode === 'list' ? 'active' : ''} 
                onClick={() => setHotspotViewMode('list')}
              >
                List
              </button>
              <button 
                type="button" 
                className={hotspotViewMode === 'map' ? 'active' : ''} 
                onClick={() => setHotspotViewMode('map')}
              >
                Map
              </button>
            </div>
          </div>
          {hotspotViewMode === 'list' ? (
            <div className="hotspotList">
              {hotspots.length === 0 && <p className="muted">No hotspots yet.</p>}
              {hotspots.map((hotspot) => (
                <article className="hotspot" key={`${hotspot.place}-${hotspot.category}`}>
                  <div>
                    <strong>{hotspot.place}</strong>
                    <span>{hotspot.category.replace('_', ' ')}</span>
                  </div>
                  <div className={`pill ${hotspot.priority}`}>{hotspot.priority}</div>
                  <b>{hotspot.count}</b>
                </article>
              ))}
            </div>
          ) : (
            <HotspotMap hotspots={hotspots} />
          )}
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
                  {complaint.place}{complaint.state ? `, ${complaint.state}` : ''} / {complaint.classification.department} / {complaint.reporter_username || 'citizen'}
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
