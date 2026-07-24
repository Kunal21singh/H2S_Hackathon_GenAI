import React from 'react';
import { Activity, Filter, Download } from 'lucide-react';
import { getShortDeptName, getDeptIcon, getDeptHealthGrade } from '../utils/department';

export function ExecutiveMonitor({ user, complaints }) {
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
                  style={{ cursor: 'pointer' }}
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
