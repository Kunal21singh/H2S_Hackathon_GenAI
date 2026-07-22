import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';

export function AuthScreen({ mode, setMode, form, setForm, loading, notice, onSubmit }) {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const countries = [
    { code: '+91', flag: 'https://flagcdn.com/w40/in.png', label: 'IN' },
    { code: '+1', flag: 'https://flagcdn.com/w40/us.png', label: 'US' },
    { code: '+44', flag: 'https://flagcdn.com/w40/gb.png', label: 'UK' },
    { code: '+61', flag: 'https://flagcdn.com/w40/au.png', label: 'AU' },
    { code: '+971', flag: 'https://flagcdn.com/w40/ae.png', label: 'AE' },
    { code: '+65', flag: 'https://flagcdn.com/w40/sg.png', label: 'SG' },
    { code: '+81', flag: 'https://flagcdn.com/w40/jp.png', label: 'JP' },
    { code: '+49', flag: 'https://flagcdn.com/w40/de.png', label: 'DE' },
    { code: '+33', flag: 'https://flagcdn.com/w40/fr.png', label: 'FR' },
  ];

  const currentCountry = countries.find(c => c.code === countryCode) || countries[0];

  const [roleType, setRoleType] = useState('Citizen');
  const [deptName, setDeptName] = useState('Department of Urban Development and Municipal Affairs');

  useEffect(() => {
    if (mode === 'register') {
      setForm(f => ({ ...f, phone: countryCode + phoneDigits }));
    }
  }, [countryCode, phoneDigits, mode, setForm]);

  useEffect(() => {
    if (mode === 'register') {
      if (roleType === 'Officer') {
        setForm(f => ({ ...f, user_type: `${deptName} Officer` }));
      } else {
        setForm(f => ({ ...f, user_type: roleType }));
      }
    }
  }, [roleType, deptName, mode, setForm]);

  return (
    <main className="authShell">
      <section className="authPanel">
        <div>
          <p className="eyebrow">CivicPulse account</p>
          <h1>CivicPulse</h1>
        </div>
        <div className="modeSwitch" role="tablist" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            <ShieldCheck size={17} />
            Login
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            <UserPlus size={17} />
            Register
          </button>
        </div>
        {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
        <form onSubmit={onSubmit}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              autoComplete="username"
              required
            />
          </label>
          {mode === 'register' && (
            <>
              <label>
                User Type / Role
                <select
                  value={roleType}
                  onChange={(event) => setRoleType(event.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-input)',
                    background: 'var(--bg-input)',
                    color: 'var(--color-main)',
                    fontSize: '1rem',
                    marginTop: '4px',
                    marginBottom: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Citizen">Citizen (General Public)</option>
                  <option value="Officer">Department Officer</option>
                  <option value="Chief Minister">Chief Minister (State Head)</option>
                  <option value="Prime Minister">Prime Minister (Country Head)</option>
                  <option value="Admin">System Administrator (Control Panel)</option>
                </select>
              </label>

              {roleType === 'Officer' && (
                <label>
                  Assigned Department (Matches AI Classification)
                  <select
                    value={deptName}
                    onChange={(event) => setDeptName(event.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-input)',
                      background: 'var(--bg-input)',
                      color: 'var(--color-main)',
                      fontSize: '1rem',
                      marginTop: '4px',
                      marginBottom: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Department of Agriculture">Department of Agriculture</option>
                    <option value="Department of Environment">Department of Environment</option>
                    <option value="Department of Finance">Department of Finance</option>
                    <option value="Department of Fisheries">Department of Fisheries</option>
                    <option value="Department of Forests">Department of Forests</option>
                    <option value="Department of Home and Hill Affairs">Department of Home and Hill Affairs</option>
                    <option value="Department of Information Technology and Electronics">Department of Information Technology and Electronics</option>
                    <option value="Department of Law">Department of Law</option>
                    <option value="Department of Parliamentary Affairs">Department of Parliamentary Affairs</option>
                    <option value="Department of Power">Department of Power</option>
                    <option value="Department of Public Enterprises & Industrial Reconstruction">Department of Public Enterprises & Industrial Reconstruction</option>
                    <option value="Department of Public Works">Department of Public Works</option>
                    <option value="Department of School Education">Department of School Education</option>
                    <option value="Department of Sundarban Affairs">Department of Sundarban Affairs</option>
                    <option value="Department of Technical Education, Training and Skill Development">Department of Technical Education, Training and Skill Development</option>
                    <option value="Department of Transport">Department of Transport</option>
                    <option value="Department of Urban Development and Municipal Affairs">Department of Urban Development and Municipal Affairs</option>
                    <option value="Department of Industry, Commerce & Enterprises">Department of Industry, Commerce & Enterprises</option>
                    <option value="Department of Health & Family Welfare">Department of Health & Family Welfare</option>
                    <option value="Department of Information & Cultural Affairs">Department of Information & Cultural Affairs</option>
                    <option value="Department of Labour">Department of Labour</option>
                    <option value="Department of Land & Land Reforms">Department of Land & Land Reforms</option>
                    <option value="Department of Minority Affairs & Madrasah Education">Department of Minority Affairs & Madrasah Education</option>
                    <option value="Department of North Bengal Development">Department of North Bengal Development</option>
                    <option value="Department of Personnel & Administrative Reforms">Department of Personnel & Administrative Reforms</option>
                    <option value="Department of Tourism">Department of Tourism</option>
                    <option value="Department of Women and Child Development and Social Welfare">Department of Women and Child Development and Social Welfare</option>
                  </select>
                </label>
              )}

              {roleType !== 'Citizen' && roleType !== 'Prime Minister' && roleType !== 'Admin' && (
                <label>
                  Designated State
                  <input
                    value={form.state || ''}
                    onChange={(event) => setForm({ ...form, state: event.target.value })}
                    placeholder="e.g. Delhi, Karnataka, Maharashtra"
                    required
                  />
                </label>
              )}
            </>
          )}
          {mode === 'register' && (
            <>
              <label>
                Full name
                <input
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Phone number
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <div style={{ position: 'relative', width: '110px' }}>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        padding: '11px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-input)',
                        background: 'var(--bg-input)',
                        color: 'var(--color-main)',
                        cursor: 'pointer',
                        height: '100%',
                        boxSizing: 'border-box',
                        userSelect: 'none'
                      }}
                    >
                      <img src={currentCountry.flag} alt={currentCountry.label} style={{ width: '22px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.85rem' }}>{currentCountry.code}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>
                    </div>

                    {isDropdownOpen && (
                      <div 
                        onClick={() => setIsDropdownOpen(false)}
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 99,
                          background: 'transparent'
                        }}
                      />
                    )}
                    
                    {isDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        width: '160px',
                        background: 'var(--bg-panel-solid, #0d142a)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-input)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        padding: '4px'
                      }}>
                        {countries.map(c => (
                          <div
                            key={c.code}
                            onClick={() => {
                              setCountryCode(c.code);
                              setIsDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              color: 'var(--color-main)',
                              fontSize: '0.85rem',
                              transition: 'background 0.2s ease',
                            }}
                            className="custom-select-option"
                          >
                            <img src={c.flag} alt={c.label} style={{ width: '22px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} />
                            <span>{c.code} ({c.label})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phoneDigits}
                    onChange={(event) => {
                      const val = event.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneDigits(val);
                    }}
                    placeholder="10-digit number"
                    pattern="\d{10}"
                    title="Please enter a valid 10-digit phone number"
                    autoComplete="tel"
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </label>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Telegram Chat ID <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>(Optional)</span>
                </span>
                <input
                  value={form.telegram_chat_id || ''}
                  onChange={(event) => setForm({ ...form, telegram_chat_id: event.target.value })}
                  placeholder="e.g. 582910243"
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', display: 'block', marginTop: '3px' }}>
                  Get your Chat ID by messaging `@userinfobot` or `/my_id` to our notifier bot.
                </span>
              </label>
            </>
          )}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />
          </label>
          <button className="primary" disabled={loading}>
            {mode === 'register' ? <UserPlus size={18} /> : <ShieldCheck size={18} />}
            {mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}
