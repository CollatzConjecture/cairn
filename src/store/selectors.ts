/* Lookups and derived data: plain functions over `Data`. */
import { NO_TEAM, PCOLORS, PR, STATUSES, type Status } from '../domain/constants';
import { DAY, TODAY, diffD, parse } from '../domain/date';
import { projectId, type FileId, type MemberId, type ProjectId, type TaskId, type TeamId } from '../domain/ids';
import type { Data, Filter, Project, SortField, Task, View } from '../domain/schema';
import type { ViewKey } from './ui';

export const me = (d: Data) => d.members.find(m => m.id === d.me);
export const memberById = (d: Data, id: MemberId | null | undefined) => d.members.find(m => m.id === id);
export const projectById = (d: Data, id: ProjectId | null | undefined) => d.projects.find(p => p.id === id);
export const taskById = (d: Data, id: TaskId | null | undefined) => d.tasks.find(t => t.id === id);
/** A file with the project and task it belongs to: a project file, else a task attachment. The demo seed gives attachments ids of their
    own, so the drawer's copy of a file can have an id the project's file list lacks. */
export function fileRef(d: Data, id: FileId) {
  const f = d.files.find(x => x.id === id);
  if (f) return { file: f, project: f.project, tid: f.task ?? null };
  for (const t of d.tasks) {
    const a = t.attachments.find(x => x.id === id);
    if (a) return { file: a, project: t.project, tid: t.id };
  }
}
export const teamById = (d: Data, id: TeamId | null | undefined) => d.teams.find(t => t.id === id);
/** The team, or the "No team" placeholder. */
export const teamOrNone = (d: Data, id: TeamId | null | undefined) => teamById(d, id) ?? NO_TEAM;
export const pColor = (p: Pick<Project, 'color'> | null | undefined) => (p ? PCOLORS[p.color] : PCOLORS.slate);
export const visibleProjects = (d: Data) =>
  d.projOrder.flatMap(id => {
    const p = projectById(d, id);
    return p && !p.archived ? [p] : [];
  });
export const canSee = (d: Data, p: Project | null | undefined) => !!p && (!p.private || p.members.includes(d.me));
export const tasksOf = (d: Data, pid: ProjectId) => d.tasks.filter(t => t.project === pid && !t.archived);
export const allTasks = (d: Data) => d.tasks.filter(t => !t.archived && canSee(d, projectById(d, t.project)));
export const isOver = (t: Task) => !!t.due && t.status !== 'done' && diffD(parse(t.due), TODAY) < 0;
export const commentsOf = (d: Data, tid: TaskId) => d.comments.filter(c => c.task === tid);
export function progressOf(d: Data, pid: ProjectId) {
  const ts = tasksOf(d, pid);
  if (!ts.length) return 0;
  return Math.round((ts.filter(t => t.status === 'done').length / ts.length) * 100);
}
export function taskProg(t: Task) {
  if (t.status === 'done') return 100;
  if (t.subtasks.length) return Math.round((t.subtasks.filter(s => s.done).length / t.subtasks.length) * 100);
  return { backlog: 0, todo: 5, progress: 45, review: 80 }[t.status];
}
/** The project a view key belongs to: `p:<id>` directly, `sv:<id>` through its saved view. */
export function projectFromKey(d: Data, key: ViewKey | null | undefined): ProjectId | null {
  if (!key) return null;
  if (key.startsWith('p:')) return projectId(key.slice(2));
  if (key.startsWith('sv:')) return d.savedViews.find(v => v.id === key.slice(3))?.project ?? null;
  return null;
}
/** Tasks in one board column. */
export function colTasks(d: Data, key: ViewKey, st: Status) {
  const pid = projectFromKey(d, key);
  return (pid ? tasksOf(d, pid) : allTasks(d)).filter(t => t.status === st);
}

/* ---------- view engine ---------- */
export const defaultView = (): View => ({
  filters: [],
  sort: { f: 'manual', dir: 1 },
  group: 'status',
  q: '',
  hidden: ['start', 'created', 'deps'],
  colW: {},
  showDone: true,
});
/** The stored view, or its default (a saved view starts from its saved filters). Reading never creates the view. */
export function viewOf(views: Partial<Record<ViewKey, View>>, d: Data, key: ViewKey): View {
  const v = views[key];
  if (v) return v;
  const sv = key.startsWith('sv:') ? d.savedViews.find(x => x.id === key.slice(3)) : undefined;
  return sv ? { ...defaultView(), filters: sv.filters } : defaultView();
}
export function matchFilter(t: Task, f: Filter) {
  if (!f.v.length) return true;
  let hit: boolean;
  if (f.f === 'labels') hit = t.labels.some(l => f.v.includes(l));
  else if (f.f === 'assignee') hit = f.v.includes(t.assignee || 'none');
  else if (f.f === 'due') {
    hit = f.v.some(v => {
      if (v === 'nodate') return !t.due;
      if (!t.due) return false;
      const n = diffD(parse(t.due), TODAY);
      return v === 'overdue' ? isOver(t) : v === 'today' ? n === 0 : v === 'week' ? n >= 0 && n <= 7 : n > 7;
    });
  } else if (f.f === 'created' || f.f === 'updated') {
    const ts = f.f === 'created' ? t.created : t.updated;
    hit = f.v.some(v => Date.now() - ts <= +v * DAY);
  } else hit = f.v.includes(t[f.f]);
  return f.op === 'not' ? !hit : hit;
}
export function sortTasks(d: Data, ts: readonly Task[], s: { f: SortField; dir: 1 | -1 }) {
  const key: (t: Task) => string | number = {
    manual: (t: Task) => t.order,
    title: (t: Task) => t.title.toLowerCase(),
    due: (t: Task) => t.due || '9999',
    start: (t: Task) => t.start || '9999',
    priority: (t: Task) => -PR[t.priority].w,
    status: (t: Task) => STATUSES.findIndex(x => x.id === t.status),
    assignee: (t: Task) => memberById(d, t.assignee)?.name || 'zzz',
    created: (t: Task) => -t.created,
    updated: (t: Task) => -t.updated,
    estimate: (t: Task) => t.estimate || 'zzz',
    project: (t: Task) => projectById(d, t.project)?.name ?? '',
  }[s.f];
  return [...ts].sort((x, y) => {
    const p = key(x),
      q = key(y);
    return (p > q ? 1 : p < q ? -1 : 0) * s.dir;
  });
}
export function applyView(d: Data, ts: readonly Task[], v: View) {
  let out = ts.filter(t => v.filters.every(f => matchFilter(t, f)));
  if (v.q) {
    const q = v.q.toLowerCase();
    out = out.filter(t => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q));
  }
  return sortTasks(d, out, v.sort);
}

/* ---------- search ---------- */
export function searchAll(d: Data, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { tasks: [], projects: [], people: [], files: [], comments: [] };
  const has = (s: string | null | undefined) => (s || '').toLowerCase().includes(q);
  return {
    tasks: allTasks(d)
      .filter(t => has(t.title) || has(t.key) || has(t.desc.replace(/<[^>]+>/g, '')))
      .slice(0, 30),
    projects: visibleProjects(d).filter(p => has(p.name) || has(p.desc)),
    people: d.members.filter(m => has(m.name) || has(m.email) || has(m.title)),
    files: d.files.filter(f => has(f.name) && canSee(d, projectById(d, f.project))),
    comments: d.comments.filter(c => {
      const t = taskById(d, c.task);
      return has(c.text) && !!t && canSee(d, projectById(d, t.project));
    }),
  };
}
