import React, { useEffect, useState } from 'react';
import { getAllComplaints, pushStatusUpdate, addComplaint, updateComplaint } from '../db';
import { showToast } from '../components/Toast';
import { triage } from '../triage/triage.js';
import { clusterComplaints } from '../triage/cluster.js';
import lexicon from '../../public/data/lexicon.json';
import replyTemplates from '../../public/data/reply_templates.json';

const HELPLINE = '1800-233-7983';
const OLLAMA_MODEL = 'gemma3:4b';
const FALLBACK_STATION = {
  en: 'the station',
  hi: 'स्टेशन',
  gu: 'સ્ટેશન',
  gujlish: 'station'
};

const STATUS_LABELS = {
  submitted: 'New / Unassigned',
  assigned: 'Assigned to Tech',
  in_progress: 'Tech Arrived',
  resolved: 'Resolved',
  closed: 'Closed'
};

const DEPTS = [
  { id: 'safety', label: 'Safety' },
  { id: 'lifts', label: 'Lifts' },
  { id: 'cleanliness', label: 'Cleanliness' },
  { id: 'fare', label: 'Fare' },
  { id: 'staff', label: 'Staff' },
  { id: 'other', label: 'Other' }
];

export default function OperatorDashboard({ user }) {
  const [allComplaints, setAllComplaints] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [langFilter, setLangFilter] = useState('');
  const [chanFilter, setChanFilter] = useState('');
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [panelMode, setPanelMode] = useState(false);

  // Import Panel States
  const [showImport, setShowImport] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [manualChan, setManualChan] = useState('app');
  const [manualStation, setManualStation] = useState('');
  const [manualText, setManualText] = useState('');

  const [draftReply, setDraftReply] = useState('');
  const [draftSource, setDraftSource] = useState('template');
  const [polishing, setPolishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  async function load() {
    const rawData = await getAllComplaints();
    const clustered = clusterComplaints(rawData);
    setAllComplaints(clustered);
    setComplaints(clustered);
    setLoading(false);
  }

  async function performSync() {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const dbData = await getAllComplaints();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (res.ok) {
        // Now fetch merged
        const getRes = await fetch('/api/sync');
        const merged = await getRes.json();
        // Update local DB
        for (const m of merged) {
           await updateComplaint(m.id, { ...m, synced: true });
        }
        load();
      }
    } catch(e) {
      console.error('Sync failed', e);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    load();
    performSync();

    const handleOnline = () => { setOnline(true); performSync(); };
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(() => {
      performSync();
      if (!panelMode) load();
    }, 20000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [panelMode]);

  useEffect(() => {
    if (selectedComplaint && panelMode) {
      if (selectedComplaint.reply) {
        setDraftReply(selectedComplaint.reply.text);
        setDraftSource(selectedComplaint.reply.source || 'template');
      } else {
        const lang = selectedComplaint.lang || 'en';
        const dept = selectedComplaint.dept || 'other';
        const tpl = (replyTemplates[dept] && replyTemplates[dept][lang]) || replyTemplates['other'][lang] || replyTemplates['other']['en'];
        const stationStr = selectedComplaint.station || FALLBACK_STATION[lang] || 'the station';
        let text = tpl.replace(/\{ref\}/g, selectedComplaint.id).replace(/\{station\}/g, stationStr).replace(/\{helpline\}/g, HELPLINE);
        setDraftReply(text);
        setDraftSource('template');
      }
    }
  }, [selectedComplaint, panelMode]);

  async function handlePolish() {
    setPolishing(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          prompt: `Improve the tone of this customer service reply. Make it more professional and empathetic. Keep the exact same language and script. Keep every fact unchanged (reference number, station name, helpline). Return ONLY the improved reply, no markdown, no other text.\n\nReply: ${draftReply}`
        }),
        signal: controller.signal
      });
      clearTimeout(id);
      if (!res.ok) throw new Error('Ollama error');
      const data = await res.json();
      setDraftReply(data.response.trim());
      setDraftSource('gemma');
      showToast('Polished with local AI', 'success');
    } catch(err) {
      console.warn('Ollama polish failed', err);
      showToast('Local AI unavailable, using template', 'error');
    } finally {
      setPolishing(false);
    }
  }

  // Filtering
  const filtered = complaints.filter(c => {
    if (langFilter && c.lang !== langFilter) return false;
    if (chanFilter && c.channel !== chanFilter) return false;
    return true;
  });

  const activeCases = filtered.filter(c => !['resolved','closed'].includes(c.status));
  const resolvedCount = filtered.length - activeCases.length;
  const criticalCount = activeCases.filter(c => c.band === 'critical').length;
  const highCount = activeCases.filter(c => c.band === 'high').length;

  async function handleStatusChange(id, newStatus) {
    await pushStatusUpdate(id, newStatus, `Status updated to ${STATUS_LABELS[newStatus]}`);
    showToast('Status updated', 'success');
    if (selectedComplaint && selectedComplaint.id === id) {
      setSelectedComplaint(prev => ({...prev, status: newStatus}));
    }
    load();
  }

  async function handleOverride(id, field, val) {
    await updateComplaint(id, { [field]: val });
    showToast(`Updated ${field}`, 'success');
    if (selectedComplaint && selectedComplaint.id === id) {
      setSelectedComplaint(prev => ({...prev, [field]: val}));
    }
    load();
  }

  async function handleSendReply() {
    if (!selectedComplaint) return;
    const replyObj = { text: draftReply, lang: selectedComplaint.lang || 'en', source: draftSource, ts: Date.now() };
    await updateComplaint(selectedComplaint.id, { reply: replyObj, synced: false });
    await pushStatusUpdate(selectedComplaint.id, selectedComplaint.status, 'Reply sent to rider');
    showToast('Reply saved and added to outbox', 'success');
    setSelectedComplaint(prev => ({...prev, reply: replyObj}));
    performSync();
  }

  async function handleBatchAdd(batchArray) {
    const start = performance.now();
    let count = 0;
    for (const c of batchArray) {
      const ts = Date.now() - ((c.minutesAgo || 0) * 60000);
      const baseRec = {
        channel: c.channel || 'app',
        source: c.source || (c.channel === 'coach_qr' ? 'coach' : 'batch'),
        station: c.station || '',
        train: c.train || '',
        coach: c.coach || '',
        asset: c.asset || '',
        ts,
        text: c.text,
        phone: c.phone || '',
        name: c.name || 'Batch User',
        hintDept: 'unsure',
        minutesAgo: c.minutesAgo || 0,
      };
      const triaged = triage(baseRec, lexicon);
      await addComplaint(triaged);
      count++;
    }
    const duration = Math.round(performance.now() - start);
    showToast(`Loaded ${count} complaints in ${duration}ms`, 'success');
    setShowImport(false);
    load();
  }

  function getBandColor(band) {
    if (band === 'critical') return '#dc2626'; // red
    if (band === 'high') return '#ea580c'; // orange
    if (band === 'medium') return '#d97706'; // amber
    return '#16a34a'; // green
  }

  const pendingSyncCount = allComplaints.filter(c => c.synced === false).length;

  return (
    <div className="operator-screen screen" style={{display: 'flex', flexDirection: 'column', height: '100vh', padding: 0}}>
      {/* Top Strip */}
      <div style={{background: 'var(--bg-card)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)'}}>
        <div style={{display: 'flex', gap: '16px', fontWeight: 600}}>
          <span style={{color: 'var(--error)'}}>Critical: {criticalCount}</span>
          <span style={{color: 'var(--orange)'}}>High: {highCount}</span>
          <span>Open: {activeCases.length}</span>
          <span style={{color: 'var(--text-3)'}}>Resolved: {resolvedCount}</span>
        </div>
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          <div className={`online-pill ${online ? '' : 'offline'}`} style={{marginRight: '8px'}}>
            <span className="online-dot"/> {online ? 'Online' : 'Offline'}
          </div>
          {pendingSyncCount > 0 && (
             <div className="sync-badge">{pendingSyncCount} waiting to sync</div>
          )}
          <button className="btn btn-secondary btn-sm" onClick={performSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <select className="form-input" style={{padding: '4px 8px'}} value={langFilter} onChange={e=>setLangFilter(e.target.value)}>
            <option value="">All Langs</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="gu">Gujarati</option>
            <option value="gujlish">Gujlish</option>
          </select>
          <select className="form-input" style={{padding: '4px 8px'}} value={chanFilter} onChange={e=>setChanFilter(e.target.value)}>
            <option value="">All Channels</option>
            <option value="app">App</option>
            <option value="x">X</option>
            <option value="email">Email</option>
            <option value="qr">QR</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(!showImport)}>Import Data</button>
        </div>
      </div>

      {showImport && (
        <div style={{background: 'var(--bg-card)', padding: '16px', borderBottom: '1px solid var(--border)'}}>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
             const res = await fetch('/data/complaints.json');
             const data = await res.json();
             handleBatchAdd(data);
          }}>Load complaints.json</button>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              let data = pasteText.trim().startsWith('[') ? JSON.parse(pasteText) : pasteText.split('\\n').map(l => {
                const p = l.split(','); return {channel:p[0], station:p[1], text:p.slice(2).join(',')};
              });
              await handleBatchAdd(data);
              setPasteText('');
            } catch(e) { showToast('Invalid format', 'error'); }
          }} style={{marginTop: '10px', display: 'flex', gap: '8px'}}>
             <input type="text" className="form-input" placeholder="Paste JSON or CSV" value={pasteText} onChange={e=>setPasteText(e.target.value)} style={{flex: 1}}/>
             <button type="submit" className="btn btn-primary btn-sm">Paste</button>
          </form>
        </div>
      )}

      {/* Board */}
      <div style={{display: 'flex', flex: 1, overflowX: 'auto', padding: '16px', gap: '16px', background: 'var(--bg-app)'}}>
        {DEPTS.map(d => {
          const colCases = filtered
            .filter(c => (c.dept || 'other') === d.id)
            .sort((a,b) => {
               const aDone = ['resolved','closed'].includes(a.status);
               const bDone = ['resolved','closed'].includes(b.status);
               if (aDone && !bDone) return 1;
               if (!aDone && bDone) return -1;
               return b.urgency - a.urgency;
            });
          return (
            <div key={d.id} style={{minWidth: '300px', maxWidth: '300px', display: 'flex', flexDirection: 'column'}}>
              <h3 style={{fontSize: '1.1rem', marginBottom: '12px', display: 'flex', justifyContent: 'space-between'}}>
                {d.label} <span style={{background:'var(--border)', padding:'2px 8px', borderRadius:'12px', fontSize:'.8rem'}}>{colCases.length}</span>
              </h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingBottom: '20px'}}>
                {colCases.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => { setSelectedComplaint(c); setPanelMode(true); }}
                    style={{background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'}}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                      <span style={{background: getBandColor(c.band), color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '.75rem', fontWeight: 600}}>
                        {c.urgency}
                      </span>
                      <div style={{display: 'flex', gap: '4px'}}>
                        <span style={{fontSize: '.7rem', background: 'var(--bg-app)', padding: '2px 4px', borderRadius: '4px', textTransform:'uppercase'}}>{c.lang}</span>
                        <span style={{fontSize: '.7rem', background: 'var(--bg-app)', padding: '2px 4px', borderRadius: '4px'}}>{c.channel}</span>
                      </div>
                    </div>
                    
                    <div style={{fontSize: '.8rem', color: 'var(--text-2)', marginBottom: '6px', fontWeight: 500}}>
                      {c.station ? `📍 ${c.station}` : ''} {c.asset ? `· ${c.asset}` : ''}
                      {c.train ? `🚇 ${c.train} · C${c.coach}` : ''}
                    </div>
                    
                    <div style={{fontSize: '.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                      {c.text}
                    </div>

                    {c.clusterSize >= 3 && (
                      <div style={{marginTop: '8px', fontSize: '.75rem', color: 'var(--blue)', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px'}}>
                        🔗 {c.clusterSize} complaints
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side Panel */}
      {panelMode && selectedComplaint && (
        <div style={{position: 'fixed', top: 0, right: 0, width: '400px', height: '100%', background: 'var(--bg-card)', boxShadow: '-2px 0 10px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s forwards'}}>
          <div style={{padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0}}>Ticket {selectedComplaint.id.split('-')[1] || selectedComplaint.id}</h3>
            <button className="btn btn-ghost" onClick={() => setPanelMode(false)}>✕</button>
          </div>
          
          <div style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
            <div style={{marginBottom: '20px'}}>
              <h4 style={{fontSize: '.85rem', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '8px'}}>Original Text</h4>
              <p style={{fontSize: '1rem', lineHeight: 1.5}}>{selectedComplaint.text}</p>
            </div>

            <div style={{marginBottom: '20px', background: 'var(--bg-app)', padding: '12px', borderRadius: '8px'}}>
              <h4 style={{fontSize: '.85rem', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '8px'}}>Why this score ({selectedComplaint.urgency})</h4>
              <ul style={{paddingLeft: '20px', margin: 0, fontSize: '.9rem'}}>
                {selectedComplaint.why?.map((w,i) => (
                  <li key={i}>{w.id}: {w.points > 0 ? '+' : ''}{w.points}</li>
                ))}
              </ul>
            </div>

            <div style={{marginBottom: '20px'}}>
              <h4 style={{fontSize: '.85rem', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '8px'}}>Classification</h4>
              <div style={{display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
                <span className="location-chip train">Primary: {selectedComplaint.dept}</span>
                {selectedComplaint.secondary?.map(s => <span key={s} className="location-chip coach">Sec: {s}</span>)}
              </div>
              
              <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                <select className="form-input" style={{flex: 1}} value={selectedComplaint.dept} onChange={e => handleOverride(selectedComplaint.id, 'dept', e.target.value)}>
                  {DEPTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
                <select className="form-input" style={{flex: 1}} value={selectedComplaint.band} onChange={e => handleOverride(selectedComplaint.id, 'band', e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div style={{marginBottom: '20px'}}>
              <h4 style={{fontSize: '.85rem', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '8px'}}>Status Update</h4>
              <select className="form-input" style={{width: '100%'}} value={selectedComplaint.status} onChange={e => handleStatusChange(selectedComplaint.id, e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{marginBottom: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                <h4 style={{fontSize: '.85rem', color: 'var(--text-2)', textTransform: 'uppercase'}}>Draft Reply ({selectedComplaint.lang || 'en'})</h4>
                <button className="btn btn-ghost btn-sm" onClick={handlePolish} disabled={polishing} style={{fontSize: '.7rem', height: '24px', padding: '0 8px'}}>
                  {polishing ? 'Polishing...' : '✨ Polish with local AI'}
                </button>
              </div>
              <textarea 
                className="form-textarea" 
                value={draftReply} 
                onChange={e => { setDraftReply(e.target.value); setDraftSource('edited'); }}
                style={{minHeight: '120px', width: '100%', marginBottom: '8px', fontSize: '.85rem'}}
              />
              <div style={{display: 'flex', gap: '8px'}}>
                <button className="btn btn-primary btn-sm" onClick={handleSendReply} style={{flex: 1}}>Approve and send</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                    const lang = selectedComplaint.lang || 'en';
                    const dept = selectedComplaint.dept || 'other';
                    const tpl = (replyTemplates[dept] && replyTemplates[dept][lang]) || replyTemplates['other'][lang] || replyTemplates['other']['en'];
                    const stationStr = selectedComplaint.station || FALLBACK_STATION[lang] || 'the station';
                    setDraftReply(tpl.replace(/\{ref\}/g, selectedComplaint.id).replace(/\{station\}/g, stationStr).replace(/\{helpline\}/g, HELPLINE));
                    setDraftSource('template');
                }}>Reset to draft</button>
              </div>
            </div>

            {selectedComplaint.clusterSize >= 3 && (
              <div>
                <h4 style={{fontSize: '.85rem', color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '8px'}}>Related in Cluster</h4>
                <div style={{fontSize: '.85rem'}}>
                  {allComplaints.filter(c => c.clusterId === selectedComplaint.clusterId && c.id !== selectedComplaint.id).map(c => (
                    <div key={c.id} style={{padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '4px'}}>
                      {c.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
