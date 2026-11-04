import React, { useEffect, useMemo, useState } from 'react';
import { store } from '../store.js';
import { flowFor, questionsFor, defaultAnswers, recommend, sizeLabel, shortSize, formatHeight } from '../sizing.js';
import { go } from '../router.js';
import { Chips } from '../components/ui.jsx';

export default function FitCheck({ data, token }) {
  const p = data.players.find((x) => x.token === token);
  const [answers, setAnswers] = useState(() => (p ? { ...defaultAnswers(p), ...(p.answers || {}) } : {}));
  const [editing, setEditing] = useState(null);

  useEffect(() => { if (p) store.markOpened(p.id); }, [p?.id]);

  const questions = useMemo(() => (p ? questionsFor(p) : []), [p?.id]);
  if (!p) return <div className="center-msg"><b>This link doesn't work.</b><span className="help">Ask your coach for a new one.</span></div>;

  const flow = flowFor(p);
  const first = p.name.split(' ')[0];
  const set = (id) => (v) => setAnswers((a) => ({ ...a, [id]: v }));
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const complete = answered === questions.length;
  const live = answered >= 3 ? recommend(p, answers) : null;

  const submit = (more) => {
    store.submit(p.id, answers);
    go(`/r/${token}/done${more ? '?more=1' : ''}`);
  };

  const head = {
    parent: { title: `${first}'s uniform size`, lede: <>{p.lastSize ? <>{first} wore <b>{sizeLabel(p.lastSize, p.cut)}</b> last season. </> : null}Five taps and you're done.</>, kicker: `${data.team.name} · for parents` },
    teen: { title: `Hey ${first}, check your fit`, lede: <>You wore <b>{sizeLabel(p.lastSize, p.cut)}</b> last season. Five taps, about 30 seconds.</>, kicker: data.team.name },
    standard: { title: `Hey ${first}, lock in your fit`, lede: 'The whole team does this, even if you know your size. Jerseys fit differently by brand. About 30 seconds.', kicker: data.team.name },
    returning: { title: `Same as last season, ${first}?`, lede: `We filled this in from your last order. Check it and submit.`, kicker: data.team.name },
  }[flow];

  const header = (
    <div>
      <div className="kicker">{head.kicker}</div>
      <h1 className="disp" style={{ margin: '6px 0 0', fontSize: 32, lineHeight: 1.02 }}>{head.title}</h1>
      <p className="lede">{head.lede}</p>
    </div>
  );

  const suggestion = (
    <div className={`suggest${live ? '' : ' empty'}`} aria-live="polite">
      <div className="disp suggest-size">{live ? shortSize(live.size) : '?'}</div>
      <div className="suggest-text">
        {live ? (
          <><b>Looking like {sizeLabel(live.size, p.cut)}.</b> {live.reasons[0] ? `${live.reasons[0]}, so we went with the safer size.` : 'Between sizes, we round up.'}</>
        ) : (
          <>Answer {3 - answered} more and we'll suggest a size.</>
        )}
      </div>
    </div>
  );

  const foot = (
    <div className="screen-foot">
      <button className="btn btn-red" style={flow === 'returning' ? { height: 56, fontSize: 17 } : null} disabled={!complete} onClick={() => submit(false)}>
        {flow === 'returning' && answers.changed === 'none' && live?.size === p.lastSize
          ? `Yep, same: submit ${live.size}`
          : complete ? 'Submit' : `Submit · ${answered} of 5`}
      </button>
      <div className="foot-links">
        <button className="lnk" disabled={!complete} style={{ opacity: complete ? 1 : 0.45 }} onClick={() => submit(true)}>Not sure about this size?</button>
        <span aria-hidden="true">·</span>
        <button className="lnk" disabled={!complete} style={{ opacity: complete ? 1 : 0.45 }} onClick={() => submit(true)}>Add more info</button>
      </div>
    </div>
  );

  // returning athletes: one real question + prefilled rows they can open
  if (flow === 'returning') {
    const [q1, ...rest] = questions;
    return (
      <div className="screen white">
        <div className="screen-scroll" style={{ gap: 16 }}>
          {header}
          <div className="last-card">
            <div className="disp last-size">{p.lastSize}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{sizeLabel(p.lastSize, p.cut)} · last order</div>
              <div style={{ fontSize: 13, color: '#c9ccd1', marginTop: 2 }}>
                {p.lastOrderDate ? new Date(p.lastOrderDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} · kept, not returned
              </div>
            </div>
          </div>
          <div className="q">
            <div className="ql"><span className="qn">01</span>{q1.label}</div>
            <Chips q={q1} value={answers[q1.id]} onChange={set(q1.id)} />
          </div>
          <div>
            {rest.map((q, i) =>
              editing === q.id ? (
                <div className="prefill-open" key={q.id}>
                  <div className="ql"><span className="qn">0{i + 2}</span>{q.label}</div>
                  <Chips q={q} value={answers[q.id]} onChange={(v) => { set(q.id)(v); setEditing(null); }} />
                </div>
              ) : (
                <div className="prefill" key={q.id}>
                  <span className="qn" style={{ width: 20 }}>0{i + 2}</span>
                  <span className="pl">{q.label}</span>
                  <span className="pv">{q.options.find((o) => o.value === answers[q.id])?.label}</span>
                  <button className="ed" aria-label={`Change ${q.label}`} onClick={() => setEditing(q.id)}>Change</button>
                </div>
              ),
            )}
          </div>
          {live && live.size !== p.lastSize && suggestion}
        </div>
        {foot}
      </div>
    );
  }

  return (
    <div className="screen white">
      <div className="screen-scroll">
        {header}
        {questions.map((q, i) => (
          <div className="q" key={q.id}>
            <div className="ql"><span className="qn">0{i + 1}</span>{q.label}</div>
            {q.type === 'stepper' ? (
              <>
                <div className="stepper">
                  <button type="button" aria-label="Shorter" onClick={() => set(q.id)(Math.max(q.min, (answers[q.id] ?? q.default) - 1))}>−</button>
                  <output>{formatHeight(answers[q.id] ?? q.default)}</output>
                  <button type="button" aria-label="Taller" onClick={() => set(q.id)(Math.min(q.max, (answers[q.id] ?? q.default) + 1))}>+</button>
                </div>
                <div className="help">{q.help}</div>
              </>
            ) : (
              <Chips q={q} value={answers[q.id]} onChange={set(q.id)} />
            )}
          </div>
        ))}
        {suggestion}
      </div>
      {foot}
    </div>
  );
}
