import React from 'react';
import { authHeaders } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export function AdminPanel({ token, user, complaints, refresh }) {
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
