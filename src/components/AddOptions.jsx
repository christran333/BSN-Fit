import React from 'react';
import { store } from '../store.js';
import { go } from '../router.js';
import { setPending } from '../rosterImport.js';

// The ways a coach can add players: BSN history, a roster photo, a spreadsheet, or by hand.
// context 'setup': players wait as drafts until "Send links".
// context 'dashboard': imported players get their text right away.
const ICONS = {
  bsn: <path d="M4 7.5h16M4 12h16M4 16.5h10" />,
  photo: <><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.5" /><path d="M8.5 6l1.5-2.5h4L15.5 6" /></>,
  sheet: <><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M4 9h16M4 15h16M10 3v18" /></>,
  hand: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
};
const Icon = ({ k }) => (
  <span className="addopt-ico" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[k]}</svg>
  </span>
);
const Chevron = () => (
  <svg className="addopt-chev" width="8" height="13" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function AddOptions({ context = 'setup', compact = false, showBsn = true, samples = true, onPick }) {
  const startImport = (kind, file) => {
    if (!file) return;
    setPending({ kind, file, context });
    onPick?.();
    go('/coach/import');
  };
  const sample = async (kind) => {
    // the .csv copy is for hosts that can't serve .xlsx
    const names = kind === 'photo' ? ['roster-photo.jpg'] : ['eagles-roster.xlsx', 'eagles-roster.csv'];
    for (const name of names) {
      const res = await fetch(`${import.meta.env.BASE_URL}samples/${name}`).catch(() => null);
      if (!res?.ok) continue;
      const blob = await res.blob();
      return startImport(kind, new File([blob], name, { type: name.endsWith('.csv') ? 'text/csv' : blob.type }));
    }
  };
  const pick = (kind) => (e) => { startImport(kind, e.target.files?.[0]); e.target.value = ''; };
  return (
    <div className={`addopts${compact ? ' compact' : ''}`}>
      {showBsn && (
        <button className="addopt" onClick={() => { store.importRoster(); onPick?.(); }}>
          <Icon k="bsn" />
          <span className="addopt-txt"><b>Last season's order</b><span>From BSN: 12 players with sizes</span></span>
          <span className="addopt-badge">Fastest</span>
        </button>
      )}
      <label className="addopt">
        <Icon k="photo" />
        <span className="addopt-txt"><b>Scan a roster photo</b><span>A printed list or a whiteboard</span></span>
        <Chevron />
        <input type="file" accept="image/*" capture="environment" onChange={pick('photo')} hidden />
      </label>
      <label className="addopt">
        <Icon k="sheet" />
        <span className="addopt-txt"><b>Upload a spreadsheet</b><span>Excel or CSV from your team app</span></span>
        <Chevron />
        <input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pick('sheet')} hidden />
      </label>
      <a className="addopt" href={context === 'setup' ? '#/coach/add?setup=1' : '#/coach/add'} onClick={() => onPick?.()}>
        <Icon k="hand" />
        <span className="addopt-txt"><b>Add one at a time</b><span>Name, age, number and last size</span></span>
        <Chevron />
      </a>
      {samples && (
        <p className="addopt-foot">
          No file handy? Try a <button onClick={() => sample('photo')}>sample photo</button> or <button onClick={() => sample('sheet')}>sample spreadsheet</button>.
          {' '}<a href={`${import.meta.env.BASE_URL}samples/roster-template.csv`} download>Get the template</a>
        </p>
      )}
    </div>
  );
}
