import React, { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

export function AnalyticsDashboard({ user, complaints }) {
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
                          <div className="progress-container" style={{ flex: 1, height: '12px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                              borderRadius: '6px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', width: '36px', textAlign: 'right', color: 'var(--color-main)' }}>{dept.rate}%</span>
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
                          <div className="progress-container" style={{ flex: 1, height: '12px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--color-accent) 0%, #10b981 100%)',
                              borderRadius: '6px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', width: '36px', textAlign: 'right', color: 'var(--color-main)' }}>{st.rate}%</span>
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
