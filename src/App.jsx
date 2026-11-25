import React, { useLayoutEffect, useRef, useState } from 'react';
import Sheet from './components/Sheet.jsx';
import { useRoute } from './router.js';
import { useStore, store, SCENARIOS, PEOPLE, DEMO_TOKEN, canHaveHeight } from './store.js';
import PhoneFrame from './components/PhoneFrame.jsx';
import CoachDashboard from './screens/CoachDashboard.jsx';
import AddPlayer from './screens/AddPlayer.jsx';
import PlayerPage from './screens/PlayerPage.jsx';
import FitCheck from './screens/FitCheck.jsx';
import Result from './screens/Result.jsx';
import Sms from './screens/Sms.jsx';
import CoachSetup from './screens/CoachSetup.jsx';
import ImportRoster from './screens/ImportRoster.jsx';
import Notice from './components/Notice.jsx';

function screenFor(path, data) {
  let m;
  if (path === '/coach' || path === '/') return <CoachDashboard data={data} />;
  if (path === '/coach/setup') return <CoachSetup data={data} step="order" />;
  if (path === '/coach/setup/roster') return <CoachSetup data={data} step="roster" />;
  if (path === '/coach/import' || path === '/coach/setup/import') return <ImportRoster data={data} />;
  if (path.startsWith('/coach/add')) return <AddPlayer setup={path.includes('setup=1')} />;
  if ((m = path.match(/^\/coach\/p\/([^/]+)/))) return <PlayerPage key={m[1]} data={data} id={m[1]} />;
  if ((m = path.match(/^\/sms\/([^/]+)/))) return <Sms key={m[1]} data={data} token={m[1]} />;
  if ((m = path.match(/^\/r\/([^/]+)\/done/))) return <Result key={m[1]} data={data} token={m[1]} />;
  if ((m = path.match(/^\/r\/([^/]+)/))) return <FitCheck key={m[1]} data={data} token={m[1]} />;
  return <CoachDashboard data={data} />;
}

/** shrink the demo panel to fit the window, the same way the phone does */
function useFitHeight(deps) {
  const ref = useRef(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const z = parseFloat(getComputedStyle(el).zoom) || 1;
      const natural = el.getBoundingClientRect().height / z;
      setZoom(Math.min(1, (window.innerHeight - 40) / natural));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, deps);
  return [ref, zoom];
}

/** the demo's controls: who gets the text, which scenario, where to jump.
    Shown as the side panel on a laptop and as a bottom sheet on a phone. */
function DemoControls({ data, path, onNav = () => {} }) {
  const demo = data.demo || { token: DEMO_TOKEN, scenario: 'first' };
  const person = data.players.find((p) => p.token === demo.token);
  const scenario = SCENARIOS.find((sc) => sc.id === demo.scenario);
  const submitted = person && (person.status === 'ready' || person.status === 'review');

  const pick = (token, id, h) => { store.scenario(token, id, h); window.location.hash = `/sms/${token}`; onNav(); };
  const journey = person ? [
    { label: 'Text', href: `#/sms/${person.token}` },
    { label: 'Fit check', href: `#/r/${person.token}` },
    { label: 'Result', href: `#/r/${person.token}/done`, off: !submitted },
    { label: 'Coach view', href: `#/coach/p/${person.id}` },
  ] : [];
  const here = `#${path}`.split('?')[0];

  return (
    <>
    <div className="demo-section">Who gets the text</div>
    <div className="demo-people" role="tablist" aria-label="Person">
      {PEOPLE.map((pp) => (
        <button key={pp.token} role="tab" aria-selected={demo.token === pp.token} onClick={() => pick(pp.token, demo.scenario)}>
          <b>{pp.label}</b><span>{pp.sub}</span>
        </button>
      ))}
    </div>

    {canHaveHeight(demo.token) && (
      <>
        <div className="demo-section">On file from last season</div>
        <div className="demo-seg" role="tablist" aria-label="What's on file">
          <button role="tab" aria-selected={!demo.heightOnFile} onClick={() => pick(demo.token, demo.scenario, false)}>Size only</button>
          <button role="tab" aria-selected={!!demo.heightOnFile} onClick={() => pick(demo.token, demo.scenario, true)}>Size + height</button>
        </div>
        <p className="demo-note">
          {demo.heightOnFile
            ? 'We know last height, so they enter today’s height and we work out growth. 4 questions.'
            : 'No height on file, so we ask how much they’ve grown. 5 questions.'}
        </p>
      </>
    )}

    <div className="demo-section">Scenario</div>
    <div className="demo-tabs" role="tablist" aria-label="Scenario">
      {SCENARIOS.map((sc, i) => (
        <button key={sc.id} role="tab" aria-selected={demo.scenario === sc.id} onClick={() => pick(demo.token, sc.id)}>
          <span className="demo-tab-n">{i + 1}</span>{sc.label}
        </button>
      ))}
    </div>
    <p className="demo-note">{scenario?.note} Reply buttons in the thread work.</p>

    <div className="demo-section">Their journey</div>
    <nav className="demo-journey" aria-label="Journey">
      {journey.map((j, i) => (
        <React.Fragment key={j.label}>
          {i > 0 && <span aria-hidden="true">›</span>}
          <a href={j.off ? undefined : j.href} onClick={onNav} aria-disabled={j.off || undefined} className={here === j.href ? 'on' : ''}>{j.label}</a>
        </React.Fragment>
      ))}
    </nav>

    <div className="demo-foot">
      <a href="#/coach/setup" onClick={() => { store.beginSetup(); onNav(); }} className={here.startsWith('#/coach/setup') ? 'on' : ''}>Coach setup</a>
      <a href="#/coach" onClick={onNav} className={here === '#/coach' ? 'on' : ''}>Dashboard</a>
      <button className="demo-reset" onClick={() => pick(demo.token, demo.scenario)}>Restart scenario</button>
    </div>
    </>
  );
}

/** phone only: a small "Demo" pill that opens the controls in a sheet */
function PhoneDemo({ data, path }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="demo-bar">
        <span>Fit Check demo</span>
        <button onClick={() => setOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h7M13 4h1M2 12h1M7 12h7M11 2v4M5 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          Controls
        </button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Demo controls" className="demo-sheet">
        <div className="demo-panel in-sheet">
          <DemoControls data={data} path={path} onNav={() => setOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}

export default function App() {
  const path = useRoute();
  const data = useStore();
  const [panelRef, panelZoom] = useFitHeight([data.demo?.token, data.demo?.heightOnFile, data.demo?.scenario, path]);
  return (
    <div className="stage">
      <aside className="demo-panel" ref={panelRef} style={{ zoom: panelZoom }}>
        <div>
          <h1 className="disp demo-title">Fit Check</h1>
        </div>

        <DemoControls data={data} path={path} />
      </aside>
      <PhoneFrame path={path} overlay={<><Notice data={data} /><PhoneDemo data={data} path={path} /></>}>{screenFor(path, data)}</PhoneFrame>
    </div>
  );
}
