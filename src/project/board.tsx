/* The board: one column per status, cards in manual order, drag and drop with @dnd-kit.
   While a card is dragged, `drag.cols` holds the live arrangement so it can cross columns; the drop ranks it once (placeCard). */
import { useRef, useState } from 'react';
import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ellipsis, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, reducedMotion } from '@/lib/utils';
import { ST, STATUSES, type Status } from '../domain/constants';
import { taskId, type ProjectId, type TaskId } from '../domain/ids';
import type { Task } from '../domain/schema';
import { cancelComposer, commitComposer, taskById, useStore, type ViewKey } from '../store';
import { StatusIcon, Tip } from '../ui/helpers';
import { addToCol, expandCol, isStatus, placeCard } from './actions';
import { KanbanCard } from './kanban-card';
import { ColumnMenu } from './menus';

type Cols = Record<Status, TaskId[]>;
const COL = 'col:';
const colOf = (cols: Cols, id: UniqueIdentifier): Status | null => {
  const s = String(id);
  if (s.startsWith(COL)) {
    const st = s.slice(COL.length);
    return isStatus(st) ? st : null;
  }
  return STATUSES.find(x => cols[x.id].includes(taskId(s)))?.id ?? null;
};
function arrange(ts: readonly Task[]): Cols {
  const by = (st: Status) =>
    ts
      .filter(t => t.status === st)
      .sort((a, b) => a.order - b.order)
      .map(t => t.id);
  return { backlog: by('backlog'), todo: by('todo'), progress: by('progress'), review: by('review'), done: by('done') };
}

function SortableCard({ t, showProj }: { t: Task; showProj: boolean }) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id: t.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} {...listeners}>
      <KanbanCard
        t={t}
        showProj={showProj}
        placeholder={isDragging}
        handle={
          <Button
            ref={setActivatorNodeRef}
            {...attributes}
            variant="ghost"
            size="icon-xs"
            className="cursor-grab"
            aria-label={`Move ${t.title}`}
            aria-roledescription="draggable card"
          >
            <GripVertical />
          </Button>
        }
      />
    </div>
  );
}

function BoardComposer() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const commit = () => {
    const el = ref.current;
    if (!el) return;
    commitComposer(el.value);
    el.value = '';
    el.focus();
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary-line bg-card px-2.5 py-2 ring-3 ring-primary-soft">
      <textarea
        ref={ref}
        id="composer-in"
        className="min-h-9.5 resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground"
        placeholder="Task name"
        rows={2}
        aria-label="New task name"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.preventDefault();
            cancelComposer();
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
      />
      <div className="flex items-center gap-1">
        <span className="flex-1 text-2xs text-muted-foreground">Enter to add · Esc to cancel</span>
        <Button variant="ghost" size="sm" onClick={cancelComposer}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Add
        </Button>
      </div>
    </div>
  );
}

function Column({
  st,
  ids,
  tasks,
  viewKey,
  showProj,
}: {
  st: Status;
  ids: readonly TaskId[];
  tasks: ReadonlyMap<TaskId, Task>;
  viewKey: ViewKey;
  showProj: boolean;
}) {
  const collapsed = useStore(s => !!s.ui.collapsedCols[`${viewKey}:${st}`]);
  const comp = useStore(s => s.ui.composer?.ctx === viewKey && s.ui.composer.group === st);
  const { setNodeRef, isOver } = useDroppable({ id: COL + st });
  const name = ST[st].name;
  const over = isOver && 'border-primary-line bg-primary-soft';
  if (collapsed)
    return (
      <button
        ref={setNodeRef}
        className={cn('flex w-11 shrink-0 flex-col items-center rounded-xl border border-divider bg-sunken pt-2 pb-3 transition-colors hover:bg-muted', over)}
        onClick={() => expandCol(viewKey, st)}
        aria-label={`Expand ${name}`}
        title="Expand"
      >
        <StatusIcon st={st} />
        <span className="mt-2 flex items-center gap-2 text-sm font-medium text-fg-2 [writing-mode:vertical-rl]">
          {name}
          <span className="text-muted-foreground">{ids.length}</span>
        </span>
      </button>
    );
  return (
    <section
      ref={setNodeRef}
      className={cn('group/col flex max-h-full w-71 shrink-0 flex-col rounded-xl border border-divider bg-sunken transition-colors', over)}
      aria-label={name}
    >
      <div className="flex items-center gap-1.75 pt-2.5 pr-2 pb-1.5 pl-3 text-sm font-semibold">
        <StatusIcon st={st} />
        <span>{name}</span>
        <span className="font-medium text-muted-foreground">{ids.length}</span>
        <span className="ml-auto flex opacity-55 transition-opacity group-hover/col:opacity-100 has-focus-visible:opacity-100 has-aria-expanded:opacity-100">
          <Tip label="Add task">
            <Button variant="ghost" size="icon-xs" onClick={() => addToCol(viewKey, st)} aria-label={`Add task to ${name}`}>
              <Plus />
            </Button>
          </Tip>
          <ColumnMenu status={st} viewKey={viewKey}>
            <Button variant="ghost" size="icon-xs" aria-label={`${name} column options`}>
              <Ellipsis />
            </Button>
          </ColumnMenu>
        </span>
      </div>
      <div className="flex min-h-15 flex-1 [scrollbar-width:none] flex-col gap-1.5 overflow-y-auto px-2 pt-1 pb-2">
        <SortableContext id={st} items={[...ids]} strategy={verticalListSortingStrategy}>
          {ids.map(id => {
            const t = tasks.get(id);
            return t && <SortableCard key={id} t={t} showProj={showProj} />;
          })}
        </SortableContext>
        {comp ? (
          <BoardComposer />
        ) : (
          <button
            className="flex h-7.5 w-full shrink-0 items-center gap-1.5 rounded-md px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted-strong hover:text-foreground"
            onClick={() => addToCol(viewKey, st)}
          >
            <Plus className="size-3.5" />
            Add task
          </button>
        )}
      </div>
    </section>
  );
}

