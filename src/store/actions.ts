/* Actions the whole app shares, as typed store operations. */
import { current, type Draft } from 'immer';
import { PR, RECUR_DAYS, ST, TEMPLATES, fileType, fsize, type TemplateId } from '../domain/constants';
import { addD, dOff, fmtDate, iso, parse } from '../domain/date';
import {
  activityId,
  commentId,
  fileId,
  projectId,
  taskId,
  uid,
  uploadId,
  type FileId,
  type MemberId,
  type ProjectId,
  type SubtaskId,
  type TaskId,
  type WorkspaceId,
} from '../domain/ids';
import type { Data, Project, Prefs, SortField, Task, View } from '../domain/schema';
import { toast, type ToastOpts } from '../ui/toast';
import { curProjectId, currentRoute, go } from './nav';
import { allTasks, canSee, commentsOf, fileRef, me, memberById, projectById, projectFromKey, taskById, tasksOf, viewOf, visibleProjects } from './selectors';
import { seed } from '../domain/seed';
import { DEFAULT_PREFS, get, mutate, set, type State } from './store';
import { modalId, type Modal, type ModalId, type RichText, type SettableUiKey, type TaskSet, type TaskTarget, type Ui, type ViewKey } from './ui';

export { toast };
export type { ToastOpts };

/* ---------- data helpers (call inside `mutate`/`set`) ---------- */
export function logAct(d: Draft<Data>, verb: string, t?: Draft<Task> | null, extra = '') {
  d.activity.unshift({ id: activityId(uid('a')), by: d.me, verb, task: t?.id ?? null, project: t?.project ?? null, at: Date.now(), extra });
  if (t) t.updated = Date.now();
}
export function nextKey(p: Draft<Project>) {
  p.seq = (p.seq || 200) + 1;
  return p.key + '-' + p.seq;
}
/** Fills defaults, issues a key, logs the creation, and flags the row for its entrance. */
export function createTask(s: Draft<State>, f: Partial<Task>): Draft<Task> | null {
  const d = s.data;
  const p = projectById(d, f.project) ?? visibleProjects(d).find(x => canSee(d, x));
  if (!p) return null;
  const now = Date.now();
  const t: Task = {
    title: 'Untitled',
    status: 'todo',
    assignee: null,
    priority: 'none',
    due: null,
    start: null,
    labels: [],
    subtasks: [],
    attachments: [],
    deps: [],
    desc: '',
    estimate: null,
    created: now,
    updated: now,
    order: Math.max(0, ...d.tasks.map(x => x.order)) + 1,
    fav: false,
    recur: null,
    ...f,
    project: p.id,
    id: f.id ?? taskId(uid('t')),
    key: f.key ?? nextKey(p),
  };
  d.tasks.push(t);
  const created = d.tasks[d.tasks.length - 1] ?? null;
  s.ui.fx.added = t.id;
  logAct(d, 'created', created);
  return created;
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'project' | 'status' | 'assignee' | 'priority' | 'due' | 'start' | 'labels' | 'recur' | 'subtasks' | 'estimate' | 'deps'>
>;
/** Applied in this order, so the activity log lists a form's changes in the same order every time. */
const PATCH_KEYS = ['title', 'project', 'status', 'assignee', 'priority', 'due', 'start', 'labels', 'recur', 'subtasks', 'estimate', 'deps'] as const;
type PatchKey = (typeof PATCH_KEYS)[number];
function write<K extends PatchKey>(t: Task, patch: TaskPatch, k: K) {
  const v = patch[k];
  if (v !== undefined) t[k] = v;
}
/** Writes changed fields, logs each, completes recurring tasks into their next occurrence. Returns info toasts. */
export function applyPatch(s: Draft<State>, t: Draft<Task>, patch: TaskPatch): string[] {
  const d = s.data;
  const msgs: string[] = [];
  for (const k of PATCH_KEYS) {
    if (!(k in patch) || JSON.stringify(t[k]) === JSON.stringify(patch[k])) continue;
    const was = t.status;
    write(t, patch, k);
    switch (k) {
      case 'status':
        if (t.status === 'done') {
          t.completedAt = Date.now();
          t.prevStatus = was;
          logAct(d, 'completed', t);
          s.ui.fx.done = t.id;
          if (t.recur && t.due) {
            const nd = iso(addD(parse(t.due), RECUR_DAYS[t.recur]));
            createTask(s, {
              ...current(t),
              id: undefined,
              key: undefined,
              prevStatus: undefined,
              status: 'todo',
              due: nd,
              start: nd,
              subtasks: t.subtasks.map(x => ({ ...x, done: false })),
              completedAt: null,
              attachments: [],
            });
            msgs.push(`Next “${t.title}” scheduled for ${fmtDate(nd)}`);
          }
        } else logAct(d, 'moved', t, `from ${ST[was].name} to ${ST[t.status].name}`);
        break;
      case 'assignee':
        logAct(d, 'assigned', t, t.assignee ? `to ${memberById(d, t.assignee)?.name}` : '(unassigned)');
        break;
      case 'priority':
        logAct(d, 'changed priority of', t, `to ${PR[t.priority].name}`);
        break;
      case 'due':
        logAct(d, 'changed due date of', t, t.due ? `to ${fmtDate(t.due)}` : '(cleared)');
        break;
      case 'start':
        logAct(d, 'changed start date of', t, t.start ? `to ${fmtDate(t.start)}` : '(cleared)');
        break;
      case 'project': {
        const p = projectById(d, t.project);
        if (p) {
          t.key = nextKey(p);
          logAct(d, 'moved', t, `to ${p.name}`);
        }
        break;
      }
      case 'labels':
        logAct(d, 'updated labels on', t);
        break;
      case 'title':
        logAct(d, 'renamed', t, `to “${t.title}”`);
        break;
      case 'recur':
        logAct(d, 'set repeat on', t, t.recur ? t.recur.toLowerCase() : 'off');
        break;
      case 'estimate':
        logAct(d, 'estimated', t, t.estimate || 'none');
        break;
      case 'deps':
        logAct(d, 'updated dependencies of', t);
        break;
      case 'subtasks':
        break;
    }
    t.updated = Date.now();
  }
  return msgs;
}
/** The task form (`'form'`) takes the patch as-is; a saved task goes through `applyPatch` behind the offline guard. */
export function updateTask(id: TaskTarget, patch: TaskPatch) {
  if (id === 'form') {
    set(s => {
      if (s.ui.form) Object.assign(s.ui.form, patch);
    });
    return;
  }
  let msgs: string[] = [];
  if (
    mutate(s => {
      const t = taskById(s.data, id);
      if (t) msgs = applyPatch(s, t, patch);
    })
  )
    msgs.forEach(m => toast(m, { kind: 'info' }));
}
export function deleteTasks(s: Draft<State>, ids: readonly TaskId[]) {
  const d = s.data;
  const gone = new Set(ids);
  d.tasks = d.tasks.filter(t => !gone.has(t.id));
  d.tasks.forEach(t => (t.deps = t.deps.filter(x => !gone.has(x))));
  d.comments = d.comments.filter(c => !gone.has(c.task));
  if (s.ui.drawer && gone.has(s.ui.drawer)) s.ui.drawer = null;
  s.ui.sel = s.ui.sel.filter(x => !gone.has(x));
}
/** State is immutable, so an undo snapshot is just the current `data` object. */
export const snapshot = () => get().data;
export const restore = (snap: Data) =>
  set(s => {
    s.data = snap;
  });
export async function copy(text: string, msg = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    toast("Copy isn't available here — " + text, { kind: 'info', ms: 6000 });
  }
}

