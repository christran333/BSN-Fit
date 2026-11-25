// Turning a coach's roster (spreadsheet or photo) into players.
//
// Spreadsheets are parsed for real: .xlsx/.xls via read-excel-file, .csv by hand.
// Columns are matched by what coaches actually call them ("Jersey #", "Parent cell",
// "Grade", "Shirt size"…), and values are cleaned up (5'6" → 66 in, "Womens M" → M).
//
// The photo scan is SIMULATED in this prototype: it shows a scan and returns the
// sample roster below (the one in public/samples/roster-photo.jpg). A real version
// would send the photo to an OCR / vision model and feed its rows through mapRoster().
import { YOUTH_LADDER, ADULT_LADDER } from './sizing.js';

// handoff from the roster screen's file picker to the import screen
let pending = null;
export const setPending = (p) => { pending = p; };
export const takePending = () => pending;

// ── reading files ────────────────────────────────────────────
export async function readRows(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') return parseCsv(await file.text());
  const { readSheet } = await import('read-excel-file/browser');
  return readSheet(file);
}

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim()));
}

// ── matching columns ─────────────────────────────────────────
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9#]/g, '');
// checked in this order, so "Jersey size" is a size, not a number
const FIELDS = [
  ['size', ['size', 'tshirt', 'shirt', 'uniform']],
  ['height', ['height', 'ht']],
  ['dob', ['dob', 'birth', 'born']],
  ['age', ['age']],
  ['grade', ['grade', 'gr', 'year', 'class', 'yr']],
  ['contact', ['phone', 'cell', 'mobile', 'contact', 'email', 'text']],
  ['cut', ['gender', 'sex', 'cut']],
  ['first', ['firstname', 'first']],
  ['last', ['lastname', 'last', 'surname']],
  ['number', ['#', 'number', 'num', 'no', 'jersey']],
  ['name', ['name', 'player', 'athlete', 'student']],
];
function fieldFor(header) {
  const h = norm(header);
  if (!h) return null;
  for (const [field, words] of FIELDS) {
    if (words.some((w) => (w.length <= 3 ? h === w || h === `${w}#` || h.startsWith(w + '#') : h.includes(w)))) return field;
  }
  return null;
}

export const FIELD_LABELS = { name: 'Name', number: 'Number', age: 'Age', size: 'Last size', height: 'Height', contact: 'Phone', cut: 'Cut' };

// ── cleaning values ──────────────────────────────────────────
const LETTERS = [['3XL', /\b(3XL|XXXL)\b/], ['2XL', /\b(2XL|XXL)\b/], ['XL', /\b(XL|XLARGE|EXTRALARGE)\b/], ['XS', /\b(XS|XSMALL|EXTRASMALL)\b/],
  ['S', /\b(S|SM|SMALL)\b/], ['M', /\b(M|MD|MED|MEDIUM)\b/], ['L', /\b(L|LG|LARGE)\b/]];

