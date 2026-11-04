import React, { useEffect, useState } from 'react';

// The phone is designed at 430×884. On a laptop we scale it down to fit
// the window height so the page never scrolls. On a real phone the frame
// disappears and the app goes full-screen (see the 600px media query).
const PHONE_W = 430;
const PHONE_H = 884;
const MARGIN = 40; // space above + below the phone

function useFitScale() {
  const calc = () => {
    if (typeof window === 'undefined' || window.innerWidth <= 600) return 1;
    return Math.min(1, (window.innerHeight - MARGIN) / PHONE_H);
  };
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

export default function PhoneFrame({ path, children }) {
  const scale = useFitScale();
  return (
    <div className="phone-fit" style={{ '--s': scale, width: PHONE_W * scale, height: PHONE_H * scale }}>
      <div className="phone">
        <div className={`phone-screen${path.startsWith('/sms') ? ' is-sms' : ''}`}>
          <div className="phone-island" aria-hidden="true" />
          <div className="phone-status" aria-hidden="true">
            <span>9:41</span>
            <svg width="70" height="13" viewBox="0 0 70 13">
              <rect x="0" y="8" width="3" height="5" rx="1" fill="currentColor" />
              <rect x="5" y="6" width="3" height="7" rx="1" fill="currentColor" />
              <rect x="10" y="3" width="3" height="10" rx="1" fill="currentColor" />
              <rect x="15" y="0" width="3" height="13" rx="1" fill="currentColor" />
              <path d="M26 5a9 9 0 0 1 12 0M28.5 7.8a5 5 0 0 1 7 0M31 10.5a1.5 1.5 0 0 1 2 0" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <rect x="44" y="1" width="22" height="11" rx="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="46" y="3" width="16" height="7" rx="1.5" fill="currentColor" />
              <rect x="67" y="4.5" width="2" height="4" rx="1" fill="currentColor" />
            </svg>
          </div>
          {!path.startsWith('/sms') && <div className="phone-url" aria-hidden="true">
            <svg width="11" height="13" viewBox="0 0 11 13">
              <rect x="1" y="5.5" width="9" height="7" rx="1.5" fill="currentColor" />
              <path d="M3 5.5V4a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
            fitcheck.team{path}
          </div>}
          <div className="app">{children}</div>
          <div className="phone-home" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