/* ---------- modals ---------- */
type ConfirmModal = Extract<Modal, { type: 'confirm' }>;
type PromptModal = Extract<Modal, { type: 'prompt' }>;
const confirms = new Map<ModalId, (ok: boolean) => void>();
const prompts = new Map<ModalId, (value: string | null) => void>();
function settle(m: Modal | undefined, ok: boolean, value: string | null = null) {
  if (m?.type === 'confirm') {
    confirms.get(m.id)?.(ok);
    confirms.delete(m.id);
  } else if (m?.type === 'prompt') {
    prompts.get(m.id)?.(ok ? value : null);
    prompts.delete(m.id);
  }
}

export function openModal(m: Modal) {
  set(s => {
    s.ui.modals.push(m);
  });
}
export function closeModal() {
  const top = get().ui.modals.at(-1);
  set(s => {
    s.ui.modals.pop();
  });
  settle(top, false);
}
export function closeAllModals() {
  const open = get().ui.modals;
  set(s => {
    s.ui.modals = [];
  });
  open.forEach(m => settle(m, false));
}
/** Resolves true when confirmed, false when dismissed. A `typeName` must be typed before OK enables. */
export function confirm(o: Omit<ConfirmModal, 'type' | 'id' | 'body'> & { body: RichText }): Promise<boolean> {
  const id = modalId(uid('md'));
  set(s => {
    s.ui.confirmText = '';
  });
  openModal({ type: 'confirm', id, ...o });
  return new Promise(res => confirms.set(id, res));
}
export function confirmOk() {
  const top = get().ui.modals.at(-1);
  if (top?.type !== 'confirm' || (top.typeName && get().ui.confirmText !== top.typeName)) return;
  set(s => {
    s.ui.modals.pop();
    s.ui.confirmText = '';
  });
  settle(top, true);
}
/** Resolves the entered text (trimmed) on submit, or null when dismissed. */
export function prompt(o: Omit<PromptModal, 'type' | 'id'>): Promise<string | null> {
  const id = modalId(uid('md'));
  openModal({ type: 'prompt', id, ...o });
  return new Promise(res => prompts.set(id, res));
}
export function promptSubmit(value: string) {
  const top = get().ui.modals.at(-1);
  if (top?.type !== 'prompt') return;
  set(s => {
    s.ui.modals.pop();
  });
  settle(top, true, value.trim());
}

