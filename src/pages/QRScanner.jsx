import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';
import { showToast } from '../components/Toast';

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
  const [typedCode, setTypedCode] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  function processUrl(url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `http://localhost/${url}`);
      if (parsed.hash.startsWith('#/report')) {
        const params = new URLSearchParams(parsed.hash.split('?')[1]);
        onScanned({
          source: params.get('src') || 'coach',
          station: params.get('station'),
          asset: params.get('asset'),
          trainId: params.get('train'),
          coachId: params.get('coach'),
          line: params.get('line')
        });
        return true;
      }
    } catch(e) {}
    return false;
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!processUrl(typedCode)) {
      showToast('Invalid QR Code URL', 'error');
    }
  }

  function tick() {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && code.data) {
        if (processUrl(code.data)) {
          return; // success
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  }

  function tryCamera() {
    setScanning(true);
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            requestRef.current = requestAnimationFrame(tick);
          }
        })
        .catch(() => setScanning(false));
    } else {
      setScanning(false);
    }
  }

  function confirmScan() {
    if (!selected) return;
    onScanned({
      source: 'coach',
      trainId: selected.trainId,
      coachId: selected.coachId,
      line: selected.line
    });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-handle"/>
        <div className="modal-title">📷 Scan QR Code</div>
        <p className="modal-sub">Scan the QR code in your coach, lift, or station.</p>

        <div className="scanner-box">
          {scanning ? (
            <>
              <video ref={videoRef} className="scanner-video" playsInline muted/>
              <canvas ref={canvasRef} style={{display:'none'}} />
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

        <form onSubmit={handleManualSubmit} style={{marginTop: '10px', display: 'flex', gap: '8px', padding: '0 20px'}}>
          <input 
            type="text" 
            placeholder="Or paste QR link here..." 
            value={typedCode}
            onChange={e => setTypedCode(e.target.value)}
            className="form-textarea"
            style={{height: '40px', padding: '8px', flex: 1}}
          />
          <button type="submit" className="btn btn-primary btn-sm">Go</button>
        </form>

        <div className="qr-divider">
          <div className="qr-divider-line"/>
          <div className="qr-divider-text">or select your train fallback</div>
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
