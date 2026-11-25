import React, { useEffect, useMemo, useState } from 'react';
import { store } from '../store.js';
import { go } from '../router.js';
import { sizeLabel, formatHeight } from '../sizing.js';
import { Back, Check, initials } from '../components/ui.jsx';
import { takePending, readRows, mapRoster, SCANNED_ROSTER, FIELD_LABELS, teamCut } from '../rosterImport.js';

// Roster import: a photo of a printed roster (scan is simulated, see rosterImport.js)
// or a spreadsheet (parsed for real). Both end on the same review list.
export default function ImportRoster({ data }) {
  const job = useMemo(() => takePending(), []);
  const [phase, setPhase] = useState(job ? 'reading' : 'none'); // reading | review | error | none
  const [rows, setRows] = useState([]);
  const [matched, setMatched] = useState([]);
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    if (!job) return undefined;
    let alive = true;
    if (job.kind === 'photo') {
      const url = URL.createObjectURL(job.file);
      setPhotoUrl(url);
      const cut = teamCut(data.team);
      const t = setTimeout(() => {
        if (!alive) return;
        setRows(SCANNED_ROSTER.map((r) => ({ ...r, cut })));
        setPhase('review');
      }, 2400);
      return () => { alive = false; clearTimeout(t); URL.revokeObjectURL(url); };
    }
    readRows(job.file)
      .then((raw) => {
        if (!alive) return;
        const out = mapRoster(raw, data.team);
        if (!out.players.length) { setPhase('error'); return; }
        setRows(out.players);
        setMatched(out.matched);
        setPhase('review');
      })
      .catch(() => alive && setPhase('error'));
    return () => { alive = false; };
  }, [job]);

  const edit = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, unsure: patch.name || patch.number ? null : r.unsure } : r)));
  const remove = (key) => setRows((rs) => rs.filter((r) => r.key !== key));
  const missingAge = rows.filter((r) => !r.age).length;
  const add = () => { store.addPlayers(rows); go('/coach/setup/roster'); };

  if (phase === 'none') {
    return (
      <div className="screen"><div className="center-msg">
        <b>Pick a file to import.</b>
        <a className="btn-sm" href="#/coach/setup/roster">Back to roster</a>
      </div></div>
    );
  }

  if (phase === 'reading') {
    return (
      <div className="screen">
        <div className="screen-scroll">
          <div>
            <Back href="#/coach/setup/roster">Roster</Back>
            <h1 className="disp h1">{job.kind === 'photo' ? 'Reading your roster' : 'Opening your file'}</h1>
            <p className="lede">{job.kind === 'photo' ? 'Finding names, numbers, grades and sizes.' : job.file.name}</p>
          </div>
          {photoUrl && (
            <div className="scan">
              <img src={photoUrl} alt="Your roster photo" />
              <div className="scan-line" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="screen">
        <div className="screen-scroll">
          <div>
            <Back href="#/coach/setup/roster">Roster</Back>
            <h1 className="disp h1">We couldn't read that file</h1>
            <p className="lede">Use an Excel (.xlsx) or CSV file with one player per row and a header row, like Name, Number, Age, Size, Phone.</p>
          </div>
          <a className="btn btn-secondary" href={`${import.meta.env.BASE_URL}samples/roster-template.csv`} download>Download a template</a>
        </div>
        <div className="screen-foot"><a className="btn btn-primary" href="#/coach/setup/roster">Back to roster</a></div>
      </div>
    );
  }

  const unsure = rows.filter((r) => r.unsure).length;
  return (
    <div className="screen">
      <div className="screen-scroll">
        <div>
          <Back href="#/coach/setup/roster">Roster</Back>
          <h1 className="disp h1">Check your roster</h1>
          <p className="lede">
            {job.kind === 'photo'
              ? <>We read <b>{rows.length} players</b> from your photo.{unsure ? ` ${unsure === 1 ? 'One spot is' : `${unsure} spots are`} worth a second look.` : ''}</>
              : <>Found <b>{rows.length} players</b> in {job.file.name}.</>}
          </p>
        </div>

        {matched.length > 0 && (
          <div className="matched">
            {matched.map((f) => <span key={f}><Check size={9} color="var(--ink)" width={2} />{FIELD_LABELS[f]}</span>)}
          </div>
        )}

        <div className="roster">
          {rows.map((r) => (
            <div key={r.key} className={`prow irow${r.unsure ? ' flag' : ''}`}>
              <div className="av">{initials(r.name || '?')}</div>
              <div className="pinfo">
                <div className="irow-top">
                  <input className="iname" aria-label="Name" size={Math.max(4, r.name.length)} value={r.name} onChange={(e) => edit(r.key, { name: e.target.value })} />
                  <span className="inum">#<input aria-label="Number" inputMode="numeric" value={r.number ?? ''} placeholder="—" onChange={(e) => edit(r.key, { number: e.target.value.replace(/\D/g, '').slice(0, 2) ? Number(e.target.value.replace(/\D/g, '').slice(0, 2)) : null })} /></span>
                </div>
                <div className="psub">
                  {[r.age ? `Age ${r.age}` : null, r.lastSize ? sizeLabel(r.lastSize, r.cut) : 'No size', r.lastHeight ? formatHeight(r.lastHeight) : null, r.contact].filter(Boolean).join(' · ')}
                </div>
                {r.unsure && <span className="flow-tag warn">Check the {r.unsure}</span>}
                {!r.age && (
                  <label className="age-fix">Age <input inputMode="numeric" placeholder="—" onChange={(e) => edit(r.key, { age: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || null })} /></label>
                )}
              </div>
              <button className="x-btn" aria-label={`Remove ${r.name}`} onClick={() => remove(r.key)}>×</button>
            </div>
          ))}
        </div>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" disabled={!rows.length || missingAge > 0} onClick={add}>
          {missingAge ? `Add an age for ${missingAge} player${missingAge === 1 ? '' : 's'}` : `Add ${rows.length} player${rows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
