// ─────────────────────────────────────────────────────────────
// Fit Check sizing engine
//
// Two jobs:
//   1. questionsFor(player)  → the 5 questions this player's link asks
//   2. recommend(player, answers) → a size, the reasons, and whether
//      the coach should take a look
//
// Rule-based on purpose: every decision is explainable to the athlete
// and the coach. An LLM could later rewrite question wording or read
// free-text notes, but the size math stays here.
//
// IMPORTANT: every chart and offset below is a PLACEHOLDER for the
// prototype. Swap in BSN's real size charts and return data.
// ─────────────────────────────────────────────────────────────

/** Nudges every recommendation toward the bigger size. People return
 *  "too small" far more than "slightly big", so we lean up on purpose. */
export const SIZE_UP_BIAS = 0.1;

/** Normal rounding goes up at .5. We go up once a score is a quarter of
 *  the way to the next size. */
export const ROUND_UP_AT = 0.25;

export const YOUTH_LADDER = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'S', 'M', 'L'];
export const ADULT_LADDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

// PLACEHOLDER: how a brand's sizing compares with BSN's team cut
// (+ means BSN runs smaller than that brand, so we size up).
const BRAND_OFFSET = { nike: 0.1, adidas: 0.1, ua: 0, other: 0 };

// PLACEHOLDER: rough typical height (in) by age, used as the stepper default
const TYPICAL_HEIGHT = { 5: 43, 6: 46, 7: 48, 8: 50, 9: 52, 10: 54, 11: 56, 12: 59 };

// PLACEHOLDER: youth size by height (in), upper bounds
const YOUTH_BY_HEIGHT = [
  ['YXS', 46], ['YS', 50], ['YM', 54], ['YL', 58], ['YXL', 62], ['S', 99],
];

// PLACEHOLDER: flat shirt width, armpit to armpit (in)
const PIT_TO_PIT = {
  youth: { YXS: 14, YS: 15, YM: 16, YL: 17.5, YXL: 19, S: 19.5, M: 20.5, L: 22 },
  womens: { XS: 17, S: 18, M: 19.5, L: 21, XL: 22.5, '2XL': 24, '3XL': 25.5 },
  mens: { XS: 18, S: 19, M: 20.5, L: 22, XL: 24, '2XL': 26, '3XL': 28 },
};

// PLACEHOLDER: size a height band usually lands on (ladder index)
const HEIGHT_EXPECT = {
  womens: { u64: 1, '64-68': 1.5, '68-72': 2, '72+': 3 },
  mens: { u64: 1, '64-68': 2, '68-72': 3, '72+': 3.5 },
};

// ── helpers ──────────────────────────────────────────────────
export const isYouth = (p) => p.age < 13 || (p.lastSize || '').startsWith('Y');
export const ladderFor = (p) => (isYouth(p) ? YOUTH_LADDER : ADULT_LADDER);
const cutKey = (p) => (p.cut === 'mens' || p.cut === 'boys' ? 'mens' : 'womens');
const firstName = (p) => p.name.split(' ')[0];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function sizeLabel(size, cut) {
  if (!size) return '—';
  if (size.startsWith('Y')) return `Youth ${size.slice(1)}`;
  if (cut === 'womens' || cut === 'girls') return `Women's ${size}`;
  if (cut === 'mens' || cut === 'boys') return `Men's ${size}`;
  return size;
}
export const shortSize = (size) => (size?.startsWith('Y') ? `Y·${size.slice(1)}` : size);

export function monthsSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

export function formatHeight(inches) {
  return `${Math.floor(inches / 12)} ft ${inches % 12} in`;
}

// ── which link does this player get? ─────────────────────────
export function flowFor(p) {
  if (p.age < 13) return 'parent';
  if (p.lastSize && p.age >= 18) return 'returning';
  if (p.lastSize) return 'teen';
  return 'standard';
}

