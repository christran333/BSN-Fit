import React, { useEffect, useState } from 'react';
import { store } from '../store.js';
import { messagesFor, messageText } from '../messages.js';
import { go } from '../router.js';

// iOS-style notification banner previewing the text a nudged athlete gets.
// Drops in over the phone, auto-hides, and tapping it opens their thread.
export default function Notice({ data }) {
  const n = data.notice;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!n) return;
    setLeaving(false);
    const t1 = setTimeout(() => setLeaving(true), 5200);
    const t2 = setTimeout(() => store.clearNotice(), 5600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [n?.key]);

  if (!n) return null;
  const p = data.players.find((x) => x.id === n.playerId);
  if (!p) return null;
  const msgs = messagesFor(p);
  const last = msgs[msgs.length - 1];
  const first = p.name.split(' ')[0];

  const open = () => { store.clearNotice(); go(`/sms/${p.token}`); };

  return (
    <div className={`notice-wrap${leaving ? ' leaving' : ''}`} key={n.key}>
      <button className="notice" onClick={open} aria-label={`Notification preview: text to ${first}. Open Messages`}>
        <span className="notice-avatar">
          <img src={`${import.meta.env.BASE_URL}bsn-mark.png`} alt="" />
          <span className="notice-app" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.6 3.4 6.1-.2 1.4-.9 2.7-1.9 3.6 2-.1 3.8-.8 5.2-1.9 1 .3 2.1.4 3.3.4 5.5 0 10-3.6 10-8.2S17.5 3 12 3z" fill="#fff" /></svg>
          </span>
        </span>
        <span className="notice-body">
          <span className="notice-top"><b>BSN Sports</b><span>now</span></span>
          <span className="notice-text">{messageText(p, data.team, last)}</span>
        </span>
      </button>
      <div className="notice-caption">
        What {first}{p.age < 13 ? "'s parent" : ''} sees{n.more > 0 ? ` · +${n.more} more sent` : ''} · tap to open
      </div>
    </div>
  );
}
