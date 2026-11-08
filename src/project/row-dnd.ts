/* Drag-and-drop reordering of markup that shared components render, through the data attributes it carries:
   - list rows (`data-task-row`, dragged by `data-drag-row`, grouped by `data-group` in the list `data-lkey`) and group headers
     (`data-grp-drop`), with Alt+Arrow keys as the keyboard alternative;
   - sidebar projects (`data-drag-proj` over `data-proj-drop`).
   It also keeps keyboard focus on a row the list remounts (a status change moves it to another group). Native drag and drop:
   these rows are already `draggable`, and dnd-kit needs hooks inside their components. Installed once, on first import. */
import { projectId, taskId, type ProjectId, type TaskId } from '../domain/ids';
import { useStore } from '../store';
import { isViewKey, moveProjectBefore, placeRow, type RowDrop } from './actions';

type Drag = { type: 'row'; id: TaskId; drop: RowDrop | null } | { type: 'proj'; id: ProjectId; before: ProjectId | null };

const LINE_BEFORE = ['before:absolute', 'before:inset-x-0', 'before:-top-px', 'before:z-3', 'before:h-0.5', 'before:rounded-full', 'before:bg-primary'];
const LINE_AFTER = ['after:absolute', 'after:inset-x-0', 'after:-bottom-px', 'after:z-3', 'after:h-0.5', 'after:rounded-full', 'after:bg-primary'];
const DRAGGING = ['opacity-40'];
const OVER_GROUP = ['bg-primary-soft'];

let drag: Drag | null = null;
let marked: { el: HTMLElement; cls: string[] }[] = [];

const closest = (t: EventTarget | null, sel: string) => (t instanceof Element ? t.closest<HTMLElement>(sel) : null);
function mark(el: HTMLElement, cls: string[]) {
  el.classList.add(...cls);
  marked.push({ el, cls });
}
function clearMarks(keepDragging = false) {
  marked = marked.filter(m => {
    if (keepDragging && m.cls === DRAGGING) return true;
    m.el.classList.remove(...m.cls);
    return false;
  });
}
/** The rows of one list, in screen order. */
const rowsOf = (lkey: string) => [...document.querySelectorAll<HTMLElement>(`[data-task-row][data-lkey="${CSS.escape(lkey)}"]`)];

function rowDrop(row: HTMLElement, before: boolean): RowDrop | null {
  const target = row.dataset.taskRow;
  const lkey = row.dataset.lkey;
  if (!target) return null;
  return { target: taskId(target), pos: before ? 'before' : 'after', group: row.dataset.group, viewKey: isViewKey(lkey) ? lkey : undefined };
}
/** A group header takes the row to the top of its group (or into the empty group). */
function groupDrop(head: HTMLElement): RowDrop | null {
  const g = head.dataset.grpDrop;
  const key = head.dataset.key;
  if (!g || !isViewKey(key)) return null;
  const first = rowsOf(key).find(r => r.dataset.group === g);
  return { target: first?.dataset.taskRow ? taskId(first.dataset.taskRow) : null, pos: 'before', group: g, viewKey: key };
}

function onDragStart(e: DragEvent) {
  const handle = closest(e.target, '[data-drag-row]');
  const proj = closest(e.target, '[data-drag-proj]');
  if (!e.dataTransfer || (!handle && !proj)) return;
  if (handle?.dataset.dragRow) {
    drag = { type: 'row', id: taskId(handle.dataset.dragRow), drop: null };
    const row = handle.closest<HTMLElement>('[data-task-row]');
    if (row) {
      e.dataTransfer.setDragImage(row, 20, 18);
      requestAnimationFrame(() => mark(row, DRAGGING));
    }
  } else if (proj?.dataset.dragProj) {
    drag = { type: 'proj', id: projectId(proj.dataset.dragProj), before: null };
  } else return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', drag.id);
}