export const FLOW_META = {
  parent: { title: 'Parent growth check', time: '~40 sec', audience: 'parent' },
  teen: { title: 'Growth + fit check', time: '~30 sec', audience: 'athlete' },
  standard: { title: 'Fit check', time: '~30 sec', audience: 'athlete' },
  returning: { title: 'Same-as-last-year check', time: '~5 sec', audience: 'athlete' },
};

/** Bullets shown to the coach before they send a link. */
export function describeFlow(p) {
  const flow = flowFor(p);
  const months = monthsSince(p.lastOrderDate);
  const out = [];
  if (flow === 'parent') out.push(`Age ${p.age}, so the link goes to a parent and talks to them`);
  if (p.lastSize && (flow === 'parent' || flow === 'teen'))
    out.push(`Asks about growth since ${sizeLabel(p.lastSize, p.cut)}${months ? `, ${months} months ago` : ''}`);
  if (flow === 'returning') out.push(`Answers filled in from the ${sizeLabel(p.lastSize, p.cut)} order, so it's one tap`);
  if (flow === 'standard') out.push('No size on file, so it asks how tops fit instead of what size they are');
  out.push('Between sizes? Rounds up');
  return out;
}

// ── the 5 questions ──────────────────────────────────────────
const HEIGHT_BANDS = [
  { value: 'u64', label: `Under 5'4"` },
  { value: '64-68', label: `5'4"–5'8"` },
  { value: '68-72', label: `5'8"–6'` },
  { value: '72+', label: `6'+` },
];
const SHOULDERS = {
  id: 'shoulders',
  label: 'Across the shoulders, your tops feel…',
  options: [
    { value: 'snug', label: 'Snug' },
    { value: 'right', label: 'Just right' },
    { value: 'loose', label: 'Loose' },
  ],
};
const REACH = {
  id: 'reach',
  label: 'When you reach overhead, the hem…',
  options: [
    { value: 'rides', label: 'Rides up' },
    { value: 'stays', label: 'Stays put' },
  ],
};

