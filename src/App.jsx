import React, { useEffect, useState } from 'react';
import { getSession, setSession } from './db';
import { ToastProvider } from './components/Toast';

import LoginPage from './pages/LoginPage';
import HomeScreen from './pages/HomeScreen';
import QRScanner from './pages/QRScanner';
import ComplaintForm from './pages/ComplaintForm';
import MyReports from './pages/MyReports';
import OperatorDashboard from './pages/OperatorDashboard';
import ProfileScreen from './pages/ProfileScreen';

function AppInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Tabs for rider: map, reports, profile
  const [activeTab, setActiveTab] = useState('map');
  
  // Modals / Overlays
  const [showQR, setShowQR] = useState(false);
  const [scanResult, setScanResult] = useState(null); // the location ctx
  const [showForm, setShowForm] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  async function checkSyncStatus() {
    const db = await import('./db');
    const data = await db.getAllComplaints();
    setPendingSyncCount(data.filter(c => c.synced === false && c.userId === user?.id).length);
  }

  async function performSync() {
    if (!navigator.onLine || !user) return;
    setSyncing(true);
    try {
      const db = await import('./db');
      const dbData = await db.getAllComplaints();
      const myPending = dbData.filter(c => c.synced === false && c.userId === user.id);
      if (myPending.length === 0) {
        // Just pull
        const getRes = await fetch('/api/sync');
        if (getRes.ok) {
           const merged = await getRes.json();
           for (const m of merged) { if (m.userId === user.id) await db.updateComplaint(m.id, { ...m, synced: true }); }
        }
      } else {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbData.filter(c => c.userId === user.id)),
          signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
          const getRes = await fetch('/api/sync');
          const merged = await getRes.json();
          for (const m of merged) { if (m.userId === user.id) await db.updateComplaint(m.id, { ...m, synced: true }); }
        }
      }
      checkSyncStatus();
    } catch(e) {
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    getSession().then(s => {
      if (s) {
        setUser(s);
        checkSyncStatus();
      }
      setLoading(false);
    });

    const handleOnline = () => { setOnline(true); performSync(); };
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(() => {
      performSync();
      checkSyncStatus();
    }, 20000);

    const handleHash = () => {
      if (window.location.hash.startsWith('#/report')) {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const data = {
          source: params.get('src') || 'coach',
          station: params.get('station'),
          asset: params.get('asset'),
          trainId: params.get('train'),
          coachId: params.get('coach'),
          line: params.get('line')
        };
        setScanResult(data);
        setShowForm(true);
        window.location.hash = ''; 
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  async function handleLogin(u) {
    await setSession(u);
    setUser(u);
    setActiveTab(u.role === 'operator' ? 'dashboard' : 'map');
  }

  function handleLogout() {
    setUser(null);
  }

  function handleQRScanned(data) {
    setScanResult(data);
    setShowQR(false);
    setShowForm(true);
  }

  function handleReportSubmitted(id) {
    setShowForm(false);
    setScanResult(null);
    setActiveTab('reports');
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="mobile-view-wrapper">
        <div className="mobile-view-frame">
          <LoginPage onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  // --- Operator Flow ---
  if (user.role === 'operator') {
    return (
      <>
        <div className="top-bar">
          <div className="top-bar-logo">
            <div className="top-bar-logo-mark">M</div>
            <div>
              <div className="top-bar-title">Operator Desk</div>
              <div className="top-bar-sub">Ahmedabad Metro</div>
            </div>
          </div>
          <div className="top-bar-spacer"/>
          <button className="avatar-btn" onClick={() => setActiveTab('profile')}>{user.avatar}</button>
        </div>

        {activeTab === 'dashboard' && <OperatorDashboard user={user} />}
        {activeTab === 'profile' && <ProfileScreen user={user} onLogout={handleLogout} />}

        <nav className="bottom-nav">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="tab-icon">🖥️</span>
            <span>Live Feed</span>
          </button>
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="tab-icon">👤</span>
            <span>Profile</span>
          </button>
        </nav>
      </>
    );
  }

  // --- Rider Flow ---
  return (
    <div className="mobile-view-wrapper">
      <div className="mobile-view-frame">
        {/* Top Nav */}
      {!showForm && (
        <div className="top-bar">
          <div className="top-bar-logo">
            <div className="top-bar-logo-mark">M</div>
            <div>
              <div className="top-bar-title">Gujarat Metro</div>
              <div className="top-bar-sub">Ahmedabad Line 1 & 2</div>
            </div>
          </div>
          <div className="top-bar-spacer"/>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <div className={`online-pill ${online ? '' : 'offline'}`}>
              <span className="online-dot"/> {online ? 'Online' : 'Offline'}
            </div>
            {pendingSyncCount > 0 && (
              <div className="sync-badge" onClick={performSync} style={{cursor:'pointer'}}>
                {syncing ? 'Syncing...' : `${pendingSyncCount} wait`}
              </div>
            )}
          </div>
        </div>
      )}

      {!online && (
        <div className="offline-banner">
          You're offline. Everything is saved on this device.
        </div>
      )}
      {online && pendingSyncCount > 0 && syncing && (
        <div className="online-banner">
          Back online. Syncing {pendingSyncCount} items.
        </div>
      )}

      {/* Main Content Area */}
      {!showForm && (
        <>
          {activeTab === 'map' && <HomeScreen user={user} onScanQR={() => setShowQR(true)} />}
          {activeTab === 'reports' && <MyReports user={user} />}
          {activeTab === 'profile' && <ProfileScreen user={user} onLogout={handleLogout} />}
        </>
      )}

      {/* Form Full-Screen Overlay */}
      {showForm && scanResult && (
        <ComplaintForm 
          user={user} 
          locationCtx={scanResult} 
          onBack={() => setShowForm(false)} 
          onSubmitSuccess={handleReportSubmitted}
        />
      )}

      {/* Bottom Nav (hidden when form is open) */}
      {!showForm && (
        <nav className="bottom-nav">
          <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
            <span className="tab-icon">🗺️</span>
            <span>Map</span>
          </button>
          <button className="tab-btn" onClick={() => setShowQR(true)}>
            <div style={{
              width:44, height:44, borderRadius:'50%', background:'var(--orange)', 
              color:'white', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'1.3rem', marginTop:-24, border:'4px solid var(--bg-card)',
              boxShadow:'0 2px 10px rgba(232,89,12,.3)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <path d="M14 14h3v3M17 17v4M14 17h4"/>
              </svg>
            </div>
            <span style={{marginTop: 4, fontWeight: 700}}>Report</span>
          </button>
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <span className="tab-icon">📋</span>
            <span>My Reports</span>
          </button>
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="tab-icon">👤</span>
            <span>Profile</span>
          </button>
        </nav>
      )}

      {/* QR Modal */}
      {showQR && <QRScanner onClose={() => setShowQR(false)} onScanned={handleQRScanned} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
