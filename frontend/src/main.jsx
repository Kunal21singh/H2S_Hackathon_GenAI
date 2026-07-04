import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
  X,
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
        height: '600px', 
        borderRadius: '8px', 
        border: '1px solid #cbd8d5',
        marginTop: '10px'
      }} 
    />
  );
}

function ComplaintTimeline({ complaint }) {
  let events = [...(complaint.timeline || [])];
  
  const hasNew = events.some(e => e.status === 'new');
  if (!hasNew) {
    const fallbacks = [
      { status: 'new', timestamp: complaint.created_at, description: 'Complaint reported by citizen.', actor: complaint.reporter_username || 'citizen' },
      { status: 'routed', timestamp: complaint.created_at, description: `Complaint automatically routed to ${complaint.classification.department} department.`, actor: 'AI System' }
    ];
    events = [...fallbacks, ...events];
  }

  const hasResolved = events.some(e => e.status === 'resolved');
  if (complaint.status === 'resolved' && !hasResolved) {
    events.push({
      status: 'resolved',
      timestamp: complaint.completed_at || complaint.updated_at,
      description: 'Grievance resolved successfully.',
      actor: complaint.completed_by || 'Officer'
    });
  }

  return (
    <div className="timeline-container" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
      <h4 style={{ margin: '0 0 12px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📋 Status Timeline & History</span>
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '8px' }}>
        {events.map((evt, idx) => {
          const isLast = idx === events.length - 1;
          const statusColors = {
            new: '#3b82f6',
            routed: '#8b5cf6',
            in_progress: '#f59e0b',
            resolved: '#10b981'
          };
          const dotColor = statusColors[evt.status] || '#64748b';
          
          return (
            <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '14px',
                  bottom: '-16px',
                  width: '2px',
                  background: '#cbd5e1'
                }} />
              )}
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: dotColor,
                border: '3px solid #ffffff',
                boxShadow: '0 0 0 1px #cbd5e1',
                zIndex: 2,
                flexShrink: 0,
                marginTop: '3px'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', lineHeight: '1.2' }}>
                  {evt.description} 
                  {evt.actor && <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '0.78rem' }}> (by @{evt.actor})</span>}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {new Date(evt.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExecutiveMonitor({ user, complaints }) {
  const [selectedState, setSelectedState] = React.useState(null);

  const isPM = user.user_type === 'Prime Minister';
  
  if (isPM) {
    const stateStats = {};
    complaints.forEach((c) => {
      const stateName = c.state ? c.state.trim() : 'Unknown';
      if (!stateStats[stateName]) {
        stateStats[stateName] = { total: 0, active: 0, resolved: 0 };
      }
      stateStats[stateName].total += 1;
      if (c.status === 'resolved') {
        stateStats[stateName].resolved += 1;
      } else {
        stateStats[stateName].active += 1;
      }
    });

    const statesList = Object.entries(stateStats).map(([name, stats]) => ({
      name,
      ...stats,
      rate: stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : '0',
    })).sort((a, b) => b.total - a.total);

    let drillDownList = [];
    if (selectedState) {
      const deptStats = {};
      complaints.filter(c => (c.state ? c.state.trim() : 'Unknown') === selectedState).forEach((c) => {
        const dept = c.classification?.department || 'Unassigned';
        if (!deptStats[dept]) {
          deptStats[dept] = { total: 0, active: 0, resolved: 0 };
        }
        deptStats[dept].total += 1;
        if (c.status === 'resolved') {
          deptStats[dept].resolved += 1;
        } else {
          deptStats[dept].active += 1;
        }
      });
      drillDownList = Object.entries(deptStats).map(([name, stats]) => ({
        name,
        ...stats,
        rate: stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : '0',
      })).sort((a, b) => b.total - a.total);
    }

    return (
      <div className="panel executive-monitor" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
        <div className="panelTitle" style={{ marginBottom: '8px' }}>
          <Activity size={18} />
          <h2>National Executive Monitor (PM)</h2>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
          Select a state below to view department-level grievance performance.
        </p>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', minHeight: '180px', padding: '4px' }}>
          {statesList.length === 0 ? (
            <p className="muted" style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center' }}>No state data found.</p>
          ) : (
            statesList.map((st) => {
              const isActive = st.name === selectedState;
              const barColor = '#16a34a';
              
              return (
                <div 
                  key={st.name} 
                  onClick={() => setSelectedState(isActive ? null : st.name)}
                  className={`monitor-card ${isActive ? 'active' : ''}`}
                  style={{
                    border: isActive ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    background: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</span>
                    <span className="pill" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', padding: '2px 6px', fontWeight: 'bold' }}>{st.total} Total</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '1rem' }}>{st.active}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Active</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>{st.resolved}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Resolved</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '600' }}>
                      <span style={{ color: '#64748b' }}>Resolved Rate</span>
                      <span style={{ color: barColor }}>{st.rate}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${st.rate}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedState && (
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '0.9rem', margin: 0, color: '#1e3a8a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📍 {selectedState} Department Drill-Down</span>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setSelectedState(null)}
              >
                Clear Selection
              </button>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
              {drillDownList.map((dp) => {
                const barColor = '#16a34a';
                
                return (
                  <div 
                    key={dp.name}
                    className="monitor-card"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dp.name}</span>
                      <span className="pill" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', padding: '2px 5px', fontWeight: 'bold' }}>{dp.total} Total</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.9rem' }}>{dp.active}</span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Active</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.9rem' }}>{dp.resolved}</span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Resolved</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: '600' }}>
                        <span style={{ color: '#64748b' }}>Rate</span>
                        <span style={{ color: barColor }}>{dp.rate}%</span>
                      </div>
                      <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${dp.rate}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  } else {
    const userState = user.state || 'Unknown';
    const deptStats = {};
    complaints.forEach((c) => {
      const dept = c.classification?.department || 'Unassigned';
      if (!deptStats[dept]) {
        deptStats[dept] = { total: 0, active: 0, resolved: 0 };
      }
      deptStats[dept].total += 1;
      if (c.status === 'resolved') {
        deptStats[dept].resolved += 1;
      } else {
        deptStats[dept].active += 1;
      }
    });

    const deptsList = Object.entries(deptStats).map(([name, stats]) => ({
      name,
      ...stats,
      rate: stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : '0',
    })).sort((a, b) => b.total - a.total);

    return (
      <div className="panel executive-monitor" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
        <div className="panelTitle" style={{ marginBottom: '8px' }}>
          <Activity size={18} />
          <h2>State Executive Monitor ({userState})</h2>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
          Administrative performance monitoring for departments within <strong>{userState}</strong>.
        </p>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', minHeight: '260px', padding: '4px' }}>
          {deptsList.length === 0 ? (
            <p className="muted" style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center' }}>No department data found.</p>
          ) : (
            deptsList.map((dp) => {
              const barColor = '#16a34a';
              
              return (
                <div 
                  key={dp.name} 
                  className="monitor-card"
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    background: '#ffffff',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dp.name}</span>
                    <span className="pill" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', padding: '2px 6px', fontWeight: 'bold' }}>{dp.total} Total</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '1rem' }}>{dp.active}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Active</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>{dp.resolved}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Resolved</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '600' }}>
                      <span style={{ color: '#64748b' }}>Resolved Rate</span>
                      <span style={{ color: barColor }}>{dp.rate}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${dp.rate}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }
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
    user_type: 'Citizen',
    state: '',
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
  const [expandedComplaintId, setExpandedComplaintId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [commentingId, setCommentingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAnalyticsPopup, setShowAnalyticsPopup] = useState(false);
  const [liveQueueCollapsed, setLiveQueueCollapsed] = useState(false);
  const [archiveQueueCollapsed, setArchiveQueueCollapsed] = useState(false);

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'success' | 'error' | 'manually_edited'
  const [locationError, setLocationError] = useState('');

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

  const geocodeAddress = async (placeName, stateName) => {
    if (!placeName || placeName === 'Unassigned') return null;
    try {
      const query = [placeName, stateName].filter(Boolean).join(', ');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const parsedLat = parseFloat(lat).toFixed(6);
          const parsedLng = parseFloat(lon).toFixed(6);
          setForm((prev) => ({
            ...prev,
            lat: parsedLat,
            lng: parsedLng,
          }));
          if (locationStatus === 'error') {
            setLocationStatus('idle');
          }
          return { lat: parsedLat, lng: parsedLng };
        }
      }
    } catch (e) {
      console.error("Failed geocoding:", e);
    }
    return null;
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
      const [complaintsRes, hotspotsRes, notificationsRes] = await Promise.all([
        fetch(`${API_BASE}/complaints`, { headers: authHeaders(session.token) }),
        fetch(`${API_BASE}/hotspots`, { headers: authHeaders(session.token) }),
        fetch(`${API_BASE}/notifications`, { headers: authHeaders(session.token) }),
      ]);
      if (!complaintsRes.ok || !hotspotsRes.ok || !notificationsRes.ok) {
        throw new Error('API responded with an error.');
      }
      setComplaints(await complaintsRes.json());
      setHotspots(await hotspotsRes.json());
      setNotifications(await notificationsRes.json());
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
          : { username: authForm.username, password: authForm.password, user_type: authForm.user_type || 'Citizen' };
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
    const formElements = event.currentTarget.elements;
    setLoading(true);
    setNotice(null);
    try {
      let finalLat = form.lat;
      let finalLng = form.lng;

      if (locationStatus === 'idle' || locationStatus === 'error') {
        const result = await geocodeAddress(form.place, form.state);
        if (result) {
          finalLat = result.lat;
          finalLng = result.lng;
        }
      }

      const payload = new FormData();
      Object.entries({ ...form, lat: finalLat, lng: finalLng }).forEach(([key, value]) => {
        if (String(value).trim() !== '') payload.append(key, value);
      });
      const fileInput = formElements.namedItem('photo');
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

  async function resolveComplaint(event, complaintId) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const fileInput = formEl.elements.namedItem('resolution_photo');
    const file = fileInput?.files?.[0];
    if (!file) {
      setNotice({ type: 'error', text: 'Please select a photo proof first.' });
      return;
    }

    setResolvingId(complaintId);
    setNotice(null);

    try {
      const payload = new FormData();
      payload.append('resolution_photo', file);

      const res = await fetch(`${API_BASE}/complaints/${complaintId}/complete`, {
        method: 'POST',
        headers: authHeaders(session.token),
        body: payload,
      });

      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Could not mark complaint as completed.');
      }

      setNotice({ type: 'success', text: 'Complaint marked as completed with photo proof.' });
      await refresh();
      setExpandedComplaintId(null);
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Error resolving complaint.' });
    } finally {
      setResolvingId(null);
    }
  }

  async function addProgressComment(event, complaintId) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const inputEl = formEl.elements.namedItem('comment_text');
    const comment = inputEl.value;
    if (!comment.trim()) return;

    setCommentingId(complaintId);
    setNotice(null);

    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(session.token),
        },
        body: JSON.stringify({ comment }),
      });

      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Could not add progress comment.');
      }

      await refresh();
      formEl.reset();
      setNotice({ type: 'success', text: 'Progress update logged to timeline.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Failed to submit update comment.' });
    } finally {
      setCommentingId(null);
    }
  }

  async function markNotificationAsRead(id) {
    if (!session?.token) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'POST',
        headers: authHeaders(session.token),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
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
          
          <div className="notificationContainer" style={{ position: 'relative' }}>
            <button className={`iconButton ${notifications.filter(n => !n.read).length > 0 ? 'has-unread' : ''}`} onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
              <Bell size={18} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="notificationBadge">{notifications.filter(n => !n.read).length}</span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notificationDropdown">
                <div className="notificationDropdownHeader">
                  <h3>Notifications</h3>
                </div>
                <div className="notificationDropdownList">
                  {notifications.length === 0 ? (
                    <p className="noNotifications">No notifications yet</p>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`notificationItem ${n.read ? 'read' : 'unread'}`}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          setExpandedComplaintId(n.complaint_id);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="notificationHeader">
                          <strong>{n.title}</strong>
                          {!n.read && <span className="unreadDot" />}
                        </div>
                        <p>{n.message}</p>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
        {['Chief Minister', 'Prime Minister'].includes(session.user.user_type) ? (
          <ExecutiveMonitor user={session.user} complaints={complaints} />
        ) : (
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
                <input 
                  value={form.place || ''} 
                  onChange={(event) => setForm({ ...form, place: event.target.value })} 
                  onBlur={() => {
                    if (locationStatus === 'idle' || locationStatus === 'error') {
                      geocodeAddress(form.place, form.state);
                    }
                  }}
                />
              </label>
              <label>
                State
                <input 
                  value={form.state || ''} 
                  onChange={(event) => setForm({ ...form, state: event.target.value })} 
                  onBlur={() => {
                    if (locationStatus === 'idle' || locationStatus === 'error') {
                      geocodeAddress(form.place, form.state);
                    }
                  }}
                />
              </label>
            </div>
            <label>
              Notify phone
              <input value={session.user.phone} readOnly />
            </label>
            <div className="location-row-container">
              <div className="location-header">
                <span className="location-title">GPS Location</span>
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
              
              {locationStatus === 'success' && (
                <div className="location-status-badge success-badge">
                  <Compass size={14} className="pulse-icon" />
                  <span>Device GPS active and location locked.</span>
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
        )}

        <section className="panel">
          <div className="panelTitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} />
            <h2>Hotspots Map</h2>
          </div>
          <HotspotMap hotspots={hotspots} />
        </section>

      </section>

      <div className="queues-container">
        <section className="panel queue">
          <div 
            className="panelTitle collapsible-header" 
            onClick={() => setLiveQueueCollapsed(!liveQueueCollapsed)}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Waves size={18} />
              <h2>Live Complaint Queue ({complaints.filter((c) => c.status !== 'resolved').length})</h2>
            </div>
            {liveQueueCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </div>
          
          {!liveQueueCollapsed && (
            <div className="table">
              {complaints.filter((complaint) => complaint.status !== 'resolved').length === 0 && (
                <p className="muted" style={{ padding: '20px', textAlign: 'center' }}>No live complaints yet.</p>
              )}
              {complaints.filter((complaint) => complaint.status !== 'resolved').map((complaint) => {
                const isExpanded = expandedComplaintId === complaint.id;
                return (
                  <React.Fragment key={complaint.id}>
                    <article 
                      className={`row ${isExpanded ? 'expanded-row' : ''}`} 
                      onClick={() => setExpandedComplaintId(isExpanded ? null : complaint.id)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s ease' }}
                    >
                      <div className="rowMainInfo">
                        <strong>{complaint.classification.summary}</strong>
                        <span className="rowSubtitle">
                          {complaint.place}{complaint.state ? `, ${complaint.state}` : ''} / {complaint.classification.department} / {complaint.reporter_username || 'citizen'}
                        </span>
                      </div>
                      <div className="rowBadges">
                        <span className={`pill ${complaint.classification.priority}`}>{complaint.classification.priority}</span>
                        <span className={`pill status-pill ${complaint.status}`}>{complaint.duplicate_of ? `Duplicate of ${complaint.duplicate_of}` : complaint.status}</span>
                      </div>
                    </article>
                    
                    {isExpanded && (
                      <div className="complaint-detail-expansion" style={{
                        padding: '20px',
                        background: '#f8fafc',
                        borderLeft: '4px solid #246bfe',
                        borderBottom: '1px solid #cbd8d5',
                        borderRight: '1px solid #cbd8d5',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                        marginTop: '-4px',
                        marginBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 6px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>Full Grievance Text</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#17202a', whiteSpace: 'pre-wrap' }}>{complaint.text}</p>
                            
                            {complaint.voice_transcript && (
                              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#eef2f6', borderRadius: '8px', borderLeft: '3px solid #64748b' }}>
                                <h5 style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#475569' }}>🎙️ Voice Transcript</h5>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontStyle: 'italic' }}>"{complaint.voice_transcript}"</p>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>Reporter Details</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Name:</strong> {complaint.reporter_name || 'Anonymous'} ({complaint.reporter_username || 'citizen'})</span>
                              {complaint.contact && <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Contact:</strong> {complaint.contact}</span>}
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Date Filed:</strong> {new Date(complaint.created_at).toLocaleString()}</span>
                            </div>
                            
                            <div>
                              <h4 style={{ margin: '0 0 4px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>AI Classification Info</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Assigned Department:</strong> {complaint.classification.department}</span>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>AI Confidence:</strong> {(complaint.classification.confidence * 100).toFixed(0)}%</span>
                              {complaint.classification.tags && complaint.classification.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {complaint.classification.tags.map(tag => (
                                    <span key={tag} style={{ padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem', color: '#475569' }}>#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <ComplaintTimeline complaint={complaint} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: complaint.photo_filename || complaint.resolution_photo_filename ? '1fr 1fr' : '1fr', gap: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                          {complaint.photo_filename && (
                            <div>
                              <h4 style={{ margin: '0 0 8px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>Original Evidence Photo</h4>
                              <a href={`${API_BASE}/uploads/${complaint.photo_filename}`} target="_blank" rel="noreferrer">
                                <img 
                                  src={`${API_BASE}/uploads/${complaint.photo_filename}`} 
                                  alt="Evidence Photo" 
                                  style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid #cbd8d5', objectFit: 'cover' }} 
                                />
                              </a>
                            </div>
                          )}
                          
                          {complaint.status === 'resolved' && (
                            <div>
                              <h4 style={{ margin: '0 0 8px', color: '#174b2a', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={16} color="#174b2a" /> Resolution Proof
                              </h4>
                              <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#334155' }}>
                                Completed by <strong>@{complaint.completed_by}</strong> on {complaint.completed_at ? new Date(complaint.completed_at).toLocaleString() : 'N/A'}
                              </div>
                              {complaint.resolution_photo_filename && (
                                <a href={`${API_BASE}/uploads/${complaint.resolution_photo_filename}`} target="_blank" rel="noreferrer">
                                  <img 
                                    src={`${API_BASE}/uploads/${complaint.resolution_photo_filename}`} 
                                    alt="Resolution Proof" 
                                    style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid #9edab4', objectFit: 'cover' }} 
                                  />
                                </a>
                              )}
                            </div>
                          )}

                          {!['Citizen', 'Chief Minister', 'Prime Minister'].includes(session.user.user_type || 'Citizen') && complaint.status !== 'resolved' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                              {/* Add Update Comment Form */}
                              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px' }}>
                                <h4 style={{ margin: '0 0 8px', color: '#475569', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Add Progress Update</h4>
                                <form onSubmit={(e) => addProgressComment(e, complaint.id)} style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                                  <input 
                                    name="comment_text" 
                                    type="text" 
                                    placeholder="Enter a progress note or update..." 
                                    required 
                                    style={{ 
                                      flex: '1 1 auto', 
                                      minWidth: '0', 
                                      padding: '8px 12px', 
                                      fontSize: '0.85rem', 
                                      border: '1px solid #cbd8d5', 
                                      borderRadius: '6px',
                                      height: '38px',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  <button 
                                    type="submit" 
                                    className="primary" 
                                    disabled={commentingId === complaint.id}
                                    style={{ 
                                      width: 'auto',
                                      minHeight: '38px',
                                      height: '38px',
                                      padding: '0 16px', 
                                      fontSize: '0.85rem', 
                                      whiteSpace: 'nowrap',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxSizing: 'border-box'
                                    }}
                                  >
                                    {commentingId === complaint.id ? <RefreshCw className="spin" size={14} /> : <MessageSquare size={14} />}
                                    Add Note
                                  </button>
                                </form>
                              </div>

                              {/* Resolve Form */}
                              <div style={{ background: '#f0fdf4', border: '1px dashed #86efac', borderRadius: '8px', padding: '16px' }}>
                                <h4 style={{ margin: '0 0 8px', color: '#166534', fontSize: '0.9rem', fontWeight: 'bold' }}>Action Required: Resolve</h4>
                                <form onSubmit={(e) => resolveComplaint(e, complaint.id)} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <label style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}>
                                    <span>Attach Repair Photo Proof:</span>
                                    <input 
                                      name="resolution_photo" 
                                      type="file" 
                                      accept="image/*" 
                                      required 
                                      style={{ fontSize: '0.85rem' }} 
                                    />
                                  </label>
                                  <button 
                                    type="submit" 
                                    className="primary success-btn" 
                                    disabled={resolvingId === complaint.id}
                                    style={{ 
                                      padding: '8px 12px', 
                                      background: '#166534', 
                                      color: '#ffffff', 
                                      border: 'none', 
                                      borderRadius: '6px', 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      fontWeight: 'bold',
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    {resolvingId === complaint.id ? (
                                      <RefreshCw className="spin" size={14} />
                                    ) : (
                                      <CheckCircle2 size={14} />
                                    )}
                                    {resolvingId === complaint.id ? 'Saving Proof...' : 'Resolve Complaint'}
                                  </button>
                                </form>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel queue archive-queue">
          <div 
            className="panelTitle collapsible-header" 
            onClick={() => setArchiveQueueCollapsed(!archiveQueueCollapsed)}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <h2>Resolved Grievances Archive ({complaints.filter((c) => c.status === 'resolved').length})</h2>
            </div>
            {archiveQueueCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </div>
          
          {!archiveQueueCollapsed && (
            <div className="table">
              {complaints.filter((complaint) => complaint.status === 'resolved').length === 0 && (
                <p className="muted" style={{ padding: '20px', textAlign: 'center' }}>No resolved complaints yet.</p>
              )}
              {complaints.filter((complaint) => complaint.status === 'resolved').map((complaint) => {
                const isExpanded = expandedComplaintId === complaint.id;
                return (
                  <React.Fragment key={complaint.id}>
                    <article 
                      className={`row resolved-row ${isExpanded ? 'expanded-row' : ''}`} 
                      onClick={() => setExpandedComplaintId(isExpanded ? null : complaint.id)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s ease' }}
                    >
                      <div className="rowMainInfo">
                        <strong>{complaint.classification.summary}</strong>
                        <span className="rowSubtitle">
                          {complaint.place}{complaint.state ? `, ${complaint.state}` : ''} / {complaint.classification.department} / {complaint.reporter_username || 'citizen'}
                        </span>
                      </div>
                      <div className="rowBadges">
                        <span className={`pill ${complaint.classification.priority}`}>{complaint.classification.priority}</span>
                        <span className="pill status-pill resolved">Resolved</span>
                      </div>
                    </article>
                    
                    {isExpanded && (
                      <div className="complaint-detail-expansion" style={{
                        padding: '20px',
                        background: '#f8fafc',
                        borderLeft: '4px solid #10b981',
                        borderBottom: '1px solid #cbd8d5',
                        borderRight: '1px solid #cbd8d5',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                        marginTop: '-4px',
                        marginBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 6px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>Full Grievance Text</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#17202a', whiteSpace: 'pre-wrap' }}>{complaint.text}</p>
                            
                            {complaint.voice_transcript && (
                              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#eef2f6', borderRadius: '8px', borderLeft: '3px solid #64748b' }}>
                                <h5 style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#475569' }}>🎙️ Voice Transcript</h5>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontStyle: 'italic' }}>"{complaint.voice_transcript}"</p>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>Reporter Details</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Name:</strong> {complaint.reporter_name || 'Anonymous'} ({complaint.reporter_username || 'citizen'})</span>
                              {complaint.contact && <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Contact:</strong> {complaint.contact}</span>}
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Date Filed:</strong> {new Date(complaint.created_at).toLocaleString()}</span>
                            </div>
                            
                            <div>
                              <h4 style={{ margin: '0 0 4px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>AI Classification Info</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Assigned Department:</strong> {complaint.classification.department}</span>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>AI Confidence:</strong> {(complaint.classification.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <ComplaintTimeline complaint={complaint} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: complaint.photo_filename || complaint.resolution_photo_filename ? '1fr 1fr' : '1fr', gap: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                          {complaint.photo_filename && (
                            <div>
                              <h4 style={{ margin: '0 0 8px', color: '#2b6f6a', fontSize: '0.85rem', textTransform: 'uppercase' }}>Original Evidence Photo</h4>
                              <a href={`${API_BASE}/uploads/${complaint.photo_filename}`} target="_blank" rel="noreferrer">
                                <img 
                                  src={`${API_BASE}/uploads/${complaint.photo_filename}`} 
                                  alt="Evidence Photo" 
                                  style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid #cbd8d5', objectFit: 'cover' }} 
                                />
                              </a>
                            </div>
                          )}
                          
                          {complaint.resolution_photo_filename && (
                            <div>
                              <h4 style={{ margin: '0 0 8px', color: '#174b2a', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={16} color="#174b2a" /> Resolution Proof
                              </h4>
                              <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#334155' }}>
                                Completed by <strong>@{complaint.completed_by}</strong> on {complaint.completed_at ? new Date(complaint.completed_at).toLocaleString() : 'N/A'}
                              </div>
                              <a href={`${API_BASE}/uploads/${complaint.resolution_photo_filename}`} target="_blank" rel="noreferrer">
                                <img 
                                  src={`${API_BASE}/uploads/${complaint.resolution_photo_filename}`} 
                                  alt="Resolution Proof" 
                                  style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid #9edab4', objectFit: 'cover' }} 
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Floating Chat Bubble & Pop-up for Conversational Analytics */}
      <div className="floating-analytics-container">
        <button 
          className={`floating-chat-fab ${showAnalyticsPopup ? 'active' : ''}`}
          onClick={() => setShowAnalyticsPopup(!showAnalyticsPopup)}
          title="AI Analytics Assistant"
        >
          {showAnalyticsPopup ? <X size={22} /> : <MessageSquare size={22} />}
        </button>

        {showAnalyticsPopup && (
          <div className="analytics-chat-popup">
            <div className="analytics-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={16} color="#ffffff" />
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '0.9rem', fontFamily: 'Outfit' }}>Analytics Assistant</h3>
              </div>
              <button className="chat-close-btn" onClick={() => setShowAnalyticsPopup(false)}>
                <X size={14} />
              </button>
            </div>
            
            <div className="analytics-chat-body">
              <p className="chat-welcome-msg">
                Ask me stats about complaints, hotspots, or priorities!
              </p>
              
              {analytics && (
                <div className="chat-answer-bubble">
                  <div className="answer-text">{analytics.answer}</div>
                  <small className="answer-source">{analytics.source}</small>
                  {analytics.rows.length > 0 && (
                    <div className="table-container" style={{ overflowX: 'auto', marginTop: '8px' }}>
                      <table>
                        <tbody>
                          {analytics.rows.map((row, index) => (
                            <tr key={index}>
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} style={{ fontSize: '0.78rem', padding: '6px 4px' }}>{String(value)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {loading && (
                <div className="chat-loading-bubble">
                  <RefreshCw className="spin" size={14} />
                  <span>Analyzing database...</span>
                </div>
              )}
            </div>

            <form onSubmit={askQuestion} className="analytics-chat-footer">
              <input 
                value={question} 
                onChange={(event) => setQuestion(event.target.value)} 
                placeholder="Ask stats question..."
                required
              />
              <button type="submit" className="chat-send-btn" disabled={loading}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
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
          <label>
            User Type / Department
            <select
              value={form.user_type || 'Citizen'}
              onChange={(event) => setForm({ ...form, user_type: event.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd8d5',
                borderRadius: '8px',
                background: '#fbfdfc',
                color: '#17202a',
                fontSize: '1rem',
                marginTop: '4px',
                marginBottom: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="Citizen">Citizen (General Public)</option>
              <option value="Water department">Water Department</option>
              <option value="Fire Department">Fire Department</option>
              <option value="Road Department">Road Department</option>
              <option value="Sanitation department">Sanitation Department</option>
              <option value="Electrical department">Electrical Department</option>
              <option value="Chief Minister">Chief Minister (State Head)</option>
              <option value="Prime Minister">Prime Minister (Country Head)</option>
            </select>
          </label>
          {form.user_type === 'Chief Minister' && (
            <label>
              Designated State
              <input
                value={form.state || ''}
                onChange={(event) => setForm({ ...form, state: event.target.value })}
                placeholder="e.g. Delhi, Karnataka, Maharashtra"
                required
              />
            </label>
          )}
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