function onDragOver(e: DragEvent) {
  if (!drag) return;
  if (drag.type === 'row') {
    const row = closest(e.target, '[data-task-row]');
    const head = row ? null : closest(e.target, '[data-grp-drop]');
    const drop =
      row && row.dataset.taskRow !== drag.id ? rowDrop(row, e.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2) : head ? groupDrop(head) : null;
    if (!drop) return;
    e.preventDefault();
    clearMarks(true);
    if (row) mark(row, drop.pos === 'before' ? LINE_BEFORE : LINE_AFTER);
    else if (head) mark(head, OVER_GROUP);
    drag.drop = drop;
  } else {
    const item = closest(e.target, '[data-proj-drop]');
    const before = item?.dataset.projDrop;
    if (!item || !before) return;
    e.preventDefault();
    clearMarks();
    mark(item, LINE_BEFORE);
    drag.before = projectId(before);
  }
}

function onDrop(e: DragEvent) {
  const d = drag;
  if (!d) return;
  e.preventDefault();
  drag = null;
  clearMarks();
  if (d.type === 'row' && d.drop) placeRow(d.id, d.drop);
  else if (d.type === 'proj' && d.before) moveProjectBefore(d.id, d.before);
}

function onDragEnd() {
  drag = null;
  clearMarks();
}

/** Alt+Arrow Up/Down moves the focused row past its neighbour in the same list, taking on the neighbour's group. */
function onKeyDown(e: KeyboardEvent) {
  if (!e.altKey || e.metaKey || e.ctrlKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  if (closest(e.target, 'input,textarea,[contenteditable]')) return;
  const row = closest(e.target, '[data-task-row]');
  const id = row?.dataset.taskRow,
    lkey = row?.dataset.lkey;
  if (!row || !id || !lkey) return;
  const rows = rowsOf(lkey);
  const up = e.key === 'ArrowUp';
  const next = rows[rows.indexOf(row) + (up ? -1 : 1)];
  const drop = next && rowDrop(next, up);
  if (!drop) return;
  e.preventDefault();
  placeRow(taskId(id), drop);
}

/* ---------- focus that survives a remount ---------- */
type Focus = { el: HTMLElement; row: string; lkey: string; label: string };
let focus: Focus | null = null;
const labelKey = (el: HTMLElement) => (el.getAttribute('aria-label') ?? el.textContent ?? '').split(':')[0]?.trim() ?? '';

function onFocusIn(e: FocusEvent) {
  const el = e.target instanceof HTMLElement ? e.target : null;
  const row = el ? el.closest<HTMLElement>('[data-task-row]') : null;
  if (!el || !row?.dataset.taskRow || !row.dataset.lkey) return;
  focus = { el, row: row.dataset.taskRow, lkey: row.dataset.lkey, label: labelKey(el) };
}
/** After a data change, the remembered control may be gone while its row lives on elsewhere: once focus falls to the body, move it there. */
function refocus() {
  const f = focus;
  if (!f) return;
  let frames = 0;
  const tick = () => {
    if (focus !== f || ++frames > 45) return;
    if (f.el.isConnected) return void requestAnimationFrame(tick);
    const a = document.activeElement;
    if (a && a !== document.body && a.isConnected) {
      if (a.closest('[role=menu],[role=dialog],[role=listbox]')) requestAnimationFrame(tick);
      return;
    }
    const row = document.querySelector<HTMLElement>(`[data-task-row="${CSS.escape(f.row)}"][data-lkey="${CSS.escape(f.lkey)}"]`);
    if (!row) return;
    const controls = [...row.querySelectorAll<HTMLElement>('button,[tabindex="0"],input')];
    const el = controls.find(c => labelKey(c) === f.label) ?? controls.find(c => !c.getAttribute('aria-label')) ?? controls[0];
    el?.focus({ preventScroll: false });
  };
  requestAnimationFrame(tick);
}

function install() {
  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('drop', onDrop);
  document.addEventListener('dragend', onDragEnd);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('focusin', onFocusIn);
  const unsub = useStore.subscribe((s, prev) => s.data !== prev.data && refocus());
  return () => {
    document.removeEventListener('dragstart', onDragStart);
    document.removeEventListener('dragover', onDragOver);
    document.removeEventListener('drop', onDrop);
    document.removeEventListener('dragend', onDragEnd);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('focusin', onFocusIn);
    unsub();
  };
}

const uninstall = install();
import.meta.hot?.dispose(uninstall);
