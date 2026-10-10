import React, { useEffect, useRef, useState } from 'react';

let _toasts = [];
let _setToasts = null;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  _setToasts = setToasts;
  _toasts = toasts;

  return (
    <>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.icon}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

export function showToast(message, type = 'info', duration = 3000) {
  if (!_setToasts) return;
  const id = Date.now() + Math.random();
  _setToasts(prev => [...prev, { id, message, type, icon: ICONS[type] || '💬' }]);
  setTimeout(() => {
    _setToasts(prev => prev.filter(t => t.id !== id));
  }, duration);
}
