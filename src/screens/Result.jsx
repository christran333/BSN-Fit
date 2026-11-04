import React, { useState } from 'react';
import { store } from '../store.js';
import { recommend, sizeLabel, sizeForMeasurement, flowFor } from '../sizing.js';
import { Check } from '../components/ui.jsx';

export default function Result({ data, token }) {
  const p = data.players.find((x) => x.token === token);
  const wantsMore = window.location.hash.includes('more=1');
  const [open, setOpen] = useState(wantsMore);
  const [pit, setPit] = useState(p?.pitToPit ? String(p.pitToPit) : '');
  const [note, setNote] = useState(p?.note || '');
  const [keep, setKeep] = useState(!!p?.keepOriginal);
  const [done, setDone] = useState(false);

  if (!p || !p.answers) return <div className="center-msg"><b>Nothing submitted yet.</b><a href={`#/r/${token}`}>Go to the fit check</a></div>;

  const pitNum = parseFloat(pit);
  const rec = recommend(p, p.answers, { pitToPit: pitNum > 0 ? pitNum : null });
  const first = p.name.split(' ')[0];
  const isParent = flowFor(p) === 'parent';
  const changed = rec.statedSize && rec.statedSize !== rec.size;

  const finish = () => {
    store.addExtras(p.id, { pitToPit: pitNum > 0 ? pitNum : null, note: note.trim(), keepOriginal: keep });
    setDone(true);
  };

  if (done) {
    return (
      <div className="screen">
        <div className="center-msg">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={28} width={1.6} /></div>
          <h1 className="disp" style={{ margin: 0, fontSize: 36 }}>You're all set</h1>
          <p className="lede" style={{ maxWidth: 280 }}>{data.team.coach} has {isParent ? `${first}'s` : 'your'} size. You can close this tab.</p>
          <button className="lnk" onClick={() => setDone(false)}>Change something</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-scroll" style={{ padding: '10px 16px 12px', gap: 12 }}>
        <div className="result-hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sent"><i><Check size={11} width={2} /></i>Sent to {data.team.coach}</div>
            {changed && <div className="disp" style={{ fontSize: 18, color: 'var(--faint)' }}>{rec.statedSize} → {rec.size}</div>}
          </div>
          <div>
            <div style={{ fontSize: 14, color: '#c9ccd1' }}>{isParent ? `${first} is set in` : "You're set in"}</div>
            <div className="disp result-size">{sizeLabel(rec.size, p.cut)}</div>
          </div>
          {rec.reasons.length > 0 && (
            <ul className="reasons">{rec.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}</ul>
          )}
          <p className="result-why">When you're between sizes, we round up. A little roomy is easier to live with than too tight.</p>
        </div>

        <div className="card" style={{ padding: '6px 18px 4px', gap: 0 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{ border: 0, background: 'none', padding: '12px 0 10px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Not sure? Help us get it right</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Optional. Your coach sees whatever you add.</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M2 3.5l3 3 3-3" stroke="#111316" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
          </button>
          {open && (
            <>
              <div className="opt">
                <div><div className="ot">Measure a shirt that fits {isParent ? first : 'you'} well</div><div className="os">Lay it flat. Measure straight across from armpit to armpit.</div></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" aria-label="Armpit to armpit, inches" inputMode="decimal" value={pit} onChange={(e) => setPit(e.target.value.replace(/[^\d.]/g, '').slice(0, 4))} placeholder="—" style={{ width: 80, textAlign: 'center', height: 44 }} />
                  <span style={{ fontSize: 14, color: '#3f434a' }}>inches</span>
                  {pitNum > 0 && <span className="tag" style={{ marginLeft: 'auto' }}>Fits {sizeForMeasurement(p, pitNum)}</span>}
                </div>
              </div>
              <div className="opt">
                <label className="ot" htmlFor="nt">Anything else we should know?</label>
                <input className="input" id="nt" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. likes sleeves long, between sizes on top" style={{ height: 44, fontSize: 15 }} />
              </div>
              {changed && (
                <div className="opt" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><div className="ot">{isParent ? `Keep ${first} in` : "I'd still rather have"} {rec.statedSize}</div><div className="os">We'll flag it for your coach.</div></div>
                  <button className="chip" aria-pressed={keep} style={{ flex: 'none', width: 'auto', padding: '0 14px', height: 36 }} onClick={() => setKeep((k) => !k)}>
                    {keep ? `Keeping ${rec.statedSize}` : `Keep ${rec.statedSize}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="screen-foot" style={{ padding: '12px 16px 28px' }}>
        <button className="btn btn-red" onClick={finish}>Done</button>
        <a className="lnk" style={{ textAlign: 'center' }} href={`#/r/${token}`}>Change my answers</a>
      </div>
    </div>
  );
}
