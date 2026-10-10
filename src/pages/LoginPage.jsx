import React, { useState } from 'react';

const DUMMY_USERS = [
  { id: 'U001', phone: '9876543210', name: 'Arjun Patel',  avatar: 'AP', role: 'rider' },
  { id: 'U002', phone: '9876543211', name: 'Priya Shah',   avatar: 'PS', role: 'rider' },
  { id: 'U003', phone: '9876543212', name: 'Rahul Mehta',  avatar: 'RM', role: 'rider' },
  { id: 'U005', phone: 'operator1',  name: 'Station Ctrl', avatar: 'SC', role: 'operator' },
];

export default function LoginPage({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function handlePhone(e) {
    const v = e.target.value.replace(/\D/g,'').slice(0,10);
    setPhone(v);
    setErr('');
  }

  function doLogin(user) {
    setLoading(true);
    setTimeout(() => { onLogin(user); setLoading(false); }, 600);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (phone.length < 10) { setErr('Enter a valid 10-digit number'); return; }
    const match = DUMMY_USERS.find(u => u.phone === phone);
    if (match) { doLogin(match); return; }
    doLogin({ id: `U-${Date.now()}`, phone, name: 'Guest Rider', avatar: phone.slice(-2).toUpperCase(), role: 'rider' });
  }

  return (
    <div className="login-screen screen">
      <div className="login-hero">
        <div className="login-metro-logo">
          <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 38V14l16-8 16 8v24" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 38V24l8-4 8 4v14" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="login-title">Gujarat <span>Metro</span></h1>
        <p className="login-subtitle">Smart commute. Report issues. Track resolutions — all in one app.</p>

        <div className="login-lines">
          <div className="login-line-chip" style={{background:'#eff6ff',color:'#1d4ed8'}}>
            <span className="dot" style={{background:'#1d4ed8'}} />
            Blue Line (E-W)
          </div>
          <div className="login-line-chip" style={{background:'#fef2f2',color:'#dc2626'}}>
            <span className="dot" style={{background:'#dc2626'}} />
            Red Line (N-S)
          </div>
        </div>
      </div>

      <div className="login-form">
        <div className="login-card">
          <form onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="phone-input">Mobile Number</label>
            <div className="phone-input-wrap">
              <div className="phone-prefix">🇮🇳 +91</div>
              <input
                id="phone-input"
                className="phone-input"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhone}
                placeholder="10-digit number"
                autoComplete="tel"
              />
            </div>
            {err && <p style={{color:'var(--error)',fontSize:'.78rem',marginTop:6}}>{err}</p>}
            <p className="login-hint">
              Demo: try <strong>9876543210</strong> (rider) or <strong>operator1</strong>
            </p>
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Continue →'}
            </button>
          </form>

          <div className="login-dummy-users">
            <p className="dummy-label">— or sign in as —</p>
            {DUMMY_USERS.map((u, i) => (
              <button
                key={u.id}
                className="dummy-user-btn"
                onClick={() => doLogin(u)}
              >
                <div className={`dummy-avatar ${i === 1 ? 'blue' : i === 2 ? 'green' : ''}`}>
                  {u.avatar}
                </div>
                <div style={{textAlign:'left'}}>
                  <div style={{fontWeight:700,fontSize:'.86rem'}}>{u.name}</div>
                  <div style={{fontSize:'.72rem',color:'var(--text-3)'}}>
                    {u.role === 'operator' ? '🔧 Operator' : '🚇 Rider'} · {u.phone}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
