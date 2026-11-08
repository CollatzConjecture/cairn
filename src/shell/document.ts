/* Effects on the document outside React's tree: preference attributes on <html>, the title, and the screen reader announcement. */
import { useEffect } from 'react';
import { PTABS } from '../domain/constants';
import { setDateFormat } from '../domain/date';
import type { Data, Prefs } from '../domain/schema';
import { effectiveDark, memberById, projectById, teamById, useRoute, useStore, type AppRoute } from '../store';
import { routeName } from './shell';

/** Applies preferences to <html> at boot and on every change, before React renders: the theme as shadcn's `.dark` class (system follows
    the OS, see main.tsx), and accent, sidebar style, density and motion as attributes the theme CSS reads. */
export function applyPrefs(p: Prefs) {
  const r = document.documentElement;
  setDateFormat(p.dateFmt);
  r.classList.toggle('dark', effectiveDark(p));
  r.dataset.accent = p.accent;
  r.dataset.side = p.side;
  r.dataset.density = p.density;
  r.dataset.motion = p.motion;
}

const AUTH_ROUTES: readonly AppRoute['r'][] = ['login', 'signup', 'forgot', 'forgot-sent', 'reset', 'reset-done', 'verify', 'onboarding'];
export function pageTitle(r: AppRoute | null, d: Data) {
  if (r && AUTH_ROUTES.includes(r.r)) return 'Cairn';
  let t = routeName(r);
  if (r?.r === 'project') {
    const p = projectById(d, r.id);
    if (p) t = `${PTABS.find(x => x[0] === r.tab)?.[1] ?? 'Saved view'} · ${p.name}`;
  }
  if (r?.r === 'member') t = memberById(d, r.id)?.name ?? t;
  if (r?.r === 'team') t = teamById(d, r.id)?.name ?? t;
  return `${t} · ${d.ws.name}`;
}

/** Keeps `document.title` current and announces page changes through `#sr-live`. */
export function useDocumentTitle() {
  const r = useRoute();
  const d = useStore(s => s.data);
  const loading = useStore(s => s.ui.loading);
  const title = pageTitle(r, d);
  useEffect(() => {
    if (document.title === title) return;
    document.title = title;
    const live = document.getElementById('sr-live');
    if (live && !loading) live.textContent = title.split(' · ').slice(0, -1).join(', ');
  }, [title, loading]);
}
