import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Agentation: click-to-annotate toolbar for design feedback to an AI agent.
// Always on in `npm run dev`. On the deployed site it stays hidden unless you
// open it with ?annotate (remembered in this browser; ?annotate=off hides it).
const Agentation = lazy(() => import('agentation').then((m) => ({ default: m.Agentation })));

function annotateEnabled() {
  if (import.meta.env.DEV || import.meta.env.VITE_ANNOTATE === '1') return true;
  try {
    const param = new URLSearchParams(window.location.search).get('annotate');
    if (param !== null) {
      const on = param !== 'off' && param !== '0';
      localStorage.setItem('bsn-annotate', on ? '1' : '0');
      return on;
    }
    return localStorage.getItem('bsn-annotate') === '1';
  } catch {
    return false;
  }
}

createRoot(document.getElementById('root')).render(
  <>
    <App />
    {annotateEnabled() && (
      <Suspense fallback={null}>
        <Agentation />
      </Suspense>
    )}
  </>
);
