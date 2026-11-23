// Tiny local store: everything lives in localStorage so the prototype
// works with no backend. Coach and athlete screens read the same data,
// so a submit on one link shows up on the dashboard right away.
import { useSyncExternalStore } from 'react';
import { recommend, flowFor, questionsFor } from './sizing.js';
import { nudgeKindFor, teamStats, daysLeft, ackFor, REPLIES } from './messages.js';

const KEY = 'bsn-fitcheck-v3';
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
    scenario: 'first',
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

// ── text scenarios ─────────────────────────────────────────────
// Each one rebuilds Jordan's thread from the start up to that moment,
// so the demo always shows one continuous conversation.
export const SCENARIOS = [
  { id: 'first', label: 'First text', note: 'No obstacle. Invite, then what to expect.' },
  { id: 'ignored', label: 'Ignored it', note: 'Three days later, no answer.' },
  { id: 'halfway', label: 'Quit half-way', note: 'Answered 3 of 5, then left.' },
  { id: 'later', label: 'Remind me later', note: 'Tapped "Remind me later". This is later.' },
  { id: 'late', label: 'After deadline', note: 'Order closed before Jordan answered.' },
];

function buildScenario(id) {
  const s = seed();
  s.scenario = id;
  const p = s.players.find((x) => x.token === DEMO_TOKEN);
  const msg = (kind, at, extra = {}) => ({ kind, at, ...extra });
  const start = (daysBack) => {
    const at = id === 'first' ? minsAgo(1) : hoursAgo(daysBack * 24);
    p.sentAt = at;
    p.messages = [msg('invite', at), msg('intro', plusSec(at, 2), { stats: teamStats(s.players, p) })];
    return at;
  };
  const reply = (replyId, at) => {
    const all = Object.values(REPLIES).flat();
    p.messages.push(msg('reply', at, { text: all.find((r) => r.id === replyId).label }));
    const ack = ackFor(replyId, p, s.team);
    if (ack) p.messages.push(msg('ack', plusSec(at, 3), { text: ack }));
  };

  if (id === 'first') start(0);
  if (id === 'ignored') {
    start(3);
    p.messages.push(msg('nudge', minsAgo(1), { stats: teamStats(s.players, p), daysLeft: daysLeft(s.team) }));
  }
  if (id === 'halfway') {
    const at = start(2);
    reply('go', plusSec(at, 120));
    p.status = 'opened';
    p.answersCount = 3;
    p.draft = Object.fromEntries(questionsFor(p).slice(0, 3).map((q) => [q.id, q.options?.[1]?.value ?? q.default]));
    p.messages.push(msg('partial', minsAgo(1), { answered: 3 }));
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
  return s;
}

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...JSON.parse(raw), notice: null };
  } catch (e) { /* ignore */ }
  return buildScenario('first');
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
  reset: () => { state = buildScenario('first'); save(); },
  scenario: (id) => { state = buildScenario(id); save(); },

  addPlayer(input) {
    const p = {
      id: `p${Date.now()}`,
      status: 'waiting',
      token: makeToken(input.name),
      sentAt: new Date().toISOString(),
      ...input,
    };
    update((s) => {
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
