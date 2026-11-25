// Tiny local store: everything lives in localStorage so the prototype
// works with no backend. Coach and athlete screens read the same data,
// so a submit on one link shows up on the dashboard right away.
import { useSyncExternalStore } from 'react';
import { recommend, flowFor, questionsFor, defaultAnswers } from './sizing.js';
import { nudgeKindFor, teamStats, daysLeft, ackFor, ALL_REPLIES } from './messages.js';

const KEY = 'bsn-fitcheck-v5';
export const DEMO_TOKEN = 'jordan-x2p';
const listeners = new Set();

const daysFromNow = (n) => new Date(Date.now() + n * 864e5).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 36e5).toISOString();
const minsAgo = (n) => new Date(Date.now() - n * 6e4).toISOString();
const plusSec = (iso, s) => new Date(new Date(iso).getTime() + s * 1000).toISOString();
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};
export const makeToken = (name) =>
  `${name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}-${Math.random().toString(36).slice(2, 5)}`;

function seed() {
  const players = [
    { id: 'p1', name: 'Mia Torres', number: 3, age: 10, cut: 'girls', lastSize: 'YM', lastOrderDate: monthsAgo(15), contact: '(214) 555-0142', token: 'mia-7kq', status: 'waiting' },
    { id: 'p2', name: 'Jordan Lee', number: 4, age: 17, cut: 'womens', lastSize: null, contact: '(469) 555-0188', token: 'jordan-x2p', status: 'waiting' },
    { id: 'p3', name: 'Dana Ortiz', number: 11, age: 24, cut: 'womens', lastSize: 'L', lastOrderDate: monthsAgo(14), heightBand: '68-72', contact: '(972) 555-0131', token: 'dana-a91', status: 'waiting' },
    { id: 'p4', name: 'Kayla Brooks', number: 12, age: 16, cut: 'womens', lastSize: null, token: 'kayla-m3d', status: 'opened' },
    { id: 'p5', name: 'Maya Chen', number: 7, age: 15, cut: 'womens', lastSize: 'S', lastOrderDate: monthsAgo(13), token: 'maya-p8w', status: 'waiting' },
    { id: 'p6', name: 'Sofia Ramirez', number: 21, age: 19, cut: 'womens', lastSize: 'L', lastOrderDate: monthsAgo(12), heightBand: '68-72', token: 'sofia-k2r', status: 'waiting' },
    { id: 'p7', name: 'Taylor Nguyen', number: 9, age: 16, cut: 'womens', lastSize: null, token: 'taylor-q5t', status: 'waiting', sentAt: daysFromNow(-2) },
    { id: 'p8', name: 'Ava Johnson', number: 2, age: 17, cut: 'womens', lastSize: 'M', lastOrderDate: monthsAgo(12), token: 'ava-h4n', status: 'waiting' },
    { id: 'p9', name: 'Riley Patel', number: 5, age: 16, cut: 'womens', lastSize: 'S', lastOrderDate: monthsAgo(12), token: 'riley-w7c', status: 'waiting' },
    { id: 'p10', name: 'Brooke Allen', number: 14, age: 17, cut: 'womens', lastSize: 'L', lastOrderDate: monthsAgo(12), token: 'brooke-z6v', status: 'waiting' },
    { id: 'p11', name: 'Nia Washington', number: 23, age: 15, cut: 'womens', lastSize: 'M', lastOrderDate: monthsAgo(12), token: 'nia-b2j', status: 'waiting' },
    { id: 'p12', name: 'Emma Davis', number: 30, age: 16, cut: 'womens', lastSize: 'S', lastOrderDate: monthsAgo(12), token: 'emma-r9f', status: 'waiting' },
  ];
  // pre-fill a couple of finished checks so the dashboard isn't empty
  const done = {
    p5: { growth: 'little', lastFit: 'right', shoulders: 'right', reach: 'stays', height: '64-68' },
    p6: { changed: 'none', lastFit: 'right', pref: 'regular', height: '68-72', length: 'fine' },
  };
  const teenOk = { growth: 'little', lastFit: 'right', shoulders: 'right', reach: 'stays', height: '64-68' };
  for (const id of ['p8', 'p9', 'p10', 'p11', 'p12']) done[id] = teenOk;
  players.forEach((p, i) => {
    p.sentAt = p.sentAt || hoursAgo(26 - i);
    p.messages = [{ kind: 'invite', at: p.sentAt }];
  });
  for (const p of players) {
    if (done[p.id]) {
      p.answers = done[p.id];
      p.rec = recommend(p, p.answers);
      p.finalSize = p.rec.size;
      p.status = 'ready';
      p.submittedAt = hoursAgo(20);
      p.messages.push({ kind: 'confirm', at: p.submittedAt, size: p.finalSize });
    }
  }
  players.find((p) => p.id === 'p4').answersCount = 3;
  // the intro text goes out right after the invite, with team progress at that moment
  for (const p of players) p.messages.splice(1, 0, { kind: 'intro', at: plusSec(p.sentAt, 2), stats: teamStats(players, p) });
  return {
    team: { ...TEAM, dueDate: daysFromNow(4) },
    players,
    notice: null,
    demo: { token: DEMO_TOKEN, scenario: 'first' },
  };
}

