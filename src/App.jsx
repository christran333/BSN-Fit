import React from 'react';
import { useRoute } from './router.js';
import { useStore, store } from './store.js';
import PhoneFrame from './components/PhoneFrame.jsx';
import CoachDashboard from './screens/CoachDashboard.jsx';
import AddPlayer from './screens/AddPlayer.jsx';
import PlayerPage from './screens/PlayerPage.jsx';
import FitCheck from './screens/FitCheck.jsx';
import Result from './screens/Result.jsx';
import Sms from './screens/Sms.jsx';
import Notice from './components/Notice.jsx';

function screenFor(path, data) {
  let m;
  if (path === '/coach' || path === '/') return <CoachDashboard data={data} />;
  if (path === '/coach/add') return <AddPlayer />;
  if ((m = path.match(/^\/coach\/p\/([^/]+)/))) return <PlayerPage key={m[1]} data={data} id={m[1]} />;
  if ((m = path.match(/^\/sms\/([^/]+)/))) return <Sms key={m[1]} data={data} token={m[1]} />;
  if ((m = path.match(/^\/r\/([^/]+)\/done/))) return <Result key={m[1]} data={data} token={m[1]} />;
  if ((m = path.match(/^\/r\/([^/]+)/))) return <FitCheck key={m[1]} data={data} token={m[1]} />;
  return <CoachDashboard data={data} />;
}

export default function App() {
  const path = useRoute();
  const data = useStore();
  const demo = [
    { label: 'Coach dashboard', href: '#/coach' },
    { label: 'Text from BSN · what athletes get', href: '#/sms/jordan-x2p' },
    { label: 'Mia · parent of a 10-year-old', href: '#/r/mia-7kq' },
    { label: 'Jordan · says S, no size on file', href: '#/r/jordan-x2p' },
    { label: 'Dana · same as last year', href: '#/r/dana-a91' },
  ];
  return (
    <div className="stage">
      <aside className="demo-panel">
        <div className="demo-kicker">Prototype</div>
        <h1 className="disp demo-title">Fit Check</h1>
        <p className="demo-copy">
          Coaches see the roster. Each athlete gets one link with five questions picked for them.
          Answers on a link show up on the coach dashboard live.
        </p>
        <nav className="demo-links" aria-label="Demo shortcuts">
          {demo.map((d) => (
            <a key={d.href} href={d.href} className={`#${path}`.replace(/\/done.*/, '') === d.href ? 'on' : ''}>
              {d.label}
            </a>
          ))}
        </nav>
        <button className="demo-reset" onClick={() => { store.reset(); window.location.hash = '/coach'; }}>
          Reset demo data
        </button>
      </aside>
      <PhoneFrame path={path} overlay={<Notice data={data} />}>{screenFor(path, data)}</PhoneFrame>
    </div>
  );
}
