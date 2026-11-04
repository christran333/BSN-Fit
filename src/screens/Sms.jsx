import React from 'react';
import { flowFor } from '../sizing.js';

// iMessage-style screen: the text an athlete (or parent) gets from BSN.
// Tapping the link or the preview card opens their fit check.
export default function Sms({ data, token }) {
  const p = data.players.find((x) => x.token === token);
  if (!p) return <div className="center-msg"><b>No text for this player.</b><a href="#/coach">Back to roster</a></div>;

  const first = p.name.split(' ')[0];
  const isParent = flowFor(p) === 'parent';
  const href = `#/r/${p.token}`;
  const shown = `fitcheck.team/r/${p.token}`; // matches the mock browser bar
  const coach = data.team.coach;

  return (
    <div className="screen sms">
      <header className="sms-head">
        <a href="#/coach" className="sms-back" aria-label="Back to roster">
          <svg width="11" height="19" viewBox="0 0 11 19" aria-hidden="true"><path d="M9.5 1.5L2 9.5l7.5 8" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="sms-count">3</span>
        </a>
        <div className="sms-contact">
          <div className="sms-avatar"><img src={`${import.meta.env.BASE_URL}bsn-mark.png`} alt="" /></div>
          <div className="sms-name">BSN Sports
            <svg width="5" height="9" viewBox="0 0 5 9" aria-hidden="true"><path d="M1 1l3 3.5L1 8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <span className="sms-video" aria-hidden="true">
          <svg width="27" height="18" viewBox="0 0 27 18"><rect x="1" y="2" width="17" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.7" fill="none" /><path d="M19 7.2l6-3.6v10.8l-6-3.6" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinejoin="round" /></svg>
        </span>
      </header>

      <div className="screen-scroll sms-thread">
        <div className="sms-meta"><b>Text Message · SMS</b><br />Today 9:41 AM</div>

        <div className="bubble">
          {isParent ? `${coach} is asking for ${first}'s uniform size:` : 'Your coach is asking for your size:'}{' '}
          <a href={href}>{shown}</a>
          <br /><br />
          {data.team.name} · {data.team.order}. Five taps, about 30 seconds.
        </div>

        <a href={href} className="sms-card">
          <div className="sms-card-art" aria-hidden="true">
            <span className="sms-card-bar" />
            <span className="disp">Fit Check</span>
            <span className="sms-card-sub">{isParent ? `${first}'s uniform size` : `${first}'s jersey size`}</span>
          </div>
          <div className="sms-card-meta">
            <div className="sms-card-title">{data.team.name}: {data.team.order}</div>
            <div className="sms-card-domain">fitcheck.team</div>
          </div>
        </a>

        <div className="bubble small">Reply STOP to opt out.</div>
      </div>

      <div className="sms-bar" aria-hidden="true">
        <span className="sms-plus">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </span>
        <span className="sms-input">Text Message
          <svg width="14" height="18" viewBox="0 0 14 18"><rect x="4" y="1" width="6" height="10" rx="3" fill="currentColor" /><path d="M1.5 8.5a5.5 5.5 0 0 0 11 0M7 14v3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
        </span>
      </div>
    </div>
  );
}
