import React, { useState } from 'react';
import { Bot, X, RefreshCw, Send } from 'lucide-react';
import { authHeaders } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export function AIChatAssistantWidget({ session, refresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: '👋 Hello! I am Civic AI & Analytics Assistant. Ask me about your grievance status, department performance, hotspots, or civic stats!' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (msgText) => {
    const textToSend = msgText || inputMsg;
    if (!textToSend.trim() || loading) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!msgText) setInputMsg('');
    setLoading(true);

    try {
      const isAnalyticsQuery = /stats|count|analytics|most|worst|top|bottleneck|hotspot|places|table|how many|department/i.test(textToSend);
      let answerText = "";
      let sourceInfo = "";
      let rowsData = [];

      if (isAnalyticsQuery) {
        try {
          const res = await fetch(`${API_BASE}/analytics/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(session.token) },
            body: JSON.stringify({ question: textToSend }),
          });
          if (res.ok) {
            const data = await res.json();
            answerText = data.answer;
            sourceInfo = data.source;
            rowsData = data.rows || [];
          }
        } catch (e) {
          // fallback to /ai/chat
        }
      }

      if (!answerText) {
        const res = await fetch(`${API_BASE}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(session.token)
          },
          body: JSON.stringify({ message: textToSend })
        });

        if (!res.ok) throw new Error('Could not contact AI Assistant');
        const data = await res.json();
        answerText = data.response;
        sourceInfo = "CivicPulse AI Engine";
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: answerText,
        source: sourceInfo,
        rows: rowsData
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "Sorry, I am having trouble connecting to AI services right now. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999 }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            transition: 'transform 0.2s ease',
          }}
        >
          <Bot size={20} />
          <span>Civic AI & Analytics</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        </button>
      ) : (
        <div style={{
          width: '380px',
          height: '520px',
          background: 'var(--bg-panel-solid, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} />
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', lineHeight: 1.2 }}>Civic AI & Analytics Assistant</strong>
                <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Powered by Gemini & CivicPulse Engine</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages body */}
          <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '10px 12px',
                borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: m.sender === 'user' ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '0.83rem',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap'
              }}>
                <div>{m.text}</div>
                {m.source && (
                  <small style={{ display: 'block', marginTop: '4px', fontSize: '0.68rem', color: m.sender === 'user' ? '#93c5fd' : '#94a3b8' }}>
                    Source: {m.source}
                  </small>
                )}
                {m.rows && m.rows.length > 0 && (
                  <div style={{ overflowX: 'auto', marginTop: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {m.rows.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {Object.entries(row).map(([k, v], cIdx) => (
                              <td key={cIdx} style={{ fontSize: '0.72rem', padding: '4px 6px', color: '#e2e8f0' }}>
                                <strong>{k}:</strong> {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '14px', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw className="spin" size={14} /> AI analyzing database...
              </div>
            )}
          </div>

          {/* Quick chips */}
          <div style={{ padding: '6px 10px', display: 'flex', gap: '6px', overflowX: 'auto', borderTop: '1px solid var(--border-color, #334155)', background: 'rgba(0,0,0,0.1)' }}>
            <button onClick={() => sendMessage('What is the status of my complaint?')} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📋 My Status
            </button>
            <button onClick={() => sendMessage('Which places had the most water complaints this month?')} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📊 Place Stats
            </button>
            <button onClick={() => sendMessage('Which state has the best resolution rate?')} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🏆 Best State
            </button>
          </div>

          {/* Input box */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ padding: '10px 12px', display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color, #334155)' }}>
            <input
              type="text"
              placeholder="Ask AI or stats question..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)', background: 'var(--bg-input, #0f172a)', color: '#ffffff', fontSize: '0.85rem' }}
            />
            <button type="submit" disabled={loading || !inputMsg.trim()} style={{ padding: '8px 12px', borderRadius: '8px', background: '#3b82f6', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
