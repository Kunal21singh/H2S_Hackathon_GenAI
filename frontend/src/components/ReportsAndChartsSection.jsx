import React from 'react';
import { BarChart3, Download, AlertTriangle, FileText } from 'lucide-react';
import { downloadCSV } from '../utils/csv';
import { AnalyticsDashboard } from './AnalyticsDashboard';

const CATEGORY_DEPT_MAP = {
  pothole: "Department of Public Works",
  garbage: "Department of Urban Development & Municipal Affairs",
  water_leak: "Department of Urban Development & Municipal Affairs",
  streetlight: "Department of Power",
  drainage: "Department of Urban Development & Municipal Affairs",
  traffic_signal: "Department of Transport",
  other: "Department of Urban Development & Municipal Affairs"
};

export function ReportsAndChartsSection({ user, complaints }) {
  const [hoveredBar, setHoveredBar] = React.useState(null); // { type: 'priority' | 'category', key: string }

  const exportGrievancesCSV = () => {
    const headers = ['ID', 'Date', 'Summary', 'Category', 'Department', 'Priority', 'Status', 'Place', 'State', 'Upvotes', 'Reporter'];
    const rows = complaints.map(c => [
      c.id,
      new Date(c.created_at).toLocaleString(),
      c.classification?.summary || c.text,
      c.classification?.category || 'other',
      c.classification?.department || 'Unassigned',
      c.classification?.priority || 'medium',
      c.status,
      c.place || '',
      c.state || '',
      c.upvotes || 0,
      c.reporter_username || 'citizen'
    ]);
    downloadCSV(`civicpulse_full_grievances_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const exportDepartmentReportCSV = () => {
    const deptStats = {};
    complaints.forEach(c => {
      const dept = c.classification?.department || 'Unassigned';
      if (!deptStats[dept]) deptStats[dept] = { total: 0, resolved: 0, active: 0, critical: 0 };
      deptStats[dept].total += 1;
      if (c.status === 'resolved') deptStats[dept].resolved += 1;
      else {
        deptStats[dept].active += 1;
        if (['high', 'critical'].includes(c.classification?.priority)) {
          deptStats[dept].critical += 1;
        }
      }
    });
    const headers = ['Department', 'Total Complaints', 'Resolved Cases', 'Active Cases', 'Critical Active Cases', 'SLA Resolution Rate'];
    const rows = Object.entries(deptStats).map(([dept, stats]) => [
      dept,
      stats.total,
      stats.resolved,
      stats.active,
      stats.critical,
      stats.total > 0 ? `${((stats.resolved / stats.total) * 100).toFixed(1)}%` : '0%'
    ]);
    downloadCSV(`civicpulse_department_sla_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const exportExecutiveBriefCSV = () => {
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const active = total - resolved;
    const critical = complaints.filter(c => c.status !== 'resolved' && ['high', 'critical'].includes(c.classification?.priority)).length;
    const headers = ['Metric', 'Count', 'Percentage'];
    const rows = [
      ['Total Grievances Registered', total, '100%'],
      ['Resolved Cases Archive', resolved, total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : '0%'],
      ['Active Citizen Grievances', active, total > 0 ? `${((active / total) * 100).toFixed(1)}%` : '0%'],
      ['Critical Urgency Grievances', critical, active > 0 ? `${((critical / active) * 100).toFixed(1)}%` : '0%']
    ];
    downloadCSV(`civicpulse_executive_brief_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const totalComplaints = complaints.length || 1;
  const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const categoryCounts = {};

  complaints.forEach(c => {
    const p = c.classification?.priority || 'medium';
    if (priorityCounts[p] !== undefined) priorityCounts[p] += 1;
    
    const cat = c.classification?.category || 'other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return (
    <section className="section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="var(--color-primary)" /> Administrative CSV Export Center
        </h3>
        <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 16px' }}>
          Extract audit logs and departmental SLA diagnostics reports directly in spreadsheet formats for local verification and review.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={exportGrievancesCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Full Grievances CSV
          </button>
          <button
            type="button"
            onClick={exportDepartmentReportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Department SLA CSV
          </button>
          <button
            type="button"
            onClick={exportExecutiveBriefCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Executive Brief CSV
          </button>
        </div>
      </div>

      <AnalyticsDashboard user={user} complaints={complaints} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Priority Distribution Spectrum */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" /> Priority Level Distribution Spectrum
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { key: 'critical', label: 'Critical Priority', color: '#ef4444', sla: '48 Hours' },
              { key: 'high', label: 'High Priority', color: '#f97316', sla: '72 Hours' },
              { key: 'medium', label: 'Medium Priority', color: '#eab308', sla: '7 Days' },
              { key: 'low', label: 'Low Priority', color: '#3b82f6', sla: '7 Days' }
            ].map(p => {
              const count = priorityCounts[p.key];
              const pct = ((count / totalComplaints) * 100).toFixed(0);
              const isHovered = hoveredBar?.type === 'priority' && hoveredBar?.key === p.key;
              
              return (
                <div 
                  key={p.key} 
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredBar({ type: 'priority', key: p.key })}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                    <span style={{ color: p.color, fontWeight: 'bold' }}>{p.label}</span>
                    <span style={{ color: 'var(--color-main)', fontWeight: 'bold' }}>{count} cases ({pct}%)</span>
                  </div>
                  <div style={{ 
                    height: '10px', 
                    background: 'var(--border-color)', 
                    borderRadius: '5px', 
                    overflow: 'visible',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: `${pct}%`, 
                      height: '100%', 
                      background: p.color, 
                      borderRadius: '5px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'scaleY(1.3)' : 'scaleY(1)',
                      boxShadow: isHovered ? `0 0 12px ${p.color}` : 'none'
                    }} />
                  </div>

                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translate(-50%, -6px)',
                      background: 'rgba(15, 23, 42, 0.96)',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                      border: `1px solid ${p.color}`,
                      zIndex: 100,
                      pointerEvents: 'none',
                      width: '180px',
                      textAlign: 'center',
                      backdropFilter: 'blur(4px)',
                      transition: 'all 0.2s ease-in-out'
                    }}>
                      <strong style={{ color: p.color, display: 'block', marginBottom: '3px' }}>{p.label}</strong>
                      ⏱️ SLA Limit: <strong>{p.sla}</strong><br/>
                      📊 Active Volume: <strong>{count} cases</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#10b981" /> Grievances by Issue Category
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(categoryCounts).length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>No category data available.</p>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = ((count / totalComplaints) * 100).toFixed(0);
                const isHovered = hoveredBar?.type === 'category' && hoveredBar?.key === cat;
                const dept = CATEGORY_DEPT_MAP[cat] || "Department of Urban Development & Municipal Affairs";
                
                return (
                  <div 
                    key={cat} 
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredBar({ type: 'category', key: cat })}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: '600', color: 'var(--color-main)' }}>{cat.replace('_', ' ')}</span>
                      <span style={{ color: 'var(--color-muted)', fontWeight: 'bold' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ 
                      height: '8px', 
                      background: 'var(--border-color)', 
                      borderRadius: '4px', 
                      overflow: 'visible',
                      position: 'relative'
                    }}>
                      <div style={{ 
                        width: `${pct}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', 
                        borderRadius: '4px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isHovered ? 'scaleY(1.3)' : 'scaleY(1)',
                        boxShadow: isHovered ? '0 0 12px rgba(16, 185, 129, 0.6)' : 'none'
                      }} />
                    </div>

                    {isHovered && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translate(-50%, -6px)',
                        background: 'rgba(15, 23, 42, 0.96)',
                        color: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                        border: '1px solid #10b981',
                        zIndex: 100,
                        pointerEvents: 'none',
                        width: '220px',
                        textAlign: 'center',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s ease-in-out'
                      }}>
                        <strong style={{ color: '#10b981', display: 'block', textTransform: 'capitalize', marginBottom: '3px' }}>{cat.replace('_', ' ')}</strong>
                        🏢 Dept: <strong>{dept.replace('Department of ', '')}</strong><br/>
                        📊 Volume: <strong>{count} cases ({pct}%)</strong>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