export const TEAM = {
  school: 'Eagles High School',
  program: 'Girls Varsity Basketball',
  short: 'Eagles',
  season: 'Fall 2026',
  name: 'Eagles HS · Girls Varsity Basketball',
  order: 'Fall 2026 uniforms',
  coach: 'Coach Newman',
};

// ── demo scenarios ─────────────────────────────────────────────
// Pick a person, then a moment. Each scenario rebuilds that person's
// thread from the first text up to that moment, so it reads as one story.
export const PEOPLE = [
  { token: 'jordan-x2p', label: 'Jordan', sub: '17 · no size on file' },
  { token: 'mia-7kq', label: "Mia's parent", sub: '10 · text goes to parent' },
  { token: 'maya-p8w', label: 'Maya', sub: '15 · wore S last season' },
  { token: 'dana-a91', label: 'Dana', sub: '24 · same as last year' },
];
// last season's height, used when the "size + height on file" tab is on
const HEIGHT_ON_FILE = { 'mia-7kq': 52, 'maya-p8w': 63 };
export const canHaveHeight = (token) => token in HEIGHT_ON_FILE;
export const SCENARIOS = [
  { id: 'first', label: 'First text', note: 'No obstacles. The invite, then what to expect.' },
  { id: 'ignored', label: 'Ignored it', note: 'Three days later, no answer yet.' },
  { id: 'halfway', label: 'Quit half-way', note: 'Opened the link, answered some, left.' },
  { id: 'later', label: 'Remind later', note: 'Tapped "Remind me later". This is the next day.' },
  { id: 'late', label: 'After deadline', note: 'The order closed before they answered.' },
  { id: 'done', label: 'Done', note: 'Submitted. Confirmation text, and the coach has the size.' },
];

function buildScenario(token = DEMO_TOKEN, id = 'first', heightOnFile = false) {
  const s = seed();
  s.demo = { token, scenario: id, heightOnFile };
  const p = s.players.find((x) => x.token === token);
  if (heightOnFile && canHaveHeight(token)) p.lastHeight = HEIGHT_ON_FILE[token];
  for (const k of ['answers', 'rec', 'finalSize', 'submittedAt', 'draft', 'answersCount']) delete p[k];
  const msg = (kind, at, extra = {}) => ({ kind, at, ...extra });
  const start = (daysBack) => {
    const at = id === 'first' ? minsAgo(1) : hoursAgo(daysBack * 24);
    p.sentAt = at;
    p.status = 'waiting';
    p.messages = [msg('invite', at), msg('intro', plusSec(at, 2), { stats: teamStats(s.players, p) })];
    return at;
  };
  const reply = (replyId, at) => {
    const r = [...ALL_REPLIES, { id: 'same', label: `Same as last year (${p.lastSize})` }].find((x) => x.id === replyId);
    p.messages.push(msg('reply', at, { text: r.label }));
    const ack = ackFor(replyId, p, s.team);
    if (ack) p.messages.push(msg('ack', plusSec(at, 3), { text: ack }));
  };
  // a plausible set of answers: defaults, else the second option
  const sample = (n) => Object.fromEntries(
    questionsFor(p).slice(0, n).map((q) => [q.id, defaultAnswers(p)[q.id] ?? q.options?.[1]?.value ?? q.default]),
  );

  if (id === 'first') start(0);
  if (id === 'ignored') {
    start(3);
    p.messages.push(msg('nudge', minsAgo(1), { stats: teamStats(s.players, p), daysLeft: daysLeft(s.team) }));
  }
  if (id === 'halfway') {
    const at = start(2);
    reply('go', plusSec(at, 120));
    p.draft = { ...defaultAnswers(p), ...sample(3) };
    p.answersCount = questionsFor(p).filter((q) => p.draft[q.id] !== undefined).length;
    p.status = 'opened';
    p.messages.push(msg('partial', minsAgo(1), { answered: p.answersCount }));
  }
  if (id === 'later') {
    const at = start(1);
    reply('later', plusSec(at, 300));
    p.messages.push(msg('reminder', minsAgo(1)));
  }
  if (id === 'late') {
    s.team.dueDate = hoursAgo(12);
    const at = start(6);
    p.messages.push(msg('nudge', plusSec(at, 3 * 864e2), { stats: teamStats(s.players, p), daysLeft: 2 }));
    p.messages.push(msg('late', minsAgo(1)));
  }
  if (id === 'done') {
    const at = start(1);
    const returning = flowFor(p) === 'returning';
    reply(returning ? 'same' : 'go', plusSec(at, 240));
    p.answers = returning ? defaultAnswers(p) : sample(5);
    p.rec = recommend(p, p.answers);
    p.finalSize = p.rec.size;
    p.status = p.rec.needsReview ? 'review' : 'ready';
    p.submittedAt = plusSec(at, 300);
    p.messages.push(msg('confirm', p.submittedAt, { size: p.finalSize }));
  }
  return s;
}

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...JSON.parse(raw), notice: null };
  } catch (e) { /* ignore */ }
  return buildScenario();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  listeners.forEach((l) => l());
}
function update(fn) {
  state = fn(structuredClone(state));
  save();
}
const patchPlayer = (id, patch) =>
  update((s) => {
    s.players = s.players.map((p) => (p.id === id ? { ...p, ...patch } : p));
    return s;
  });

