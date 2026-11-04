// Tiny local store: everything lives in localStorage so the prototype
// works with no backend. Coach and athlete screens read the same data,
// so a submit on one link shows up on the dashboard right away.
import { useSyncExternalStore } from 'react';
import { recommend, flowFor } from './sizing.js';

const KEY = 'bsn-fitcheck-v1';
const listeners = new Set();

const daysFromNow = (n) => new Date(Date.now() + n * 864e5).toISOString();
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
  ];
  // pre-fill a couple of finished checks so the dashboard isn't empty
  const done = {
    p5: { growth: 'little', lastFit: 'right', shoulders: 'right', reach: 'stays', height: '64-68' },
    p6: { changed: 'none', lastFit: 'right', pref: 'regular', height: '68-72', length: 'fine' },
  };
  for (const p of players) {
    if (done[p.id]) {
      p.answers = done[p.id];
      p.rec = recommend(p, p.answers);
      p.finalSize = p.rec.size;
      p.status = 'ready';
      p.submittedAt = daysFromNow(-1);
    }
  }
  players.find((p) => p.id === 'p4').answersCount = 3;
  return {
    team: { name: 'Eagles Volleyball Club', order: 'Fall uniforms', coach: 'Coach Rivera', dueDate: daysFromNow(10) },
    players,
  };
}

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return seed();
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
  reset: () => { state = seed(); save(); },

  addPlayer(input) {
    const p = {
      id: `p${Date.now()}`,
      status: 'waiting',
      token: makeToken(input.name),
      sentAt: new Date().toISOString(),
      ...input,
    };
    update((s) => { s.players.unshift(p); return s; });
    return p;
  },
  markOpened(id) {
    const p = state.players.find((x) => x.id === id);
    if (p && p.status === 'waiting') patchPlayer(id, { status: 'opened' });
  },
  nudge: (id) => patchPlayer(id, { nudgedAt: new Date().toISOString() }),
  submit(id, answers) {
    const p = state.players.find((x) => x.id === id);
    const rec = recommend(p, answers);
    patchPlayer(id, {
      answers,
      rec,
      finalSize: rec.size,
      status: rec.needsReview ? 'review' : 'ready',
      submittedAt: new Date().toISOString(),
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
