import React, { useEffect, useState } from 'react';
import { getComplaintsByUser } from '../db';
import { formatMinutesAgo } from '../components/ComplaintCard'; // reuse from previous if kept? Wait I'll just write a small date formatter

function formatTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

const TYPE_ICONS = {
  technical: '🔧',
  cleanliness: '🧹',
  staff: '👤',
  safety: '🚨',
  ac: '❄️',
  other: '📋',
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  assigned: 'Assigned',
  in_progress: 'Technician Arrived',
  resolved: 'Resolved',
  closed: 'Closed'
};

export default function MyReports({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getComplaintsByUser(user.id);
      setReports(data.sort((a,b) => b.createdAt - a.createdAt));
      setLoading(false);
    }
    load();
    // In a real app we'd poll or use a subscription here.
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  if (loading) {
    return <div className="reports-screen screen center"><div className="spinner"/></div>;
  }

  if (reports.length === 0) {
    return (
      <div className="reports-screen screen animate-in">
        <div className="reports-empty">
          <div className="empty-icon">📝</div>
          <h2 className="empty-title">No Reports Yet</h2>
          <p className="empty-sub">When you report an issue on the metro, you can track its progress here.</p>
        </div>
      </div>
    );
  }

  const selectedReport = selectedId ? reports.find(r => r.id === selectedId) : null;

  if (selectedReport) {
    const r = selectedReport;
    return (
      <div className="reports-screen screen animate-in">
        <div className="form-header" style={{background: 'var(--bg-card)', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 16}}>
          <button className="form-back" style={{color:'var(--text)', background:'var(--bg)'}} onClick={() => setSelectedId(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div className="report-ref">Ref: {r.id}</div>
          <h2 className="form-title" style={{fontSize:'1.1rem'}}>{TYPE_ICONS[r.type]} {r.type.toUpperCase()}</h2>
        </div>
        <div className="form-body" style={{marginTop:0, borderRadius:0, minHeight: '100%'}}>
          <div className="form-section">
            <div className="op-location-row">
              <span className="location-chip train">🚇 Train {r.trainId}</span>
              <span className="location-chip coach">Coach {r.coachId}</span>
            </div>
            <p className="op-card-desc" style={{fontSize:'.95rem', marginTop:12}}>{r.desc}</p>
          </div>
          
          <div className="section-header" style={{paddingLeft:0}}>Status Updates</div>
          <div className="status-timeline">
            {r.statusHistory?.map((h, i) => {
              const isLast = i === r.statusHistory.length - 1;
              const isDone = ['resolved', 'closed'].includes(r.status);
              return (
                <div key={i} className="timeline-step">
                  <div className={`timeline-dot ${isLast && !isDone ? 'active' : 'done'}`}>
                    {isDone ? '✓' : ''}
                  </div>
                  <div className="timeline-info">
                    <div className="timeline-status">{STATUS_LABELS[h.status] || h.status}</div>
                    <div className="timeline-note">{h.note}</div>
                    <div className="timeline-time">{new Date(h.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-screen screen animate-in">
      <div className="section-header">My Submitted Reports</div>
      {reports.map(r => (
        <div key={r.id} className="report-card" onClick={() => setSelectedId(r.id)}>
          <div className="report-card-header">
            <div className="report-type-icon" style={{background: 'var(--bg)'}}>{TYPE_ICONS[r.type] || '📋'}</div>
            <div className="report-card-info">
              <div className="report-ref">{r.id}</div>
              <div className="report-type-label">{r.type.charAt(0).toUpperCase() + r.type.slice(1)}</div>
              <div className="report-meta">
                Train {r.trainId} · Coach {r.coachId} · {formatTime(r.createdAt)}
              </div>
            </div>
            <div className={`status-pill ${r.status}`}>
              {STATUS_LABELS[r.status] || r.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