/** `tasks` are the view's (already filtered); each column keeps manual order. */
// Release phase: the card leaves the finger and lands in its slot quickly on Cairn's strong ease-out (dnd-kit's default is a
// slower 250ms "ease"), with the original hidden while it lands, as by default.
const DROP = {
  duration: 200,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } }),
};

export function Board({ tasks, viewKey, project }: { tasks: readonly Task[]; viewKey: ViewKey; project?: ProjectId }) {
  const [drag, setDrag] = useState<{ id: TaskId; cols: Cols } | null>(null);
  const cols = drag?.cols ?? arrange(tasks);
  const byId = new Map(tasks.map(t => [t.id, t]));
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const title = (id: UniqueIdentifier) => byId.get(taskId(String(id)))?.title ?? 'card';
  const colName = (id: UniqueIdentifier | undefined) => {
    const c = id == null ? null : colOf(cols, id);
    return c ? ST[c].name : 'no column';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
    onDragOver: ({ active, over }) => `${title(active.id)} is over ${colName(over?.id)}.`,
    onDragEnd: ({ active, over }) => (over ? `Dropped ${title(active.id)} in ${colName(over.id)}.` : `${title(active.id)} returned.`),
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const r = active.rect.current.translated;
    const below = !!r && r.top > over.rect.top + over.rect.height / 2;
    setDrag(d => {
      if (!d) return d;
      const from = colOf(d.cols, active.id),
        to = colOf(d.cols, over.id);
      if (!from || !to || from === to) return d;
      const target = d.cols[to];
      const oi = target.indexOf(taskId(String(over.id)));
      const at = oi < 0 ? target.length : oi + (below ? 1 : 0);
      return { id: d.id, cols: { ...d.cols, [from]: d.cols[from].filter(x => x !== d.id), [to]: [...target.slice(0, at), d.id, ...target.slice(at)] } };
    });
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const d = drag;
    setDrag(null);
    if (!d || !over) return;
    const col = colOf(d.cols, over.id) ?? colOf(d.cols, active.id);
    if (!col) return;
    let list = d.cols[col];
    const ai = list.indexOf(d.id),
      oi = list.indexOf(taskId(String(over.id)));
    if (ai >= 0 && oi >= 0 && ai !== oi) list = arrayMove(list, ai, oi);
    const at = list.indexOf(d.id);
    placeCard(d.id, col, at < 0 ? null : (list[at + 1] ?? null));
  };
  const active = drag ? byId.get(drag.id) : undefined;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: 'Press space to pick up a card. Use the arrow keys to move it, space to drop, escape to cancel.' },
      }}
      onDragStart={({ active: a }) => {
        const id = taskId(String(a.id));
        if (taskById(useStore.getState().data, id)) setDrag({ id, cols: arrange(tasks) });
      }}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto px-(--gutter) pt-3.5 pb-6 after:shrink-0 after:basis-2 after:content-[''] max-md:pb-22">
        {STATUSES.map(s => (
          <Column key={s.id} st={s.id} ids={cols[s.id]} tasks={byId} viewKey={viewKey} showProj={!project} />
        ))}
      </div>
      <DragOverlay dropAnimation={reducedMotion() ? null : DROP}>
        {active ? (
          // dnd-kit measures an overlay's only child; this wrapper keeps the tilt out of that rect, so keyboard moves stay aligned.
          <div>
            <KanbanCard t={active} showProj={!project} ghost />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
