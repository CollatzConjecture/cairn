import './index.css';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from './router';
import { applyPrefs } from './shell/document';
import * as store from './store';
import { bindRouter, get, useStore } from './store';

applyPrefs(get().prefs);
useStore.subscribe((s, prev) => {
  if (s.prefs !== prev.prefs) applyPrefs(s.prefs);
});
// The system theme follows the OS while the app is open.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyPrefs(get().prefs));
bindRouter(router);

const app = document.getElementById('app');
if (app)
  createRoot(app).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );

declare global {
  interface Window {
    __cairn?: { store: typeof store; router: typeof router };
  }
}
// Dev-only handle for debugging and screenshot tooling; stripped from production builds.
if (import.meta.env.DEV) window.__cairn = { store, router };