export function cleanSize(raw, age) {
  if (raw == null || raw === '') return { size: null };
  const s = String(raw).toUpperCase().replace(/[’']/g, '').replace(/-/g, ' ');
  const cut = /WOMEN|LADIES|GIRL/.test(s) ? 'womens' : /\bMEN|\bMENS|BOY/.test(s) ? 'mens' : null;
  const youth = /YOUTH|\bY(XS|S|M|L|XL)\b|\bY\s/.test(s) || (age && age < 13);
  const bare = s.replace(/YOUTH|WOMENS|WOMEN|MENS|MEN|ADULT|UNISEX|LADIES|GIRLS|BOYS/g, ' ').replace(/\bY(?=XS|S|M|L|XL\b)/, ' ');
  const hit = LETTERS.find(([, re]) => re.test(bare));
  if (!hit) return { size: null, cut };
  const size = youth ? `Y${hit[0]}` : hit[0];
  const ok = youth ? YOUTH_LADDER.includes(size) : ADULT_LADDER.includes(size);
  return { size: ok ? size : null, cut };
}

export function cleanHeight(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    if (raw >= 36 && raw <= 90) return Math.round(raw);
    if (raw >= 4 && raw < 8) return Math.floor(raw) * 12 + Math.round((raw % 1) * 10); // 5.6 means 5'6"
    if (raw >= 120 && raw <= 220) return Math.round(raw / 2.54);
    return null;
  }
  const s = String(raw).trim();
  let m = s.match(/(\d)\s*(?:'|’|ft|-|\s)\s*(\d{1,2})/i);
  if (m) return Number(m[1]) * 12 + Number(m[2]);
  m = s.match(/^(\d)\s*(?:'|’|ft)$/i);
  if (m) return Number(m[1]) * 12;
  m = s.match(/(\d{3})\s*cm/i);
  if (m) return Math.round(Number(m[1]) / 2.54);
  m = s.match(/^(\d{2})(?:\s*(?:in|"|”))?$/i);
  if (m && Number(m[1]) >= 36 && Number(m[1]) <= 90) return Number(m[1]);
  return null;
}

const GRADES = { fr: 9, freshman: 9, so: 10, soph: 10, sophomore: 10, jr: 11, junior: 11, sr: 12, senior: 12 };
export function cleanAge({ age, dob, grade }) {
  if (age != null && age !== '') {
    const n = parseInt(age, 10);
    if (n > 3 && n < 80) return n;
  }
  if (dob) {
    const d = dob instanceof Date ? dob : new Date(dob);
    if (!isNaN(d)) {
      const now = new Date();
      let a = now.getFullYear() - d.getFullYear();
      if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
      if (a > 3 && a < 80) return a;
    }
  }
  if (grade != null && grade !== '') {
    const g = String(grade).toLowerCase().trim();
    const n = GRADES[g.replace(/[^a-z]/g, '')] ?? parseInt(g, 10);
    if (n >= 1 && n <= 12) return n + 5;
  }
  return null;
}

export function cleanContact(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (s.includes('@')) return s;
  const d = s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : s || null;
}

const cleanName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
  .replace(/^([^,]+),\s*(.+)$/, '$2 $1') // "Lee, Jordan" → "Jordan Lee"
  .replace(/\b([a-z])/g, (c) => c.toUpperCase());

// the team's default cut, from its name
export function teamCut(team) {
  const t = `${team?.program || ''}`.toLowerCase();
  return /girl|women/.test(t) ? 'womens' : /boy|men/.test(t) ? 'mens' : 'unisex';
}

/** rows (2D array) → { players, matched: [field], headerRow } */
export function mapRoster(rows, team) {
  // the header is the first row (of the first five) that names a player column and one more
  let headerRow = -1, cols = {};
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const c = {};
    rows[r].forEach((h, i) => { const f = fieldFor(h); if (f && c[f] == null) c[f] = i; });
    if ((c.name != null || c.first != null) && Object.keys(c).length >= 2) { headerRow = r; cols = c; break; }
  }
  if (headerRow < 0) return { players: [], matched: [], headerRow };

  const get = (row, f) => (cols[f] != null ? row[cols[f]] : null);
  const fallbackCut = teamCut(team);
  const players = rows.slice(headerRow + 1).map((row, i) => {
    const name = cleanName(cols.name != null ? get(row, 'name') : `${get(row, 'first') ?? ''} ${get(row, 'last') ?? ''}`);
    if (!name) return null;
    const age = cleanAge({ age: get(row, 'age'), dob: get(row, 'dob'), grade: get(row, 'grade') });
    const { size, cut: sizeCut } = cleanSize(get(row, 'size'), age);
    const g = norm(get(row, 'cut'));
    const cut = /^(f|female|w|women|womens|girl|girls)$/.test(g) ? 'womens' : /^(m|male|men|mens|boy|boys)$/.test(g) ? 'mens' : sizeCut || fallbackCut;
    const num = parseInt(get(row, 'number'), 10);
    return {
      key: `r${i}`,
      name,
      number: Number.isFinite(num) ? num : null,
      age,
      cut,
      lastSize: size,
      lastHeight: size ? cleanHeight(get(row, 'height')) : null,
      contact: cleanContact(get(row, 'contact')),
    };
  }).filter(Boolean);

  const matched = ['name', 'number', 'age', 'size', 'height', 'contact', 'cut']
    .filter((f) => cols[f] != null || (f === 'name' && cols.first != null) || (f === 'age' && (cols.dob != null || cols.grade != null)));
  return { players, matched, headerRow };
}

// what the simulated scan "reads" off public/samples/roster-photo.jpg
export const SCANNED_ROSTER = [
  { key: 's0', name: 'Avery Mitchell', number: 2, age: 17, lastSize: 'M' },
  { key: 's1', name: 'Brooke Sanders', number: 3, age: 16, lastSize: 'S' },
  { key: 's2', name: 'Camila Reyes', number: 5, age: 15, lastSize: 'S' },
  { key: 's3', name: 'Danielle Okafor', number: 10, age: 17, lastSize: 'L' },
  { key: 's4', name: 'Emma Lindqvist', number: 11, age: 16, lastSize: 'M', unsure: 'name' },
  { key: 's5', name: 'Grace Whitaker', number: 12, age: 14, lastSize: 'XS' },
  { key: 's6', name: 'Harper Nguyen', number: 14, age: 16, lastSize: 'M' },
  { key: 's7', name: 'Isabella Cruz', number: 20, age: 15, lastSize: 'S' },
  { key: 's8', name: 'Jasmine Porter', number: null, age: 17, lastSize: 'L', unsure: 'number' },
  { key: 's9', name: 'Kennedy Shaw', number: 23, age: 14, lastSize: 'S' },
  { key: 's10', name: 'Lauren Becker', number: 24, age: 16, lastSize: 'M' },
  { key: 's11', name: 'Madison Ortiz', number: 33, age: 15, lastSize: 'XL' },
];
