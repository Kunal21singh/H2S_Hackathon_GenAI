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
  Clock,
  Compass,
  Download,
  HelpCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Mic,
  Moon,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldCheck,
  Sun,
  ThumbsUp,
  Upload,
  User,
  Waves,
  X,
} from 'lucide-react';
import './styles.css';

// Import local modular components
import { HotspotMap } from './components/HotspotMap';
import { ComplaintTimeline } from './components/ComplaintTimeline';
import { PhotoComparisonCard } from './components/PhotoComparisonCard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ExecutiveMonitor } from './components/ExecutiveMonitor';
import { AdminPanel } from './components/AdminPanel';
import { AIChatAssistantWidget } from './components/AIChatAssistantWidget';
import { FAQSection } from './components/FAQSection';
import { ContactUsSection } from './components/ContactUsSection';
import { UserProfileSection } from './components/UserProfileSection';
import { ReportsAndChartsSection } from './components/ReportsAndChartsSection';
import { AuthScreen } from './components/AuthScreen';
import { Metric } from './components/Metric';

// Import local modular utilities
import { authHeaders, readError } from './utils/auth';
import { downloadCSV } from './utils/csv';
import { getShortDeptName, getDeptIcon, getDeptHealthGrade } from './utils/department';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const AUTH_STORAGE_KEY = 'civicpulse-session';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('civicpulse_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('civicpulse_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
      if (complaintsRes.status === 401 || hotspotsRes.status === 401 || notificationsRes.status === 401) {
        setSession(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setNotice({
          type: 'info',
          text: 'Your session has expired. Please log in again.',
        });
        return;
      }
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

  async function markAllNotificationsAsRead() {
    if (!session?.token) return;
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => 
        fetch(`${API_BASE}/notifications/${n.id}/read`, {
          method: 'POST',
          headers: authHeaders(session.token)
        })
      ));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error("Failed to mark all notifications as read:", e);
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
              onClick={() => setActiveTab('reports')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'reports' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                color: activeTab === 'reports' ? '#ffffff' : 'var(--color-muted)',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <BarChart3 size={15} /> Reports & Charts
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
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'profile' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                color: activeTab === 'profile' ? '#ffffff' : 'var(--color-muted)',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <User size={15} /> Profile
            </button>
          </div>
        </div>
        <div className="topActions">
          <div className="accountBadge" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }} title="View Profile">
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

          <button className="iconButton" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

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

      {activeTab === 'reports' && <ReportsAndChartsSection user={session.user} complaints={complaints} />}
      {activeTab === 'faqs' && <FAQSection />}
      {activeTab === 'contact' && <ContactUsSection user={session.user} session={session} />}
      {activeTab === 'profile' && <UserProfileSection session={session} setSession={setSession} complaints={complaints} />}

      {activeTab === 'dashboard' && (
        <>
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

createRoot(document.getElementById('root')).render(<App />);
