import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Cpu,
  Download,
  FileText,
  Filter,
  Fish,
  Flame,
  GraduationCap,
  HardHat,
  Headphones,
  HeartPulse,
  HelpCircle,
  Leaf,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  RefreshCw,
  Scale,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sprout,
  Sparkles,
  ThumbsUp,
  Trees,
  Truck,
  Upload,
  UserPlus,
  Waves,
  X,
  Zap,
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

  const currentStatus = complaint.status || 'routed';
  const stages = [
    { key: 'new', label: 'Reported', sub: 'Citizen Intake' },
    { key: 'routed', label: 'AI Routed', sub: getShortDeptName(complaint.classification?.department) || 'Assigned' },
    { key: 'in_progress', label: 'In Progress', sub: 'Action Initiated' },
    { key: 'resolved', label: 'Resolved', sub: 'Proof Verified' },
  ];

  const getStepState = (stepKey) => {
    const statusOrder = ['new', 'routed', 'in_progress', 'resolved'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex || currentStatus === 'resolved') {
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="timeline-container" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
      <h4 style={{ margin: '0 0 12px', color: 'var(--color-primary-hover)', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📋 Multi-Stage Grievance Lifecycle & Timeline</span>
      </h4>

      {/* Interactive 4-Stage Stepper Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 20px', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        {stages.map((stg, i) => {
          const state = getStepState(stg.key);
          const isCompleted = state === 'completed';
          const isActive = state === 'active';
          
          let stepBg = 'rgba(255, 255, 255, 0.05)';
          let stepColor = 'var(--color-muted)';
          let borderColor = 'var(--border-color)';
          
          if (isCompleted) {
            stepBg = 'rgba(16, 185, 129, 0.15)';
            stepColor = '#10b981';
            borderColor = '#10b981';
          } else if (isActive) {
            stepBg = 'rgba(59, 130, 246, 0.2)';
            stepColor = '#3b82f6';
            borderColor = '#3b82f6';
          }

          return (
            <React.Fragment key={stg.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px', zIndex: 1, flex: '0 0 auto' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: stepBg,
                  border: `2px solid ${borderColor}`,
                  color: stepColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none'
                }}>
                  {isCompleted ? <CheckCircle2 size={16} /> : (i + 1)}
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: isActive || isCompleted ? '700' : '500', color: isActive || isCompleted ? 'var(--color-main)' : 'var(--color-muted)' }}>
                  {stg.label}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-muted)', maxWidth: '90px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stg.sub}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: isCompleted ? '#10b981' : 'var(--border-color)',
                  margin: '0 8px 20px',
                  minWidth: '20px',
                  transition: 'background 0.3s ease'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

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
                  background: 'var(--border-color)'
                }} />
              )}
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: dotColor,
                border: '3px solid var(--bg-panel-solid)',
                boxShadow: '0 0 0 1px var(--border-color)',
                zIndex: 2,
                flexShrink: 0,
                marginTop: '3px'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-main)', lineHeight: '1.2' }}>
                  {evt.description} 
                  {evt.actor && <span style={{ fontWeight: 'normal', color: 'var(--color-muted)', fontSize: '0.78rem' }}> (by @{evt.actor})</span>}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
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

function PhotoComparisonCard({ complaint }) {
  const hasOriginal = Boolean(complaint.photo_filename);
  const hasResolution = Boolean(complaint.resolution_photo_filename);

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
      <h4 style={{ margin: '0 0 12px', color: 'var(--color-primary-hover)', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📷 Visual Evidence & Resolution Comparison</span>
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* BEFORE CARD */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              📷 BEFORE: Citizen Evidence
            </span>
            {complaint.reporter_username && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>@{complaint.reporter_username}</span>
            )}
          </div>
          
          {hasOriginal ? (
            <a href={`${API_BASE}/uploads/${complaint.photo_filename}`} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '6px', overflow: 'hidden' }}>
              <img 
                src={`${API_BASE}/uploads/${complaint.photo_filename}`} 
                alt="Original Evidence" 
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </a>
          ) : (
            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', color: 'var(--color-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
              No photo submitted with original complaint
            </div>
          )}
        </div>

        {/* AFTER CARD */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: '800', 
              background: complaint.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
              color: complaint.status === 'resolved' ? '#10b981' : '#f59e0b', 
              border: `1px solid ${complaint.status === 'resolved' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, 
              padding: '2px 8px', 
              borderRadius: '4px', 
              textTransform: 'uppercase' 
            }}>
              {complaint.status === 'resolved' ? '✅ AFTER: Verified Resolution' : '⏳ AFTER: Resolution Pending'}
            </span>
            {complaint.completed_by && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>@{complaint.completed_by}</span>
            )}
          </div>

          {hasResolution ? (
            <a href={`${API_BASE}/uploads/${complaint.resolution_photo_filename}`} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '6px', overflow: 'hidden' }}>
              <img 
                src={`${API_BASE}/uploads/${complaint.resolution_photo_filename}`} 
                alt="Resolution Proof" 
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.4)' }}
              />
            </a>
          ) : complaint.status === 'resolved' ? (
            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px', color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>
              ✅ Resolved (Official confirmed completion)
            </div>
          ) : (
            <div style={{ height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '6px', color: 'var(--color-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '12px' }}>
              <Clock size={22} style={{ color: '#f59e0b', opacity: 0.7 }} />
              <span>Resolution proof photo will be uploaded by the department official upon completion.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsDashboard({ user, complaints }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('depts'); // 'depts' | 'states' | 'insights'

  const filteredComplaints = useMemo(() => {
    if (!user) return complaints;
    const userType = user.user_type || 'Citizen';

    if (userType === 'Admin' || userType === 'Prime Minister') {
      return complaints;
    }

    if (userType === 'Chief Minister') {
      const userState = (user.state || '').trim().toLowerCase();
      return complaints.filter(c => c.state && c.state.trim().toLowerCase() === userState);
    }

    if (userType !== 'Citizen') {
      const userState = (user.state || '').trim().toLowerCase();
      const userTypeLower = userType.toLowerCase();
      let depts = [];
      if (userTypeLower.includes('water')) depts = ['Water Works', 'Drainage'];
      else if (userTypeLower.includes('road')) depts = ['Roads'];
      else if (userTypeLower.includes('fire')) depts = ['Fire Department', 'Traffic'];
      else if (userTypeLower.includes('sanitation')) depts = ['Sanitation'];
      else if (userTypeLower.includes('electrical')) depts = ['Electrical'];

      return complaints.filter(c =>
        c.state && c.state.trim().toLowerCase() === userState &&
        depts.includes(c.classification?.department)
      );
    }

    return complaints;
  }, [complaints, user]);

  const getTitle = () => {
    if (!user) return 'Grievance Analytics & Diagnostics';
    const userType = user.user_type || 'Citizen';
    if (userType === 'Admin' || userType === 'Prime Minister') {
      return 'National Grievance Diagnostics Center (Global Access)';
    }
    if (userType === 'Chief Minister') {
      return `${user.state || 'State'} Executive Diagnostics Panel (CM Access)`;
    }
    if (userType !== 'Citizen') {
      return `${user.state || 'State'} ${userType} Diagnostics Panel (Officer Access)`;
    }
    return 'Public Grievance Diagnostics Center (Citizen Access)';
  };

  const deptStats = {};
  const stateStats = {};
  let totalPriorityCount = { low: 0, medium: 0, high: 0, critical: 0 };

  filteredComplaints.forEach(c => {
    // Department stats
    const dept = c.classification?.department || 'Unassigned';
    if (!deptStats[dept]) {
      deptStats[dept] = { total: 0, resolved: 0, active: 0 };
    }
    deptStats[dept].total += 1;
    if (c.status === 'resolved') {
      deptStats[dept].resolved += 1;
    } else {
      deptStats[dept].active += 1;
    }

    // State stats
    const state = c.state || 'Unknown';
    if (!stateStats[state]) {
      stateStats[state] = { total: 0, resolved: 0, active: 0 };
    }
    stateStats[state].total += 1;
    if (c.status === 'resolved') {
      stateStats[state].resolved += 1;
    } else {
      stateStats[state].active += 1;
    }

    // Priority stats
    const priority = (c.classification?.priority || 'medium').toLowerCase();
    if (totalPriorityCount[priority] !== undefined) {
      totalPriorityCount[priority] += 1;
    }
  });

  const deptsList = Object.entries(deptStats).map(([name, stats]) => ({
    name,
    ...stats,
    rate: stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : '0',
  })).sort((a, b) => b.total - a.total);

  const statesList = Object.entries(stateStats).map(([name, stats]) => ({
    name,
    ...stats,
    rate: stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : '0',
  })).sort((a, b) => b.total - a.total);

  const maxTotalDept = deptsList.length > 0 ? Math.max(...deptsList.map(d => d.total)) : 1;
  const maxTotalState = statesList.length > 0 ? Math.max(...statesList.map(s => s.total)) : 1;

  // AI-generated Dynamic Smart Insights
  const insights = [];
  if (deptsList.length > 0) {
    const busyDept = deptsList[0];
    insights.push({
      type: 'info',
      icon: '💼',
      title: 'Highest Load',
      text: `${busyDept.name} department is currently handling the highest volume with ${busyDept.total} total cases.`
    });

    const worstDept = [...deptsList].sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
    if (worstDept && parseFloat(worstDept.rate) < 60) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Performance Alert',
        text: `${worstDept.name} department has a low resolution rate of ${worstDept.rate}%. High bottleneck risk.`
      });
    }
  }

  if (statesList.length > 0) {
    const bestState = [...statesList].sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))[0];
    if (bestState && parseFloat(bestState.rate) > 50) {
      insights.push({
        type: 'success',
        icon: '🏆',
        title: 'Top Performing Region',
        text: `State of ${bestState.name} is leading with a ${bestState.rate}% complaint resolution rate!`
      });
    }
  }

  const highCritical = (totalPriorityCount.critical || 0) + (totalPriorityCount.high || 0);
  if (highCritical > 0) {
    insights.push({
      type: 'danger',
      icon: '🔥',
      title: 'Priority Warning',
      text: `${highCritical} active cases are marked High or Critical priority, requiring urgent field deployment.`
    });
  }

  return (
    <div className="panel analytics-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
      <div 
        className="panelTitle collapsible-header" 
        onClick={() => setCollapsed(!collapsed)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} />
          <h2>{getTitle()}</h2>
        </div>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{collapsed ? '▶ Expand' : '▼ Collapse'}</span>
      </div>

      {!collapsed && (
        <>
          <div className="tabHeader" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <button 
              onClick={() => setActiveTab('depts')} 
              className={`tabButton ${activeTab === 'depts' ? 'active' : ''}`}
              style={{
                background: activeTab === 'depts' ? 'var(--color-primary)' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              📊 Department Volume
            </button>
            <button 
              onClick={() => setActiveTab('states')} 
              className={`tabButton ${activeTab === 'states' ? 'active' : ''}`}
              style={{
                background: activeTab === 'states' ? 'var(--color-primary)' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              🗺️ Regional Performance
            </button>
            <button 
              onClick={() => setActiveTab('insights')} 
              className={`tabButton ${activeTab === 'insights' ? 'active' : ''}`}
              style={{
                background: activeTab === 'insights' ? 'var(--color-primary)' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              💡 Smart AI Diagnostics
            </button>
          </div>

          <div className="tabContent" style={{ minHeight: '180px', paddingTop: '10px' }}>
            {activeTab === 'depts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {deptsList.length === 0 ? (
                  <p className="muted">No department data available.</p>
                ) : (
                  deptsList.map(dept => {
                    const pct = ((dept.total / maxTotalDept) * 100).toFixed(0);
                    return (
                      <div key={dept.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600' }}>
                          <span>{dept.name}</span>
                          <span className="muted">{dept.active} Active / {dept.resolved} Resolved ({dept.total} Total)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="progress-container" style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                              borderRadius: '6px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', width: '36px', textAlign: 'right' }}>{dept.rate}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'states' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {statesList.length === 0 ? (
                  <p className="muted">No regional data available.</p>
                ) : (
                  statesList.map(st => {
                    const pct = ((st.total / maxTotalState) * 100).toFixed(0);
                    return (
                      <div key={st.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600' }}>
                          <span>📍 {st.name}</span>
                          <span className="muted">{st.active} Active / {st.resolved} Resolved</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="progress-container" style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--color-accent) 0%, #10b981 100%)',
                              borderRadius: '6px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', width: '36px', textAlign: 'right' }}>{st.rate}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'insights' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {insights.length === 0 ? (
                  <p className="muted" style={{ gridColumn: '1 / -1' }}>Awaiting more complaint inputs to analyze regional diagnostics.</p>
                ) : (
                  insights.map((insight, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-primary-hover)' }}>
                        <span>{insight.icon}</span>
                        <span>{insight.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-muted)', lineHeight: '1.4' }}>
                        {insight.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function getShortDeptName(deptName) {
  if (!deptName) return 'Unassigned';
  const cleaned = deptName.trim();
  
  const mappings = {
    'Department of Public Works': 'Public Works',
    'Department of Urban Development and Municipal Affairs': 'Urban Development',
    'Department of Information Technology and Electronics': 'IT & Electronics',
    'Department of Public Enterprises & Industrial Reconstruction': 'Public Enterprises',
    'Department of Technical Education, Training and Skill Development': 'Technical Edu & Skill Dev',
    'Department of Women and Child Development and Social Welfare': 'Women & Child Dev',
    'Department of Industry, Commerce & Enterprises': 'Industry & Commerce',
    'Department of Health & Family Welfare': 'Health & Family Welfare',
    'Department of Information & Cultural Affairs': 'Info & Cultural Affairs',
    'Department of Minority Affairs & Madrasah Education': 'Minority Affairs',
    'Department of Personnel & Administrative Reforms': 'Personnel & Admin',
    'Department of Home and Hill Affairs': 'Home & Hill Affairs',
    'Department of Land & Land Reforms': 'Land & Land Reforms',
    'Department of North Bengal Development': 'North Bengal Dev',
    'Department of School Education': 'School Education',
    'Department of Sundarban Affairs': 'Sundarban Affairs',
    'Department of Agriculture': 'Agriculture',
    'Department of Environment': 'Environment',
    'Department of Finance': 'Finance',
    'Department of Fisheries': 'Fisheries',
    'Department of Forests': 'Forests',
    'Department of Law': 'Law',
    'Department of Parliamentary Affairs': 'Parliamentary Affairs',
    'Department of Power': 'Power',
    'Department of Transport': 'Transport',
    'Department of Tourism': 'Tourism',
    'Department of Labour': 'Labour',
  };

  if (mappings[cleaned]) {
    return mappings[cleaned];
  }

  return cleaned.replace(/^(Department of|Dept of)\s+/i, '');
}

export function getDeptIcon(deptName) {
  const short = getShortDeptName(deptName).toLowerCase();
  
  if (short.includes('public works') || short.includes('works')) return <HardHat size={16} />;
  if (short.includes('urban') || short.includes('municipal')) return <Building2 size={16} />;
  if (short.includes('power') || short.includes('electricity')) return <Zap size={16} />;
  if (short.includes('transport')) return <Truck size={16} />;
  if (short.includes('environment')) return <Leaf size={16} />;
  if (short.includes('home') || short.includes('hill')) return <Shield size={16} />;
  if (short.includes('agriculture')) return <Sprout size={16} />;
  if (short.includes('finance')) return <Coins size={16} />;
  if (short.includes('fisheries') || short.includes('fish')) return <Fish size={16} />;
  if (short.includes('forest')) return <Trees size={16} />;
  if (short.includes('it &') || short.includes('technology') || short.includes('electronics')) return <Cpu size={16} />;
  if (short.includes('law') || short.includes('parliamentary')) return <Scale size={16} />;
  if (short.includes('health')) return <HeartPulse size={16} />;
  if (short.includes('education') || short.includes('school') || short.includes('skill')) return <GraduationCap size={16} />;
  if (short.includes('industry') || short.includes('enterprise') || short.includes('commerce')) return <Briefcase size={16} />;
  if (short.includes('tourism')) return <Compass size={16} />;
  if (short.includes('fire')) return <Flame size={16} />;
  if (short.includes('traffic')) return <Car size={16} />;
  if (short.includes('land')) return <MapPin size={16} />;
  
  return <Building2 size={16} />;
}

export function getDeptHealthGrade(resolvedRate, activeCount, criticalCount = 0) {
  const rate = parseFloat(resolvedRate) || 0;
  let score = rate;
  score -= (criticalCount * 12);
  if (activeCount > 5) {
    score -= ((activeCount - 5) * 3);
  }
  score = Math.max(0, Math.min(100, score));

  if (score >= 75) {
    return {
      grade: 'A+',
      label: 'Optimal',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.4)'
    };
  } else if (score >= 45) {
    return {
      grade: 'B',
      label: 'Moderate',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)'
    };
  } else {
    return {
      grade: 'F',
      label: 'Bottleneck',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.4)'
    };
  }
}

function ExecutiveMonitor({ user, complaints }) {
  const [selectedState, setSelectedState] = React.useState(null);
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [timeFilter, setTimeFilter] = React.useState('all');

  const isPM = user.user_type === 'Prime Minister';

  const filterComplaint = React.useCallback((c) => {
    if (timeFilter !== 'all' && c.created_at) {
      const createdDate = new Date(c.created_at);
      const now = new Date();
      const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
      if (timeFilter === '7days' && diffDays > 7) return false;
      if (timeFilter === '30days' && diffDays > 30) return false;
    }
    if (priorityFilter !== 'all') {
      const priority = (c.classification?.priority || '').toLowerCase();
      if (priorityFilter === 'critical' && priority !== 'critical') return false;
      if (priorityFilter === 'high_critical' && !['critical', 'high'].includes(priority)) return false;
    }
    return true;
  }, [priorityFilter, timeFilter]);

  const handleExportCSV = (list, scopeName, isNationalLevel = false) => {
    if (!list || list.length === 0) {
      alert("No data available to export for current filter selection.");
      return;
    }
    
    const entityHeader = isNationalLevel ? "State Name" : "Department Name";
    const headers = [entityHeader, "Health Grade", "Status Label", "Total Complaints", "Active Complaints", "Resolved Complaints", "Resolution Rate (%)", "Critical Complaints"];
    
    const rows = list.map(item => {
      const name = isNationalLevel ? item.name : getShortDeptName(item.name);
      const health = getDeptHealthGrade(item.rate, item.active, item.critical || 0);
      return [
        `"${name}"`,
        `"${health.grade}"`,
        `"${health.label}"`,
        item.total,
        item.active,
        item.resolved,
        `"${item.rate}%"`,
        item.critical || 0
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Executive_Brief_${scopeName || 'Report'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isPM) {
    const stateStats = {};
    complaints.filter(filterComplaint).forEach((c) => {
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
      complaints.filter(c => (c.state ? c.state.trim() : 'Unknown') === selectedState && filterComplaint(c)).forEach((c) => {
        const dept = c.classification?.department || 'Unassigned';
        if (!deptStats[dept]) {
          deptStats[dept] = { total: 0, active: 0, resolved: 0, critical: 0 };
        }
        deptStats[dept].total += 1;
        if ((c.classification?.priority || '').toLowerCase() === 'critical') {
          deptStats[dept].critical += 1;
        }
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

        {/* Controls Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: '600' }}>
              <Filter size={14} />
              <span>Priority:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[['all', 'All'], ['high_critical', 'High & Critical'], ['critical', 'Critical']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPriorityFilter(val)}
                    style={{
                      background: priorityFilter === val ? (val === 'critical' ? '#ef4444' : val === 'high_critical' ? '#f59e0b' : 'var(--color-primary)') : 'transparent',
                      color: priorityFilter === val ? '#fff' : 'var(--color-muted)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: '600' }}>
              <span>Time:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[['all', 'All Time'], ['7days', '7 Days'], ['30days', '30 Days']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTimeFilter(val)}
                    style={{
                      background: timeFilter === val ? 'var(--color-primary)' : 'transparent',
                      color: timeFilter === val ? '#fff' : 'var(--color-muted)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const isNational = !selectedState;
              handleExportCSV(isNational ? statesList : drillDownList, selectedState || 'National', isNational);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '5px 12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Download size={14} />
            <span>Export Executive Brief (CSV)</span>
          </button>
        </div>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', alignContent: 'start', minHeight: '180px', padding: '4px' }}>
          {statesList.length === 0 ? (
            <p className="muted" style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center' }}>No state data matching filters.</p>
          ) : (
            statesList.map((st) => {
              const barColor = '#16a34a';
              const isActive = st.name === selectedState;
              
              return (
                <div 
                  key={st.name} 
                  onClick={() => setSelectedState(isActive ? null : st.name)}
                  className={`monitor-card ${isActive ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="state-name" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</span>
                    <span className="pill" style={{ fontSize: '0.7rem', padding: '2px 6px', fontWeight: 'bold' }}>{st.total} Total</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '1rem' }}>{st.active}</span>
                      <span className="stat-label" style={{ fontSize: '0.68rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Active</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#10b981', fontWeight: '700', fontSize: '1rem' }}>{st.resolved}</span>
                      <span className="stat-label" style={{ fontSize: '0.68rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Resolved</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '600' }}>
                      <span className="stat-label" style={{ color: 'var(--color-muted)' }}>Resolved Rate</span>
                      <span style={{ color: barColor }}>{st.rate}%</span>
                    </div>
                    <div className="progress-container">
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', alignContent: 'start', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
              {drillDownList.map((dp) => {
                const barColor = '#16a34a';
                const shortName = getShortDeptName(dp.name);
                const DeptIcon = getDeptIcon(dp.name);
                const health = getDeptHealthGrade(dp.rate, dp.active, dp.critical);
                
                return (
                  <div 
                    key={dp.name}
                    className="monitor-card dept-card"
                    style={{ borderLeft: `4px solid ${health.color}` }}
                    title={dp.name}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div className="dept-icon-badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {DeptIcon}
                        </div>
                        <span className="dept-name" style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--color-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {shortName}
                        </span>
                      </div>
                      <span 
                        style={{ 
                          fontSize: '0.68rem', 
                          padding: '2px 6px', 
                          fontWeight: '800', 
                          borderRadius: '4px',
                          color: health.color,
                          background: health.bg,
                          border: `1px solid ${health.borderColor}`,
                          flexShrink: 0
                        }}
                        title={`Health Score Grade: ${health.grade} (${health.label})`}
                      >
                        {health.grade} {health.label}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '2px' }}>
                      <div style={{ display: 'flex', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.95rem' }}>{dp.active}</span>
                          <span className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Active</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.95rem' }}>{dp.resolved}</span>
                          <span className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Resolved</span>
                        </div>
                      </div>

                      {dp.critical > 0 && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          🔥 {dp.critical} Critical
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: '600' }}>
                        <span className="stat-label" style={{ color: 'var(--color-muted)' }}>Rate</span>
                        <span style={{ color: barColor }}>{dp.rate}%</span>
                      </div>
                      <div className="progress-container">
                        <div style={{ width: `${dp.rate}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>

                    <div className="monitor-card-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#3b82f6', fontSize: '0.68rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Dept</span>
                      <span style={{ fontWeight: '700', color: 'var(--color-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={shortName}>{shortName}</span>
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
    complaints.filter(filterComplaint).forEach((c) => {
      const dept = c.classification?.department || 'Unassigned';
      if (!deptStats[dept]) {
        deptStats[dept] = { total: 0, active: 0, resolved: 0, critical: 0 };
      }
      deptStats[dept].total += 1;
      if ((c.classification?.priority || '').toLowerCase() === 'critical') {
        deptStats[dept].critical += 1;
      }
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
        <div className="panelTitle" style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} />
            <h2>State Executive Monitor ({userState})</h2>
          </div>
        </div>
        
        {/* Controls Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: '600' }}>
              <Filter size={14} />
              <span>Priority:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[['all', 'All'], ['high_critical', 'High & Critical'], ['critical', 'Critical']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPriorityFilter(val)}
                    style={{
                      background: priorityFilter === val ? (val === 'critical' ? '#ef4444' : val === 'high_critical' ? '#f59e0b' : 'var(--color-primary)') : 'transparent',
                      color: priorityFilter === val ? '#fff' : 'var(--color-muted)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: '600' }}>
              <span>Time:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[['all', 'All Time'], ['7days', '7 Days'], ['30days', '30 Days']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTimeFilter(val)}
                    style={{
                      background: timeFilter === val ? 'var(--color-primary)' : 'transparent',
                      color: timeFilter === val ? '#fff' : 'var(--color-muted)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleExportCSV(deptsList, userState)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '5px 12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Download size={14} />
            <span>Export Executive Brief (CSV)</span>
          </button>
        </div>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', alignContent: 'start', minHeight: '260px', padding: '4px' }}>
          {deptsList.length === 0 ? (
            <p className="muted" style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center' }}>No department data matching active filters.</p>
          ) : (
            deptsList.map((dp) => {
              const barColor = '#16a34a';
              const shortName = getShortDeptName(dp.name);
              const DeptIcon = getDeptIcon(dp.name);
              const health = getDeptHealthGrade(dp.rate, dp.active, dp.critical);
              
              return (
                <div 
                  key={dp.name} 
                  className="monitor-card dept-card"
                  style={{ borderLeft: `4px solid ${health.color}` }}
                  title={dp.name}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div className="dept-icon-badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {DeptIcon}
                      </div>
                      <span className="dept-name" style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--color-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {shortName}
                      </span>
                    </div>
                    
                    {/* Health Grade Badge */}
                    <span 
                      style={{ 
                        fontSize: '0.68rem', 
                        padding: '2px 6px', 
                        fontWeight: '800', 
                        borderRadius: '4px',
                        color: health.color,
                        background: health.bg,
                        border: `1px solid ${health.borderColor}`,
                        flexShrink: 0
                      }}
                      title={`Health Score Grade: ${health.grade} (${health.label})`}
                    >
                      {health.grade} {health.label}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '2px' }}>
                    <div style={{ display: 'flex', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.95rem' }}>{dp.active}</span>
                        <span className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Active</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.95rem' }}>{dp.resolved}</span>
                        <span className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Resolved</span>
                      </div>
                    </div>

                    {dp.critical > 0 && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        🔥 {dp.critical} Critical
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '600' }}>
                      <span className="stat-label" style={{ color: 'var(--color-muted)' }}>Resolved Rate</span>
                      <span style={{ color: barColor }}>{dp.rate}%</span>
                    </div>
                    <div className="progress-container">
                      <div style={{ width: `${dp.rate}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>

                  <div className="monitor-card-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: '#3b82f6', fontSize: '0.68rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Dept</span>
                    <span style={{ fontWeight: '700', color: 'var(--color-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={shortName}>{shortName}</span>
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

function AdminPanel({ token, user, complaints, refresh }) {
  const [users, setUsers] = React.useState([]);
  const [editingComplaint, setEditingComplaint] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('complaints');
  const [savingId, setSavingId] = React.useState(null);

  const fetchUsers = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: authHeaders(token)
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  React.useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Are you sure you want to delete user @${username}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/auth/users/${username}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      });
      if (res.ok) {
        alert("User deleted successfully.");
        fetchUsers();
      } else {
        alert("Failed to delete user.");
      }
    } catch (e) {
      alert("Error deleting user: " + e.message);
    }
  };

  const handleDeleteComplaint = async (complaintId) => {
    if (!window.confirm("Are you sure you want to delete this complaint?")) return;
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      });
      if (res.ok) {
        alert("Complaint deleted successfully.");
        refresh();
        if (editingComplaint?.id === complaintId) setEditingComplaint(null);
      } else {
        alert("Failed to delete complaint.");
      }
    } catch (e) {
      alert("Error deleting complaint: " + e.message);
    }
  };

  const handleUpdateComplaint = async (e) => {
    e.preventDefault();
    setSavingId(editingComplaint.id);
    try {
      const res = await fetch(`${API_BASE}/complaints/${editingComplaint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token)
        },
        body: JSON.stringify({
          text: editingComplaint.text,
          place: editingComplaint.place,
          state: editingComplaint.state,
          status: editingComplaint.status,
          department: editingComplaint.classification.department,
          priority: editingComplaint.classification.priority,
          category: editingComplaint.classification.category
        })
      });
      if (res.ok) {
        alert("Complaint modified successfully.");
        refresh();
        setEditingComplaint(null);
      } else {
        alert("Failed to modify complaint.");
      }
    } catch (err) {
      alert("Error modifying complaint: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%', gridColumn: '1 / -1' }}>
      <div className="panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b' }}>🛡️ Admin Command Center</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>Delete accounts, override metadata, and manage complaints state-wide.</p>
          </div>
          <div className="modeSwitch" style={{ margin: 0 }}>
            <button className={activeTab === 'complaints' ? 'active' : ''} onClick={() => setActiveTab('complaints')} type="button">
              Manage Complaints
            </button>
            <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')} type="button">
              Manage Users ({users.length || ''})
            </button>
          </div>
        </div>

        {activeTab === 'complaints' ? (
          <div style={{ display: 'grid', gridTemplateColumns: editingComplaint ? '1.5fr 1fr' : '1fr', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#475569', marginBottom: '12px' }}>System Complaints Log ({complaints.length})</h3>
              <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {complaints.map(c => (
                  <div key={c.id} style={{
                    padding: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: editingComplaint?.id === c.id ? '#eff6ff' : '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong>{c.classification.summary}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        ID: {c.id} | {c.place}, {c.state} | Dept: {c.classification.department} | Priority: {c.classification.priority}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setEditingComplaint({ ...c })}
                        style={{ padding: '6px 12px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteComplaint(c.id)}
                        style={{ padding: '6px 12px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editingComplaint && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Modify Complaint {editingComplaint.id}</h3>
                  <button onClick={() => setEditingComplaint(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>
                <form onSubmit={handleUpdateComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    Complaint Text
                    <textarea 
                      value={editingComplaint.text} 
                      onChange={e => setEditingComplaint({ ...editingComplaint, text: e.target.value })} 
                      rows={3}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    Place
                    <input 
                      type="text" 
                      value={editingComplaint.place} 
                      onChange={e => setEditingComplaint({ ...editingComplaint, place: e.target.value })} 
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    State
                    <input 
                      type="text" 
                      value={editingComplaint.state} 
                      onChange={e => setEditingComplaint({ ...editingComplaint, state: e.target.value })} 
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    Department
                    <input 
                      type="text" 
                      value={editingComplaint.classification.department} 
                      onChange={e => setEditingComplaint({ ...editingComplaint, classification: { ...editingComplaint.classification, department: e.target.value } })} 
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                      Priority
                      <select 
                        value={editingComplaint.classification.priority} 
                        onChange={e => setEditingComplaint({ ...editingComplaint, classification: { ...editingComplaint.classification, priority: e.target.value } })}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="critical">critical</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                      Status
                      <select 
                        value={editingComplaint.status} 
                        onChange={e => setEditingComplaint({ ...editingComplaint, status: e.target.value })}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="new">new</option>
                        <option value="routed">routed</option>
                        <option value="in_progress">in_progress</option>
                        <option value="resolved">resolved</option>
                      </select>
                    </label>
                  </div>
                  <button 
                    type="submit" 
                    className="primary" 
                    disabled={savingId === editingComplaint.id}
                    style={{ minHeight: '38px', height: '38px', marginTop: '10px' }}
                  >
                    Save Modifications
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1rem', color: '#475569', marginBottom: '12px' }}>Registered Accounts List</h3>
            <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(u => (
                <div key={u.id} style={{
                  padding: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong>{u.full_name} (@{u.username})</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Role: {u.user_type} | Phone: {u.phone} {u.state ? `| State: ${u.state}` : ''}
                    </span>
                  </div>
                  <div>
                    {u.user_type !== 'Admin' && (
                      <button 
                        onClick={() => handleDeleteUser(u.username)}
                        style={{ padding: '6px 12px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Delete User
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AIChatAssistantWidget({ session, refresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: '👋 Hello! I am Civic AI & Analytics Assistant. Ask me about your grievance status, department performance, hotspots, or civic stats!' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (msgText) => {
    const textToSend = msgText || inputMsg;
    if (!textToSend.trim() || loading) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!msgText) setInputMsg('');
    setLoading(true);

    try {
      const isAnalyticsQuery = /stats|count|analytics|most|worst|top|bottleneck|hotspot|places|table|how many|department/i.test(textToSend);
      let answerText = "";
      let sourceInfo = "";
      let rowsData = [];

      if (isAnalyticsQuery) {
        try {
          const res = await fetch(`${API_BASE}/analytics/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(session.token) },
            body: JSON.stringify({ question: textToSend }),
          });
          if (res.ok) {
            const data = await res.json();
            answerText = data.answer;
            sourceInfo = data.source;
            rowsData = data.rows || [];
          }
        } catch (e) {
          // fallback to /ai/chat
        }
      }

      if (!answerText) {
        const res = await fetch(`${API_BASE}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(session.token)
          },
          body: JSON.stringify({ message: textToSend })
        });

        if (!res.ok) throw new Error('Could not contact AI Assistant');
        const data = await res.json();
        answerText = data.response;
        sourceInfo = "CivicPulse AI Engine";
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: answerText,
        source: sourceInfo,
        rows: rowsData
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "Sorry, I am having trouble connecting to AI services right now. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999 }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            transition: 'transform 0.2s ease',
          }}
        >
          <Bot size={20} />
          <span>Civic AI & Analytics</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        </button>
      ) : (
        <div style={{
          width: '380px',
          height: '520px',
          background: 'var(--bg-panel-solid, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} />
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', lineHeight: 1.2 }}>Civic AI & Analytics Assistant</strong>
                <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Powered by Gemini & CivicPulse Engine</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages body */}
          <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '10px 12px',
                borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: m.sender === 'user' ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '0.83rem',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap'
              }}>
                <div>{m.text}</div>
                {m.source && (
                  <small style={{ display: 'block', marginTop: '4px', fontSize: '0.68rem', color: m.sender === 'user' ? '#93c5fd' : '#94a3b8' }}>
                    Source: {m.source}
                  </small>
                )}
                {m.rows && m.rows.length > 0 && (
                  <div style={{ overflowX: 'auto', marginTop: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {m.rows.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {Object.entries(row).map(([k, v], cIdx) => (
                              <td key={cIdx} style={{ fontSize: '0.72rem', padding: '4px 6px', color: '#e2e8f0' }}>
                                <strong>{k}:</strong> {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '14px', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw className="spin" size={14} /> AI analyzing database...
              </div>
            )}
          </div>

          {/* Quick chips */}
          <div style={{ padding: '6px 10px', display: 'flex', gap: '6px', overflowX: 'auto', borderTop: '1px solid var(--border-color, #334155)', background: 'rgba(0,0,0,0.1)' }}>
            <button onClick={() => sendMessage('What is the status of my complaint?')} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📋 My Status
            </button>
            <button onClick={() => sendMessage('Which places had the most water complaints this month?')} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📊 Place Stats
            </button>
            <button onClick={() => sendMessage('Which state has the best resolution rate?')} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🏆 Best State
            </button>
          </div>

          {/* Input box */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ padding: '10px 12px', display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color, #334155)' }}>
            <input
              type="text"
              placeholder="Ask AI or stats question..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)', background: 'var(--bg-input, #0f172a)', color: '#ffffff', fontSize: '0.85rem' }}
            />
            <button type="submit" disabled={loading || !inputMsg.trim()} style={{ padding: '8px 12px', borderRadius: '8px', background: '#3b82f6', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function FAQSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqs = [
    {
      category: 'Filing & Intake',
      question: 'How does CivicPulse AI auto-classify and route my complaint?',
      answer: 'CivicPulse uses advanced Multimodal AI and Gemini Language Models to analyze your grievance text, voice transcripts, and photo evidence. It automatically assigns the responsible government department (e.g. Water Works, Public Works, Power Grid), determines priority level (Critical, High, Medium, Low), and routes it directly to the designated official.'
    },
    {
      category: 'Filing & Intake',
      question: 'What happens when an AI Duplicate Grievance Alert pops up?',
      answer: 'Our location-aware AI engine checks nearby active reports within your ward/neighborhood. If a similar issue was recently filed, an alert will display. You can click "👍 Upvote & Boost Priority" to join existing citizens in escalating the ticket, or click "Submit New Anyway" if your issue is distinct.'
    },
    {
      category: 'Filing & Intake',
      question: 'Can I dictate my complaint using Voice-to-Text?',
      answer: 'Yes! When filing a complaint, click the Microphone 🎙️ button to speak your grievance in natural language. Our system transcribes your voice directly into the report.'
    },
    {
      category: 'Tracking & Timeline',
      question: 'What do the 4 stages on the Complaint Timeline mean?',
      answer: 'Every complaint progresses through 4 clear lifecycle stages:\n1. Reported: Grievance logged by citizen.\n2. AI Routed: Machine learning assigns department & priority.\n3. In Progress: Field officer initiated resolution work.\n4. Resolved: Issue fixed with photo proof & timestamp uploaded by officer.'
    },
    {
      category: 'Tracking & Timeline',
      question: 'How is resolution verified by department officials?',
      answer: 'Field officers must attach a geo-tagged resolution photo proof before marking a ticket as Resolved. Citizens and administrators can compare the original reported photo against the official resolution proof side-by-side on the dashboard.'
    },
    {
      category: 'Notifications & Alerts',
      question: 'How do I receive instant status updates on Telegram?',
      answer: 'During registration or profile settings, add your Telegram Chat ID. CivicPulse will automatically send instant push notifications whenever your grievance status changes or an official posts a progress update.'
    },
    {
      category: 'Department & Governance',
      question: 'What is the Executive Monitor dashboard for Chief Ministers & PMs?',
      answer: 'The Executive Monitor provides real-time state-level and national-level oversight, allowing CMs and national administrators to track department resolution rates, bottleneck areas, hotspot maps, and download Executive CSV Briefs.'
    }
  ];

  const categories = ['All', 'Filing & Intake', 'Tracking & Timeline', 'Notifications & Alerts', 'Department & Governance'];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="panel" style={{ padding: '28px', maxWidth: '1000px', margin: '0 auto 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
          <HelpCircle size={28} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-main)' }}>Frequently Asked Questions (FAQs)</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Find answers to common questions about filing grievances, AI routing, tracking progress, and resolution proof.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search FAQs by keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)', fontSize: '0.88rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: activeCategory === cat ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                background: activeCategory === cat ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat ? '#60a5fa' : 'var(--color-muted)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion FAQ List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredFaqs.length === 0 ? (
          <p style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>No matching FAQs found for your search query.</p>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = expandedIndex === idx;
            return (
              <div 
                key={idx}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  background: isOpen ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    color: 'var(--color-main)',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 'bold' }}>{faq.category}</span>
                    {faq.question}
                  </span>
                  {isOpen ? <ChevronDown size={18} color="#60a5fa" /> : <ChevronRight size={18} color="var(--color-muted)" />}
                </button>

                {isOpen && (
                  <div style={{ padding: '0 18px 16px', color: 'var(--color-muted)', fontSize: '0.88rem', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '12px', whiteSpace: 'pre-line' }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function ContactUsSection({ user, session }) {
  const [form, setForm] = useState({ name: user?.full_name || '', email: '', department: 'Public Works', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: user?.full_name || '', email: '', department: 'Public Works', subject: '', message: '' });
    }, 4000);
  };

  return (
    <section className="panel" style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto 30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <PhoneCall size={28} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-main)' }}>Contact Us & Nodal Helplines</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Get in touch with department nodal officers, emergency civic support, or send direct inquiries.
          </p>
        </div>
      </div>

      {/* Emergency Helpline Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '30px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', marginBottom: '6px' }}>
            <Phone size={18} /> Emergency Civic Line
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>112 / 1800-11-2024</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginTop: '4px' }}>Toll-Free • Available 24x7</span>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '6px' }}>
            <Building2 size={18} /> Central Grievance Cell
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>011-2309-8800</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginTop: '4px' }}>Cabinet Secretariat, North Block</span>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold', marginBottom: '6px' }}>
            <Mail size={18} /> Support Email
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#ffffff' }}>support@civicpulse.gov.in</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginTop: '4px' }}>Response time: &lt; 24 hours</span>
        </div>
      </div>

      {/* Main Grid: Contact Form & Department Directory */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Direct Inquiry Form */}
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#3b82f6" /> Send Direct Message to Nodal Officer
          </h3>

          {submitted ? (
            <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#34d399', textAlign: 'center', fontWeight: 'bold' }}>
              ✓ Thank you! Your message has been routed to the Nodal Officer. Reference Ticket ID will be sent to your phone.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Your Name
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: '#ffffff' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Email / Contact
                  <input
                    required
                    type="text"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email or phone number"
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: '#ffffff' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Target Department
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: '#ffffff' }}
                  >
                    <option value="Public Works">Public Works (Roads & Drainage)</option>
                    <option value="Water Works">Water Works & Sanitation</option>
                    <option value="Power Grid">Electricity & Power Grid</option>
                    <option value="Waste Management">Waste & Sanitation</option>
                    <option value="Health & Medical">Health & Medical Services</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Subject
                  <input
                    required
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Urgent pipeline repair"
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: '#ffffff' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                Message / Inquiry Details
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Describe your inquiry or request for the nodal department..."
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: '#ffffff' }}
                />
              </label>

              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '8px',
                  marginTop: '4px'
                }}
              >
                <Send size={16} /> Send Inquiry
              </button>
            </form>
          )}
        </div>

        {/* Key Department Directory & Office Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--color-main)', textTransform: 'uppercase' }}>Department Toll-Free Lines</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--color-muted)' }}>💧 Water Supply & Leakage</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1800-425-0011</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--color-muted)' }}>🚧 Roads & Potholes (PWD)</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1800-180-2222</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--color-muted)' }}>⚡ Electricity & Power Outages</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1912</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>🧹 Sanitation & Solid Waste</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1800-11-0033</strong>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--color-main)', textTransform: 'uppercase' }}>Headquarters Address</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: '1.5' }}>
              <strong>CivicPulse National Grievance Monitoring Hub</strong><br />
              Department of Administrative Reforms & Public Grievances (DARPG)<br />
              Sardar Patel Bhawan, Parliament Street, New Delhi - 110001
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
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
    telegram_chat_id: '',
  });
  const [complaints, setComplaints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [question, setQuestion] = useState('Which places had the most water complaints this month?');
  const [chatHistory, setChatHistory] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState({
    text: 'Water pipe is leaking near the bus stop and flooding the lane.',
    place: '',
    state: '',
    lat: '',
    lng: '',
    voice_transcript: '',
  });
  const [expandedComplaintId, setExpandedComplaintId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [commentingId, setCommentingId] = useState(null);
  const [transferringId, setTransferringId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAnalyticsPopup, setShowAnalyticsPopup] = useState(false);
  const [liveQueueCollapsed, setLiveQueueCollapsed] = useState(false);
  const [archiveQueueCollapsed, setArchiveQueueCollapsed] = useState(false);
  const [duplicateModalData, setDuplicateModalData] = useState(null);

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'success' | 'error' | 'manually_edited'
  const [locationError, setLocationError] = useState('');

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setForm((prev) => ({
        ...prev,
        voice_transcript: (prev.voice_transcript ? prev.voice_transcript + ' ' : '') + transcript.trim()
      }));
    };

    rec.onerror = (e) => {
      console.error(e);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

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

  useEffect(() => {
    if (complaints.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    if (trackId && complaints.some(c => c.id === trackId)) {
      setExpandedComplaintId(trackId);
      setTimeout(() => {
        const el = document.getElementById(`complaint-${trackId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 600);
    }
  }, [complaints]);

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

  async function analyzeImageAndPopulate(file) {
    if (!session?.token) return;
    setAnalyzingImage(true);
    setNotice({ type: 'info', text: 'Analyzing image with Gen AI to extract complaint details...' });
    try {
      const payload = new FormData();
      payload.append('photo', file);
      
      const res = await fetch(`${API_BASE}/ai/analyze-image`, {
        method: 'POST',
        headers: authHeaders(session.token),
        body: payload,
      });
      
      if (!res.ok) {
        throw new Error('Image analysis failed.');
      }
      
      const data = await res.json();
      if (data.description) {
        setForm(prev => ({ ...prev, text: data.description }));
        setNotice({ type: 'success', text: 'Gen AI populated complaint box successfully!' });
      }
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: 'Failed to auto-populate complaint from image.' });
    } finally {
      setAnalyzingImage(false);
    }
  }

  async function submitComplaint(event, bypassDuplicateCheck = false) {
    if (event && event.preventDefault) event.preventDefault();
    const formEl = event?.currentTarget || document.querySelector('form.complaint-form');
    const formElements = formEl?.elements;
    setLoading(true);
    setNotice(null);

    try {
      if (!bypassDuplicateCheck && form.text.trim().length > 10) {
        try {
          const checkRes = await fetch(`${API_BASE}/complaints/check-duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(session.token) },
            body: JSON.stringify({ 
              text: form.text, 
              place: form.place, 
              state: form.state,
              lat: form.lat ? parseFloat(form.lat) : null,
              lng: form.lng ? parseFloat(form.lng) : null
            }),
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.has_duplicates && checkData.matches && checkData.matches.length > 0) {
              const bestMatch = checkData.matches[0];
              setDuplicateModalData(bestMatch);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn("Duplicate check failed, continuing:", err);
        }
      }

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
      const fileInput = formElements?.namedItem('photo');
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
      setSelectedFile(null);
      setForm({
        text: '',
        place: '',
        state: '',
        lat: '',
        lng: '',
        voice_transcript: '',
      });
      if (formEl?.reset) formEl.reset();
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

  const [isUpvotingModal, setIsUpvotingModal] = useState(false);

  const handleUpvoteAndClose = async (complaintId, event) => {
    if (event && event.stopPropagation) event.stopPropagation();
    setIsUpvotingModal(true);
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/upvote`, {
        method: 'POST',
        headers: authHeaders(session.token)
      });
      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Could not upvote complaint.');
      }
      setNotice({ type: 'success', text: `👍 Ticket #${complaintId} upvoted! Priority boosted and department notified.` });
      setDuplicateModalData(null);
      setForm({
        text: '',
        place: '',
        state: '',
        lat: '',
        lng: '',
        voice_transcript: '',
      });
      setSelectedFile(null);
      await refresh();
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Error upvoting complaint.' });
    } finally {
      setIsUpvotingModal(false);
    }
  };

  const proceedWithSubmission = async () => {
    setDuplicateModalData(null);
    await submitComplaint(null, true);
  };

  async function askQuestion(event) {
    event.preventDefault();
    const queryText = question.trim();
    if (!queryText) return;
    
    setQuestion('');
    setIsAsking(true);
    setNotice(null);
    
    setChatHistory(prev => [...prev, { sender: 'user', text: queryText }]);
    
    try {
      const res = await fetch(`${API_BASE}/analytics/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session.token) },
        body: JSON.stringify({ question: queryText }),
      });
      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Analytics request failed.');
      }
      const data = await res.json();
      setAnalytics(data);
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        text: data.answer,
        source: data.source,
        rows: data.rows || []
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        text: `Oops, I encountered an issue: ${error.message || 'Connection failed.'}`,
        source: 'system-error',
        rows: []
      }]);
    } finally {
      setIsAsking(false);
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

  async function transferComplaint(event, complaintId) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const deptSelect = formEl.elements.namedItem('transfer_dept');
    const reasonInput = formEl.elements.namedItem('transfer_reason');
    const new_department = deptSelect?.value;
    const reason = reasonInput?.value;

    if (!new_department || !reason?.trim()) {
      alert("Please select a department and enter a reason.");
      return;
    }

    setTransferringId(complaintId);
    setNotice(null);

    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(session.token)
        },
        body: JSON.stringify({ new_department, reason })
      });

      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Could not transfer complaint.');
      }

      setNotice({ type: 'success', text: `Grievance transferred to ${new_department} successfully.` });
      await refresh();
      setExpandedComplaintId(null);
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Error transferring complaint.' });
    } finally {
      setTransferringId(null);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div>
            <p className="eyebrow">AI grievance redressal</p>
            <h1>CivicPulse</h1>
          </div>

          <div className="navTabs" style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'dashboard' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                color: activeTab === 'dashboard' ? '#ffffff' : 'var(--color-muted)',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Activity size={15} /> Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faqs')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'faqs' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                color: activeTab === 'faqs' ? '#ffffff' : 'var(--color-muted)',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <HelpCircle size={15} /> FAQs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'contact' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                color: activeTab === 'contact' ? '#ffffff' : 'var(--color-muted)',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <PhoneCall size={15} /> Contact Us
            </button>
          </div>
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
                <div className="notificationDropdownHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 'bold' }}>Notifications</h3>
                  {notifications.some(n => !n.read) && (
                    <button 
                      type="button" 
                      onClick={markAllNotificationsAsRead}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Mark all read
                    </button>
                  )}
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

      {activeTab === 'faqs' && <FAQSection />}
      {activeTab === 'contact' && <ContactUsSection user={session.user} session={session} />}

      {activeTab === 'dashboard' && (
        <>
          <AnalyticsDashboard user={session.user} complaints={complaints} />

      <section className="workspace">
        {session.user.user_type === 'Admin' ? (
          <AdminPanel token={session.token} user={session.user} complaints={complaints} refresh={refresh} />
        ) : ['Chief Minister', 'Prime Minister'].includes(session.user.user_type) ? (
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
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
              <span>Voice transcript</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                <input
                  value={form.voice_transcript}
                  onChange={(event) => setForm({ ...form, voice_transcript: event.target.value })}
                  placeholder={isListening ? "Listening... Speak now..." : "Optional speech-to-text transcript"}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`iconButton ${isListening ? 'listening-active' : ''}`}
                  title={isListening ? "Stop listening" : "Record voice transcript"}
                  style={{
                    height: '38px',
                    width: '38px',
                    minHeight: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isListening ? '#ef4444' : '#f1f5f9',
                    color: isListening ? '#ffffff' : '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                >
                  <Mic className={isListening ? 'pulse-icon' : ''} size={16} />
                </button>
              </div>
            </label>
            <label className="fileInput" style={{ cursor: analyzingImage ? 'not-allowed' : 'pointer', opacity: analyzingImage ? 0.7 : 1 }}>
              {analyzingImage ? (
                <RefreshCw size={18} className="spin" />
              ) : (
                <Upload size={18} />
              )}
              <span>
                {analyzingImage 
                  ? 'AI analyzing image...' 
                  : selectedFile 
                    ? `Selected: ${selectedFile.name}` 
                    : 'Attach photo'
                }
              </span>
              <input 
                name="photo" 
                type="file" 
                accept="image/*" 
                disabled={analyzingImage}
                onChange={(e) => {
                  const file = e.target.files[0];
                  setSelectedFile(file || null);
                  if (file) {
                    analyzeImageAndPopulate(file);
                  }
                }}
              />
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

      {session.user.user_type !== 'Admin' && (
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
                      id={`complaint-${complaint.id}`}
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
                      <div className="rowBadges" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => handleUpvoteAndClose(complaint.id, e)}
                          title="Upvote grievance priority"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: complaint.upvotes > 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                            color: complaint.upvotes > 0 ? '#10b981' : 'var(--color-muted)',
                            border: `1px solid ${complaint.upvotes > 0 ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}`,
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <ThumbsUp size={12} />
                          <span>{complaint.upvotes || 0} {complaint.upvotes === 1 ? 'Vote' : 'Votes'}</span>
                        </button>
                        <span className={`pill ${complaint.classification.priority}`}>{complaint.classification.priority}</span>
                        <span className={`pill status-pill ${complaint.status}`}>{complaint.duplicate_of ? `Duplicate of ${complaint.duplicate_of}` : complaint.status}</span>
                      </div>
                    </article>
                    
                    {isExpanded && (
                      <div className="complaint-detail-expansion" style={{
                        padding: '20px',
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
                            <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', textTransform: 'uppercase' }}>Full Grievance Text</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{complaint.text}</p>
                            
                            {complaint.voice_transcript && (
                              <div className="voice-transcript-box" style={{ marginTop: '12px' }}>
                                <h5 style={{ margin: '0 0 4px', fontSize: '0.8rem' }}>🎙️ Voice Transcript</h5>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>"{complaint.voice_transcript}"</p>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', textTransform: 'uppercase' }}>Reporter Details</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Name:</strong> {complaint.reporter_name || 'Anonymous'} ({complaint.reporter_username || 'citizen'})</span>
                              {complaint.contact && <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Contact:</strong> {complaint.contact}</span>}
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Date Filed:</strong> {new Date(complaint.created_at).toLocaleString()}</span>
                            </div>
                            
                            <div>
                              <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', textTransform: 'uppercase' }}>AI Classification Info</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Assigned Department:</strong> {complaint.classification.department}</span>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>AI Confidence:</strong> {(complaint.classification.confidence * 100).toFixed(0)}%</span>
                              {complaint.classification.tags && complaint.classification.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {complaint.classification.tags.map(tag => (
                                    <span key={tag} className="tag-badge">#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <ComplaintTimeline complaint={complaint} />
                          <PhotoComparisonCard complaint={complaint} />
                        </div>

                        {!['Citizen', 'Chief Minister', 'Prime Minister'].includes(session.user.user_type || 'Citizen') && complaint.status !== 'resolved' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                              {/* Add Update Comment Form */}
                              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                                <h4 style={{ margin: '0 0 8px', color: 'var(--color-primary-hover)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Add Progress Update</h4>
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
                                      border: '1px solid var(--border-color)', 
                                      borderRadius: '6px',
                                      background: 'var(--bg-input)',
                                      color: 'var(--color-main)',
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
                              <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px dashed rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '16px', width: '100%' }}>
                                <h4 style={{ margin: '0 0 8px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>Action Required: Resolve</h4>
                                <form onSubmit={(e) => resolveComplaint(e, complaint.id)} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <label style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer', color: 'var(--color-main)' }}>
                                    <span style={{ fontWeight: '600' }}>Attach Repair Photo Proof:</span>
                                    <input 
                                      name="resolution_photo" 
                                      type="file" 
                                      accept="image/*" 
                                      required 
                                      style={{ 
                                        fontSize: '0.85rem',
                                        color: 'var(--color-muted)',
                                        padding: '4px 0'
                                      }} 
                                    />
                                  </label>
                                  <button 
                                    type="submit" 
                                    className="primary success-btn" 
                                    disabled={resolvingId === complaint.id}
                                    style={{ 
                                      padding: '8px 12px', 
                                      background: '#10b981', 
                                      color: '#ffffff', 
                                      border: 'none', 
                                      borderRadius: '6px', 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      fontWeight: 'bold',
                                      fontSize: '0.85rem',
                                      transition: 'background 0.2s'
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

                              {/* Transfer Department Form */}
                              <div style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '16px', width: '100%' }}>
                                <h4 style={{ margin: '0 0 8px', color: '#3b82f6', fontSize: '0.9rem', fontWeight: 'bold' }}>Transfer Grievance to another Department</h4>
                                <form onSubmit={(e) => transferComplaint(e, complaint.id)} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <label style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--color-main)' }}>
                                    <span style={{ fontWeight: '600' }}>Select Destination Department:</span>
                                    <select 
                                      name="transfer_dept" 
                                      required
                                      style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-input)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--color-main)',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="Department of Agriculture">Department of Agriculture</option>
                                      <option value="Department of Environment">Department of Environment</option>
                                      <option value="Department of Finance">Department of Finance</option>
                                      <option value="Department of Fisheries">Department of Fisheries</option>
                                      <option value="Department of Forests">Department of Forests</option>
                                      <option value="Department of Home and Hill Affairs">Department of Home and Hill Affairs</option>
                                      <option value="Department of Information Technology and Electronics">Department of Information Technology and Electronics</option>
                                      <option value="Department of Law">Department of Law</option>
                                      <option value="Department of Parliamentary Affairs">Department of Parliamentary Affairs</option>
                                      <option value="Department of Power">Department of Power</option>
                                      <option value="Department of Public Enterprises & Industrial Reconstruction">Department of Public Enterprises & Industrial Reconstruction</option>
                                      <option value="Department of Public Works">Department of Public Works</option>
                                      <option value="Department of School Education">Department of School Education</option>
                                      <option value="Department of Sundarban Affairs">Department of Sundarban Affairs</option>
                                      <option value="Department of Technical Education, Training and Skill Development">Department of Technical Education, Training and Skill Development</option>
                                      <option value="Department of Transport">Department of Transport</option>
                                      <option value="Department of Urban Development and Municipal Affairs">Department of Urban Development and Municipal Affairs</option>
                                      <option value="Department of Industry, Commerce & Enterprises">Department of Industry, Commerce & Enterprises</option>
                                      <option value="Department of Health & Family Welfare">Department of Health & Family Welfare</option>
                                      <option value="Department of Information & Cultural Affairs">Department of Information & Cultural Affairs</option>
                                      <option value="Department of Labour">Department of Labour</option>
                                      <option value="Department of Land & Land Reforms">Department of Land & Land Reforms</option>
                                      <option value="Department of Minority Affairs & Madrasah Education">Department of Minority Affairs & Madrasah Education</option>
                                      <option value="Department of North Bengal Development">Department of North Bengal Development</option>
                                      <option value="Department of Personnel & Administrative Reforms">Department of Personnel & Administrative Reforms</option>
                                      <option value="Department of Tourism">Department of Tourism</option>
                                      <option value="Department of Women and Child Development and Social Welfare">Department of Women and Child Development and Social Welfare</option>
                                    </select>
                                  </label>
                                  <label style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--color-main)' }}>
                                    <span style={{ fontWeight: '600' }}>Reason for Transfer:</span>
                                    <input 
                                      name="transfer_reason" 
                                      type="text" 
                                      placeholder="e.g. Work completed here / Misclassified grievance / Needs joint action..." 
                                      required
                                      style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-input)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--color-main)',
                                        fontSize: '0.85rem'
                                      }}
                                    />
                                  </label>
                                  <button 
                                    type="submit" 
                                    className="primary" 
                                    disabled={transferringId === complaint.id}
                                    style={{ 
                                      padding: '8px 12px', 
                                      background: '#3b82f6', 
                                      color: '#ffffff', 
                                      border: 'none', 
                                      borderRadius: '6px', 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      fontWeight: 'bold',
                                      fontSize: '0.85rem',
                                      transition: 'background 0.2s'
                                    }}
                                  >
                                    {transferringId === complaint.id ? (
                                      <RefreshCw className="spin" size={14} />
                                    ) : (
                                      <Send size={14} />
                                    )}
                                    {transferringId === complaint.id ? 'Transferring...' : 'Transfer Grievance'}
                                  </button>
                                </form>
                              </div>
                            </div>
                          )}
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
                      id={`complaint-${complaint.id}`}
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
                      <div className="complaint-detail-expansion resolved-expansion" style={{
                        padding: '20px',
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
                            <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', textTransform: 'uppercase' }}>Full Grievance Text</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{complaint.text}</p>
                            
                            {complaint.voice_transcript && (
                              <div className="voice-transcript-box" style={{ marginTop: '12px' }}>
                                <h5 style={{ margin: '0 0 4px', fontSize: '0.8rem' }}>🎙️ Voice Transcript</h5>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>"{complaint.voice_transcript}"</p>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', textTransform: 'uppercase' }}>Reporter Details</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Name:</strong> {complaint.reporter_name || 'Anonymous'} ({complaint.reporter_username || 'citizen'})</span>
                              {complaint.contact && <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Contact:</strong> {complaint.contact}</span>}
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Date Filed:</strong> {new Date(complaint.created_at).toLocaleString()}</span>
                            </div>
                            
                            <div>
                              <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', textTransform: 'uppercase' }}>AI Classification Info</h4>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>Assigned Department:</strong> {complaint.classification.department}</span>
                              <span style={{ fontSize: '0.9rem', display: 'block' }}><strong>AI Confidence:</strong> {(complaint.classification.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <ComplaintTimeline complaint={complaint} />
                          <PhotoComparisonCard complaint={complaint} />
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
      )}
      </>
      )}



      {/* AI Duplicate Alert Modal */}
      {duplicateModalData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-panel-solid, #1e293b)', border: '1px solid var(--border-color, #334155)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-main)' }}>AI Duplicate Grievance Alert</h3>
                <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 'bold' }}>{duplicateModalData.match_percent}% Match Found with active complaint</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Ticket #{duplicateModalData.id} • {duplicateModalData.department}</span>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-main)' }}>"{duplicateModalData.text}"</p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '4px' }}>
                <span>Status: <strong style={{ color: '#10b981' }}>{(duplicateModalData.status || 'NEW').toUpperCase()}</strong></span>
                <span>Upvotes: <strong>👍 {duplicateModalData.upvotes || 0}</strong></span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: '1.4' }}>
              An active complaint matching your report has already been logged. You can <strong>upvote this existing ticket</strong> to boost its priority for department officials, or proceed to submit a separate ticket.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                disabled={isUpvotingModal}
                onClick={(e) => handleUpvoteAndClose(duplicateModalData.id, e)}
                style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {isUpvotingModal ? <RefreshCw className="spin" size={16} /> : <ThumbsUp size={16} />}
                {isUpvotingModal ? 'Upvoting...' : 'Upvote & Boost Priority'}
              </button>
              <button
                type="button"
                disabled={isUpvotingModal}
                onClick={proceedWithSubmission}
                style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Submit New Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Chatbot Widget */}
      <AIChatAssistantWidget session={session} refresh={refresh} />
    </main>
  );
}

function AuthScreen({ mode, setMode, form, setForm, loading, notice, onSubmit }) {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const countries = [
    { code: '+91', flag: 'https://flagcdn.com/w40/in.png', label: 'IN' },
    { code: '+1', flag: 'https://flagcdn.com/w40/us.png', label: 'US' },
    { code: '+44', flag: 'https://flagcdn.com/w40/gb.png', label: 'UK' },
    { code: '+61', flag: 'https://flagcdn.com/w40/au.png', label: 'AU' },
    { code: '+971', flag: 'https://flagcdn.com/w40/ae.png', label: 'AE' },
    { code: '+65', flag: 'https://flagcdn.com/w40/sg.png', label: 'SG' },
    { code: '+81', flag: 'https://flagcdn.com/w40/jp.png', label: 'JP' },
    { code: '+49', flag: 'https://flagcdn.com/w40/de.png', label: 'DE' },
    { code: '+33', flag: 'https://flagcdn.com/w40/fr.png', label: 'FR' },
  ];

  const currentCountry = countries.find(c => c.code === countryCode) || countries[0];

  const [roleType, setRoleType] = useState('Citizen');
  const [deptName, setDeptName] = useState('Department of Urban Development and Municipal Affairs');

  useEffect(() => {
    if (mode === 'register') {
      setForm(f => ({ ...f, phone: countryCode + phoneDigits }));
    }
  }, [countryCode, phoneDigits, mode, setForm]);

  useEffect(() => {
    if (mode === 'register') {
      if (roleType === 'Officer') {
        setForm(f => ({ ...f, user_type: `${deptName} Officer` }));
      } else {
        setForm(f => ({ ...f, user_type: roleType }));
      }
    }
  }, [roleType, deptName, mode, setForm]);

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
                User Type / Role
                <select
                  value={roleType}
                  onChange={(event) => setRoleType(event.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-input)',
                    background: 'var(--bg-input)',
                    color: 'var(--color-main)',
                    fontSize: '1rem',
                    marginTop: '4px',
                    marginBottom: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Citizen">Citizen (General Public)</option>
                  <option value="Officer">Department Officer</option>
                  <option value="Chief Minister">Chief Minister (State Head)</option>
                  <option value="Prime Minister">Prime Minister (Country Head)</option>
                  <option value="Admin">System Administrator (Control Panel)</option>
                </select>
              </label>

              {roleType === 'Officer' && (
                <label>
                  Assigned Department (Matches AI Classification)
                  <select
                    value={deptName}
                    onChange={(event) => setDeptName(event.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-input)',
                      background: 'var(--bg-input)',
                      color: 'var(--color-main)',
                      fontSize: '1rem',
                      marginTop: '4px',
                      marginBottom: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Department of Agriculture">Department of Agriculture</option>
                    <option value="Department of Environment">Department of Environment</option>
                    <option value="Department of Finance">Department of Finance</option>
                    <option value="Department of Fisheries">Department of Fisheries</option>
                    <option value="Department of Forests">Department of Forests</option>
                    <option value="Department of Home and Hill Affairs">Department of Home and Hill Affairs</option>
                    <option value="Department of Information Technology and Electronics">Department of Information Technology and Electronics</option>
                    <option value="Department of Law">Department of Law</option>
                    <option value="Department of Parliamentary Affairs">Department of Parliamentary Affairs</option>
                    <option value="Department of Power">Department of Power</option>
                    <option value="Department of Public Enterprises & Industrial Reconstruction">Department of Public Enterprises & Industrial Reconstruction</option>
                    <option value="Department of Public Works">Department of Public Works</option>
                    <option value="Department of School Education">Department of School Education</option>
                    <option value="Department of Sundarban Affairs">Department of Sundarban Affairs</option>
                    <option value="Department of Technical Education, Training and Skill Development">Department of Technical Education, Training and Skill Development</option>
                    <option value="Department of Transport">Department of Transport</option>
                    <option value="Department of Urban Development and Municipal Affairs">Department of Urban Development and Municipal Affairs</option>
                    <option value="Department of Industry, Commerce & Enterprises">Department of Industry, Commerce & Enterprises</option>
                    <option value="Department of Health & Family Welfare">Department of Health & Family Welfare</option>
                    <option value="Department of Information & Cultural Affairs">Department of Information & Cultural Affairs</option>
                    <option value="Department of Labour">Department of Labour</option>
                    <option value="Department of Land & Land Reforms">Department of Land & Land Reforms</option>
                    <option value="Department of Minority Affairs & Madrasah Education">Department of Minority Affairs & Madrasah Education</option>
                    <option value="Department of North Bengal Development">Department of North Bengal Development</option>
                    <option value="Department of Personnel & Administrative Reforms">Department of Personnel & Administrative Reforms</option>
                    <option value="Department of Tourism">Department of Tourism</option>
                    <option value="Department of Women and Child Development and Social Welfare">Department of Women and Child Development and Social Welfare</option>
                  </select>
                </label>
              )}

              {roleType !== 'Citizen' && roleType !== 'Prime Minister' && roleType !== 'Admin' && (
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
            </>
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
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <div style={{ position: 'relative', width: '110px' }}>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        padding: '11px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-input)',
                        background: 'var(--bg-input)',
                        color: 'var(--color-main)',
                        cursor: 'pointer',
                        height: '100%',
                        boxSizing: 'border-box',
                        userSelect: 'none'
                      }}
                    >
                      <img src={currentCountry.flag} alt={currentCountry.label} style={{ width: '22px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.85rem' }}>{currentCountry.code}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>
                    </div>

                    {isDropdownOpen && (
                      <div 
                        onClick={() => setIsDropdownOpen(false)}
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 99,
                          background: 'transparent'
                        }}
                      />
                    )}
                    
                    {isDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        width: '160px',
                        background: 'var(--bg-panel-solid, #0d142a)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-input)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        padding: '4px'
                      }}>
                        {countries.map(c => (
                          <div
                            key={c.code}
                            onClick={() => {
                              setCountryCode(c.code);
                              setIsDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              color: 'var(--color-main)',
                              fontSize: '0.85rem',
                              transition: 'background 0.2s ease',
                            }}
                            className="custom-select-option"
                          >
                            <img src={c.flag} alt={c.label} style={{ width: '22px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} />
                            <span>{c.code} ({c.label})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phoneDigits}
                    onChange={(event) => {
                      const val = event.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneDigits(val);
                    }}
                    placeholder="10-digit number"
                    pattern="\d{10}"
                    title="Please enter a valid 10-digit phone number"
                    autoComplete="tel"
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </label>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Telegram Chat ID <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>(Optional)</span>
                </span>
                <input
                  value={form.telegram_chat_id || ''}
                  onChange={(event) => setForm({ ...form, telegram_chat_id: event.target.value })}
                  placeholder="e.g. 582910243"
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', display: 'block', marginTop: '3px' }}>
                  Get your Chat ID by messaging `@userinfobot` or `/my_id` to our notifier bot.
                </span>
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
