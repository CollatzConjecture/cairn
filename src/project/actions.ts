/* Handlers of the project views (board, list, table, calendar, timeline, files) as typed store operations. */
import { PR, PSTAT, ST, fileType, type Priority, type ProjectStatus, type Status } from '../domain/constants';
import { TODAY, addD, diffD, fmtDate, iso, parse } from '../domain/date';
import { activityId, fileId, projectId, uid, type FileId, type ProjectId, type TaskId, type ViewId } from '../domain/ids';
import type { Data, View } from '../domain/schema';
import {
  applyPatch,
  colTasks,
  confirm,
  currentRoute,
  get,
  go,
  mutate,
  openModal,
  projectById,
  projectFromKey,
  prompt,
  restore,
  set,
  snapshot,
  startComposer,
  taskById,
  toast,
  updateTask,
  updateView,
  viewOf,
  type TaskPatch,
  type ViewKey,
} from '../store';

export const isStatus = (s: string): s is Status => Object.hasOwn(ST, s);
const isPriority = (s: string): s is Priority => Object.hasOwn(PR, s);
const VIEW_KEY = /^(tasks|mytasks|my|cal|tl|p:.+|sv:.+)$/;
export const isViewKey = (s: string | undefined): s is ViewKey => !!s && VIEW_KEY.test(s);

/* ---------- project header ---------- */
export function setProjectStatus(id: ProjectId, v: ProjectStatus) {
  const p = projectById(get().data, id);
  if (!p || p.status === v) return;
  if (
    mutate(s => {
      const x = projectById(s.data, id);
      if (!x) return;
      x.status = v;
      s.data.activity.unshift({
        id: activityId(uid('a')),
        by: s.data.me,
        verb: 'changed status of project',
        task: null,
        project: id,
        at: Date.now(),
        extra: 'to ' + PSTAT[v].name,
      });
    })
  )
    toast(`${p.name} marked ${PSTAT[v].name}`);
}
/** Overview status counts: the project's list, filtered to one status. */
export function goFilteredList(pid: ProjectId, st: Status) {
  updateView(`p:${pid}`, v => {
    v.filters = [{ f: 'status', op: 'is', v: [st] }];
    v.group = 'status';
  });
  go({ r: 'project', id: pid, tab: 'list' });
}

/* ---------- saved views ---------- */
export function saveView(pid: ProjectId) {
  const { views, data } = get();
  openModal({ type: 'saveView', pid, nf: viewOf(views, data, `p:${pid}`).filters.length });
}
export async function renameView(id: ViewId) {
  const v = get().data.savedViews.find(x => x.id === id);
  if (!v) return;
  const name = (await prompt({ title: 'Rename view', label: 'View name', value: v.name }))?.trim();
  if (name)
    mutate(s => {
      const x = s.data.savedViews.find(y => y.id === id);
      if (x) x.name = name;
    });
}
export function delView(id: ViewId) {
  const v = get().data.savedViews.find(x => x.id === id);
  if (!v) return;
  if (
    !mutate(s => {
      s.data.savedViews = s.data.savedViews.filter(x => x.id !== id);
    })
  )
    return;
  const r = currentRoute();
  if (r?.r === 'project' && r.tab === `v:${id}`) go({ r: 'project', id: v.project, tab: 'list' });
  toast(`Deleted view “${v.name}”`);
}

