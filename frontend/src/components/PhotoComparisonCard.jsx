import React from 'react';
import { Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export function PhotoComparisonCard({ complaint }) {
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