export function questionsFor(p) {
  const flow = flowFor(p);
  const name = firstName(p);
  const last = p.lastSize ? sizeLabel(p.lastSize, p.cut) : null;

  if (flow === 'parent') {
    return [
      {
        id: 'height',
        type: 'stepper',
        label: `How tall is ${name} now?`,
        help: 'Best guess is fine.',
        default: TYPICAL_HEIGHT[p.age] ?? 52,
        min: 36,
        max: 72,
      },
      {
        id: 'growth',
        label: last ? `Since last season, ${name} has grown…` : `In the past year, ${name} has grown…`,
        options: [
          { value: 'none', label: 'Not much' },
          { value: 'little', label: 'A little' },
          { value: 'lot', label: 'A lot' },
        ],
      },
      {
        id: 'lastFit',
        label: last ? `Last year's ${last} felt…` : `Tees ${name} wears now feel…`,
        options: [
          { value: 'tight', label: 'Tight' },
          { value: 'right', label: 'Just right' },
          { value: 'roomy', label: 'Roomy' },
        ],
      },
      {
        id: 'storeSize',
        label: `Store-bought tees ${name} wears now`,
        options: [
          { value: 'YS', label: 'Y-S' },
          { value: 'YM', label: 'Y-M' },
          { value: 'YL', label: 'Y-L' },
          { value: 'YXL', label: 'Y-XL' },
          { value: 'notsure', label: 'Not sure', wide: true },
        ],
      },
      {
        id: 'pref',
        label: `${name} likes a jersey…`,
        options: [
          { value: 'fitted', label: 'Fitted' },
          { value: 'regular', label: 'Regular' },
          { value: 'room', label: 'Room to grow', wide: true },
        ],
      },
    ];
  }

  if (flow === 'returning') {
    return [
      {
        id: 'changed',
        label: 'Anything changed since then?',
        default: 'none',
        options: [
          { value: 'none', label: 'Nope' },
          { value: 'bulked', label: 'Bulked up' },
          { value: 'slimmed', label: 'Slimmed' },
          { value: 'taller', label: 'Taller' },
        ],
      },
      {
        id: 'lastFit',
        label: `Last year's ${last} fit`,
        default: 'right',
        compact: true,
        options: [
          { value: 'tight', label: 'Tight' },
          { value: 'right', label: 'Just right' },
          { value: 'roomy', label: 'Roomy' },
        ],
      },
      {
        id: 'pref',
        label: 'You like it',
        default: 'regular',
        compact: true,
        options: [
          { value: 'fitted', label: 'Fitted' },
          { value: 'regular', label: 'Regular' },
          { value: 'room', label: 'Relaxed' },
        ],
      },
      { id: 'height', label: 'Height', default: p.heightBand || '68-72', compact: true, options: HEIGHT_BANDS },
      {
        id: 'length',
        label: 'Shirts are usually',
        default: 'fine',
        compact: true,
        options: [
          { value: 'short', label: 'Too short' },
          { value: 'fine', label: 'Long enough' },
        ],
      },
    ];
  }

  if (flow === 'teen') {
    return [
      {
        id: 'growth',
        label: `Since your ${last} last season, you've grown…`,
        options: [
          { value: 'none', label: 'Not much' },
          { value: 'little', label: 'A little' },
          { value: 'lot', label: 'A lot' },
        ],
      },
      {
        id: 'lastFit',
        label: `That ${last} felt…`,
        options: [
          { value: 'tight', label: 'Tight' },
          { value: 'right', label: 'Just right' },
          { value: 'roomy', label: 'Roomy' },
        ],
      },
      SHOULDERS,
      REACH,
      { id: 'height', label: 'Height', options: HEIGHT_BANDS },
    ];
  }

  // standard: no size on file, so ask how clothes fit, not just "what size are you"
  return [
    {
      id: 'usualSize',
      label: 'Your usual size in athletic tops',
      options: ['XS', 'S', 'M', 'L', 'XL'].map((s) => ({ value: s, label: s })),
    },
    {
      id: 'brand',
      label: 'In that size, which brand?',
      options: [
        { value: 'nike', label: 'Nike' },
        { value: 'ua', label: 'Under Armour', wide: true },
        { value: 'adidas', label: 'Adidas' },
        { value: 'other', label: 'Other' },
      ],
    },
    SHOULDERS,
    REACH,
    { id: 'height', label: 'Height', options: HEIGHT_BANDS },
  ];
}

export function defaultAnswers(p) {
  const out = {};
  for (const q of questionsFor(p)) if (q.default !== undefined) out[q.id] = q.default;
  return out;
}

