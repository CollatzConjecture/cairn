/* Subtasks in the task drawer: the checklist with add, toggle and drag to reorder,
   and the detail view a subtask opens into. */
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowLeft, ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Folder, GripVertical, Plus, Trash, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AssigneePicker, DatePicker } from '../components/pickers';
import { fxEnter, pill } from '../components/task-list';
import { TODAY, diffD, parse, relDate } from '../domain/date';
import { subtaskId, uid, type SubtaskId, type TaskId } from '../domain/ids';
import type { Subtask, Task } from '../domain/schema';
import { createTask, get, logAct, memberById, mutate, openTask, set, taskById, toast, toggleSub, useStore } from '../store';
import { Avatar, ProgressBar } from '../ui/helpers';
import { PropRow, Section, esc } from './parts';

/* ---------- handlers ---------- */
export function addSub(tid: TaskId, title: string) {
  const v = title.trim();
  if (!v) return;
  const id = subtaskId(uid('s'));
  mutate(s => {
    const t = taskById(s.data, tid);
    if (!t) return;
    t.subtasks.push({ id, title: v, done: false });
    s.ui.fx.added = id;
    logAct(s.data, 'added subtask to', t, `“${v}”`);
  });
}
export function rmSub(tid: TaskId, sid: SubtaskId) {
  mutate(s => {
    const t = taskById(s.data, tid);
    if (t) t.subtasks = t.subtasks.filter(x => x.id !== sid);
    if (s.ui.subOpen?.sid === sid) s.ui.subOpen = null;
  });
}
function updateSub(tid: TaskId, sid: SubtaskId, patch: Partial<Pick<Subtask, 'title' | 'assignee' | 'due'>>) {
  mutate(s => {
    const t = taskById(s.data, tid);
    const sb = t?.subtasks.find(x => x.id === sid);
    if (!t || !sb) return;
    Object.assign(sb, patch);
    t.updated = Date.now();
  });
}
export function moveSub(tid: TaskId, from: number, to: number) {
  mutate(s => {
    const t = taskById(s.data, tid);
    if (t) t.subtasks = arrayMove(t.subtasks, from, to);
  });
}
export const openSub = (tid: TaskId, sid: SubtaskId) =>
  set(s => {
    s.ui.subOpen = { tid, sid };
  });
export const closeSub = () =>
  set(s => {
    s.ui.subOpen = null;
  });
function subNav(t: Task, dir: -1 | 1) {
  const i = t.subtasks.findIndex(x => x.id === get().ui.subOpen?.sid) + dir;
  const next = t.subtasks[i];
  if (next) openSub(t.id, next.id);
}
/** The subtask becomes a task in the same project and leaves the checklist. */
function promoteSub(tid: TaskId, sid: SubtaskId) {
  let key = '';
  let id: TaskId | null = null;
  const ok = mutate(s => {
    const t = taskById(s.data, tid);
    const sb = t?.subtasks.find(x => x.id === sid);
    if (!t || !sb) return;
    const n = createTask(s, {
      title: sb.title,
      project: t.project,
      status: sb.done ? 'done' : 'todo',
      assignee: sb.assignee || t.assignee,
      priority: t.priority,
      due: sb.due || null,
      labels: [...t.labels],
      desc: sb.note ? `<p>${esc(sb.note)}</p>` : '',
    });
    if (!n) return;
    key = n.key;
    id = n.id;
    t.subtasks = t.subtasks.filter(x => x.id !== sid);
    logAct(s.data, 'converted a subtask of', t, `into ${n.key}`);
    s.ui.subOpen = null;
  });
  const n = id;
  if (ok && n) toast(`Converted to ${key}`, { action: 'Open', onAction: () => openTask(n) });
}

/* ---------- the checklist ---------- */
const SR_HELP = { draggable: 'Press the up or down arrow key to move this subtask, or drag it with a pointer.' };
const overdue = (s: Subtask) => !s.done && !!s.due && diffD(parse(s.due), TODAY) < 0;

