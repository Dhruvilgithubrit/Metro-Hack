import React from 'react';
import { clearSession } from '../db';

export default function ProfileScreen({ user, onLogout }) {
  async function handleLogout() {
    await clearSession();
    onLogout();
  }

  return (
    <div className="screen animate-in">
      <div className="profile-sheet-header">
        <div className="profile-avatar-large">
          {user.avatar}
        </div>
        <div style={{textAlign:'center'}}>
          <h2 className="profile-name">{user.name}</h2>
          <div className="profile-phone">+91 {user.phone}</div>
        </div>
        <div className="profile-role-badge">
          {user.role === 'operator' ? 'Station Controller' : 'Commuter'}
        </div>
      </div>

      <div className="profile-menu">
        <button className="profile-menu-item">
          <span style={{fontSize:'1.2rem',width:30}}>📝</span>
          My Reports
        </button>
        <button className="profile-menu-item">
          <span style={{fontSize:'1.2rem',width:30}}>⚙️</span>
          Settings
        </button>
        <button className="profile-menu-item">
          <span style={{fontSize:'1.2rem',width:30}}>❓</span>
          Help & Support
        </button>
        
        <div style={{height:1, background:'var(--border)', margin:'12px 0'}}/>
        
        <button className="profile-menu-item danger" onClick={handleLogout}>
          <span style={{fontSize:'1.2rem',width:30}}>🚪</span>
          Log out
        </button>
      </div>
    </div>
  );
}
