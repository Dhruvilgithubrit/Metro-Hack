import React, { useRef, useState, useEffect } from 'react';

function getArrivals(stationId, lineId, now = Date.now()) {
  const seed = stationId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const base  = (seed % 8) + 1;
  const trains = [
    { trainId: 'T0' + (1 + (seed % 3)), direction: lineId === 'Blue' ? 'Towards Vastral Gam' : 'Towards Motera Stadium', mins: base },
    { trainId: 'T0' + (4 + (seed % 3)), direction: lineId === 'Blue' ? 'Towards Thaltej Gam' : 'Towards APMC', mins: base + 6 + (seed % 4) },
    { trainId: 'T0' + (1 + ((seed+1) % 3)), direction: lineId === 'Blue' ? 'Towards Vastral Gam' : 'Towards Motera Stadium', mins: base + 12 + (seed % 5) },
    { trainId: 'T0' + (4 + ((seed+2) % 3)), direction: lineId === 'Blue' ? 'Towards Thaltej Gam' : 'Towards APMC', mins: base + 18 },
  ];
  return trains;
}

const VIEWBOX = "0 0 900 640";

export default function HomeScreen({ user, onScanQR }) {
  const [metroData, setMetroData] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const svgRef = useRef(null);

  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const drag = useRef(null);

  useEffect(() => {
    fetch('/data/metro.json').then(r => r.json()).then(setMetroData);
  }, []);

  function onMouseDown(e) { drag.current = { startX: e.clientX - view.x, startY: e.clientY - view.y }; }
  function onMouseMove(e) {
    if (!drag.current) return;
    setView(v => ({ ...v, x: e.clientX - drag.current.startX, y: e.clientY - drag.current.startY }));
  }
  function onMouseUp() { drag.current = null; }
  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setView(v => ({ ...v, scale: Math.max(0.5, Math.min(3, v.scale * delta)) }));
  }

  function selectStation(st, line) {
    setSelectedStation(st);
    setSelectedLine(line);
  }

  if (!metroData) return null;

  const L1_STATIONS = metroData.lines.find(l => l.id === 'Blue').stations;
  const L2_STATIONS = metroData.lines.find(l => l.id === 'Red').stations;

  const arrivals = selectedStation ? getArrivals(selectedStation.id, selectedLine?.id || 'Blue') : [];

  const transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;

  return (
    <div className="home-screen">
      <div
        className="map-container"
        style={{ flex: 1 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <button className="qr-fab" onClick={onScanQR} aria-label="Scan coach QR code">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 14h3v3M17 17v4M14 17h4"/>
          </svg>
        </button>

        <svg ref={svgRef} viewBox={VIEWBOX} className="metro-map-svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
            </filter>
          </defs>

          <g style={{ transform, transformOrigin: '50% 50%', transition: drag.current ? 'none' : 'transform .05s' }}>
            {Array.from({length:9}, (_,i) => <line key={`hg${i}`} x1="0" y1={i*80+20} x2="900" y2={i*80+20} stroke="#e5e7eb" strokeWidth=".5"/>)}
            {Array.from({length:12}, (_,i) => <line key={`vg${i}`} x1={i*80+10} y1="0" x2={i*80+10} y2="640" stroke="#e5e7eb" strokeWidth=".5"/>)}

            <polyline points={L1_STATIONS.map(s => `${s.x},${s.y}`).join(' ')} stroke="#1d4ed8" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points={L2_STATIONS.map(s => `${s.x},${s.y}`).join(' ')} stroke="#dc2626" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>

            {L1_STATIONS.map((st, idx) => {
              const sel = selectedStation?.id === st.id;
              return (
                <g key={st.id} onClick={() => selectStation(st, { id: 'Blue', name: 'East-West', color: '#1d4ed8' })} style={{ cursor: 'pointer' }}>
                  <circle cx={st.x} cy={st.y} r="16" fill="transparent"/>
                  {st.interchange && <circle cx={st.x} cy={st.y} r="12" stroke="#1d4ed8" strokeWidth="2" fill="#fff" opacity=".6"/>}
                  <circle cx={st.x} cy={st.y} r={sel ? 9 : st.interchange ? 8 : 6} fill={sel ? '#1d4ed8' : '#fff'} stroke="#1d4ed8" strokeWidth={sel ? 0 : 2.5} filter="url(#shadow)"/>
                  {sel && <circle cx={st.x} cy={st.y} r="14" fill="rgba(29,78,216,.15)" stroke="#1d4ed8" strokeWidth="1.5"/>}
                  <text 
                    x={st.x + 6} 
                    y={st.y - 12} 
                    transform={`rotate(-45 ${st.x + 6} ${st.y - 12})`}
                    textAnchor="start" 
                    fontSize="9.5" 
                    fontWeight={sel ? '700' : '500'} 
                    fill={sel ? '#1d4ed8' : '#374151'} 
                    style={{ pointerEvents: 'none' }}
                  >
                    {st.name}
                  </text>
                </g>
              );
            })}

            {L2_STATIONS.filter(s => s.id !== 'OHC').map((st, idx) => {
              const sel = selectedStation?.id === st.id;
              return (
                <g key={st.id} onClick={() => selectStation(st, { id: 'Red', name: 'North-South', color: '#dc2626' })} style={{ cursor: 'pointer' }}>
                  <circle cx={st.x} cy={st.y} r="16" fill="transparent"/>
                  <circle cx={st.x} cy={st.y} r={sel ? 9 : 6} fill={sel ? '#dc2626' : '#fff'} stroke="#dc2626" strokeWidth={sel ? 0 : 2.5} filter="url(#shadow)"/>
                  {sel && <circle cx={st.x} cy={st.y} r="14" fill="rgba(220,38,38,.12)" stroke="#dc2626" strokeWidth="1.5"/>}
                  <text x={st.x + 14} y={st.y + 4} textAnchor="start" fontSize="9" fontWeight={sel ? '700' : '500'} fill={sel ? '#dc2626' : '#374151'} style={{ pointerEvents: 'none' }}>{st.name}</text>
                </g>
              );
            })}

            <g onClick={() => selectStation(L1_STATIONS.find(s => s.id === 'OHC'), { id: 'Blue+Red', name: 'Interchange', color: '#7c3aed' })} style={{ cursor: 'pointer' }}>
              <circle cx={420} cy={340} r="16" fill="transparent"/>
              <circle cx={420} cy={340} r="14" fill="white" stroke="#7c3aed" strokeWidth="2.5" filter="url(#shadow)"/>
              <circle cx={420} cy={340} r="8" fill="#7c3aed"/>
              <text x={420} y={365} textAnchor="middle" fontSize="9" fontWeight="700" fill="#7c3aed" style={{userSelect:'none'}}>Old High Court ⟳</text>
            </g>

            <text x={80} y={358} fontSize="9" fill="#1d4ed8" fontWeight="600" style={{userSelect:'none'}}>← Thaltej Gam</text>
            <text x={850} y={358} fontSize="9" fill="#1d4ed8" fontWeight="600" textAnchor="end" style={{userSelect:'none'}}>Vastral Gam →</text>

            <text x={440} y={68} fontSize="9" fill="#dc2626" fontWeight="600" style={{userSelect:'none'}}>↑ Motera</text>
            <text x={440} y={558} fontSize="9" fill="#dc2626" fontWeight="600" style={{userSelect:'none'}}>↓ APMC</text>
          </g>
        </svg>

        <div className="map-legend">
          <div className="legend-item"><div className="legend-line" style={{background:'#1d4ed8'}}/>Blue Line</div>
          <div className="legend-item"><div className="legend-line" style={{background:'#dc2626'}}/>Red Line</div>
        </div>

        {/* Tap hint */}
        {!selectedStation && (
          <div style={{
            position:'absolute', top:12, left:'50%', transform:'translateX(-50%)',
            background:'rgba(255,255,255,.95)', borderRadius:20, padding:'6px 14px',
            fontSize:'.76rem', fontWeight:600, color:'var(--text-2)',
            boxShadow:'var(--shadow-sm)', pointerEvents:'none', zIndex: 10
          }}>
            👆 Tap a station to see arrivals
          </div>
        )}
      </div>

      {/* Dim overlay for closing */}
      <div 
        className={`map-dim-overlay ${selectedStation ? 'active' : ''}`} 
        onClick={() => setSelectedStation(null)}
        aria-hidden="true"
      />

      {/* Station popup */}
      <div className={`station-popup ${selectedStation ? 'open' : ''}`}>
        <div className="popup-handle-zone" onClick={() => setSelectedStation(null)}>
          <div className="popup-handle" />
        </div>
        
        {selectedStation && (
          <>
            <button className="popup-close-btn" onClick={() => setSelectedStation(null)} aria-label="Close">×</button>
            <div className="popup-station-name" style={{marginTop: 8}}>📍 {selectedStation.name}</div>
            <span
              className="popup-line-tag"
              style={{
                background: selectedStation.interchange ? '#f5f3ff' : selectedLine?.id === 'Blue' ? '#eff6ff' : '#fef2f2',
                color: selectedStation.interchange ? '#7c3aed' : selectedLine?.id === 'Blue' ? '#1d4ed8' : '#dc2626',
              }}
            >
              {selectedStation.interchange ? '⟳ Interchange · Blue + Red' : `${selectedLine?.id} · ${selectedLine?.name}`}
            </span>

            <div className="arrivals-title">Upcoming Trains</div>
            {arrivals.map((a, i) => (
              <div className="arrival-item" key={i}>
                <div>
                  <div className="arrival-dir">{a.direction}</div>
                  <div className="arrival-train">{a.trainId}</div>
                </div>
                <span className="arrival-platform">Plt {i % 2 + 1}</span>
                <div className={`arrival-time ${a.mins <= 3 ? 'soon' : ''}`}>
                  {a.mins <= 0 ? 'Now' : `${a.mins} min`}
                </div>
              </div>
            ))}

            <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={onScanQR}>
              📢 Report Issue from This Train
            </button>
          </>
        )}
      </div>
    </div>
  );
}