/* ---------- board ---------- */
/** A board card drop: rank the card before `before` among every task with status `col` (at the end when null), moving it there. */
export function placeCard(id: TaskId, col: Status, before: TaskId | null) {
  const d = get().data;
  const t = taskById(d, id);
  if (!t) return;
  const rest = d.tasks.filter(x => x.status === col && x.id !== id && !x.archived).sort((a, b) => a.order - b.order);
  const i = before ? rest.findIndex(x => x.id === before) : -1;
  const next = rest[i],
    prev = rest[i - 1],
    last = rest.at(-1);
  const order = next ? (prev ? (prev.order + next.order) / 2 : next.order - 1) : last ? last.order + 1 : t.order;
  const moved = t.status !== col;
  if (!moved && order === t.order) return;
  mutate(s => {
    const x = taskById(s.data, id);
    if (!x) return;
    s.ui.fx.moved = id;
    x.order = order;
    if (moved) applyPatch(s, x, { status: col });
  });
  if (moved) toast(`Moved “${t.title}” to ${ST[col].name}`, { ms: 2200 });
}
const colKey = (key: ViewKey, st: Status) => `${key}:${st}`;
export function collapseCol(key: ViewKey, st: Status) {
  set(s => {
    s.ui.collapsedCols[colKey(key, st)] = true;
  });
}
export function expandCol(key: ViewKey, st: Status) {
  set(s => {
    delete s.ui.collapsedCols[colKey(key, st)];
  });
}
export function addToCol(key: ViewKey, st: Status) {
  const pid = projectFromKey(get().data, key);
  startComposer(key, st, { status: st, ...(pid ? { project: pid } : {}) });
}
export function colDoneAll(key: ViewKey, st: Status) {
  const ids = colTasks(get().data, key, st).map(t => t.id);
  if (!ids.length) return;
  const snap = snapshot();
  if (
    mutate(s =>
      ids.forEach(id => {
        const t = taskById(s.data, id);
        if (t) applyPatch(s, t, { status: 'done' });
      }),
    )
  )
    toast(`Marked ${ids.length} tasks as done`, { action: 'Undo', onAction: () => restore(snap) });
}
export function colArchive(key: ViewKey) {
  const ids = colTasks(get().data, key, 'done').map(t => t.id);
  if (!ids.length) return;
  const snap = snapshot();
  if (
    mutate(s =>
      ids.forEach(id => {
        const t = taskById(s.data, id);
        if (!t) return;
        t.archived = true;
        t.archivedAt = Date.now();
      }),
    )
  )
    toast(`Archived ${ids.length} completed tasks`, { action: 'Undo', onAction: () => restore(snap) });
}
export function colSortPrio(key: ViewKey, st: Status) {
  const ts = colTasks(get().data, key, st).sort((a, b) => PR[b.priority].w - PR[a.priority].w);
  if (!ts.length) return;
  const base = Math.min(...ts.map(t => t.order));
  const rank = new Map(ts.map((t, i) => [t.id, base + i * 0.001]));
  mutate(s =>
    s.data.tasks.forEach(t => {
      const o = rank.get(t.id);
      if (o !== undefined) t.order = o;
    }),
  );
}

/* ---------- list rows ---------- */
/** Where a list row lands: next to `target` (null: just into `group`), in the list whose view is `viewKey`. */
export type RowDrop = { target: TaskId | null; pos: 'before' | 'after'; group?: string; viewKey?: ViewKey };
/** The fields a list group sets on a row dropped into it. */
function groupPatch(d: Data, v: View, g: string): TaskPatch {
  if (v.group === 'status' && isStatus(g)) return { status: g };
  if (v.group === 'priority' && isPriority(g)) return { priority: g };
  if (v.group === 'assignee') return { assignee: g === 'none' ? null : (d.members.find(m => m.id === g)?.id ?? null) };
  if (v.group === 'project' && projectById(d, projectId(g))) return { project: projectId(g) };
  return {};
}
/** A list row drop: rank next to the target, take on the target group's field, and switch the view to manual order. */
export function placeRow(id: TaskId, drop: RowDrop) {
  const { data, views } = get();
  const t = taskById(data, id);
  if (!t) return;
  const tg = drop.target === id ? undefined : taskById(data, drop.target);
  const key = drop.viewKey ?? null;
  const v = key ? viewOf(views, data, key) : null;
  let order = t.order;
  if (tg) {
    const rest = data.tasks.filter(x => !x.archived && x.id !== id).sort((a, b) => a.order - b.order);
    const i = rest.findIndex(x => x.id === tg.id);
    const nb = rest[drop.pos === 'before' ? i - 1 : i + 1];
    order = nb ? (tg.order + nb.order) / 2 : tg.order + (drop.pos === 'before' ? -1 : 1);
  }
  const patch = v && drop.group ? groupPatch(data, v, drop.group) : {};
  if (order === t.order && !Object.keys(patch).length) return;
  const switched = !!key && !!v && v.sort.f !== 'manual';
  if (
    !mutate(s => {
      const x = taskById(s.data, id);
      if (!x) return;
      x.order = order;
      applyPatch(s, x, patch);
    })
  )
    return;
  if (key && switched) {
    updateView(key, x => {
      x.sort = { f: 'manual', dir: 1 };
    });
    toast('Sorted manually to keep your order', { kind: 'info', ms: 2200 });
  }
}

