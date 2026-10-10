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

  useEffect(() => {
    getSession().then(s => {
      if (s) setUser(s);
      setLoading(false);
    });
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
    return <LoginPage onLogin={handleLogin} />;
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
    <>
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
          <div className="online-pill">
            <span className="online-dot"/> Online
          </div>
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
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
