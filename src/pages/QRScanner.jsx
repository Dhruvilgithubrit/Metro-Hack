import React, { useRef, useState } from 'react';

const QR_OPTIONS = [
  { trainId: 'T01', coachId: 'C1', line: 'Blue Line', direction: 'Towards Vastral Gam' },
  { trainId: 'T01', coachId: 'C3', line: 'Blue Line', direction: 'Towards Vastral Gam' },
  { trainId: 'T02', coachId: 'C2', line: 'Blue Line', direction: 'Towards Thaltej Gam' },
  { trainId: 'T03', coachId: 'C5', line: 'Blue Line', direction: 'Towards Thaltej Gam' },
  { trainId: 'T04', coachId: 'C1', line: 'Red Line', direction: 'Towards Motera Stadium' },
  { trainId: 'T05', coachId: 'C4', line: 'Red Line', direction: 'Towards APMC' },
];

export default function QRScanner({ onClose, onScanned }) {
  const [selected, setSelected] = useState(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);

  function tryCamera() {
    setScanning(true);
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => setScanning(false));
    } else {
      setScanning(false);
    }
  }

  function confirmScan() {
    if (!selected) return;
    onScanned(selected);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-handle"/>
        <div className="modal-title">📷 Scan Coach QR</div>
        <p className="modal-sub">Scan the QR code inside your metro coach to report an issue.</p>

        <div className="scanner-box">
          {scanning ? (
            <>
              <video ref={videoRef} className="scanner-video" playsInline muted/>
              <div className="scanner-overlay">
                <div className="scanner-frame"/>
                <div className="scanner-line"/>
              </div>
            </>
          ) : (
            <div className="scanner-placeholder">
              <div style={{fontSize:'3rem',marginBottom:12}}>📸</div>
              <div style={{marginBottom:12}}>Camera permission needed to scan QR</div>
              <button className="btn btn-secondary btn-sm" onClick={tryCamera} style={{color:'white',borderColor:'rgba(255,255,255,.3)'}}>
                Enable Camera
              </button>
            </div>
          )}
        </div>

        <div className="qr-divider">
          <div className="qr-divider-line"/>
          <div className="qr-divider-text">or select your train</div>
          <div className="qr-divider-line"/>
        </div>

        <div className="qr-selector">
          <div className="qr-selector-label">Select Train & Coach</div>
          <div className="qr-grid">
            {QR_OPTIONS.map((opt, i) => {
              const isSel = selected?.trainId === opt.trainId && selected?.coachId === opt.coachId;
              return (
                <button
                  key={i}
                  className={`qr-option ${isSel ? 'selected' : ''}`}
                  onClick={() => setSelected(opt)}
                >
                  <div className="qr-option-train">🚇 {opt.trainId} · Coach {opt.coachId}</div>
                  <div className="qr-option-detail" style={{color: opt.line === 'Blue Line' ? '#1d4ed8' : '#dc2626'}}>
                    {opt.line} · {opt.direction.replace('Towards ','')}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            disabled={!selected}
            onClick={confirmScan}
          >
            {selected ? `Report Issue → ${selected.trainId} · ${selected.coachId}` : 'Select a coach above'}
          </button>
          <button
            className="btn btn-ghost btn-full"
            onClick={onClose}
            style={{marginTop:10}}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
