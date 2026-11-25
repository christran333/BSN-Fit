import React, { useState } from 'react';
import { store } from '../store.js';
import { go } from '../router.js';
import { flowFor, sizeLabel, formatHeight, questionsFor } from '../sizing.js';
import { messageText } from '../messages.js';
import { initials, Back } from '../components/ui.jsx';
import AddOptions from '../components/AddOptions.jsx';

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
          <div className="bubble" style={{ maxWidth: '100%' }}>
            Hey Jordan! 👋 {f.coach || 'Your coach'} needs your {f.season} jersey size.
          </div>
        </div>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" disabled={!ok} onClick={next}>Next: add your roster</button>
      </div>
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

        {players.length === 0 && <AddOptions context="setup" />}

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
            <AddOptions context="setup" showBsn={!players.some((p) => p.fromBsn)} samples={false} compact />
          </>
        )}

        {example && (
          <div className="setup-preview">
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
