import React, { useState } from 'react';
import { store } from '../store.js';
import { shortSize, sizeLabel, questionsFor } from '../sizing.js';
import { initials, timeAgo } from '../components/ui.jsx';
import Sheet from '../components/Sheet.jsx';
import AddOptions from '../components/AddOptions.jsx';

const subFor = (p) => {
  if (p.status === 'review') return p.flagReason || p.rec?.flagReason || 'Needs a look';
  if (p.status === 'ready') {
    if (p.coachApproved) return 'Approved by you';
    if (p.rec?.sizedUp) return `Up from ${sizeLabel(p.rec.statedSize, p.cut)}`;
    if (p.lastSize && p.finalSize === p.lastSize) return 'Same as last order';
    return 'Fit check done';
  }
  if (p.status === 'draft') return 'Link not sent yet';
  if (p.nextBatch) return 'Asked for the next batch';
  if (p.declined) return 'Said not now';
  if (p.nudgedAt) return `Notified ${timeAgo(p.nudgedAt)}`;
  if (p.status === 'opened') return p.answersCount ? `${p.answersCount} of ${questionsFor(p).length} answered` : 'Opened · not submitted';
  return p.sentAt ? `Not opened · ${timeAgo(p.sentAt)}` : 'Not opened yet';
};

export default function CoachDashboard({ data }) {
  const { team, players } = data;
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);

  const ready = players.filter((p) => p.status === 'ready');
  const review = players.filter((p) => p.status === 'review');
  const waiting = players.filter((p) => p.status === 'waiting' || p.status === 'opened');
  const daysLeft = Math.max(0, Math.ceil((new Date(team.dueDate) - Date.now()) / 864e5));
  const closed = new Date(team.dueDate) <= Date.now();
  const due = new Date(team.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const tabs = [
    { id: 'all', label: 'All', n: players.length },
    { id: 'review', label: 'Review', n: review.length },
    { id: 'waiting', label: 'Waiting', n: waiting.length },
    { id: 'ready', label: 'Ready', n: ready.length },
  ];
  const order = { review: 0, opened: 1, waiting: 2, draft: 2.5, ready: 3 };
  const shown = (filter === 'all' ? players : filter === 'waiting' ? waiting : players.filter((p) => p.status === filter))
    .slice()
    .sort((a, b) => order[a.status] - order[b.status]);

  const nudgeAll = () => store.nudge(waiting.map((p) => p.id));

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="coach-head">
          <h1 className="disp h1">{team.order}</h1>
          <div className="due">
            <i aria-hidden="true" />
            {closed ? `Order closed ${due}` : `Order due ${due} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          </div>
        </div>

        {players.some((p) => p.status === 'draft') && (
          <a href="#/coach/setup/roster" className="import-card" style={{ textDecoration: 'none' }}>
            <div><b>{players.filter((p) => p.status === 'draft').length} links not sent yet</b><span>Finish setup to text them.</span></div>
            <span className="import-go">Finish</span>
          </a>
        )}

        <div className="progress">
          <div className="progress-top">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="disp progress-num">{ready.length + review.length}<span>/{players.length}</span></span>
              <span className="progress-cap">fit checks in</span>
            </div>
            <button className="btn-sm btn-sm-light" onClick={nudgeAll} disabled={!waiting.length}>
              {closed ? `Offer next batch · ${waiting.length}` : `Notify ${waiting.length}`}
            </button>
          </div>
          <div className="bar" aria-hidden="true">
            <div style={{ flex: ready.length, background: '#fff' }} />
            <div style={{ flex: review.length, background: 'var(--amber)' }} />
            <div style={{ flex: waiting.length, background: '#3f434a' }} />
          </div>
          <div className="legend">
            <span><i style={{ background: '#fff' }} />{ready.length} ready</span>
            {review.length > 0 && <span><i style={{ background: 'var(--amber)' }} />{review.length} need a look</span>}
            <span><i style={{ background: '#6b7079' }} />{waiting.length} waiting</span>
          </div>
        </div>

        <div className="seg" role="group" aria-label="Filter roster">
          {tabs.map((t) => (
            <button key={t.id} aria-pressed={filter === t.id} onClick={() => setFilter(t.id)}>{t.label}<span className="seg-n">{t.n}</span></button>
          ))}
        </div>

        <div className="roster">
          {shown.length === 0 && <div className="empty-note">Nobody here.</div>}
          {shown.map((p) => (
            <a key={p.id} href={`#/coach/p/${p.id}`} className={`prow${p.status === 'review' ? ' flag' : ''}`}>
              <div className="av">{initials(p.name)}</div>
              <div className="pinfo">
                <div className="pname">
                  {p.name} {p.number != null && <span>#{p.number}</span>}
                  {p.token === data.demo?.token && (
                    <svg className="demo-star" width="12" height="12" viewBox="0 0 24 24" role="img" aria-label="Text message demo player">
                      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="currentColor" />
                    </svg>
                  )}
                </div>
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
                  {closed ? 'Text' : 'Notify'}
                </button>
              )}
            </a>
          ))}
        </div>
      </div>

      <div className="screen-foot">
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          Add players
        </button>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add players">
        <p className="sheet-lede">New players get their text as soon as you add them.</p>
        <AddOptions context="dashboard" showBsn={false} onPick={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}
