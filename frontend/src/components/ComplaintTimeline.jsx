import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getShortDeptName } from '../utils/department';

export function ComplaintTimeline({ complaint }) {
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
            <div key={idx} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '16px',
                  bottom: '-22px',
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
                zIndex: 1,
                marginTop: '3px',
                boxShadow: `0 0 8px ${dotColor}`
              }} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-main)', textTransform: 'capitalize' }}>
                    {evt.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: '1.4' }}>
                  {evt.description}
                </p>
                {evt.actor && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: '500', alignSelf: 'flex-start' }}>
                    Actor: @{evt.actor}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
