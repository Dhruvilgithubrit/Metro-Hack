import React, { useEffect, useState } from 'react';
import { getAllComplaints, pushStatusUpdate } from '../db';
import { showToast } from '../components/Toast';

const TYPE_ICONS = {
  technical: '🔧',
  cleanliness: '🧹',
  staff: '👤',
  safety: '🚨',
  ac: '❄️',
  other: '📋',
};

const STATUS_LABELS = {
  submitted: 'New / Unassigned',
  assigned: 'Assigned to Tech',
  in_progress: 'Tech Arrived',
  resolved: 'Resolved',
  closed: 'Closed'
};

export default function OperatorDashboard({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('active'); // active, resolved
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await getAllComplaints();
    setComplaints(data.sort((a,b) => b.createdAt - a.createdAt));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(id, newStatus, note) {
    try {
      await pushStatusUpdate(id, newStatus, note);
      showToast('Status updated', 'success');
      load();
    } catch(e) {
      showToast('Error updating status', 'error');
    }
  }

  const activeCount = complaints.filter(c => !['resolved','closed'].includes(c.status)).length;
  const criticalCount = complaints.filter(c => c.severity === 'high' && !['resolved','closed'].includes(c.status)).length;

  const visible = complaints.filter(c => {
    if (filter === 'active') return !['resolved','closed'].includes(c.status);
    return ['resolved','closed'].includes(c.status);
  });

  return (
    <div className="operator-screen screen">
      <div className="operator-header">
        <h2 className="operator-title">Control Room Dashboard</h2>
        <div className="operator-sub">Ahmedabad Line 1 & 2</div>
      </div>

      <div className="operator-stats">
        <div className="op-stat-card">
          <div className="op-stat-num">{activeCount}</div>
          <div className="op-stat-label">Active Cases</div>
        </div>
        <div className="op-stat-card">
          <div className="op-stat-num" style={{color: criticalCount > 0 ? 'var(--error)' : 'inherit'}}>{criticalCount}</div>
          <div className="op-stat-label">Critical Priority</div>
        </div>
        <div className="op-stat-card">
          <div className="op-stat-num">{complaints.length}</div>
          <div className="op-stat-label">Total Today</div>
        </div>
      </div>

      <div className="op-filter-bar">
        <button 
          className={`op-filter-chip ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >Live Feed</button>
        <button 
          className={`op-filter-chip ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
        >Resolved ({complaints.length - activeCount})</button>
      </div>

      <div className="op-complaint-list animate-in">
        {visible.length === 0 ? (
          <div style={{textAlign:'center', padding: '40px 20px', color: 'var(--text-3)'}}>
            No {filter} cases.
          </div>
        ) : (
          visible.map(c => (
            <div key={c.id} className="op-card" style={{ borderLeft: c.severity === 'high' ? '3px solid var(--error)' : '' }}>
              <div className="op-card-top">
                <div>
                  <div className="op-card-ref">{c.id} · {new Date(c.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="op-card-type">{TYPE_ICONS[c.type]} {c.type.toUpperCase()}</div>
                </div>
                <div className={`status-pill ${c.status}`}>{STATUS_LABELS[c.status]}</div>
              </div>
              
              <div className="op-location-row">
                <span className="location-chip train">🚇 Train {c.trainId}</span>
                <span className="location-chip coach">Coach {c.coachId}</span>
                <span className="location-chip time">{c.line} · {c.direction.replace('Towards ','')}</span>
              </div>

              <div className="op-card-desc">"{c.desc}"</div>

              <div className="op-actions" style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px'}}>
                <span style={{fontSize: '.8rem', fontWeight: 600, color: 'var(--text-2)'}}>Update Status:</span>
                <select 
                  className="btn btn-secondary btn-sm"
                  style={{cursor: 'pointer'}}
                  value={c.status}
                  onChange={(e) => updateStatus(c.id, e.target.value, `Status changed to ${STATUS_LABELS[e.target.value]}`)}
                >
                  <option value="submitted">New / Unassigned</option>
                  <option value="assigned">Assigned to Tech</option>
                  <option value="in_progress">Tech Arrived</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
