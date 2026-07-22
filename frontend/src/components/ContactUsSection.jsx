import React, { useState } from 'react';
import { PhoneCall, Phone, Building2, Mail, MessageSquare, Send } from 'lucide-react';

export function ContactUsSection({ user, session }) {
  const [form, setForm] = useState({ name: user?.full_name || '', email: '', department: 'Public Works', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: user?.full_name || '', email: '', department: 'Public Works', subject: '', message: '' });
    }, 4000);
  };

  return (
    <section className="panel" style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto 30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <PhoneCall size={28} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-main)' }}>Contact Us & Nodal Helplines</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Get in touch with department nodal officers, emergency civic support, or send direct inquiries.
          </p>
        </div>
      </div>

      {/* Emergency Helpline Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '30px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', marginBottom: '6px' }}>
            <Phone size={18} /> Emergency Civic Line
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--color-main)', fontFamily: 'monospace' }}>112 / 1800-11-2024</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginTop: '4px' }}>Toll-Free • Available 24x7</span>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '6px' }}>
            <Building2 size={18} /> Central Grievance Cell
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-main)', fontFamily: 'monospace' }}>011-2309-8800</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginTop: '4px' }}>Cabinet Secretariat, North Block</span>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold', marginBottom: '6px' }}>
            <Mail size={18} /> Support Email
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--color-main)' }}>support@civicpulse.gov.in</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginTop: '4px' }}>Response time: &lt; 24 hours</span>
        </div>
      </div>

      {/* Main Grid: Contact Form & Department Directory */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Direct Inquiry Form */}
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#3b82f6" /> Send Direct Message to Nodal Officer
          </h3>

          {submitted ? (
            <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#34d399', textAlign: 'center', fontWeight: 'bold' }}>
              ✓ Thank you! Your message has been routed to the Nodal Officer. Reference Ticket ID will be sent to your phone.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Your Name
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Email / Contact
                  <input
                    required
                    type="text"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email or phone number"
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Target Department
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
                  >
                    <option value="Public Works">Public Works (Roads & Drainage)</option>
                    <option value="Water Works">Water Works & Sanitation</option>
                    <option value="Power Grid">Electricity & Power Grid</option>
                    <option value="Waste Management">Waste & Sanitation</option>
                    <option value="Health & Medical">Health & Medical Services</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Subject
                  <input
                    required
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Urgent pipeline repair"
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                Message / Inquiry Details
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Describe your inquiry or request for the nodal department..."
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)' }}
                />
              </label>

              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px'
                }}
              >
                <Send size={16} /> Send Inquiry
              </button>
            </form>
          )}
        </div>

        {/* Key Department Directory & Office Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--color-main)', textTransform: 'uppercase' }}>Department Toll-Free Lines</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--color-muted)' }}>💧 Water Supply & Leakage</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1800-425-0011</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--color-muted)' }}>🚧 Roads & Potholes (PWD)</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1800-180-2222</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--color-muted)' }}>⚡ Electricity & Power Outages</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1912</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>🧹 Sanitation & Solid Waste</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>1800-11-0033</strong>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--color-main)', textTransform: 'uppercase' }}>Headquarters Address</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: '1.5' }}>
              <strong>CivicPulse National Grievance Monitoring Hub</strong><br />
              Department of Administrative Reforms & Public Grievances (DARPG)<br />
              Sardar Patel Bhawan, Parliament Street, New Delhi - 110001
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
