import React, { useMemo, useState } from 'react';
import { store } from '../store.js';
import { flowFor, FLOW_META, describeFlow, YOUTH_LADDER, ADULT_LADDER, sizeLabel, questionsFor, formatHeight } from '../sizing.js';
import { go } from '../router.js';
import { Back, Check } from '../components/ui.jsx';

const CUTS = [
  { value: 'womens', label: "Women's" },
  { value: 'mens', label: "Men's" },
  { value: 'unisex', label: 'Unisex' },
];

const HEIGHTS = Array.from({ length: 49 }, (_, i) => 36 + i); // 3 ft to 7 ft

export default function AddPlayer({ setup = false }) {
  const [f, setF] = useState({ name: '', number: '', age: '', cut: 'womens', lastSize: '', lastOrderDate: '', lastHeight: '', contact: '' });
  const back = setup ? '#/coach/setup/roster' : '#/coach';
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target ? e.target.value : e }));

  const age = Number(f.age);
  const isKid = age > 0 && age < 13;
  const sizes = isKid ? YOUTH_LADDER.slice(0, 5) : ADULT_LADDER;
  const draft = useMemo(
    () => ({
      name: f.name || 'This player',
      age: age || 18,
      cut: isKid ? (f.cut === 'mens' ? 'boys' : 'girls') : f.cut,
      lastSize: f.lastSize || null,
      lastOrderDate: f.lastSize ? (f.lastOrderDate ? new Date(f.lastOrderDate).toISOString() : new Date(Date.now() - 365 * 864e5).toISOString()) : null,
      lastHeight: f.lastSize && f.lastHeight ? Number(f.lastHeight) : null,
    }),
    [f, age, isKid],
  );
  const flow = flowFor(draft);
  const meta = FLOW_META[flow];
  const ready = f.name.trim() && age > 0;

  const create = () => {
    const p = store.addPlayer({
      ...draft,
      name: f.name.trim(),
      number: f.number ? Number(f.number) : null,
      contact: f.contact || null,
    }, { draft: setup });
    go(setup ? '/coach/setup/roster' : `/coach/p/${p.id}`);
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div>
          <Back href={back}>Roster</Back>
          <h1 className="disp h1">Add player</h1>
          {setup && <p className="lede">Nothing sends yet. You'll review everyone first.</p>}
        </div>

        <div className="field"><label htmlFor="nm">Player name</label><input id="nm" className="input" value={f.name} onChange={set('name')} placeholder="First and last" autoComplete="off" /></div>

        <div className="grid2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <div className="field"><label htmlFor="ag">Age</label><input id="ag" className="input" inputMode="numeric" value={f.age} onChange={(e) => setF((s) => ({ ...s, age: e.target.value.replace(/\D/g, '').slice(0, 2), lastSize: '' }))} /></div>
          <div className="field"><label htmlFor="no">Number</label><input id="no" className="input" inputMode="numeric" value={f.number} onChange={(e) => setF((s) => ({ ...s, number: e.target.value.replace(/\D/g, '').slice(0, 2) }))} /></div>
        </div>

        <div className="field"><span className="lb">Cut</span>
          <div className="seg" role="group" aria-label="Cut">
            {CUTS.map((c) => (
              <button key={c.value} type="button" aria-pressed={f.cut === c.value} onClick={() => set('cut')(c.value)}>
                {isKid && c.value !== 'unisex' ? (c.value === 'womens' ? 'Girls' : 'Boys') : c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <div className="field"><label htmlFor="ls">Last size (optional)</label>
            <select id="ls" className="input" value={f.lastSize} onChange={set('lastSize')}>
              <option value="">None on file</option>
              {sizes.map((s) => <option key={s} value={s}>{sizeLabel(s, isKid ? 'girls' : f.cut)}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="ld">Ordered</label>
            <input id="ld" className="input" type="month" value={f.lastOrderDate} onChange={set('lastOrderDate')} disabled={!f.lastSize} style={{ opacity: f.lastSize ? 1 : 0.5 }} />
          </div>
        </div>

        <div className="field"><label htmlFor="lh">Height at that order (optional)</label>
          <select id="lh" className="input" value={f.lastHeight} onChange={set('lastHeight')} disabled={!f.lastSize} style={{ opacity: f.lastSize ? 1 : 0.5 }}>
            <option value="">Not on file</option>
            {HEIGHTS.map((h) => <option key={h} value={h}>{formatHeight(h)}</option>)}
          </select>
          <span className="help">{f.lastSize ? 'With last size and height, we measure growth instead of asking about it.' : 'Add a last size first.'}</span>
        </div>

        <div className="field"><label htmlFor="pc">{isKid ? "Parent's phone" : 'Phone or email'}</label><input id="pc" className="input" inputMode="tel" value={f.contact} onChange={set('contact')} placeholder={isKid ? 'Link goes to the parent' : 'Where to text the link'} /></div>

        <div className="flow-card" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{meta.title}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{questionsFor(draft).length} taps<br />{meta.time}</div>
          </div>
          {describeFlow(draft).map((t) => (
            <div className="li" key={t}><span className="dot"><Check /></span>{t}</div>
          ))}
        </div>
      </div>

      <div className="screen-foot">
        <button className="btn btn-primary" disabled={!ready} onClick={create}>{setup ? 'Add to roster' : 'Create link'}</button>
      </div>
    </div>
  );
}