/* ---------- shell ---------- */
export function setUi<K extends SettableUiKey>(k: K, v: Ui[K]) {
  set(s => {
    Object.assign(s.ui, { [k]: v });
  });
}
export const toggleSide = () =>
  set(s => {
    s.ui.collapsed = !s.ui.collapsed;
  });
export const openMnav = () =>
  set(s => {
    s.ui.mnav = true;
  });
export const closeMnav = () =>
  set(s => {
    s.ui.mnav = false;
  });
/** Sidebar project sub-pages. */
export const toggleExpand = (id: ProjectId) =>
  set(s => {
    s.ui.expanded[id] = !s.ui.expanded[id];
  });
export function openPalette() {
  set(s => {
    s.ui.palette = { q: '', mode: 'cmd', scope: 'all', hl: 0 };
  });
}
export const effectiveDark = (p: Prefs) => p.theme === 'dark' || (p.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
export const setTheme = (v: Prefs['theme']) =>
  set(s => {
    s.prefs.theme = v;
  });
export function toggleDark() {
  set(s => {
    s.prefs.theme = effectiveDark(s.prefs) ? 'light' : 'dark';
    s.ui.palette = null;
  });
  toast(effectiveDark(get().prefs) ? 'Dark mode on' : 'Light mode on', { kind: 'info', ms: 1800 });
}
export function toggleOffline() {
  set(s => {
    s.ui.offline = !s.ui.offline;
  });
  const off = get().ui.offline;
  toast(off ? 'Offline mode on — edits will fail to save' : 'Back online', { kind: off ? 'err' : 'ok' });
}
/** Resolves once reconnected; the caller shows its button as loading until then. */
export const retryOnline = () =>
  new Promise<void>(res =>
    setTimeout(() => {
      set(s => {
        s.ui.offline = false;
      });
      toast('Reconnected. All changes are synced.');
      res();
    }, 700),
  );
export function requestAccess(id: ProjectId | null) {
  const d = get().data;
  toast(`Access requested. We'll notify you when ${memberById(d, projectById(d, id)?.lead)?.name || 'the owner'} responds.`);
}

/* ---------- workspace and account (shell menus) ---------- */
export function switchWs(id: WorkspaceId) {
  const w = get().data.workspaces.find(x => x.id === id);
  if (!w) return;
  set(s => {
    s.data.ws = { name: w.name, url: w.name.toLowerCase().replace(/[^a-z0-9]+/g, ''), c: w.c, brand: !!w.brand };
  });
  go({ r: 'home' });
  toast(`Switched to ${w.name}`);
}
export function newWorkspace() {
  set(s => {
    s.ui.onbData.ws = '';
    s.ui.onbData.url = '';
  });
  go({ r: 'onboarding', step: 1 });
}
export const startOnboarding = () => go({ r: 'onboarding', step: 0 });
export function signOut() {
  set(s => {
    s.ui.palette = null;
    s.ui.drawer = null;
    s.ui.modals = [];
    s.ui.errors = {};
  });
  go({ r: 'login' });
}
export async function resetDemo() {
  const ok = await confirm({
    title: 'Reset demo data?',
    body: 'All projects, tasks, and settings in this browser go back to the original sample workspace.',
    ok: 'Reset data',
    danger: true,
    icon: 'rotate-ccw',
  });
  if (!ok) return;
  set(s => {
    s.data = seed();
    s.views = {};
    s.prefs = { ...DEFAULT_PREFS, theme: s.prefs.theme };
    s.ui.drawer = null;
  });
  go({ r: 'home' });
  toast('Demo data restored');
}

/* ---------- tasks ---------- */
export function openTask(id: TaskId) {
  const d = get().data;
  const t = taskById(d, id);
  if (!t) return;
  if (!canSee(d, projectById(d, t.project))) {
    toast("You don't have access to that task", { kind: 'err' });
    return;
  }
  closeAllModals();
  set(s => {
    const u = s.ui;
    u.drawer = id;
    u.drawerFull = s.prefs.openTasks === 'full' || u.drawerFull;
    u.palette = null;
    u.mention = null;
    u.subOpen = null;
  });
}
export function toggleDone(id: TaskId) {
  const t = taskById(get().data, id);
  if (!t) return;
  const wasDone = t.status === 'done';
  updateTask(id, { status: wasDone ? (t.prevStatus && t.prevStatus !== 'done' ? t.prevStatus : 'todo') : 'done' });
  if (!wasDone && !get().ui.offline)
    toast(`Completed “${t.title}”`, { action: 'Undo', onAction: () => updateTask(id, { status: taskById(get().data, id)?.prevStatus || 'todo' }) });
}
export function toggleSub(tid: TaskId, sid: SubtaskId) {
  mutate(s => {
    const t = taskById(s.data, tid);
    const sb = t?.subtasks.find(x => x.id === sid);
    if (!t || !sb) return;
    if (!sb.done) s.ui.fx.done = sb.id;
    sb.done = !sb.done;
    logAct(s.data, sb.done ? 'completed subtask on' : 'reopened subtask on', t, `“${sb.title}”`);
  });
}
const plainDesc = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export function editTask(id: TaskId) {
  const t = taskById(get().data, id);
  if (!t) return;
  set(s => {
    s.ui.form = {
      title: t.title,
      desc: plainDesc(t.desc),
      project: t.project,
      status: t.status,
      assignee: t.assignee,
      priority: t.priority,
      due: t.due,
      start: t.start,
      labels: [...t.labels],
      subtasks: t.subtasks.map(x => ({ ...x })),
      files: [],
      recur: t.recur,
      more: false,
    };
    s.ui.errors = {};
  });
  openModal({ type: 'task', edit: id });
}
/** The project comes from the trigger, the current page, the open composer, or the open task. */
export function newTask(o: { project?: ProjectId; assignee?: Task['assignee']; due?: string } = {}) {
  const { data: d, ui } = get();
  const drawerTask = taskById(d, ui.drawer);
  const pid =
    o.project ??
    curProjectId() ??
    projectFromKey(d, ui.composer?.ctx) ??
    drawerTask?.project ??
    visibleProjects(d).find(p => canSee(d, p) && p.status !== 'complete')?.id;
  set(s => {
    s.ui.form = {
      title: '',
      desc: '',
      project: canSee(d, projectById(d, pid)) && pid ? pid : projectId('p1'),
      status: 'todo',
      assignee: o.assignee ?? d.me,
      priority: 'medium',
      due: o.due ?? null,
      start: null,
      labels: [],
      subtasks: [],
      files: [],
      recur: null,
      more: s.ui.form?.more || false,
    };
    s.ui.errors = {};
  });
  openModal({ type: 'task', edit: null });
}
/** Inline "Add task" row: `ctx` is the list's view key, `group` its group key, `gb` the fields the group sets. */
export function startComposer(ctx: ViewKey, group: string, gb: TaskSet) {
  set(s => {
    s.ui.composer = { ctx, group, gb };
  });
}
export const cancelComposer = () =>
  set(s => {
    s.ui.composer = null;
  });
/** Adds the typed task and keeps the composer open for the next one; an empty title cancels. */
export function commitComposer(title: string) {
  const c = get().ui.composer;
  if (!c) return;
  const v = title.trim();
  if (!v) return cancelComposer();
  const project = c.gb.project ?? projectFromKey(get().data, c.ctx) ?? curProjectId() ?? projectId('p1');
  mutate(s => {
    createTask(s, { title: v, ...c.gb, project, ...(c.ctx === 'mytasks' ? { assignee: s.data.me } : {}) });
  });
}
/** Double-click a list row title to rename it inline. */
export function editTitle(id: TaskId) {
  set(s => {
    s.ui.drawer = null;
    s.ui.editCell = { id, f: 'title' };
  });
}
export function commitTitle(value: string) {
  const c = get().ui.editCell;
  if (!c) return;
  set(s => {
    s.ui.editCell = null;
  });
  const v = value.trim();
  if (v && v !== taskById(get().data, c.id)?.title) updateTask(c.id, { title: v });
}
/** Table cells edited in place. */
export function editCell(id: TaskId, f: 'title' | 'estimate') {
  set(s => {
    s.ui.drawer = null;
    s.ui.editCell = { id, f };
  });
}
export function commitCell(value: string) {
  const c = get().ui.editCell;
  if (!c) return;
  set(s => {
    s.ui.editCell = null;
  });
  const v = value.trim();
  if (c.f === 'title') {
    if (v) updateTask(c.id, { title: v });
  } else updateTask(c.id, { estimate: v || null });
}
export const expandRow = (id: TaskId) =>
  set(s => {
    s.ui.openTasks[id] = !s.ui.openTasks[id];
  });
/** List group headers: `expanded` is the header's current state. */
export const toggleGroup = (gk: string, expanded: boolean) =>
  set(s => {
    s.ui.collapsedGroups[gk] = expanded;
  });

/* ---------- selection ---------- */
export const selRow = (id: TaskId) =>
  set(s => {
    s.ui.sel = s.ui.sel.includes(id) ? s.ui.sel.filter(x => x !== id) : [...s.ui.sel, id];
  });
/** "Select all" in a list header: `ids` are the rows that list shows. */
export function selAll(ids: readonly TaskId[]) {
  set(s => {
    const all = ids.every(i => s.ui.sel.includes(i));
    s.ui.sel = all ? s.ui.sel.filter(x => !ids.includes(x)) : [...s.ui.sel, ...ids.filter(i => !s.ui.sel.includes(i))];
  });
}
export const clearSel = () =>
  set(s => {
    s.ui.sel = [];
  });
export async function bulkDelete() {
  const ids = get().ui.sel;
  const n = `${ids.length} task${ids.length > 1 ? 's' : ''}`;
  const ok = await confirm({
    title: `Delete ${n}?`,
    body: 'The selected tasks, their subtasks, and comments will be permanently deleted.',
    ok: `Delete ${n}`,
    danger: true,
  });
  if (!ok) return;
  const snap = snapshot();
  if (mutate(s => deleteTasks(s, ids))) toast(`Deleted ${ids.length} tasks`, { action: 'Undo', onAction: () => restore(snap) });
}

/** Bulk bar pickers: one patch applied to every selected task. */
export function bulkSet(patch: TaskPatch) {
  const ids = get().ui.sel;
  if (
    mutate(s =>
      ids.forEach(id => {
        const t = taskById(s.data, id);
        if (t) applyPatch(s, t, patch);
      }),
    )
  )
    toast(`Updated ${ids.length} task${ids.length > 1 ? 's' : ''}`);
}
/** Date pickers: a due date earlier than the start pulls the start back with it. */
export function setTaskDate(id: TaskTarget, field: 'due' | 'start', v: string | null) {
  const t = id === 'form' ? null : taskById(get().data, id);
  updateTask(id, field === 'due' && v && t?.start && t.start > v ? { due: v, start: v } : { [field]: v });
}
export function toggleFavTask(id: TaskId) {
  let fav = false;
  mutate(s => {
    const t = taskById(s.data, id);
    if (t) fav = t.fav = !t.fav;
  });
  toast(fav ? 'Added to favorites' : 'Removed from favorites', { ms: 1800 });
}
/** Copies a link that opens the target in this app: the project page, with `?task=` or `?file=` naming the overlay it opens. */
export function copyLink(target: { task: TaskId } | { project: ProjectId } | { file: FileId }) {
  const d = get().data;
  let path: string | undefined;
  if ('project' in target) path = `/projects/${target.project}`;
  else if ('task' in target) {
    const t = taskById(d, target.task);
    path = t && `/projects/${t.project}?task=${t.key}`;
  } else {
    const f = fileRef(d, target.file);
    path = f && `/projects/${f.project}/files?file=${target.file}`;
  }
  if (path) void copy(location.origin + path);
}
export function dupTask(id: TaskId) {
  let copyId: TaskId | null = null;
  mutate(s => {
    const t = taskById(s.data, id);
    if (t) copyId = createTask(s, { ...current(t), id: undefined, key: undefined, title: t.title + ' (copy)', created: Date.now(), fav: false })?.id ?? null;
  });
  const n = copyId;
  if (n) toast('Task duplicated', { action: 'Open', onAction: () => openTask(n) });
}
export function archiveTask(id: TaskId) {
  const t = taskById(get().data, id);
  if (!t) return;
  const snap = snapshot();
  if (
    mutate(s => {
      const x = taskById(s.data, id);
      if (!x) return;
      if (s.ui.drawer === id) s.ui.drawer = null;
      x.archived = true;
      x.archivedAt = Date.now();
      logAct(s.data, 'archived', x);
    })
  )
    toast(`Archived “${t.title}”`, { action: 'Undo', onAction: () => restore(snap) });
}

/* ---------- comments ---------- */
/** Comment box input: keeps the draft and tracks an `@name` being typed before the caret. */
export function setDraft(tid: TaskId, value: string, caret: number) {
  const m = value.slice(0, caret).match(/(?:^|\s)@([A-Za-z]*)$/);
  set(s => {
    s.ui.drafts[tid] = value;
    const next = m ? { tid, q: m[1] ?? '' } : null;
    if (JSON.stringify(next) !== JSON.stringify(s.ui.mention)) s.ui.mention = next;
  });
}
/** Returns false when the draft is empty (the caller keeps focus in the box). */
export function postComment(tid: TaskId): boolean {
  const txt = (get().ui.drafts[tid] || '').trim();
  if (!txt) return false;
  const ok = mutate(s => {
    s.data.comments.push({ id: commentId(uid('c')), task: tid, by: s.data.me, at: Date.now(), text: txt, re: {} });
    logAct(s.data, 'commented on', taskById(s.data, tid));
    s.ui.drafts[tid] = '';
    s.ui.mention = null;
    s.ui.drawerTab = 'comments';
  });
  if (ok && currentRoute()?.r === 'inbox') toast('Reply posted');
  return true;
}

/* ---------- files ---------- */
/** Simulated uploads with progress in `ui.uploads`, then a project file (and a task attachment). */
export function uploadFiles(files: Iterable<File>, ctx: { project: ProjectId; task: TaskId | null }) {
  const list = [...files];
  if (!list.length) return;
  if (get().ui.offline) {
    toast("Upload failed — you're offline.", { kind: 'err', action: 'Try again', onAction: () => {} });
    return;
  }
  for (const file of list) {
    const id = uploadId(uid('u'));
    const size = fsize(file.size);
    set(s => {
      s.ui.uploads.push({ id, name: file.name, size, project: ctx.project, task: ctx.task, pct: 0 });
    });
    const iv = setInterval(() => {
      let done = false;
      set(s => {
        const up = s.ui.uploads.find(x => x.id === id);
        if (!up) return;
        up.pct = Math.min(100, up.pct + 9 + Math.round(Math.random() * 22));
        if (up.pct < 100) return;
        done = true;
        s.ui.uploads = s.ui.uploads.filter(x => x.id !== id);
        const rec = { id: fileId(uid('f')), name: file.name, type: fileType(file.name), size, by: s.data.me, at: Date.now() };
        s.data.files.unshift({ ...rec, project: ctx.project, task: ctx.task });
        const t = taskById(s.data, ctx.task);
        if (t) {
          t.attachments.push(rec);
          logAct(s.data, 'added a file to', t, file.name);
        }
      });
      if (done) {
        clearInterval(iv);
        toast(`Uploaded ${file.name}`);
      }
    }, 220);
  }
}

/* ---------- projects ---------- */
export function newProject() {
  const d = get().data;
  set(s => {
    s.ui.pform = { name: '', desc: '', icon: 'folder', color: 'indigo', team: me(d)?.team ?? null, lead: d.me, due: dOff(30), tmpl: 'blank' };
    s.ui.errors = {};
  });
  openModal({ type: 'project', edit: null });
}
export function makeKey(d: Data, name: string) {
  let k = name
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  if (k.length < 2)
    k =
      name
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'PRJ';
  while (d.projects.some(p => p.key === k)) k += 'X';
  return k;
}
/** Used by the project form and onboarding: a new project first in the sidebar, with the template's starter tasks. */
export function createProject(
  s: Draft<State>,
  f: Pick<Project, 'name' | 'icon' | 'color' | 'team' | 'lead'> & { desc?: string; due?: string },
  tmpl: TemplateId,
): Draft<Project> {
  const d = s.data;
  const p: Project = {
    id: projectId(uid('p')),
    key: makeKey(d, f.name),
    name: f.name,
    icon: f.icon,
    color: f.color,
    status: 'planning',
    team: f.team,
    lead: f.lead,
    due: f.due || dOff(30),
    start: dOff(0),
    fav: false,
    members: [...new Set([d.me, f.lead])],
    desc: f.desc || 'No description yet.',
    milestones: [],
    last: 0,
  };
  d.projects.push(p);
  d.projOrder.unshift(p.id);
  d.activity.unshift({ id: activityId(uid('a')), by: d.me, verb: 'created project', task: null, project: p.id, at: Date.now(), extra: '' });
  const tasks: readonly string[] = TEMPLATES.find(t => t.id === tmpl)?.tasks ?? [];
  tasks.forEach((title, i) =>
    createTask(s, {
      project: p.id,
      title,
      status: i === 0 ? 'todo' : 'backlog',
      assignee: i === 0 ? d.me : null,
      priority: i === 0 ? 'high' : 'medium',
      due: dOff(5 + i * 5),
      start: dOff(i * 5),
    }),
  );
  return d.projects[d.projects.length - 1] ?? p;
}
export async function delProject(id: ProjectId) {
  const d = get().data;
  const p = projectById(d, id);
  if (!p) return;
  const n = tasksOf(d, id).length;
  const ok = await confirm({
    title: `Delete ${p.name}?`,
    body: [
      'This permanently deletes the project and its ',
      { b: `${n} task${n === 1 ? '' : 's'}` },
      ", files, and comments for everyone. This can't be undone.",
    ],
    ok: 'Delete project',
    danger: true,
    typeName: p.name,
  });
  if (!ok) return;
  const snap = snapshot();
  if (
    mutate(s => {
      deleteTasks(
        s,
        s.data.tasks.filter(t => t.project === id).map(t => t.id),
      );
      s.data.projects = s.data.projects.filter(x => x.id !== id);
      s.data.projOrder = s.data.projOrder.filter(x => x !== id);
      s.data.files = s.data.files.filter(f => f.project !== id);
    })
  ) {
    const r = currentRoute();
    if (r?.r === 'project' && r.id === id) go({ r: 'projects' });
    toast(`Deleted ${p.name}`, { action: 'Undo', onAction: () => restore(snap) });
  }
}
/** Sidebar "Move up" and "Move down": swaps with the neighbouring visible project. */
export function moveProject(id: ProjectId, dir: -1 | 1) {
  const d = get().data;
  const vis = visibleProjects(d).map(p => p.id);
  const i = vis.indexOf(id);
  const a = vis[i],
    b = vis[i + dir];
  if (i < 0 || !a || !b) return;
  set(s => {
    const o = s.data.projOrder;
    const ia = o.indexOf(a),
      ib = o.indexOf(b);
    [o[ia], o[ib]] = [b, a];
  });
  toast(`Moved ${projectById(d, id)?.name} ${dir < 0 ? 'up' : 'down'}`, { ms: 1600 });
}

/* Handlers the task menu shares with the pages that also offer them. */
/** Asks first unless Preferences turned confirmation off; `demo` always asks (design system). */
export async function delTask(id: TaskId, o: { demo?: boolean } = {}) {
  const d = get().data;
  const t = taskById(d, id);
  if (!t) return;
  if (get().prefs.confirmDel !== false || o.demo) {
    const cc = commentsOf(d, id).length;
    const ok = await confirm({
      title: 'Delete task?',
      body: [
        { b: t.title },
        `${t.subtasks.length ? `, its ${t.subtasks.length} subtasks,` : ''} and ${cc} comment${cc === 1 ? '' : 's'} will be permanently deleted.`,
      ],
      ok: 'Delete task',
      danger: true,
    });
    if (!ok) return;
  }
  const snap = snapshot();
  if (mutate(s => deleteTasks(s, [id]))) toast(`Deleted “${t.title}”`, { action: 'Undo', onAction: () => restore(snap) });
}
export function editProject(id: ProjectId) {
  const p = projectById(get().data, id);
  if (!p) return;
  set(s => {
    s.ui.pform = { name: p.name, desc: p.desc, icon: p.icon, color: p.color, team: p.team, lead: p.lead, due: p.due, tmpl: 'blank' };
    s.ui.errors = {};
  });
  openModal({ type: 'project', edit: id });
}
/** The share dialog for a project (the current one by default). */
export function share(id: ProjectId | null = curProjectId()) {
  if (!id) return;
  set(s => {
    s.ui.shareQ = '';
  });
  openModal({ type: 'share', id });
}
export function toggleFavProj(id: ProjectId) {
  let fav = false;
  mutate(s => {
    const p = projectById(s.data, id);
    if (p) fav = p.fav = !p.fav;
  });
  toast(fav ? `Added ${projectById(get().data, id)?.name} to favorites` : 'Removed from favorites', { ms: 1800 });
}
export async function archiveProject(id: ProjectId) {
  const p = projectById(get().data, id);
  if (!p) return;
  const ok = await confirm({
    title: `Archive ${p.name}?`,
    body: 'The project will be hidden from the sidebar and project lists. Tasks, files, and comments are kept, and you can restore it from Settings → Projects.',
    ok: 'Archive project',
    icon: 'archive',
  });
  if (!ok) return;
  const snap = snapshot();
  if (
    mutate(s => {
      const x = projectById(s.data, id);
      if (!x) return;
      x.archived = true;
      x.archivedAt = Date.now();
    })
  ) {
    const r = currentRoute();
    if (r?.r === 'project' && r.id === id) go({ r: 'projects' });
    toast(`Archived ${p.name}`, { action: 'Undo', onAction: () => restore(snap) });
  }
}
export function restoreProject(id: ProjectId) {
  const p = projectById(get().data, id);
  if (!p) return;
  mutate(s => {
    const x = projectById(s.data, id);
    if (!x) return;
    x.archived = false;
    x.archivedAt = null;
  });
  toast(`Restored ${p.name}`);
}
export function previewFile(id: FileId) {
  const f = fileRef(get().data, id);
  if (f) openModal({ type: 'filePreview', file: f.file, tid: f.tid });
}
export function shortcuts() {
  set(s => {
    s.ui.palette = null;
  });
  openModal({ type: 'shortcuts' });
}
export async function removeMember(id: MemberId) {
  const d = get().data;
  const m = memberById(d, id);
  if (!m) return;
  const n = allTasks(d).filter(t => t.assignee === id && t.status !== 'done').length;
  const ok = await confirm({
    title: `Remove ${m.name}?`,
    body: [
      `${m.name} will lose access to ${d.ws.name} immediately.${n ? ' Their ' : ''}`,
      ...(n ? [{ b: `${n} open task${n > 1 ? 's' : ''}` }, ' will become unassigned.'] : []),
    ],
    ok: 'Remove member',
    danger: true,
    icon: 'user-minus',
  });
  if (!ok) return;
  const snap = snapshot();
  if (
    mutate(s => {
      s.data.members = s.data.members.filter(x => x.id !== id);
      s.data.tasks.forEach(t => {
        if (t.assignee === id) t.assignee = null;
      });
      s.data.projects.forEach(p => (p.members = p.members.filter(x => x !== id)));
    })
  ) {
    if (currentRoute()?.r === 'member') go({ r: 'members' });
    toast(`Removed ${m.name}`, { action: 'Undo', onAction: () => restore(snap) });
  }
}

export function dupProject(id: ProjectId) {
  let copyId: ProjectId | null = null;
  mutate(s => {
    const p = projectById(s.data, id);
    if (!p) return;
    const n = createProject(s, { ...current(p), name: p.name + ' copy' }, 'blank');
    copyId = n.id;
    tasksOf(s.data, id).forEach(t => createTask(s, { ...current(t), id: undefined, key: undefined, project: n.id, status: 'todo' }));
  });
  const n = copyId;
  if (n) toast(`Duplicated ${projectById(get().data, id)?.name}`, { action: 'Open', onAction: () => go({ r: 'project', id: n }) });
}

/* ---------- teams and people ---------- */
export function newTeam() {
  set(s => {
    s.ui.errors = {};
    s.ui.tform = { name: '', desc: '', icon: 'users', color: 'teal', members: [] };
  });
  openModal({ type: 'team', edit: null });
}
export function invite() {
  set(s => {
    s.ui.inviteDraft = '';
    s.ui.errors = {};
  });
  openModal({ type: 'invite' });
}
export const copyInviteLink = () => copy(`${location.origin}/signup?invite=${get().data.ws.url}`, 'Invite link copied');

/* ---------- views: sort, filters ---------- */
/** Writes a view, creating it from its default first. */
export function updateView(key: ViewKey, fn: (v: Draft<View>) => void) {
  const init = structuredClone(viewOf(get().views, get().data, key));
  set(s => {
    fn((s.views[key] ??= init));
  });
}
/** Column header click: sort by `f`, or flip the direction when already sorted by it. */
export const sortBy = (key: ViewKey, f: SortField) =>
  updateView(key, v => {
    v.sort = v.sort.f === f ? { f, dir: v.sort.dir === 1 ? -1 : 1 } : { f, dir: 1 };
  });
export const rmFilter = (key: ViewKey, i: number) =>
  updateView(key, v => {
    v.filters.splice(i, 1);
  });
export const clearFilters = (key: ViewKey) =>
  updateView(key, v => {
    v.filters = [];
    v.q = '';
  });
/** Dashboard stat links: open the Tasks page as a list filtered to open, done this week, overdue, or everything. */
export function goTasks(f: 'open' | 'done' | 'overdue' | 'all') {
  updateView('tasks', v => {
    v.mode = 'list';
    v.filters =
      f === 'open'
        ? [{ f: 'status', op: 'not', v: ['done'] }]
        : f === 'done'
          ? [
              { f: 'status', op: 'is', v: ['done'] },
              { f: 'updated', op: 'is', v: ['7'] },
            ]
          : f === 'overdue'
            ? [{ f: 'due', op: 'is', v: ['overdue'] }]
            : [];
  });
  go({ r: 'tasks' });
}
