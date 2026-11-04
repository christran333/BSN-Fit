import React, { useState } from 'react';
import { store } from '../store.js';
import { shortSize, sizeLabel } from '../sizing.js';
import { initials, timeAgo } from '../components/ui.jsx';

const subFor = (p) => {
  if (p.status === 'review') return p.flagReason || p.rec?.flagReason || 'Needs a look';
  if (p.status === 'ready') {
    if (p.coachApproved) return 'Approved by you';
    if (p.rec?.sizedUp) return `Up from ${sizeLabel(p.rec.statedSize, p.cut)}`;
    if (p.lastSize && p.finalSize === p.lastSize) return 'Same as last order';
    return 'Fit check done';
  }
  if (p.nudgedAt) return `Nudged ${timeAgo(p.nudgedAt)}`;
  if (p.status === 'opened') return p.answersCount ? `Opened · ${p.answersCount} of 5 answered` : 'Opened · not submitted';
  return p.sentAt ? `Link sent ${timeAgo(p.sentAt)} · not opened` : 'Link not opened yet';
};

export default function CoachDashboard({ data }) {
  const { team, players } = data;
  const [filter, setFilter] = useState('all');

  const ready = players.filter((p) => p.status === 'ready');
  const review = players.filter((p) => p.status === 'review');
  const waiting = players.filter((p) => p.status === 'waiting' || p.status === 'opened');
  const daysLeft = Math.max(0, Math.ceil((new Date(team.dueDate) - Date.now()) / 864e5));
  const due = new Date(team.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const tabs = [
    { id: 'all', label: `All ${players.length}` },
    { id: 'review', label: `Needs look ${review.length}` },
    { id: 'waiting', label: `Waiting ${waiting.length}` },
    { id: 'ready', label: `Ready ${ready.length}` },
  ];
  const order = { review: 0, opened: 1, waiting: 2, ready: 3 };
  const shown = (filter === 'all' ? players : filter === 'waiting' ? waiting : players.filter((p) => p.status === filter))
    .slice()
    .sort((a, b) => order[a.status] - order[b.status]);

  const nudgeAll = () => store.nudge(waiting.map((p) => p.id));

  return (
    <div className="screen">
      <div className="screen-scroll" style={{ padding: '10px 16px 12px', gap: 12 }}>
        <div className="coach-head">
          <div>
            <div className="team-name">{team.name}</div>
            <h1 className="disp h1">{team.order}</h1>
          </div>
          <div style={{ paddingTop: 4 }}>
            <div className="due-label">Order due</div>
            <div className="due">{due} · {daysLeft} days</div>
          </div>
        </div>

        <div className="progress">
          <div className="progress-top">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="disp progress-num">{ready.length + review.length}<span>/{players.length}</span></span>
              <span style={{ fontSize: 14, color: '#c9ccd1' }}>fit checks in</span>
            </div>
            <button className="btn btn-red" style={{ height: 36, width: 'auto', padding: '0 14px', fontSize: 14, borderRadius: 10 }} onClick={nudgeAll} disabled={!waiting.length}>
              Nudge {waiting.length}
            </button>
          </div>
          <div className="bar" aria-hidden="true">
            <div style={{ flex: ready.length, background: '#fff' }} />
            <div style={{ flex: review.length, background: 'var(--amber)' }} />
            <div style={{ flex: waiting.length, background: '#3f434a' }} />
          </div>
          <div className="legend">
            <span><i style={{ background: '#fff' }} />{ready.length} ready</span>
            <span><i style={{ background: 'var(--amber)' }} />{review.length} need a look</span>
            <span><i style={{ background: '#6b7079' }} />{waiting.length} waiting</span>
          </div>
        </div>

        <div className="seg" role="group" aria-label="Filter roster">
          {tabs.map((t) => (
            <button key={t.id} aria-pressed={filter === t.id} onClick={() => setFilter(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="roster">
          {shown.length === 0 && <div className="empty-note">Nobody here.</div>}
          {shown.map((p) => (
            <a key={p.id} href={`#/coach/p/${p.id}`} className={`prow${p.status === 'review' ? ' flag' : ''}`}>
              <div className="av">{initials(p.name)}</div>
              <div className="pinfo">
                <div className="pname">{p.name} {p.number != null && <span>#{p.number}</span>}</div>
                <div className="psub">{subFor(p)}</div>
              </div>
              {p.status === 'review' && <span className="pill pill-amber">Review</span>}
              {p.status === 'ready' && (
                <span className="pill pill-ink">{shortSize(p.finalSize)}{p.rec?.sizedUp && !p.coachApproved ? ' ↑' : ''}</span>
              )}
              {(p.status === 'waiting' || p.status === 'opened') && (
                <button
                  className="btn-sm"
                  onClick={(e) => { e.preventDefault(); store.nudge(p.id); }}
                >
                  Nudge
                </button>
              )}
            </a>
          ))}
        </div>
      </div>

      <div className="screen-foot" style={{ flexDirection: 'row', gap: 10, padding: '10px 16px 28px' }}>
        <a href="#/coach/add" className="btn btn-ink">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
          Add player
        </a>
      </div>
    </div>
  );
}