function SubRow({ t, s, i }: { t: Task; s: Subtask; i: number }) {
  const fx = useStore(st => st.ui.fx);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group/sub relative flex min-h-8 items-center gap-2.25 rounded-sm px-1.5 text-base hover:bg-muted',
        isDragging && 'z-10 bg-background shadow-drag',
        fxEnter(fx, s.id),
      )}
      style={{ transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined, transition }}
    >
      <button
        ref={setActivatorNodeRef}
        className="absolute -left-4 flex h-full w-4 cursor-grab items-center justify-center text-fg-4 opacity-0 group-hover/sub:opacity-100 focus-visible:opacity-100"
        aria-label={`Reorder ${s.title}`}
        aria-keyshortcuts="ArrowUp ArrowDown"
        {...attributes}
        {...listeners}
        onKeyDown={e => {
          // Arrow keys move the subtask here: the dialog stops arrow keys before they reach dnd-kit's document-level keyboard sensor.
          const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1;
          if (to < 0 || to >= t.subtasks.length) return;
          e.preventDefault();
          const el = e.currentTarget;
          moveSub(t.id, i, to);
          requestAnimationFrame(() => el.focus());
        }}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox checked={s.done} onCheckedChange={() => toggleSub(t.id, s.id)} aria-label={`${s.done ? 'Reopen' : 'Complete'} subtask ${s.title}`} />
      <button
        className={cn(
          'min-w-0 flex-1 truncate rounded-sm py-1 text-left hover:underline hover:decoration-input hover:underline-offset-3',
          s.done && 'text-muted-foreground line-through',
        )}
        onClick={() => openSub(t.id, s.id)}
      >
        {s.title}
      </button>
      {s.due && (
        <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs text-fg-2 tabular-nums', overdue(s) && 'text-red')}>
          <Calendar className="size-3" />
          {relDate(s.due)}
        </span>
      )}
      {s.assignee && <Avatar id={s.assignee} size="sm" />}
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 group-hover/sub:opacity-100"
        aria-label="Open subtask details"
        tabIndex={-1}
        onClick={() => openSub(t.id, s.id)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export function Subtasks({ t }: { t: Task }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const sd = t.subtasks.filter(s => s.done).length;
  const n = t.subtasks.length;
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const from = t.subtasks.findIndex(s => s.id === active.id);
    const to = t.subtasks.findIndex(s => s.id === over?.id);
    if (from >= 0 && to >= 0 && from !== to) moveSub(t.id, from, to);
  };
  return (
    <Section
      title="Subtasks"
      count={`${sd}/${n}`}
      extra={
        n > 0 && <ProgressBar v={Math.round((sd / n) * 100)} className={cn('w-22.5 flex-none', sd === n && '[&_[data-slot=progress-indicator]]:bg-green')} />
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ screenReaderInstructions: SR_HELP }}>
        <SortableContext items={t.subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {t.subtasks.map((s, i) => (
            <SubRow key={s.id} t={t} s={s} i={i} />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex min-h-8 items-center gap-2.25 px-1.5 text-muted-foreground">
        <Plus className="size-3.75" />
        <input
          className="h-8 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Add subtask"
          aria-label="Add subtask"
          onKeyDown={e => {
            if (e.key !== 'Enter' || e.shiftKey) return;
            e.preventDefault();
            addSub(t.id, e.currentTarget.value);
            e.currentTarget.value = '';
          }}
        />
      </div>
    </Section>
  );
}

/* ---------- the detail view ---------- */
export function SubtaskView({ t, s }: { t: Task; s: Subtask }) {
  const i = t.subtasks.indexOf(s);
  const who = useStore(st => memberById(st.data, s.assignee));
  return (
    <div>
      <Button variant="ghost" size="sm" className="-mt-1 mb-3.5 -ml-1.75 max-w-full text-sm text-fg-2" onClick={closeSub}>
        <ArrowLeft />
        <span className="truncate">{t.title}</span>
      </Button>
      <div className="flex items-start gap-2.5">
        <Checkbox
          className="mt-2.25 rounded-full"
          checked={s.done}
          onCheckedChange={() => toggleSub(t.id, s.id)}
          aria-label={s.done ? 'Mark subtask not done' : 'Mark subtask done'}
        />
        <textarea
          key={s.id}
          autoFocus
          className={cn(
            '-mx-1.5 field-sizing-content w-full resize-none rounded-sm px-1.5 py-1 text-xl leading-[1.3] font-semibold tracking-[-0.018em] outline-none hover:bg-muted focus:bg-muted focus:ring-1 focus:ring-input',
            s.done && 'text-muted-foreground line-through',
          )}
          rows={1}
          aria-label="Subtask title"
          defaultValue={s.title}
          onBlur={e => {
            const v = e.currentTarget.value.trim();
            if (v && v !== s.title) updateSub(t.id, s.id, { title: v });
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      </div>
      <div className="mt-1 ml-6.5 text-xs text-muted-foreground">{`Subtask ${i + 1} of ${t.subtasks.length} · ${s.done ? 'Done' : 'Open'}`}</div>
      <dl className="mt-4 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-y-0.5 text-sm max-sm:grid-cols-[96px_minmax(0,1fr)]">
        <PropRow icon={User} label="Assignee">
          <AssigneePicker value={s.assignee ?? null} onChange={assignee => updateSub(t.id, s.id, { assignee })}>
            <button className={pill} data-empty={who ? undefined : ''} aria-label={`Subtask assignee: ${who?.name ?? 'Unassigned'}`}>
              <Avatar id={s.assignee} size="sm" tip={false} />
              <span>{who?.name ?? 'Unassigned'}</span>
            </button>
          </AssigneePicker>
        </PropRow>
        <PropRow icon={Calendar} label="Due date">
          <DatePicker value={s.due ?? null} onChange={due => updateSub(t.id, s.id, { due })}>
            <button className={pill} data-empty={s.due ? undefined : ''} aria-label="Subtask due date">
              <Calendar className="size-3.25" />
              <span className="tabular-nums">{s.due ? relDate(s.due) : 'Set date'}</span>
            </button>
          </DatePicker>
        </PropRow>
        <PropRow icon={Folder} label="Parent">
          <button className={pill} onClick={closeSub}>
            <span className="font-mono text-2xs text-muted-foreground">{t.key}</span>
            <span className="truncate">{t.title}</span>
          </button>
        </PropRow>
      </dl>
      <Section title="Notes" titleId="s-note-l">
        <Textarea
          key={s.id}
          rows={4}
          className="min-h-24"
          placeholder="Add details, links, or acceptance criteria…"
          aria-labelledby="s-note-l"
          defaultValue={s.note ?? ''}
          onChange={e => {
            const note = e.currentTarget.value;
            // Notes save on every keystroke without the offline guard.
            set(st => {
              const sb = taskById(st.data, t.id)?.subtasks.find(x => x.id === s.id);
              if (sb) sb.note = note;
            });
          }}
        />
      </Section>
      <div className="mt-6.5 flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => promoteSub(t.id, s.id)}>
          <ArrowUpRight />
          Convert to task
        </Button>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" disabled={i === 0} aria-label="Previous subtask" onClick={() => subNav(t, -1)}>
          <ChevronLeft />
          Previous
        </Button>
        <Button variant="ghost" size="sm" disabled={i === t.subtasks.length - 1} aria-label="Next subtask" onClick={() => subNav(t, 1)}>
          Next
          <ChevronRight />
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => rmSub(t.id, s.id)}>
          <Trash />
          Delete
        </Button>
      </div>
    </div>
  );
}
