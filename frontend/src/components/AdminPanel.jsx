import React from 'react';
import { authHeaders } from '../utils/auth';
import { 
  Shield, Users, FileText, Trash2, Edit3, X, Save, 
  MapPin, Tag, Briefcase, UserX, AlertCircle, Calendar, Hash
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export function AdminPanel({ token, user, complaints, refresh }) {
  const [users, setUsers] = React.useState([]);
  const [editingComplaint, setEditingComplaint] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('complaints');
  const [savingId, setSavingId] = React.useState(null);
  const [deleteModal, setDeleteModal] = React.useState(null); // { type: 'complaint' | 'user', id: string, name: string }

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

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id } = deleteModal;
    
    try {
      if (type === 'user') {
        const res = await fetch(`${API_BASE}/auth/users/${id}`, {
          method: 'DELETE',
          headers: authHeaders(token)
        });
        if (res.ok) {
          fetchUsers();
          setDeleteModal(null);
        } else {
          alert("Failed to delete user.");
        }
      } else if (type === 'complaint') {
        const res = await fetch(`${API_BASE}/complaints/${id}`, {
          method: 'DELETE',
          headers: authHeaders(token)
        });
        if (res.ok) {
          refresh();
          if (editingComplaint?.id === id) setEditingComplaint(null);
          setDeleteModal(null);
        } else {
          alert("Failed to delete complaint.");
        }
      }
    } catch (e) {
      alert(`Error deleting ${type}: ` + e.message);
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

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#3b82f6';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'routed': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  return (
    <>
      
      {/* Custom Delete Confirmation Modal */}
      {deleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.15)'
          }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '16px' }}>
              <AlertCircle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>Confirm Deletion</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--color-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Are you sure you want to delete {deleteModal.type === 'user' ? `user @${deleteModal.name}` : `complaint ${deleteModal.name}`}? This action is permanent and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setDeleteModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Complaint Modal Overlay */}
      {editingComplaint && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 900
        }}>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.95)', 
            border: `1px solid ${getPriorityColor(editingComplaint.classification.priority)}40`, 
            borderRadius: '12px', 
            padding: '24px',
            maxWidth: '500px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px ${getPriorityColor(editingComplaint.classification.priority)}15`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, color: '#fff', fontWeight: 650 }}>Modify Complaint {editingComplaint.id}</h3>
              <button 
                onClick={() => setEditingComplaint(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-muted)', display: 'inline-flex' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: '600' }}>
                Grievance Summary Text
                <textarea 
                  value={editingComplaint.text} 
                  onChange={e => setEditingComplaint({ ...editingComplaint, text: e.target.value })} 
                  rows={3}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: '600' }}>
                  Place
                  <input 
                    type="text" 
                    value={editingComplaint.place} 
                    onChange={e => setEditingComplaint({ ...editingComplaint, place: e.target.value })} 
                    style={{ 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: '600' }}>
                  State
                  <input 
                    type="text" 
                    value={editingComplaint.state || ''} 
                    onChange={e => setEditingComplaint({ ...editingComplaint, state: e.target.value })} 
                    style={{ 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: '600' }}>
                Assigned Department
                <input 
                  type="text" 
                  value={editingComplaint.classification.department} 
                  onChange={e => setEditingComplaint({ ...editingComplaint, classification: { ...editingComplaint.classification, department: e.target.value } })} 
                  style={{ 
                    padding: '8px 10px', 
                    borderRadius: '6px', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: '600' }}>
                  Priority
                  <select 
                    value={editingComplaint.classification.priority} 
                    onChange={e => setEditingComplaint({ ...editingComplaint, classification: { ...editingComplaint.classification, priority: e.target.value } })}
                    style={{ 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: '600' }}>
                  Status
                  <select 
                    value={editingComplaint.status} 
                    onChange={e => setEditingComplaint({ ...editingComplaint, status: e.target.value })}
                    style={{ 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
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
                style={{ 
                  minHeight: '38px', 
                  height: '38px', 
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600'
                }}
              >
                <Save size={16} /> Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Panel Content */}
      <div className="panel" style={{ padding: '24px', background: 'rgba(30, 41, 59, 0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.05)', fontFamily: 'Outfit, sans-serif' }}>
        
        {/* Panel Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)', 
          paddingBottom: '16px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              padding: '10px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              color: '#a78bfa',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 650, letterSpacing: '0.2px' }}>Admin Command Center</h2>
              <p className="muted" style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--color-muted)' }}>Configure credentials, adjust triage tags, and override metadata.</p>
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '3px',
            borderRadius: '10px'
          }}>
            <button 
              className={activeTab === 'complaints' ? 'active' : ''} 
              onClick={() => setActiveTab('complaints')} 
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'complaints' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'complaints' ? '#fff' : 'var(--color-muted)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <FileText size={14} /> Manage Complaints
            </button>
            <button 
              className={activeTab === 'users' ? 'active' : ''} 
              onClick={() => setActiveTab('users')} 
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'users' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'users' ? '#fff' : 'var(--color-muted)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Users size={14} /> Manage Users ({users.length || complaints.length ? users.length : ''})
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'complaints' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 650 }}>
              Live System Database ({complaints.length})
            </h3>
            <div style={{ 
              maxHeight: '520px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px',
              paddingRight: '4px'
            }}>
              {complaints.map(c => {
                const priorityColor = getPriorityColor(c.classification.priority);
                const isSelected = editingComplaint?.id === c.id;
                
                return (
                  <div 
                    key={c.id} 
                    style={{
                      padding: '16px',
                      border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.1)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {c.classification.summary}
                      </strong>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '0.76rem', color: 'var(--color-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Hash size={11} /> {c.id}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {c.place}
                        </span>
                        <span>•</span>
                        <span style={{ 
                          display: 'inline-flex', 
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          background: `${priorityColor}1a`, 
                          color: priorityColor,
                          fontWeight: '600'
                        }}>
                          {c.classification.priority}
                        </span>
                        <span>•</span>
                        <span style={{ 
                          display: 'inline-flex', 
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          background: `${getStatusColor(c.status)}1a`, 
                          color: getStatusColor(c.status),
                          fontWeight: '600'
                        }}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button 
                        onClick={() => setEditingComplaint({ ...c })}
                        style={{ 
                          padding: '6px 12px', 
                          background: 'rgba(99, 102, 241, 0.12)', 
                          color: '#818cf8', 
                          border: '1px solid rgba(99, 102, 241, 0.25)', 
                          borderRadius: '6px', 
                          fontSize: '0.78rem', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        title="Edit complaint"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => setDeleteModal({ type: 'complaint', id: c.id, name: c.id })}
                        style={{ 
                          padding: '6px 12px', 
                          background: 'rgba(239, 68, 68, 0.12)', 
                          color: '#f87171', 
                          border: '1px solid rgba(239, 68, 68, 0.25)', 
                          borderRadius: '6px', 
                          fontSize: '0.78rem', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        title="Delete complaint"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Users Management View */
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 650 }}>
              Registered Accounts List ({users.length})
            </h3>
            <div style={{ maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(u => (
                <div key={u.id} style={{
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ color: '#fff', fontSize: '0.92rem' }}>
                      {u.full_name} <span style={{ color: 'var(--color-muted)', fontWeight: 'normal', fontSize: '0.85rem' }}>@{u.username}</span>
                    </strong>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '0.76rem', color: 'var(--color-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Briefcase size={11} /> {u.user_type}
                      </span>
                      <span>•</span>
                      <span><strong>Phone:</strong> {u.phone}</span>
                      {u.state && (
                        <>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} /> {u.state}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} /> Registered: {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    {u.user_type !== 'Admin' ? (
                      <button 
                        onClick={() => setDeleteModal({ type: 'user', id: u.username, name: u.username })}
                        style={{ 
                          padding: '6px 12px', 
                          background: 'rgba(239, 68, 68, 0.12)', 
                          color: '#f87171', 
                          border: '1px solid rgba(239, 68, 68, 0.25)', 
                          borderRadius: '6px', 
                          fontSize: '0.78rem', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <UserX size={12} /> Revoke User
                      </button>
                    ) : (
                      <span style={{ 
                        fontSize: '0.72rem', 
                        color: '#34d399', 
                        background: 'rgba(52, 211, 153, 0.12)', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontWeight: '600',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Shield size={10} /> Active Admin
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
