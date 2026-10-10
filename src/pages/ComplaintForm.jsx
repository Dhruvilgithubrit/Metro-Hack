import React, { useState } from 'react';
import { addComplaint } from '../db';
import { showToast } from '../components/Toast';

const PROBLEMS = [
  { id: 'technical', label: 'Technical Issue', icon: '🔧' },
  { id: 'cleanliness', label: 'Cleanliness', icon: '🧹' },
  { id: 'staff', label: 'Staff Behavior', icon: '👤' },
  { id: 'safety', label: 'Safety / Security', icon: '🚨' },
  { id: 'ac', label: 'A/C Not Working', icon: '❄️' },
  { id: 'other', label: 'Other', icon: '📋' },
];

export default function ComplaintForm({ user, locationCtx, onBack, onSubmitSuccess }) {
  const [problemType, setProblemType] = useState(null);
  const [severity, setSeverity] = useState('medium');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!problemType) { showToast('Please select a problem type', 'error'); return; }
    if (desc.trim().length < 5) { showToast('Please provide a few details', 'error'); return; }

    setLoading(true);
    try {
      const record = {
        userId: user.id,
        userPhone: user.phone,
        type: problemType,
        severity,
        desc: desc.trim(),
        trainId: locationCtx.trainId,
        coachId: locationCtx.coachId,
        line: locationCtx.line,
        direction: locationCtx.direction,
      };

      const saved = await addComplaint(record);
      setSuccessData(saved);
      showToast('Report submitted successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error submitting report', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (successData) {
    return (
      <div className="form-screen animate-in">
        <div className="submit-success">
          <div className="success-icon">✅</div>
          <h2 className="success-title">Report Submitted</h2>
          <div className="success-ref">{successData.id}</div>
          <p className="success-sub">
            Thank you. Our team has been notified. 
            An operator is reviewing your report and will assign assistance to Train {successData.trainId}, Coach {successData.coachId} shortly.
          </p>
          <button className="btn btn-primary btn-lg btn-full" onClick={() => onSubmitSuccess(successData.id)}>
            Track Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-screen animate-in">
      <div className="form-header">
        <button className="form-back" onClick={onBack} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2 className="form-title">Report Issue</h2>
        <div className="form-location-chip">
          🚇 Train {locationCtx.trainId} · Coach {locationCtx.coachId}
        </div>
      </div>

      <div className="form-body">
        <form onSubmit={handleSubmit}>
          
          {/* Problem Type */}
          <div className="form-section">
            <label className="form-label">
              What is the problem? <span className="form-required">*</span>
            </label>
            <div className="problem-grid">
              {PROBLEMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`problem-btn ${problemType === p.id ? 'active' : ''}`}
                  onClick={() => setProblemType(p.id)}
                >
                  <div className="problem-icon">{p.icon}</div>
                  <div className="problem-label">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="form-section">
            <label className="form-label">Severity Level</label>
            <div className="severity-row">
              <button 
                type="button" 
                className={`severity-btn low ${severity === 'low' ? 'active' : ''}`}
                onClick={() => setSeverity('low')}
              >Low</button>
              <button 
                type="button" 
                className={`severity-btn medium ${severity === 'medium' ? 'active' : ''}`}
                onClick={() => setSeverity('medium')}
              >Medium</button>
              <button 
                type="button" 
                className={`severity-btn high ${severity === 'high' ? 'active' : ''}`}
                onClick={() => setSeverity('high')}
              >High</button>
            </div>
          </div>

          {/* Description */}
          <div className="form-section">
            <label className="form-label">
              Details <span className="form-required">*</span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Please describe what happened..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              maxLength={500}
            />
            <div className="char-count">{desc.length} / 500</div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full btn-lg" 
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Report →'}
          </button>
        </form>
      </div>
    </div>
  );
}
