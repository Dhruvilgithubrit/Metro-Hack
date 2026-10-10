import React, { useState } from 'react';
import { addComplaint } from '../db';
import { showToast } from '../components/Toast';
import lexicon from '../../public/data/lexicon.json';
import { triage } from '../triage/triage.js';

const PROBLEMS = [
  { id: 'safety', label: 'Safety', icon: '🚨' },
  { id: 'lifts', label: 'Lifts', icon: '🛗' },
  { id: 'cleanliness', label: 'Cleanliness', icon: '🧹' },
  { id: 'fare', label: 'Fare', icon: '🎟️' },
  { id: 'staff', label: 'Staff behaviour', icon: '👤' },
  { id: 'other', label: 'Other', icon: '📋' },
  { id: 'unsure', label: 'I\'m not sure', icon: '❓' },
];

export default function ComplaintForm({ user, locationCtx, onBack, onSubmitSuccess }) {
  const [problemType, setProblemType] = useState(null);
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  React.useEffect(() => {
    if (locationCtx.source === 'lift') setProblemType('lifts');
    else if (locationCtx.source === 'station') setProblemType('safety'); // default hint
  }, [locationCtx]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!problemType) { showToast('Please select a department', 'error'); return; }
    if (desc.trim().length < 5) { showToast('Please write the problem details', 'error'); return; }

    setLoading(true);
    try {
      const baseRecord = {
        userId: user.id,
        userPhone: user.phone,
        name: user.name || user.phone,
        hintDept: problemType,
        text: desc.trim(),
        channel: 'app',
        source: locationCtx.coachId ? 'coach' : (locationCtx.asset ? 'lift' : 'station'),
        station: locationCtx.station || '',
        train: locationCtx.trainId || '',
        coach: locationCtx.coachId || '',
        asset: locationCtx.asset || '',
        line: locationCtx.line || '',
        minutesAgo: 0,
        ts: Date.now(),
      };

      // Run local triage engine
      const triagedRecord = triage(baseRecord, lexicon);

      const saved = await addComplaint(triagedRecord);
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
            {successData.train ? ` An operator is reviewing your report and will assign assistance to Train ${successData.train}, Coach ${successData.coach} shortly.` : ' We will attend to your request shortly.'}
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
          {locationCtx.coachId ? `🚇 Train ${locationCtx.trainId} · Coach ${locationCtx.coachId}` : `📍 Station ${locationCtx.station}`}
        </div>
      </div>

      <div className="form-body">
        <form onSubmit={handleSubmit}>
          
          {/* Problem Type */}
          <div className="form-section">
            <label className="form-label">
              Select Department <span className="form-required">*</span>
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

          {/* Description */}
          <div className="form-section">
            <label className="form-label">
              Details (Write in English, Hindi, or Gujarati) <span className="form-required">*</span>
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
