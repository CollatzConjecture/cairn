/* Global keyboard shortcuts. Surfaces handle their own keys first: Base UI closes the topmost dialog, sheet,
   menu or popover on Escape and marks the event handled, the palette owns its arrows, Enter and Tab, and forms own Mod+Enter. */
import { useEffect } from 'react';
import {
  cancelComposer,
  currentRoute,
  editTask,
  get,
  go,
  newProject,
  newTask,
  openPalette,
  set,
  shortcuts,
  toggleDark,
  toggleSide,
  closeMnav,
  clearSel,
  type GoTarget,
} from '../store';
import { closePalette, openSearch } from './palette';

const G_KEYS: Record<string, GoTarget> = {
  h: { r: 'home' },
  t: { r: 'mytasks' },
  p: { r: 'projects' },
  i: { r: 'inbox' },
  c: { r: 'calendar' },
  s: { r: 'settings', sec: 'appearance' },
  n: { r: 'notifications' },
  a: { r: 'activity' },
  m: { r: 'members' },
};
const G_WINDOW_MS = 1200;
const OUTSIDE_APP = new Set(['login', 'signup', 'forgot', 'forgot-sent', 'reset', 'reset-done', 'verify', 'onboarding']);

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || !!t.closest('input, textarea, select'));

/** What Escape closes when no surface took it, in this order. */
function escape(e: KeyboardEvent) {
  const u = get().ui;
  if (u.mention) set(s => void (s.ui.mention = null));
  else if (u.editCell) set(s => void (s.ui.editCell = null));
  else if (u.composer) cancelComposer();
  else if (u.mnav) closeMnav();
  else if (u.sel.length) clearSel();
  else if (isTyping(e.target) && e.target instanceof HTMLElement) e.target.blur();
}

const inApp = () => {
  const r = currentRoute();
  return !!r && !OUTSIDE_APP.has(r.r);
};

function onKey(e: KeyboardEvent, g: { at: number }) {
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (mod && key === 'k' && !e.shiftKey && !e.altKey && inApp()) {
    e.preventDefault();
    if (get().ui.palette) closePalette();
    else openPalette();
    return;
  }
  if (mod && e.shiftKey && key === 'l') {
    e.preventDefault();
    toggleDark();
    return;
  }
  if (e.defaultPrevented) return;
  if (e.key === 'Escape') return escape(e);
  const u = get().ui;
  if (u.palette || mod || e.altKey || isTyping(e.target) || !inApp()) return;
  if (g.at && Date.now() - g.at < G_WINDOW_MS) {
    g.at = 0;
    const to = G_KEYS[key];
    if (to) {
      e.preventDefault();
      go(to);
    }
    return;
  }
  if (u.modals.length) return;
  if (key === 'g') g.at = Date.now();
  else if (e.key === '/') {
    e.preventDefault();
    openSearch();
  } else if (key === 'n') {
    e.preventDefault();
    newTask();
  } else if (key === 'p') {
    e.preventDefault();
    newProject();
  } else if (e.key === '?') {
    e.preventDefault();
    shortcuts();
  } else if (e.key === '[') {
    e.preventDefault();
    // Keyboard toggles skip the slide. data-instant turns the sidebar transition off until the new width has painted.
    const root = document.documentElement;
    root.dataset.instant = '';
    toggleSide();
    requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.instant));
  } else if (key === 'e' && u.drawer) {
    e.preventDefault();
    editTask(u.drawer);
  }
}

export function useGlobalShortcuts() {
  useEffect(() => {
    const g = { at: 0 };
    const h = (e: KeyboardEvent) => onKey(e, g);
    // Bubble phase on window, so a focused surface's own handler (and Base UI's document listeners) run first.
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}