/* ---------- sidebar ---------- */
export function moveProjectBefore(id: ProjectId, before: ProjectId) {
  if (id === before) return;
  set(s => {
    const o = s.data.projOrder.filter(x => x !== id);
    const i = o.indexOf(before);
    if (i < 0) return;
    o.splice(i, 0, id);
    s.data.projOrder = o;
  });
}

/* ---------- calendar and timeline ---------- */
export function calNav(dir: -1 | 0 | 1) {
  set(s => {
    const cur = parse(s.ui.calDate);
    s.ui.calDate = dir === 0 ? iso(TODAY) : s.ui.calMode === 'month' ? iso(new Date(cur.getFullYear(), cur.getMonth() + dir, 1)) : iso(addD(cur, dir * 7));
  });
}
/** Calendar drop: a new due date, keeping the task's length when it has a start. */
export function reschedule(id: TaskId, day: string) {
  const t = taskById(get().data, id);
  if (!t || t.due === day) return;
  const len = t.start && t.due ? diffD(parse(t.due), parse(t.start)) : null;
  set(s => {
    s.ui.fx.moved = id;
  });
  updateTask(id, { due: day, ...(len != null ? { start: iso(addD(parse(day), -len)) } : {}) });
  toast(`Rescheduled “${t.title}” to ${fmtDate(day)}`, { ms: 2200 });
}
/** Which part of a timeline bar a drag moves: the whole bar, or one end. */
export type BarEdge = 'move' | 'start' | 'end';
/** Timeline drag by whole days. Resizing never lets the start pass the due date. */
export function shiftTask(id: TaskId, edge: BarEdge, days: number) {
  const t = taskById(get().data, id);
  if (!t?.due || !days) return;
  const due = parse(t.due);
  const start = parse(t.start && t.start <= t.due ? t.start : t.due);
  if (edge === 'move') {
    updateTask(id, { due: iso(addD(due, days)), start: t.start ? iso(addD(start, days)) : null });
    const n = Math.abs(days);
    toast(`Moved “${t.title}” ${n} day${n > 1 ? 's' : ''} ${days > 0 ? 'later' : 'earlier'}`, { ms: 2200 });
  } else if (edge === 'end') {
    const nd = iso(addD(due, Math.max(days, -diffD(due, start))));
    if (nd === t.due) return;
    updateTask(id, { due: nd, ...(t.start ? {} : { start: iso(start) }) });
    toast(`“${t.title}” now due ${fmtDate(nd)}`, { ms: 2200 });
  } else {
    const ns = iso(addD(start, Math.min(days, diffD(due, start))));
    if (ns === t.start) return;
    updateTask(id, { start: ns });
    toast(`“${t.title}” now starts ${fmtDate(ns)}`, { ms: 2200 });
  }
}

/* ---------- files ---------- */
const fileById = (id: FileId) => get().data.files.find(f => f.id === id);
export async function renameFile(id: FileId) {
  const f = fileById(id);
  if (!f) return;
  const name = (await prompt({ title: 'Rename file', label: 'File name', value: f.name }))?.trim();
  if (name)
    mutate(s => {
      const x = s.data.files.find(y => y.id === id);
      if (!x) return;
      x.name = name;
      x.type = fileType(name);
    });
}
export function dupFile(id: FileId) {
  if (
    mutate(s => {
      const i = s.data.files.findIndex(x => x.id === id);
      const f = s.data.files[i];
      if (!f) return;
      s.data.files.splice(i + 1, 0, { ...f, id: fileId(uid('f')), name: f.name.replace(/(\.[^.]+)$/, ' copy$1'), at: Date.now(), by: s.data.me });
    })
  )
    toast('File duplicated');
}
export async function delFile(id: FileId) {
  const f = fileById(id);
  if (!f) return;
  const ok = await confirm({
    title: 'Delete file?',
    body: [{ b: f.name }, ` will be removed from the project${f.task ? ' and its task' : ''}.`],
    ok: 'Delete file',
    danger: true,
  });
  if (!ok) return;
  const snap = snapshot();
  if (
    mutate(s => {
      s.data.files = s.data.files.filter(x => x.id !== id);
      const t = taskById(s.data, f.task);
      if (t) t.attachments = t.attachments.filter(a => a.name !== f.name);
    })
  )
    toast(`Deleted ${f.name}`, { action: 'Undo', onAction: () => restore(snap) });
}