export const store = {
  get: () => state,
  subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  reset: () => { const d = state.demo || {}; state = buildScenario(d.token, 'first', d.heightOnFile); save(); },
  scenario: (token, id, heightOnFile = state.demo?.heightOnFile) => { state = buildScenario(token, id, !!heightOnFile); save(); },

  // ── coach setup: order details, then roster, then send ──────
  beginSetup() {
    state = {
      team: { ...TEAM, dueDate: daysFromNow(7) },
      players: [],
      notice: null,
      demo: { ...(state.demo || {}), setup: true },
    };
    save();
  },
  saveTeam(patch) {
    update((s) => {
      const t = { ...s.team, ...patch };
      t.short = t.school.split(' ')[0] || t.school;
      t.name = `${t.school.replace(/High School/i, 'HS')} · ${t.program}`;
      t.order = `${t.season} uniforms`;
      s.team = t;
      return s;
    });
  },
  /** BSN already has last season's order for this team: pull it in */
  importRoster() {
    const keep = ['id', 'name', 'number', 'age', 'cut', 'lastSize', 'lastOrderDate', 'heightBand', 'contact', 'token'];
    update((s) => {
      const have = new Set(s.players.map((p) => p.token));
      const last = seed().players
        .filter((p) => !have.has(p.token))
        .map((p) => ({ ...Object.fromEntries(keep.filter((k) => p[k] != null).map((k) => [k, p[k]])), lastHeight: HEIGHT_ON_FILE[p.token] ?? null, status: 'draft', fromBsn: true }));
      s.players = [...s.players, ...last];
      return s;
    });
  },
  removePlayer: (id) => update((s) => { s.players = s.players.filter((p) => p.id !== id); return s; }),
  sendLinks() {
    const at = new Date().toISOString();
    update((s) => {
      s.players = s.players.map((p) => {
        if (p.status !== 'draft') return p;
        const q = { ...p, status: 'waiting', sentAt: at };
        q.messages = [{ kind: 'invite', at }, { kind: 'intro', at: plusSec(at, 2), stats: teamStats(s.players, q) }];
        return q;
      });
      s.demo = { ...(s.demo || {}), setup: false };
      return s;
    });
  },

  /** add a batch of draft players from a roster import (spreadsheet or photo) */
  addPlayers(list) {
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString();
    update((s) => {
      const taken = new Set(s.players.map((p) => p.name.toLowerCase()));
      list.forEach((r, i) => {
        if (taken.has(r.name.toLowerCase())) return;
        const kid = r.age < 13;
        s.players.push({
          id: `p${Date.now()}${i}`,
          status: 'draft',
          token: makeToken(r.name),
          name: r.name,
          number: r.number ?? null,
          age: r.age,
          cut: kid ? (r.cut === 'mens' ? 'boys' : 'girls') : r.cut || 'unisex',
          lastSize: r.lastSize || null,
          lastOrderDate: r.lastSize ? yearAgo : null,
          lastHeight: r.lastSize && r.lastHeight ? r.lastHeight : null,
          contact: r.contact || null,
        });
      });
      return s;
    });
  },
  addPlayer(input, { draft = false } = {}) {
    const p = {
      id: `p${Date.now()}`,
      status: draft ? 'draft' : 'waiting',
      token: makeToken(input.name),
      sentAt: new Date().toISOString(),
      ...input,
    };
    update((s) => {
      if (draft) { delete p.sentAt; s.players.push(p); return s; }
      p.messages = [{ kind: 'invite', at: p.sentAt }, { kind: 'intro', at: plusSec(p.sentAt, 2), stats: teamStats([p, ...s.players], p) }];
      s.players.unshift(p);
      return s;
    });
    return p;
  },
  markOpened(id) {
    const p = state.players.find((x) => x.id === id);
    if (p && p.status === 'waiting') patchPlayer(id, { status: 'opened' });
  },
  /** send reminder texts and pop a notification preview of the first one */
  nudge(ids) {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!list.length) return;
    const at = new Date().toISOString();
    update((s) => {
      s.players = s.players.map((p) => {
        if (!list.includes(p.id)) return p;
        const kind = nudgeKindFor(p, s.team);
        const m = { kind, at, stats: teamStats(s.players, p), daysLeft: daysLeft(s.team), answered: p.answersCount };
        return { ...p, nudgedAt: at, messages: [...(p.messages || [{ kind: 'invite', at: p.sentAt || at }]), m] };
      });
      s.notice = { playerId: list[0], more: list.length - 1, at, key: Date.now() };
      return s;
    });
  },
  /** athlete tapped a quick-reply button in the text thread */
  quickReply(id, replyId, label) {
    const at = new Date().toISOString();
    let ackText = null;
    update((s) => {
      s.players = s.players.map((p) => {
        if (p.id !== id) return p;
        ackText = ackFor(replyId, p, s.team);
        const msgs = [...(p.messages || []), { kind: 'reply', at, text: label }];
        if (ackText) msgs.push({ kind: 'ack', at: plusSec(at, 1), text: ackText });
        return { ...p, messages: msgs, nextBatch: replyId === 'batch' ? true : p.nextBatch, declined: replyId === 'notnow' ? true : p.declined };
      });
      return s;
    });
    // returning adult confirmed last year's size right from the text
    if (replyId === 'same') {
      const p = state.players.find((x) => x.id === id);
      setTimeout(() => store.submit(id, { ...defaultAnswers(p), ...(p.draft || {}) }), 700);
    }
    // "remind me later": in the demo, "later" arrives a few seconds from now
    if (replyId === 'later' || replyId === 'tomorrow') {
      setTimeout(() => {
        const p = state.players.find((x) => x.id === id);
        if (!p || p.status === 'ready' || p.status === 'review') return;
        update((s) => {
          s.players = s.players.map((x) => (x.id === id
            ? { ...x, messages: [...x.messages, { kind: 'reminder', at: new Date(Date.now() + 864e5).toISOString() }] }
            : x));
          s.notice = { playerId: id, more: 0, key: Date.now(), caption: 'The next day' };
          return s;
        });
      }, 3500);
    }
  },
  joinNextBatch(id) {
    const at = new Date().toISOString();
    update((s) => {
      s.players = s.players.map((p) => (p.id === id
        ? { ...p, nextBatch: true, messages: [...(p.messages || []), { kind: 'ack', at, text: ackFor('batch', p, s.team) }] }
        : p));
      return s;
    });
  },
  /** half-finished answers, so a "you're 60% done" text knows where they stopped */
  saveDraft(id, draft, count) {
    const p = state.players.find((x) => x.id === id);
    if (!p || p.status === 'ready' || p.status === 'review') return;
    patchPlayer(id, { draft, answersCount: count, status: 'opened' });
  },
  clearNotice: () => update((s) => { s.notice = null; return s; }),
  submit(id, answers) {
    const p = state.players.find((x) => x.id === id);
    const rec = recommend(p, answers);
    const at = new Date().toISOString();
    const already = (p.messages || []).some((m) => m.kind === 'confirm' && m.size === rec.size);
    patchPlayer(id, {
      messages: already ? p.messages : [...(p.messages || []), { kind: 'confirm', at, size: rec.size }],
      answers,
      rec,
      finalSize: rec.size,
      status: rec.needsReview ? 'review' : 'ready',
      submittedAt: at,
    });
    return rec;
  },
  /** extras from the "not sure / add more info" section */
  addExtras(id, { pitToPit, note, keepOriginal }) {
    const p = state.players.find((x) => x.id === id);
    const rec = recommend(p, p.answers, { pitToPit });
    const flagged = rec.needsReview || !!note || !!keepOriginal;
    patchPlayer(id, {
      rec,
      pitToPit: pitToPit || null,
      note: note || null,
      keepOriginal: !!keepOriginal,
      finalSize: rec.size,
      status: flagged ? 'review' : 'ready',
      flagReason: keepOriginal
        ? `Wants ${rec.statedSize} · answers point to ${rec.size}`
        : note
          ? 'Left a note'
          : rec.flagReason,
    });
  },
  coachDecide: (id, size) => patchPlayer(id, { finalSize: size, status: 'ready', coachApproved: true }),
};

export function useStore() {
  return useSyncExternalStore(store.subscribe, store.get);
}

export { flowFor };