// ── the recommendation ───────────────────────────────────────
export function recommend(p, a = {}, extras = {}) {
  const ladder = ladderFor(p);
  const flow = flowFor(p);
  const reasons = [];
  const idxOf = (s) => ladder.indexOf(s);

  // starting point
  const statedSize = p.lastSize || a.usualSize || null;
  let base = statedSize && idxOf(statedSize) >= 0 ? idxOf(statedSize) : -1;
  if (base < 0 && a.storeSize && a.storeSize !== 'notsure') base = idxOf(a.storeSize);
  if (base < 0 && a.height && flow === 'parent') base = youthIndexForHeight(a.height, ladder);
  if (base < 0) base = Math.floor(ladder.length / 2) - 1;

  let delta = SIZE_UP_BIAS;

  // growth (kids + teens)
  if (a.growth === 'lot') { delta += 1; reasons.push('Grown a lot since last season'); }
  else if (a.growth === 'little') { delta += 0.5; reasons.push('Grown a little since last season'); }
  else if (!a.growth && p.age < 16 && (monthsSince(p.lastOrderDate) ?? 0) >= 9) {
    delta += 0.4;
    reasons.push('Kids this age usually grow about 2 in a year');
  }

  // how last year's size actually fit (asymmetric on purpose)
  if (a.lastFit === 'tight') { delta += 1; reasons.push('Last size felt tight'); }
  if (a.lastFit === 'roomy') { delta -= 0.5; reasons.push('Last size was roomy, so we only step down a little'); }

  if (a.shoulders === 'snug') { delta += 0.35; reasons.push('Snug across the shoulders'); }
  if (a.shoulders === 'loose') delta -= 0.25;
  if (a.reach === 'rides') { delta += 0.35; reasons.push('Hem rides up when reaching'); }

  if (a.brand && BRAND_OFFSET[a.brand]) {
    delta += BRAND_OFFSET[a.brand];
    reasons.push(`BSN's team cut runs closer than ${a.brand === 'nike' ? 'Nike' : 'Adidas'}`);
  }

  if (a.pref === 'fitted') delta -= 0.25;
  if (a.pref === 'room') { delta += 0.5; reasons.push('Wants room to grow'); }

  if (a.changed === 'bulked') { delta += 1; reasons.push('Bulked up since last order'); }
  if (a.changed === 'taller') { delta += 0.5; reasons.push('Taller since last order'); }
  if (a.changed === 'slimmed') delta -= 0.5;
  if (a.length === 'short') { delta += 0.5; reasons.push('Shirts usually run short on you'); }

  // height as a sanity check (adults/teens)
  if (a.height && typeof a.height === 'string' && !isYouth(p)) {
    const expect = HEIGHT_EXPECT[cutKey(p)][a.height];
    if (expect !== undefined && expect > base + delta + 0.5) {
      delta += 0.5;
      reasons.push('Height usually lands a size up');
    }
  }

  let raw = base + delta;

  // kids: height and store-bought size can only pull the size UP
  if (flow === 'parent') {
    if (a.height) {
      const byH = youthIndexForHeight(a.height, ladder);
      if (byH > raw) { raw = byH + SIZE_UP_BIAS; reasons.push(`At ${formatHeight(a.height)}, ${sizeLabel(ladder[byH], p.cut)} is the better match`); }
    }
    if (a.storeSize && a.storeSize !== 'notsure' && idxOf(a.storeSize) > raw) {
      raw = idxOf(a.storeSize) + SIZE_UP_BIAS;
      reasons.push('Already wearing a bigger size in stores');
    }
  }

  let index = clamp(Math.floor(raw + (1 - ROUND_UP_AT)), 0, ladder.length - 1);

  // optional shirt measurement: can only push up, never down
  if (extras.pitToPit) {
    const chart = PIT_TO_PIT[isYouth(p) ? 'youth' : cutKey(p)];
    const m = Number(extras.pitToPit);
    const fit = ladder.findIndex((s) => chart[s] !== undefined && chart[s] >= m);
    if (fit > index) { index = fit; reasons.push(`A ${m}" shirt matches ${sizeLabel(ladder[fit], p.cut)}`); }
  }

  const size = ladder[index];
  const statedIdx = statedSize ? idxOf(statedSize) : -1;
  const sizedUp = statedIdx >= 0 && index > statedIdx;

  // flag adults/teens whose answers disagree with the size they named
  let needsReview = false;
  let flagReason = null;
  // (a teen who grew is expected to size up, so that's not a flag)
  const disagrees = flow === 'standard' || (flow === 'teen' && a.growth === 'none');
  if (disagrees && statedIdx >= 0 && index - statedIdx >= 1) {
    needsReview = true;
    flagReason = `Picked ${statedSize} · answers point to ${size}`;
  }

  return { size, index, statedSize, sizedUp, reasons, needsReview, flagReason };
}

export function sizeForMeasurement(p, inches) {
  const ladder = ladderFor(p);
  const chart = PIT_TO_PIT[isYouth(p) ? 'youth' : cutKey(p)];
  const i = ladder.findIndex((s) => chart[s] !== undefined && chart[s] >= Number(inches));
  return i >= 0 ? ladder[i] : ladder[ladder.length - 1];
}

function youthIndexForHeight(h, ladder) {
  const hit = YOUTH_BY_HEIGHT.find(([, max]) => h <= max) || YOUTH_BY_HEIGHT.at(-1);
  return ladder.indexOf(hit[0]);
}
