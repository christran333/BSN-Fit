import React, { useEffect, useMemo, useState } from 'react';
import { store } from '../store.js';
import { flowFor, questionsFor, defaultAnswers, recommend, sizeLabel, shortSize, formatHeight } from '../sizing.js';
import { go } from '../router.js';
import { Chips, Check } from '../components/ui.jsx';
import { isClosed } from '../messages.js';

export default function FitCheck({ data, token }) {
  const p = data.players.find((x) => x.token === token);
  const [answers, setAnswers] = useState(() => (p ? { ...defaultAnswers(p), ...(p.draft || {}), ...(p.answers || {}) } : {}));

  useEffect(() => { if (p) store.markOpened(p.id); }, [p?.id]);

  const questions = useMemo(() => (p ? questionsFor(p) : []), [p?.id]);
  if (!p) return <div className="center-msg"><b>This link doesn't work.</b><span className="help">Ask your coach for a new one.</span></div>;

  const flow = flowFor(p);
  const first = p.name.split(' ')[0];
  const submitted = p.status === 'ready' || p.status === 'review';

  // link opened after the order closed: offer the next batch instead
  if (isClosed(data.team) && !submitted) {
    const due = new Date(data.team.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return (
      <div className="screen white">
        <div className="center-msg" style={{ alignItems: 'flex-start', textAlign: 'left', justifyContent: 'flex-start', paddingTop: 28 }}>
          <div className="kicker">{data.team.name}</div>
          <h1 className="disp h1" style={{ margin: 0 }}>
            {p.nextBatch ? "You're on the list" : `Sizes closed on ${due}`}
          </h1>
          <p className="lede" style={{ margin: 0 }}>
            {p.nextBatch
              ? `We'll text ${flow === 'parent' ? `you a new link for ${first}` : 'you a new link'} when the next batch opens. Nothing else to do.`
              : `${data.team.coach}'s ${data.team.season} order has already gone in. ${flow === 'parent' ? `${first} can` : 'You can'} still get a uniform in the next batch.`}
          </p>
          {p.nextBatch && <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={24} width={1.6} /></div>}
        </div>
        {!p.nextBatch && (
          <div className="screen-foot">
            <button className="btn btn-primary" onClick={() => store.joinNextBatch(p.id)}>Add {flow === 'parent' ? first : 'me'} to the next batch</button>
          </div>
        )}
      </div>
    );
  }
  const set = (id) => (v) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    // keep their place, so a reminder can say how far along they are
    store.saveDraft(p.id, next, questions.filter((q) => next[q.id] !== undefined).length);
  };
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const complete = answered === questions.length;
  const live = answered >= 3 ? recommend(p, answers) : null;

  const submit = (more) => {
    store.submit(p.id, answers);
    go(`/r/${token}/done${more ? '?more=1' : ''}`);
  };

  const head = {
    parent: { title: `${first}'s uniform size`, lede: <>{p.lastSize ? <>{first} wore <b>{sizeLabel(p.lastSize, p.cut)}</b> last season. </> : null}{questions.length === 4 ? 'Four' : 'Five'} taps and you're done.</>, kicker: data.team.name },
    teen: { title: `Hey ${first}, check your fit`, lede: <>You wore <b>{sizeLabel(p.lastSize, p.cut)}</b> last season. {questions.length === 4 ? 'Four' : 'Five'} quick questions, about a minute.</>, kicker: data.team.name },
    standard: { title: `Hey ${first}, lock in your fit`, lede: 'The whole team does this, even if you know your size. Jerseys fit differently by brand. About a minute.', kicker: data.team.name },
    returning: { title: `Same as last season, ${first}?`, lede: `We filled this in from your last order. Nothing changed? Just hit submit.`, kicker: data.team.name },
  }[flow];

  const header = (
    <div>
      <div className="kicker">{head.kicker}</div>
      <h1 className="disp h1">{head.title}</h1>
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
      <button className="btn btn-primary" disabled={!complete} onClick={() => submit(false)}>
        {flow === 'returning' && answers.changed === 'none' && live?.size === p.lastSize
          ? `Yep, same: submit ${live.size}`
          : complete ? 'Submit' : `Submit · ${answered} of ${questions.length}`}
      </button>
      {complete && (
        <div className="foot-links">
          <button className="lnk" onClick={() => submit(true)}>Not sure about this size?</button>
          <span aria-hidden="true">·</span>
          <button className="lnk" onClick={() => submit(true)}>Add more info</button>
        </div>
      )}
    </div>
  );

  // returning athletes: same five questions, all open, pre-selected from last order
  if (flow === 'returning') {
    return (
      <div className="screen white">
        <div className="screen-scroll">
          {header}
          <div className="last-card compact">
            <div className="disp last-size">{p.lastSize}</div>
            <div>
              <div className="last-title">{sizeLabel(p.lastSize, p.cut)} · last order</div>
              <div className="last-sub">
                {p.lastOrderDate ? new Date(p.lastOrderDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} · kept, not returned
              </div>
            </div>
          </div>
          {questions.map((q, i) => (
            <div className="q" key={q.id}>
              <div className="ql"><span className="qn">0{i + 1}</span>{q.label}</div>
              <Chips q={q} value={answers[q.id]} onChange={set(q.id)} />
            </div>
          ))}
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
