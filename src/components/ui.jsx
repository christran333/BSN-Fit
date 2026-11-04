import React, { useEffect, useState } from 'react';

export const Check = ({ size = 10, color = '#fff', width = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1.5 5.2l2.2 2.2L8.5 2.6" stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Back = ({ href, children }) => (
  <a href={href} className="back">
    <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
      <path d="M6 1L1.5 6 6 11" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
    {children}
  </a>
);

export const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** chip row; pressing the selected chip again keeps it selected */
export function Chips({ q, value, onChange }) {
  return (
    <div className="chips" role="group" aria-label={q.label}>
      {q.options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip${o.wide ? ' wide' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast" role="status" key={msg + Date.now()}>{msg}</div> : null;
  return [node, setMsg];
}

export function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
