import React from 'react';
import { BarChart3, Download, AlertTriangle, FileText } from 'lucide-react';
import { downloadCSV } from '../utils/csv';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export function ReportsAndChartsSection({ user, complaints }) {
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
      else deptStats[dept].active += 1;
      if (c.classification?.priority === 'critical' || c.classification?.priority === 'high') deptStats[dept].critical += 1;
    });

    const headers = ['Department Name', 'Total Complaints', 'Active Cases', 'Resolved Cases', 'High/Critical Priority', 'Resolution Rate (%)'];
    const rows = Object.entries(deptStats).map(([dept, stats]) => [
      dept,
      stats.total,
      stats.active,
      stats.resolved,
      stats.critical,
      stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : '0'
    ]);
    downloadCSV(`civicpulse_department_audit_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const exportExecutiveBriefCSV = () => {
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const active = total - resolved;
    const critical = complaints.filter(c => c.classification?.priority === 'critical').length;
    const high = complaints.filter(c => c.classification?.priority === 'high').length;

    const headers = ['Metric Label', 'Value', 'Notes'];
    const rows = [
      ['Total Grievances Logged', total, 'National Database'],
      ['Active Redressal Tickets', active, 'Currently In Progress or AI Routed'],
      ['Resolved Cases', resolved, 'Verified with Resolution Photo Proof'],
      ['Resolution Rate', total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : '0%', 'Overall system efficiency'],
      ['Critical Priority Tickets', critical, 'Immediate SLA Attention Required'],
      ['High Priority Tickets', high, 'Priority Queue Escalation']
    ];
    downloadCSV(`civicpulse_executive_brief_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Priority Distribution Stats
  const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const categoryCounts = {};

  complaints.forEach(c => {
    const prio = (c.classification?.priority || 'medium').toLowerCase();
    if (priorityCounts[prio] !== undefined) priorityCounts[prio] += 1;
    
    const cat = c.classification?.category || 'other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const totalComplaints = complaints.length || 1;

  return (
    <section style={{ maxWidth: '1100px', margin: '0 auto 30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Section Header */}
      <div className="panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <BarChart3 size={30} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-main)' }}>Reports & Visual Analytics</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              Explore public grievance diagnostic intelligence, regional SLA charts, and download executive CSV briefs.
            </p>
          </div>
        </div>

        {/* CSV Export Quick Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

      {/* Moved Public Grievance Diagnostic Center Component */}
      <AnalyticsDashboard user={user} complaints={complaints} />

      {/* Priority & Category Visual Distribution Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Priority Distribution Spectrum */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" /> Priority Level Distribution Spectrum
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Critical */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Critical Priority</span>
                <span style={{ color: 'var(--color-main)', fontWeight: 'bold' }}>{priorityCounts.critical} cases ({((priorityCounts.critical / totalComplaints) * 100).toFixed(0)}%)</span>
              </div>
              <div style={{ height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(priorityCounts.critical / totalComplaints) * 100}%`, height: '100%', background: '#ef4444', borderRadius: '5px' }} />
              </div>
            </div>

            {/* High */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ color: '#f97316', fontWeight: 'bold' }}>High Priority</span>
                <span style={{ color: 'var(--color-main)', fontWeight: 'bold' }}>{priorityCounts.high} cases ({((priorityCounts.high / totalComplaints) * 100).toFixed(0)}%)</span>
              </div>
              <div style={{ height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(priorityCounts.high / totalComplaints) * 100}%`, height: '100%', background: '#f97316', borderRadius: '5px' }} />
              </div>
            </div>

            {/* Medium */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ color: '#eab308', fontWeight: 'bold' }}>Medium Priority</span>
                <span style={{ color: 'var(--color-main)', fontWeight: 'bold' }}>{priorityCounts.medium} cases ({((priorityCounts.medium / totalComplaints) * 100).toFixed(0)}%)</span>
              </div>
              <div style={{ height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(priorityCounts.medium / totalComplaints) * 100}%`, height: '100%', background: '#eab308', borderRadius: '5px' }} />
              </div>
            </div>

            {/* Low */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Low Priority</span>
                <span style={{ color: 'var(--color-main)', fontWeight: 'bold' }}>{priorityCounts.low} cases ({((priorityCounts.low / totalComplaints) * 100).toFixed(0)}%)</span>
              </div>
              <div style={{ height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(priorityCounts.low / totalComplaints) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '5px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#10b981" /> Grievances by Issue Category
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(categoryCounts).length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>No category data available.</p>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = ((count / totalComplaints) * 100).toFixed(0);
                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: '600', color: 'var(--color-main)' }}>{cat.replace('_', ' ')}</span>
                      <span style={{ color: 'var(--color-muted)', fontWeight: 'bold' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', borderRadius: '4px' }} />
                    </div>
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
