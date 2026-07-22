import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { authHeaders, readError } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const AUTH_STORAGE_KEY = 'civicpulse-session';

export function UserProfileSection({ session, setSession, complaints }) {
  const user = session.user;
  const [profileForm, setProfileForm] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    state: user.state || '',
    telegram_chat_id: user.telegram_chat_id || ''
  });
  const [passForm, setPassForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const userComplaints = complaints.filter(c => c.reporter_username === user.username);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(session.token)
        },
        body: JSON.stringify(profileForm)
      });
      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Could not update profile.');
      }
      const updatedUser = await res.json();
      const newSession = { ...session, user: updatedUser };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
      setNotice({ type: 'success', text: '✓ Profile details updated successfully!' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Error updating profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm_password) {
      setNotice({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    setPassLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(session.token)
        },
        body: JSON.stringify({
          old_password: passForm.old_password,
          new_password: passForm.new_password
        })
      });
      if (!res.ok) {
        const detail = await readError(res);
        throw new Error(detail || 'Could not change password.');
      }
      setPassForm({ old_password: '', new_password: '', confirm_password: '' });
      setNotice({ type: 'success', text: '🔒 Password changed successfully!' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Error changing password.' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <section className="panel" style={{ padding: '28px', maxWidth: '1000px', margin: '0 auto 30px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justify_content: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 'bold', color: '#ffffff', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)' }}>
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-main)' }}>{user.full_name || user.username}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              <span>@{user.username}</span>
              <span>•</span>
              <span className="pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 'bold', fontSize: '0.72rem' }}>
                {user.user_type}
              </span>
              {user.state && (
                <>
                  <span>•</span>
                  <span>📍 {user.state}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', textTransform: 'uppercase' }}>Filed Reports</span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--color-main)' }}>{userComplaints.length}</strong>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', textTransform: 'uppercase' }}>Account ID</span>
            <strong style={{ fontSize: '0.82rem', color: '#60a5fa', fontFamily: 'monospace' }}>{user.id}</strong>
          </div>
        </div>
      </div>

      {notice && <div className={`notice ${notice.type}`} style={{ marginBottom: '20px' }}>{notice.text}</div>}

      {/* Grid: Profile Form & Password Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Profile Information Form */}
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#3b82f6" /> Personal Profile Details
          </h3>

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              Full Name
              <input
                required
                type="text"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                Phone Number
                <input
                  required
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                State / Region
                <input
                  type="text"
                  placeholder="e.g. West Bengal"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
                />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              Telegram Chat ID (for Push Notifications)
              <input
                type="text"
                placeholder="Optional: Enter Telegram Chat ID"
                value={profileForm.telegram_chat_id}
                onChange={(e) => setProfileForm({ ...profileForm, telegram_chat_id: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
              />
            </label>

            <button
              type="submit"
              disabled={profileLoading}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              {profileLoading ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />}
              {profileLoading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#f59e0b" /> Change Password
          </h3>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              Current Password
              <input
                required
                type="password"
                placeholder="••••••••"
                value={passForm.old_password}
                onChange={(e) => setPassForm({ ...passForm, old_password: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              New Password
              <input
                required
                type="password"
                placeholder="At least 6 characters"
                value={passForm.new_password}
                onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              Confirm New Password
              <input
                required
                type="password"
                placeholder="Re-enter new password"
                value={passForm.confirm_password}
                onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
              />
            </label>

            <button
              type="submit"
              disabled={passLoading}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              {passLoading ? <RefreshCw className="spin" size={16} /> : <Lock size={16} />}
              {passLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
