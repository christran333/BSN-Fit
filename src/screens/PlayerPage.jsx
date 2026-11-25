import React from 'react';
import { store } from '../store.js';
import { questionsFor, sizeLabel, flowFor, FLOW_META, formatHeight, ladderFor } from '../sizing.js';
import { linkFor } from '../router.js';
import { Back, copy, useToast, timeAgo } from '../components/ui.jsx';

function answerText(q, v) {
  if (v === undefined || v === null) return '—';
  if (q.type === 'stepper') return formatHeight(v);
  return q.options.find((o) => o.value === v)?.label ?? String(v);
}

export default function PlayerPage({ data, id }) {
  const p = data.players.find((x) => x.id === id);
  const [toast, showToast] = useToast();
  if (!p) return <div className="center-msg">Player not found. <a href="#/coach">Back to roster</a></div>;

  const first = p.name.split(' ')[0];
  const meta = FLOW_META[flowFor(p)];
  const submitted = p.status === 'review' || p.status === 'ready';
  const rec = p.rec;
  const ladder = ladderFor(p);
  const sub = [p.number != null && `#${p.number}`, p.cut === 'womens' || p.cut === 'girls' ? "Women's" : p.cut === 'mens' || p.cut === 'boys' ? "Men's" : 'Unisex', p.age].filter(Boolean).join(' · ');

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div>
          <Back href="#/coach">Roster</Back>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <h1 className="disp h1">{p.name}</h1>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', paddingBottom: 3, whiteSpace: 'nowrap' }}>{sub}</span>
          </div>
        </div>

        {!submitted && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {p.status === 'opened' ? 'Opened, not submitted yet' : 'Waiting for them to open it'}
                </div>
              </div>
            </div>
            <div className="linkbox">
              <code>{linkFor(p.token).replace(/^https?:\/\//, '')}</code>
              <button className="btn-sm" onClick={async () => showToast((await copy(linkFor(p.token))) ? 'Link copied' : 'Could not copy')}>Copy</button>
            </div>
            {p.contact && <div className="help">Sent to {p.contact}{p.nudgedAt ? ` · notified ${timeAgo(p.nudgedAt)}` : ''}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => store.nudge(p.id)}>Notify {first}</button>
              <a className="btn btn-secondary" href={`#/sms/${p.token}`}>See the text</a>
            </div>
          </div>
        )}

        {submitted && rec && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {p.status === 'review'
                ? <span className="pill pill-amber">Needs a look</span>
                : <span className="pill pill-ink">Ready</span>}
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Submitted {timeAgo(p.submittedAt)}</span>
            </div>
            {rec.statedSize && rec.statedSize !== p.finalSize ? (
              <div className="compare">
                <div style={{ background: 'var(--bg)' }}>
                  <small style={{ color: 'var(--muted)' }}>{p.lastSize ? 'Last order' : `${first} picked`}</small>
                  <div className="disp" style={{ color: '#6b7079' }}>{rec.statedSize}</div>
                </div>
                <svg width="36" height="20" viewBox="0 0 36 20" aria-hidden="true"><path d="M4 10h26M24 4l6 6-6 6" stroke="#111316" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div style={{ background: 'var(--ink)', color: '#fff' }}>
                  <small style={{ color: '#c9ccd1' }}>{p.coachApproved ? 'Ordering' : 'We suggest'}</small>
                  <div className="disp">{p.finalSize}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="disp" style={{ fontSize: 30, lineHeight: 1.15 }}>{sizeLabel(p.finalSize, p.cut)}</span>
                {p.lastSize === p.finalSize && <span style={{ fontSize: 13, color: 'var(--muted)' }}>same as last order</span>}
              </div>
            )}
            {rec.reasons.length > 0 && (
              <div style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--ink-2)' }}>
                {rec.reasons.slice(0, 3).join('. ')}. Between sizes, we round up.
              </div>
            )}
            {(p.wants || p.keepOriginal) && <div className="li" style={{ color: 'var(--amber-ink)' }}>{first} asked for {p.wants || rec.statedSize} instead.</div>}
            {p.note && <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 12px', fontSize: 14 }}><b>Note:</b> {p.note}</div>}
          </div>
        )}

        {submitted && (
          <div className="card" style={{ padding: '6px 18px 4px', gap: 0 }}>
            <div className="card-label" style={{ padding: '10px 0 8px' }}>{flowFor(p) === 'parent' ? 'Parent answers' : `${first}'s answers`}</div>
            {questionsFor(p).map((q) => (
              <div className="kv" key={q.id}><span>{q.label}</span><span>{answerText(q, p.answers?.[q.id])}</span></div>
            ))}
            {p.pitToPit && <div className="kv"><span>Shirt, armpit to armpit</span><span>{p.pitToPit} in</span></div>}
          </div>
        )}
      </div>

      {submitted && (
        <div className="screen-foot" style={{ gap: 8 }}>
          {p.status === 'review' ? (
            <>
              <button className="btn btn-primary" onClick={() => { store.coachDecide(p.id, rec.size); showToast(`Ordering ${rec.size}`); }}>Order {rec.size}</button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {rec.statedSize && rec.statedSize !== rec.size
                  ? <button className="btn btn-secondary" onClick={() => { store.coachDecide(p.id, rec.statedSize); showToast(`Keeping ${rec.statedSize}`); }}>Keep {rec.statedSize}</button>
                  : <button className="btn btn-secondary" onClick={() => { const i = ladder.indexOf(rec.size); const up = ladder[Math.min(i + 1, ladder.length - 1)]; store.coachDecide(p.id, up); showToast(`Ordering ${up}`); }}>Go one up</button>}
                <button className="btn btn-secondary" onClick={() => showToast(`Message to ${first} opened`)}>Message {first}</button>
              </div>
            </>
          ) : (
            <a className="btn btn-primary" href="#/coach">Back to roster</a>
          )}
        </div>
      )}
      {toast}
    </div>
  );
}
