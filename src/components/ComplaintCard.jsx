import React from 'react';

const DEPT_LABELS = {
  safety: '🚨 Safety',
  lifts: '🛗 Lifts',
  cleanliness: '🧹 Cleanliness',
  fare: '💳 Fare',
  staff: '👤 Staff',
  other: '📋 Other',
};

const CHANNEL_ICONS = {
  app: '📱',
  x: '𝕏',
  email: '✉️',
  paper: '📄',
  coach_qr: '🔲',
};

const LANG_LABELS = { en: 'EN', hi: 'HI', gu: 'ગુ', gujlish: 'GL' };

export function formatMinutesAgo(m) {
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m ago` : `${h}h ago`;
}

export function ComplaintCard({ complaint, selected, onClick }) {
  const { id, station, minutesAgo, text, dept, band, urgency, lang, channel, status, clusterId, secondary } = complaint;

  return (
    <div
      className={`complaint-card band-${band} status-${status} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`Complaint ${id} from ${station}, urgency ${urgency}`}
    >
      {/* Urgency ring */}
      <div className="card-urgency-col">
        <div className={`urgency-ring band-${band}`}>{urgency}</div>
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="card-meta">
          <span className="card-id">{id}</span>
          <span className="card-station">📍 {station}</span>
          <span className="card-time">{formatMinutesAgo(minutesAgo)}</span>
        </div>
        <div className="card-text" title={text}>{text}</div>
        <div className="card-tags">
          <span className="tag tag-dept">{DEPT_LABELS[dept]}</span>
          <span className={`tag tag-band-${band}`}>{band.toUpperCase()}</span>
          <span className="tag tag-lang">{LANG_LABELS[lang] || lang}</span>
          <span className="tag tag-channel">{CHANNEL_ICONS[channel]} {channel.replace('_', ' ')}</span>
          {secondary && secondary.length > 0 && (
            secondary.map(d => (
              <span key={d} className="tag" style={{background:'#f9fafb',color:'#6b7280',border:'1px solid #e5e7eb'}}>+{d}</span>
            ))
          )}
          {clusterId && (
            <span className="tag tag-cluster">🔗 {clusterId}</span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="card-right">
        <span className={`status-badge ${status}`}>{status}</span>
      </div>
    </div>
  );
}

export function DetailPanel({ complaint, onReplyChange, onMarkReplied, onClose }) {
  if (!complaint) {
    return (
      <div className="detail-panel empty">
        <div className="detail-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
          </svg>
          <p>Select a complaint to review and reply</p>
        </div>
      </div>
    );
  }

  const { id, station, minutesAgo, text, dept, band, urgency, lang, channel, status, why, reply, clusterId } = complaint;

  return (
    <div className="detail-panel">
      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-top">
          <div className={`detail-urgency-ring urgency-ring band-${band}`}>{urgency}</div>
          <div className="detail-header-info">
            <div className="detail-id">{id} · {formatMinutesAgo(minutesAgo)}</div>
            <div className="detail-station">📍 {station}</div>
            <div className="detail-tags">
              <span className="tag tag-dept">{DEPT_LABELS[dept]}</span>
              <span className={`tag tag-band-${band}`}>{band.toUpperCase()}</span>
              <span className="tag tag-lang">{LANG_LABELS[lang] || lang}</span>
              <span className="tag tag-channel">{CHANNEL_ICONS[channel]} {channel.replace('_', ' ')}</span>
              {clusterId && <span className="tag tag-cluster">🔗 {clusterId}</span>}
            </div>
          </div>
        </div>
        {why && why.length > 0 && (
          <div>
            <div className="detail-section-label">Why elevated?</div>
            <div className="why-reasons">
              {why.map((w, i) => <span key={i} className="why-tag">⚡ {w}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="detail-body">
        {/* Original complaint */}
        <div>
          <div className="detail-section-label">Original complaint</div>
          <div className="complaint-text-box">{text}</div>
          <div className="channel-info" style={{marginTop: 8}}>
            <span className="channel-icon">{CHANNEL_ICONS[channel]}</span>
            <span>via {channel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            <span style={{color: 'var(--text-muted)'}}>·</span>
            <span>{LANG_LABELS[lang] || lang} detected</span>
          </div>
        </div>

        {/* Draft reply */}
        <div className="reply-box">
          <div className="detail-section-label">Draft reply ({reply?.lang || 'en'})</div>
          <textarea
            className="reply-textarea"
            value={reply?.text || ''}
            onChange={e => onReplyChange(e.target.value)}
            aria-label="Edit draft reply"
            rows={6}
          />
          <div className="reply-source">
            Source: {reply?.source === 'template' ? '📄 Template' : reply?.source === 'edited' ? '✏️ Edited' : '🤖 AI'}
          </div>
          <div className="reply-actions">
            <button
              className="btn btn-primary"
              onClick={onMarkReplied}
              disabled={status === 'replied'}
              aria-label="Mark as replied"
            >
              {status === 'replied' ? '✅ Replied' : '✅ Mark Replied'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              aria-label="Close detail panel"
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
