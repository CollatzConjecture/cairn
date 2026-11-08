/* App routes (`{ r: 'project', id, tab }`) mapped onto URLs. The router owns the location; this module owns the mapping and the
   side effects of every navigation. */
import { useRouterState } from '@tanstack/react-router';
import type { ProjectTabKey } from '../domain/constants';
import { memberId, projectId, teamId, type MemberId, type ProjectId, type TeamId } from '../domain/ids';
import type { router as appRouter } from '../router';
import { get, set } from './store';

const PAGE_ROUTES = [
  'home',
  'inbox',
  'mytasks',
  'favorites',
  'notifications',
  'search',
  'overview',
  'projects',
  'tasks',
  'calendar',
  'timeline',
  'members',
  'teams',
  'activity',
  'system',
  'states',
  'archive',
] as const;
const AUTH_ROUTES = ['login', 'signup', 'forgot', 'forgot-sent', 'reset', 'reset-done', 'verify'] as const;
export type PageRoute = (typeof PAGE_ROUTES)[number];
export type AuthRoute = (typeof AUTH_ROUTES)[number];
/** A project tab, or `v:<savedViewId>` for a saved view. */
export type ProjectTab = ProjectTabKey | `v:${string}`;
export type AppRoute =
  | { r: PageRoute }
  | { r: 'project'; id: ProjectId; tab: ProjectTab }
  | { r: 'member'; id: MemberId }
  | { r: 'team'; id: TeamId }
  | { r: 'settings'; sec: string }
  | { r: AuthRoute }
  | { r: 'onboarding'; step: number };
/** What `go()` accepts: a project without a tab opens `prefs.defaultTab` (Board by default). */
export type GoTarget = Exclude<AppRoute, { r: 'project' }> | { r: 'project'; id: ProjectId; tab?: ProjectTab };

const PAGE_PATHS: Record<PageRoute, string> = {
  home: '/home',
  inbox: '/inbox',
  mytasks: '/my-tasks',
  favorites: '/favorites',
  notifications: '/notifications',
  search: '/search',
  overview: '/overview',
  projects: '/projects',
  tasks: '/tasks',
  calendar: '/calendar',
  timeline: '/timeline',
  members: '/members',
  teams: '/teams',
  activity: '/activity',
  system: '/design-system',
  states: '/states',
  archive: '/archive',
};
const AUTH_PATHS: Record<AuthRoute, string> = {
  login: '/login',
  signup: '/signup',
  forgot: '/forgot',
  'forgot-sent': '/forgot/sent',
  reset: '/reset',
  'reset-done': '/reset/done',
  verify: '/verify',
};
const PROJECT_TABS: readonly string[] = ['overview', 'board', 'list', 'table', 'calendar', 'timeline', 'files', 'activity'] satisfies ProjectTabKey[];
export const isProjectTab = (s: string): s is ProjectTab => PROJECT_TABS.includes(s) || /^v:.+/.test(s);

const enc = encodeURIComponent;
export function hrefOf(r: AppRoute): string {
  switch (r.r) {
    case 'project':
      return `/projects/${enc(r.id)}/${enc(r.tab)}`;
    case 'member':
      return `/members/${enc(r.id)}`;
    case 'team':
      return `/teams/${enc(r.id)}`;
    case 'settings':
      return `/settings/${enc(r.sec)}`;
    case 'onboarding':
      return `/onboarding/${r.step}`;
    case 'login':
    case 'signup':
    case 'forgot':
    case 'forgot-sent':
    case 'reset':
    case 'reset-done':
    case 'verify':
      return AUTH_PATHS[r.r];
    default:
      return PAGE_PATHS[r.r];
  }
}

const byPath = new Map<string, AppRoute>([
  ...PAGE_ROUTES.map((r): [string, AppRoute] => [PAGE_PATHS[r], { r }]),
  ...AUTH_ROUTES.map((r): [string, AppRoute] => [AUTH_PATHS[r], { r }]),
]);
/** The route a pathname shows, or null for a URL the app does not have (the 404 page). Redirect-only paths (`/`, `/settings`) are null. */
export function routeOf(pathname: string): AppRoute | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const hit = byPath.get(path);
  if (hit) return hit;
  const seg = path.split('/').slice(1).map(decodeURIComponent);
  const [a, b, c] = seg;
  if (a === 'projects' && b && c && seg.length === 3 && isProjectTab(c)) return { r: 'project', id: projectId(b), tab: c };
  if (a === 'members' && b && seg.length === 2) return { r: 'member', id: memberId(b) };
  if (a === 'teams' && b && seg.length === 2) return { r: 'team', id: teamId(b) };
  if (a === 'settings' && b && seg.length === 2) return { r: 'settings', sec: b };
  if (a === 'onboarding' && b && seg.length === 2 && /^[0-5]$/.test(b)) return { r: 'onboarding', step: +b };
  return null;
}

type AppRouter = typeof appRouter;
let router: AppRouter | null = null;

export const currentRoute = () => (router ? routeOf(router.state.location.pathname) : null);
/** The project the current page belongs to. */
export function curProjectId(): ProjectId | null {
  const r = currentRoute();
  return r?.r === 'project' ? r.id : null;
}

export function go(to: GoTarget) {
  const r: AppRoute = to.r === 'project' ? { ...to, tab: to.tab ?? get().prefs.defaultTab ?? 'board' } : to;
  void router?.navigate({ href: hrefOf(r) });
}
/** The previous page in this session, else Home. */
export function back() {
  if (router?.history.canGoBack()) router.history.back();
  else go({ r: 'home' });
}

/** Wires the router to the store: the side effects of `go()` run on every navigation, including browser back and forward. */
export function bindRouter(r: AppRouter) {
  router = r;
  r.subscribe('onBeforeNavigate', e => {
    set(s => {
      const u = s.ui;
      u.mnav = false;
      u.sel = [];
      u.palette = null;
      u.composer = null;
      u.editCell = null;
      u.loading = false;
      if (u.drawer && innerWidth < 900) u.drawer = null;
      if (e.pathChanged) u.fx = {};
    });
  });
  r.subscribe('onRendered', e => {
    if (!e.pathChanged || !e.fromLocation) return;
    const c = document.querySelector('.content');
    if (c) c.scrollTop = 0;
  });
}

/** The current route, re-rendering on navigation. Null on the 404 page. */
export const useRoute = () => routeOf(useRouterState({ select: s => s.location.pathname }));
