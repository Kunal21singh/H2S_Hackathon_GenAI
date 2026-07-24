import React, { useState } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronRight } from 'lucide-react';

export function FAQSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqs = [
    {
      category: 'Filing & Intake',
      question: 'How does CivicPulse AI auto-classify and route my complaint?',
      answer: 'CivicPulse uses advanced Multimodal AI and Gemini Language Models to analyze your grievance text, voice transcripts, and photo evidence. It automatically assigns the responsible government department (e.g. Water Works, Public Works, Power Grid), determines priority level (Critical, High, Medium, Low), and routes it directly to the designated official.'
    },
    {
      category: 'Filing & Intake',
      question: 'What happens when an AI Duplicate Grievance Alert pops up?',
      answer: 'Our location-aware AI engine checks nearby active reports within your ward/neighborhood. If a similar issue was recently filed, an alert will display. You can click "👍 Upvote & Boost Priority" to join existing citizens in escalating the ticket, or click "Submit New Anyway" if your issue is distinct.'
    },
    {
      category: 'Filing & Intake',
      question: 'Can I dictate my complaint using Voice-to-Text?',
      answer: 'Yes! When filing a complaint, click the Microphone 🎙️ button to speak your grievance in natural language. Our system transcribes your voice directly into the report.'
    },
    {
      category: 'Tracking & Timeline',
      question: 'What do the 4 stages on the Complaint Timeline mean?',
      answer: 'Every complaint progresses through 4 clear lifecycle stages:\n1. Reported: Grievance logged by citizen.\n2. AI Routed: Machine learning assigns department & priority.\n3. In Progress: Field officer initiated resolution work.\n4. Resolved: Issue fixed with photo proof & timestamp uploaded by officer.'
    },
    {
      category: 'Tracking & Timeline',
      question: 'How is resolution verified by department officials?',
      answer: 'Field officers must attach a geo-tagged resolution photo proof before marking a ticket as Resolved. Citizens and administrators can compare the original reported photo against the official resolution proof side-by-side on the dashboard.'
    },
    {
      category: 'Notifications & Alerts',
      question: 'How do I receive instant status updates on Telegram?',
      answer: 'During registration or profile settings, add your Telegram Chat ID. CivicPulse will automatically send instant push notifications whenever your grievance status changes or an official posts a progress update.'
    },
    {
      category: 'Department & Governance',
      question: 'What is the Executive Monitor dashboard for Chief Ministers & PMs?',
      answer: 'The Executive Monitor provides real-time state-level and national-level oversight, allowing CMs and national administrators to track department resolution rates, bottleneck areas, hotspot maps, and download Executive CSV Briefs.'
    }
  ];

  const categories = ['All', 'Filing & Intake', 'Tracking & Timeline', 'Notifications & Alerts', 'Department & Governance'];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="panel" style={{ padding: '28px', maxWidth: '1000px', margin: '0 auto 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
          <HelpCircle size={28} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-main)' }}>Frequently Asked Questions (FAQs)</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Find answers to common questions about filing grievances, AI routing, tracking progress, and resolution proof.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search FAQs by keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--color-main)', fontSize: '0.88rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: activeCategory === cat ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                background: activeCategory === cat ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat ? '#60a5fa' : 'var(--color-muted)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion FAQ List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredFaqs.length === 0 ? (
          <p style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>No matching FAQs found for your search query.</p>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = expandedIndex === idx;
            return (
              <div 
                key={idx}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  background: isOpen ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    color: 'var(--color-main)',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 'bold' }}>{faq.category}</span>
                    {faq.question}
                  </span>
                  {isOpen ? <ChevronDown size={18} color="#60a5fa" /> : <ChevronRight size={18} color="var(--color-muted)" />}
                </button>

                {isOpen && (
                  <div style={{ padding: '0 18px 16px', color: 'var(--color-muted)', fontSize: '0.88rem', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '12px', whiteSpace: 'pre-line' }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
