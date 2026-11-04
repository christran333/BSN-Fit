import React from 'react';

// On a real phone the app is full-screen. On a laptop it sits inside a
// phone frame (with a fake browser bar) so it presents like a phone.
export default function PhoneFrame({ path, children }) {
  return (
    <div className="phone">
      <div className="phone-screen">
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
        <div className="phone-url" aria-hidden="true">
          <svg width="11" height="13" viewBox="0 0 11 13">
            <rect x="1" y="5.5" width="9" height="7" rx="1.5" fill="currentColor" />
            <path d="M3 5.5V4a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
          fitcheck.team{path}
        </div>
        <div className="app">{children}</div>
        <div className="phone-home" aria-hidden="true" />
      </div>
    </div>
  );
}
