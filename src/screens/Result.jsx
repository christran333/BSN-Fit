import React, { useState } from 'react';
import { store } from '../store.js';
import { recommend, sizeLabel, sizeForMeasurement, flowFor, ladderFor } from '../sizing.js';
import { Check } from '../components/ui.jsx';

/** the team jersey with the size printed where the number goes */
function Jersey({ size, team, done }) {
  const letter = size?.startsWith('Y') ? size.slice(1) : size;
  return (
    <div className="jersey-wrap" aria-hidden="true">
      <span className="spark s1" /><span className="spark s2" /><span className="spark s3" /><span className="spark s4" /><span className="spark s5" />
      <svg className="jersey" viewBox="0 0 160 176" width="148" height="163">
        <path className="jersey-body" d="M48 6 C54 22 66 30 80 30 C94 30 106 22 112 6 L130 10 C128 34 132 50 146 60 L146 168 C146 172 143 174 139 174 L21 174 C17 174 14 172 14 168 L14 60 C28 50 32 34 30 10 Z" />
        <path className="jersey-trim" d="M48 6 C54 22 66 30 80 30 C94 30 106 22 112 6" />
        <path className="jersey-trim" d="M30 10 C32 34 28 50 14 60 M130 10 C128 34 132 50 146 60" />
        <text x="80" y="62" className="jersey-team">{(team || 'TEAM').toUpperCase()}</text>
        <text key={letter} x="80" y="132" className={`jersey-size${letter.length > 2 ? ' long' : ''}`}>{letter}</text>
      </svg>
      <span className={`jersey-badge${done ? ' on' : ''}`}><Check size={13} width={2.2} /></span>
    </div>
  );
}

export default function Result({ data, token }) {
  const p = data.players.find((x) => x.token === token);
  const wantsMore = window.location.hash.includes('more=1');
  const [open, setOpen] = useState(wantsMore ? 'measure' : null);
  const [pit, setPit] = useState(p?.pitToPit ? String(p.pitToPit) : '');
  const [note, setNote] = useState(p?.note || '');
  const [done, setDone] = useState(false);

  const pitNum = parseFloat(pit);
  const rec = p?.answers ? recommend(p, p.answers, { pitToPit: pitNum > 0 ? pitNum : null }) : null;
  const [pick, setPick] = useState(p?.wants || (p?.keepOriginal && rec?.statedSize) || rec?.size);

  if (!p || !p.answers) return <div className="center-msg"><b>Nothing submitted yet.</b><a href={`#/r/${token}`}>Go to the fit check</a></div>;

  const first = p.name.split(' ')[0];
  const isParent = flowFor(p) === 'parent';
  const chosen = pick || rec.size;
  const custom = chosen !== rec.size;

  // five sizes around our pick
  const ladder = ladderFor(p);
  const at = Math.max(0, ladder.indexOf(rec.size));
  const start = Math.min(Math.max(0, at - 2), Math.max(0, ladder.length - 5));
  const sizes = ladder.slice(start, start + 5);

  const save = (patch = {}) => store.addExtras(p.id, {
    pitToPit: pitNum > 0 ? pitNum : null, note: note.trim(), wants: chosen, ...patch,
  });
  const choose = (s) => { setPick(s); save({ wants: s }); };
  const finish = () => { save(); setDone(true); };
  const toggle = (k) => setOpen((o) => (o === k ? null : k));

  if (done) {
    return (
      <div className="screen">
        <div className="result-center">
          <Jersey size={chosen} team={data.team.short} done />
          <h1 className="disp result-title">You're all set</h1>
          <p className="result-lede">
            {data.team.coach} has {isParent ? `${first}'s` : 'your'} size{custom ? ` and will double-check ${chosen}` : ''}. You can close this tab.
          </p>
          <button className="lnk" onClick={() => setDone(false)}>Change something</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-scroll result-scroll">
        <div className="result-hero-c">
          <Jersey size={chosen} team={data.team.short} />
          <h1 className="disp result-big" key={chosen}>{sizeLabel(chosen, p.cut)}</h1>
          <p className="result-sent"><i><Check size={8} width={2.4} /></i>Sent to {data.team.coach}</p>
          {custom ? (
            <p className="result-why">Got it. We'll ask {data.team.coach} to double-check, since your answers pointed to {rec.size}.</p>
          ) : rec.reasons.length > 0 ? (
            <div className="why-chips">{rec.reasons.slice(0, 2).map((r) => <span key={r}>↑ {r}</span>)}</div>
          ) : (
            <p className="result-why">Between sizes, we round up. Roomy beats tight.</p>
          )}
        </div>

        <div className="pick-card">
          <div className="pick-head"><b>Not quite right? Tap your size.</b></div>
          <div className="pick-row" role="radiogroup" aria-label="Your size">
            {sizes.map((s) => (
              <button key={s} role="radio" aria-checked={s === chosen} className={`pick${s === chosen ? ' on' : ''}`} onClick={() => choose(s)}>
                {s.startsWith('Y') ? s.slice(1) : s}
                {s === rec.size && <small>Our pick</small>}
              </button>
            ))}
          </div>
          {custom && <button className="pick-undo" onClick={() => choose(rec.size)}>Go back to {rec.size}</button>}
        </div>

        <div className="help-card">
          <button className={`help-row${open === 'measure' ? ' open' : ''}`} onClick={() => toggle('measure')} aria-expanded={open === 'measure'}>
            <span className="help-ico" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2.5" y="8" width="19" height="8" rx="2" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></svg>
            </span>
            <span className="help-txt"><b>Measure a shirt that fits</b><span>{pitNum > 0 ? `${pitNum} in · fits ${sizeForMeasurement(p, pitNum)}` : 'Armpit to armpit, laid flat'}</span></span>
            <svg className="help-chev" width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
          </button>
          {open === 'measure' && (
            <div className="help-body">
              <input className="input" id="pit" aria-label="Armpit to armpit, inches" inputMode="decimal" value={pit} placeholder="—"
                onChange={(e) => setPit(e.target.value.replace(/[^\d.]/g, '').slice(0, 4))} onBlur={() => save()} />
              <span>inches</span>
              {pitNum > 0 && <span className="tag">Fits {sizeForMeasurement(p, pitNum)}</span>}
            </div>
          )}
          <button className={`help-row${open === 'note' ? ' open' : ''}`} onClick={() => toggle('note')} aria-expanded={open === 'note'}>
            <span className="help-ico" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
            </span>
            <span className="help-txt"><b>Add a note for {data.team.coach}</b><span>{note.trim() ? `“${note.trim()}”` : 'Long sleeves, between sizes…'}</span></span>
            <svg className="help-chev" width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
          </button>
          {open === 'note' && (
            <div className="help-body">
              <input className="input" id="nt" aria-label="Note for your coach" value={note} placeholder="Anything we should know?" onChange={(e) => setNote(e.target.value)} onBlur={() => save()} />
            </div>
          )}
        </div>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" onClick={finish}>Done</button>
        <a className="lnk" style={{ textAlign: 'center' }} href={`#/r/${token}`}>Change my answers</a>
      </div>
    </div>
  );
}
