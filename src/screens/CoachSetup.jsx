import React, { useState } from 'react';
import { store } from '../store.js';
import { go } from '../router.js';
import { flowFor, sizeLabel, formatHeight, questionsFor } from '../sizing.js';
import { messageText } from '../messages.js';
import { initials, Back } from '../components/ui.jsx';
import { setPending } from '../rosterImport.js';

// First-time coach setup, two steps:
//   1. the order: who it's for, whose name goes on the texts, when sizes are due
//   2. the roster: import last season's order from BSN or add players, then send
const FLOW_TAG = {
  parent: 'Parent check',
  teen: 'Growth check',
  standard: 'Fit check',
  returning: 'Same as last year',
};

function Steps({ n }) {
  return (
    <div className="setup-steps" aria-label={`Step ${n} of 2`}>
      <span className={n >= 1 ? 'on' : ''} />
      <span className={n >= 2 ? 'on' : ''} />
      <b>Step {n} of 2</b>
    </div>
  );
}

function OrderStep({ team }) {
  const toDate = (iso) => new Date(iso).toISOString().slice(0, 10);
  const [f, setF] = useState({
    school: team.school, program: team.program, season: team.season, coach: team.coach, due: toDate(team.dueDate),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const ok = f.school.trim() && f.program.trim() && f.season.trim() && f.coach.trim() && f.due;
  const next = () => {
    store.saveTeam({
      school: f.school.trim(), program: f.program.trim(), season: f.season.trim(), coach: f.coach.trim(),
      dueDate: new Date(`${f.due}T23:59:00`).toISOString(),
    });
    go('/coach/setup/roster');
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div>
          <Steps n={1} />
          <h1 className="disp h1">Set up your order</h1>
          <p className="lede">Each player gets a text with their own link. This is what it'll say.</p>
        </div>
        <div className="field"><label htmlFor="sc">School or club</label><input id="sc" className="input" value={f.school} onChange={set('school')} /></div>
        <div className="field"><label htmlFor="pg">Team</label><input id="pg" className="input" value={f.program} onChange={set('program')} placeholder="e.g. Girls Varsity Basketball" /></div>
        <div className="grid2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <div className="field"><label htmlFor="ss">Season</label><input id="ss" className="input" value={f.season} onChange={set('season')} /></div>
          <div className="field"><label htmlFor="du">Sizes due</label><input id="du" className="input" type="date" value={f.due} onChange={set('due')} /></div>
        </div>
        <div className="field"><label htmlFor="co">Your name on the texts</label><input id="co" className="input" value={f.coach} onChange={set('coach')} placeholder="e.g. Coach Newman" />
          <span className="help">Players open texts from their coach. They ignore texts from a company.</span>
        </div>
        <div className="setup-preview" aria-live="polite">
          <div className="flow-kicker">Players will get</div>
          <div className="bubble" style={{ maxWidth: '100%' }}>
            {f.coach || 'Your coach'} is asking for your {f.season} uniform size for {f.school} {f.program}.
          </div>
        </div>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" disabled={!ok} onClick={next}>Next: add your roster</button>
      </div>
    </div>
  );
}

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

/** the ways a coach can add players: BSN history, a photo, a spreadsheet, or by hand */
function AddOptions({ compact = false, showBsn = true }) {
  const startImport = (kind, file) => { if (file) { setPending({ kind, file }); go('/coach/setup/import'); } };
  const sample = async (kind) => {
    const name = kind === 'photo' ? 'roster-photo.jpg' : 'eagles-roster.xlsx';
    const blob = await (await fetch(`${import.meta.env.BASE_URL}samples/${name}`)).blob();
    startImport(kind, new File([blob], name, { type: blob.type }));
  };
  const pick = (kind) => (e) => { startImport(kind, e.target.files?.[0]); e.target.value = ''; };
  return (
    <div className={`addopts${compact ? ' compact' : ''}`}>
      {showBsn && (
        <button className="addopt" onClick={() => store.importRoster()}>
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
      <a className="addopt" href="#/coach/add?setup=1">
        <Icon k="hand" />
        <span className="addopt-txt"><b>Add one at a time</b><span>Name, age, number and last size</span></span>
        <Chevron />
      </a>
      {!compact && (
        <p className="addopt-foot">
          No file handy? Try a <button onClick={() => sample('photo')}>sample photo</button> or <button onClick={() => sample('sheet')}>sample spreadsheet</button>.
          {' '}<a href={`${import.meta.env.BASE_URL}samples/roster-template.csv`} download>Get the template</a>
        </p>
      )}
    </div>
  );
}

function RosterStep({ data }) {
  const { team, players } = data;
  const drafts = players.filter((p) => p.status === 'draft');
  const due = new Date(team.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const send = () => { store.sendLinks(); go('/coach'); };
  const example = drafts[0];

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div>
          <Back href="#/coach/setup">Order details</Back>
          <Steps n={2} />
          <h1 className="disp h1">Add your roster</h1>
          <p className="lede">{team.name} · sizes due {due}</p>
        </div>

        {players.length === 0 && <AddOptions showBsn />}

        <div className="roster">
          {players.map((p) => {
            const flow = flowFor(p);
            const onFile = [
              p.age && `Age ${p.age}`,
              p.lastSize ? sizeLabel(p.lastSize, p.cut) : 'No size on file',
              p.lastHeight && formatHeight(p.lastHeight),
            ].filter(Boolean).join(' · ');
            return (
              <div key={p.id} className="prow">
                <div className="av">{initials(p.name)}</div>
                <div className="pinfo">
                  <div className="pname">{p.name} {p.number != null && <span>#{p.number}</span>}</div>
                  <div className="psub">{onFile}</div>
                  <span className="flow-tag">{FLOW_TAG[flow]} · {questionsFor(p).length} questions</span>
                </div>
                {p.status === 'draft' && (
                  <button className="x-btn" aria-label={`Remove ${p.name}`} onClick={() => store.removePlayer(p.id)}>×</button>
                )}
              </div>
            );
          })}
        </div>

        {players.length > 0 && (
          <>
            <div className="section-label">Add more</div>
            <AddOptions showBsn={!players.some((p) => p.fromBsn)} compact />
          </>
        )}

        {example && (
          <div className="setup-preview">
            <div className="flow-kicker">{example.name.split(' ')[0]}'s text, for example</div>
            <div className="bubble" style={{ maxWidth: '100%' }}>{messageText(example, team, { kind: 'invite' })}</div>
          </div>
        )}
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" disabled={!drafts.length} onClick={send}>
          {drafts.length ? `Send ${drafts.length} link${drafts.length === 1 ? '' : 's'}` : 'Add players to send'}
        </button>
      </div>
    </div>
  );
}

export default function CoachSetup({ data, step }) {
  return step === 'roster' ? <RosterStep data={data} /> : <OrderStep team={data.team} />;
}
