import React, { useEffect, useRef } from 'react';
import { messagesFor, messageParts, threadTime, repliesFor, cardFor } from '../messages.js';
import { store } from '../store.js';
import { go } from '../router.js';

// iMessage-style screen: the text an athlete (or parent) gets from BSN.
// Tapping the link or the preview card opens their fit check.
export default function Sms({ data, token }) {
  const p = data.players.find((x) => x.token === token);
  const threadRef = useRef(null);
  const count = p ? messagesFor(p).length : 0;
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [count, token]);
  if (!p) return <div className="center-msg"><b>No text for this player.</b><a href="#/coach">Back to roster</a></div>;

  const msgs = messagesFor(p);
  const href = `#/r/${p.token}`;
  const { team } = data;
  // quick replies only show under the newest BSN text, until they answer it
  const lastIdx = msgs.length - 1;
  const done = p.status === 'ready' || p.status === 'review';
  const liveReplies = !done && !p.nextBatch && !p.declined ? repliesFor(msgs[lastIdx], p) : null;
  const live = liveReplies ? lastIdx : -1;
  const card = cardFor(p, team);
  // flatten the log into what iOS draws: timestamps, bubbles, the link card, quick replies
  const items = [];
  msgs.forEach((m, i) => {
    const prev = msgs[i - 1];
    if (!prev || new Date(m.at) - new Date(prev.at) > 15 * 60 * 1000) {
      items.push({ type: 'time', key: `t${i}`, label: threadTime(m.at), first: i === 0 });
    }
    const { lead, link } = messageParts(p, team, m);
    const side = m.kind === 'reply' ? 'me' : 'them';
    const isNew = i === lastIdx && Date.now() - new Date(m.at) < 8000;
    items.push({ type: 'bubble', key: `b${i}`, side, lead, link, isNew });
    if (m.kind === 'invite') items.push({ type: 'card', key: `c${i}`, side: 'them' });
    if (i === 0) items.push({ type: 'bubble', key: 'stop', side: 'them', lead: 'Reply STOP to opt out.' });
    if (i === live) items.push({ type: 'qr', key: 'qr' });
  });
  const mine = items.filter((it) => it.side === 'me');
  const lastMineKey = mine.length && items[items.length - 1] === mine[mine.length - 1] ? mine[mine.length - 1].key : null;

  const tap = (r) => {
    store.quickReply(p.id, r.id, r.label);
    if (r.id === 'go') setTimeout(() => go(`/r/${p.token}`), 650);
  };

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

      <div className="screen-scroll sms-thread" ref={threadRef}>
        {items.map((it, i) => {
          if (it.type === 'time') {
            const [day, ...rest] = it.label.split(' ');
            return (
              <div className="sms-meta" key={it.key}>
                {it.first && <>Text Message • RCS<br /></>}
                <b>{day}</b> {rest.join(' ')}
              </div>
            );
          }
          if (it.type === 'qr') {
            return (
              <div className="qr" role="group" aria-label="Quick replies" key={it.key}>
                {liveReplies.map((r) => (
                  <button key={r.id} className="qr-btn" onClick={() => tap(r)}>{r.label}</button>
                ))}
              </div>
            );
          }
          const next = items[i + 1];
          const tail = !next || next.type !== 'bubble' && next.type !== 'card' || next.side !== it.side;
          const prev = items[i - 1];
          const start = !prev || prev.type === 'time' || prev.side !== it.side;
          const cls = `${it.side}${tail ? ' tail' : ''}${start ? ' start' : ''}${it.isNew ? ' is-new' : ''}`;
          if (it.type === 'card') {
            return (
              <a href={href} className={`sms-card ${cls}`} key={it.key}>
                <div className="sms-card-art">
                  <span className="sms-card-title-big">{card.title}</span>
                  <span className="sms-card-foot">{card.foot}</span>
                </div>
                <div className="sms-card-meta">
                  <div className="sms-card-title">Fit Check from {team.coach}</div>
                  <div className="sms-card-domain">fitcheck.team</div>
                </div>
              </a>
            );
          }
          return (
            <React.Fragment key={it.key}>
              <div className={`bubble ${cls}`}>
                {it.lead}{it.link && <> <a href={href}>{it.link}</a></>}
              </div>
              {it.key === lastMineKey && <div className="sms-delivered">Delivered</div>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="sms-bar" aria-hidden="true">
        <span className="sms-plus">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </span>
        <span className="sms-input">Text Message • RCS
          <svg width="14" height="18" viewBox="0 0 14 18"><rect x="4" y="1" width="6" height="10" rx="3" fill="currentColor" /><path d="M1.5 8.5a5.5 5.5 0 0 0 11 0M7 14v3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
        </span>
      </div>
    </div>
  );
}
