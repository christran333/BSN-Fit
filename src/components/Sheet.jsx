import React, { useEffect } from 'react';

/** iOS-style bottom sheet, drawn inside the phone screen */
export default function Sheet({ open, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const key = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button className="sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className={`sheet ${className}`}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <b>{title}</b>
          <button className="sheet-x" aria-label="Close" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
