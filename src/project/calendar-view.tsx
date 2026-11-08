/* The calendar: a month grid or a week of columns, tasks on their due date and project events.
   Tasks drag to another day with @dnd-kit (Space and the arrow keys from the keyboard). */
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { TaskContextMenu } from '../components/task-menu';
import { MONL, TODAY, WD, addD, diffD, fmtDate, iso, parse, startOfWeek } from '../domain/date';
import { taskId, type ProjectId } from '../domain/ids';
import type { CalEvent, Task } from '../domain/schema';
import { newTask, openTask, pColor, projectById, setUi, useStore, type ViewKey } from '../store';
import { Avatar, Dot, PriorityIcon, StatusIcon } from '../ui/helpers';
import { calNav, reschedule } from './actions';
import { justDragged, markDragEnd, stepKeys } from './dnd';
import { DayListPopover, EventPopover } from './menus';

type Item = { ev: CalEvent } | { t: Task };
const collide: CollisionDetection = args => (args.pointerCoordinates ? pointerWithin(args) : closestCenter(args));

/** One day cell per arrow key, measured from the cell under the dragged task. */
const dayKeys = stepKeys((code, r) => {
  const dx = r?.width ?? 0,
    dy = r?.height ?? 0;
  return code === 'ArrowRight'
    ? { dx, dy: 0 }
    : code === 'ArrowLeft'
      ? { dx: -dx, dy: 0 }
      : code === 'ArrowDown'
        ? { dx: 0, dy }
        : code === 'ArrowUp'
          ? { dx: 0, dy: -dy }
          : null;
});

function TaskChip({ t, week }: { t: Task; week: boolean }) {
  const p = useStore(s => projectById(s.data, t.project));
  const moved = useStore(s => s.ui.fx.moved === t.id);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: t.id });
  const done = t.status === 'done';
  const open = () => !justDragged() && openTask(t.id);
  const fx = moved && 'animate-in zoom-in-90 duration-200';
  return (
    <TaskContextMenu id={t.id}>
      {week ? (
        <button
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          aria-roledescription="draggable task"
          className={cn(
            'flex touch-manipulation flex-col gap-1.25 rounded-md border bg-card px-2 py-1.75 text-left text-sm transition-colors hover:border-input',
            isDragging && 'opacity-35',
            fx,
          )}
          style={{ '--c': pColor(p) }}
          onClick={open}
        >
          <span className={cn('flex items-baseline gap-1.75 leading-[1.3] font-medium', done && 'text-muted-foreground line-through')}>
            <Dot c={pColor(p)} className="-translate-y-px" />
            {t.title}
          </span>
          <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <StatusIcon st={t.status} className="size-2.75" />
            <PriorityIcon p={t.priority} className="size-2.75" />
            <span className="min-w-0 flex-1 truncate">{p?.name}</span>
            <Avatar id={t.assignee} size="sm" tip={false} />
          </span>
        </button>
      ) : (
        <button
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          aria-roledescription="draggable task"
          className={cn(
            'flex h-5.5 w-full min-w-0 touch-manipulation items-center gap-1.25 rounded-[5px] border border-(--c)/22 bg-(--c)/11 px-1.5 text-left text-xs text-foreground transition-colors hover:bg-(--c)/18',
            'max-sm:h-2 max-sm:rounded-[3px] max-sm:border-0 max-sm:bg-(--c) max-sm:p-0',
            done && 'opacity-55',
            isDragging && 'opacity-35',
            fx,
          )}
          style={{ '--c': pColor(p) }}
          title={t.title}
          onClick={open}
        >
          {done ? <StatusIcon st="done" className="size-2.75" /> : <PriorityIcon p={t.priority} className="size-2.75" />}
          <span className={cn('min-w-0 flex-1 truncate max-sm:hidden', done && 'line-through')}>{t.title}</span>
          <Avatar id={t.assignee} size="sm" tip={false} className="size-4 text-[7.5px] max-sm:hidden" />
        </button>
      )}
    </TaskContextMenu>
  );
}

function EventChip({ ev, week }: { ev: CalEvent; week: boolean }) {
  const p = useStore(s => projectById(s.data, ev.project));
  return (
    <EventPopover id={ev.id}>
      {week ? (
        <button
          className="flex flex-col gap-1.25 rounded-md border bg-(--c)/8 px-2 py-1.75 text-left text-sm transition-colors hover:border-input"
          style={{ '--c': pColor(p) }}
        >
          <span className="flex items-baseline gap-1.75 leading-[1.3] font-medium">
            <Dot c={pColor(p)} round className="-translate-y-px" />
            {ev.title}
          </span>
          <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <Clock className="size-2.75" />
            {`${ev.time} · ${p?.name ?? ''}`}
          </span>
        </button>
      ) : (
        <button
          className="flex h-5.5 w-full min-w-0 items-center gap-1.25 rounded-[5px] border border-dashed border-(--c)/45 px-1.5 text-left text-xs transition-colors hover:bg-(--c)/18 max-sm:h-2 max-sm:rounded-[3px] max-sm:p-0"
          style={{ '--c': pColor(p) }}
          title={`${ev.title} · ${ev.time}`}
        >
          <span className="text-2xs text-muted-foreground tabular-nums">{ev.time}</span>
          <span className="min-w-0 flex-1 truncate max-sm:hidden">{ev.title}</span>
        </button>
      )}
    </EventPopover>
  );
}

const chip = (it: Item, week: boolean) => ('ev' in it ? <EventChip key={it.ev.id} ev={it.ev} week={week} /> : <TaskChip key={it.t.id} t={it.t} week={week} />);

function MonthDay({ d, out, items, viewKey, project }: { d: Date; out: boolean; items: Item[]; viewKey: ViewKey; project?: ProjectId }) {
  const ds = iso(d);
  const today = diffD(d, TODAY) === 0;
  const { setNodeRef, isOver } = useDroppable({ id: ds });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group/day relative flex min-w-0 flex-col gap-0.75 border-r border-b border-divider p-1.5 transition-colors nth-[7n]:border-r-0',
        out && 'bg-sunken',
        isOver && 'bg-primary-soft',
      )}
      data-day={ds}
    >
      <span
        className={cn(
          'grid size-5.5 place-items-center rounded-full text-xs font-medium text-fg-2 tabular-nums',
          out && 'text-muted-foreground',
          today && 'bg-primary text-primary-foreground',
        )}
        aria-current={today ? 'date' : undefined}
      >
        {d.getDate()}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-1.25 right-1.25 opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100"
        onClick={() => newTask({ due: ds, ...(project ? { project } : {}) })}
        aria-label={`Add task on ${fmtDate(ds)}`}
      >
        <Plus />
      </Button>
      {items.slice(0, 3).map(it => chip(it, false))}
      {items.length > 3 && (
        <DayListPopover date={ds} viewKey={viewKey}>
          <button className="px-1.5 text-left text-2xs text-fg-2 hover:text-foreground">{`+${items.length - 3} more`}</button>
        </DayListPopover>
      )}
    </div>
  );
}

function WeekDay({ d, items, project }: { d: Date; items: Item[]; project?: ProjectId }) {
  const ds = iso(d);
  const today = diffD(d, TODAY) === 0;
  const { setNodeRef, isOver } = useDroppable({ id: ds });
  return (
    <div className="flex min-w-0 flex-col border-r border-divider last:border-r-0 max-sm:border-r-0 max-sm:border-b max-sm:border-b-border">
      <div className="flex items-baseline gap-1.5 border-b p-2.5">
        <span className={cn('text-xl font-semibold tracking-[-0.02em] tabular-nums', today && 'text-primary')} aria-current={today ? 'date' : undefined}>
          {d.getDate()}
        </span>
        <span className="text-xs text-fg-2">{WD[d.getDay()]}</span>
        <span className="flex-1" />
        <Button variant="ghost" size="icon-xs" onClick={() => newTask({ due: ds, ...(project ? { project } : {}) })} aria-label={`Add task on ${fmtDate(ds)}`}>
          <Plus />
        </Button>
      </div>
      <div ref={setNodeRef} className={cn('flex flex-1 flex-col gap-1.5 overflow-y-auto p-2 transition-colors', isOver && 'bg-primary-soft')} data-day={ds}>
        {items.length ? items.map(it => chip(it, true)) : <span className="p-1 text-xs text-muted-foreground">No tasks</span>}
      </div>
    </div>
  );
}

/** `tasks` are the view's; `events` adds the (project's) events. */
export function CalendarView({ tasks, viewKey, project, events = false }: { tasks: readonly Task[]; viewKey: ViewKey; project?: ProjectId; events?: boolean }) {
  const d = useStore(s => s.data);
  const calDate = useStore(s => s.ui.calDate);
  const mode = useStore(s => s.ui.calMode);
  const weekStart = useStore(s => s.prefs.weekStart);
  const [drag, setDrag] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, dayKeys),
  );
  const cur = parse(calDate);
  const evs = events ? d.events.filter(e => !project || e.project === project) : [];
  const itemsOn = (ds: string): Item[] => [...evs.filter(e => e.date === ds).map(ev => ({ ev })), ...tasks.filter(t => t.due === ds).map(t => ({ t }))];
  const wdn = Array.from({ length: 7 }, (_, i) => WD[(i + weekStart) % 7]);
  let label: string;
  let body;
  if (mode === 'month') {
    label = `${MONL[cur.getMonth()]} ${cur.getFullYear()}`;
    const start = startOfWeek(new Date(cur.getFullYear(), cur.getMonth(), 1), weekStart);
    const cells = Array.from({ length: 42 }, (_, i) => addD(start, i));
    const shown = cells[35]?.getMonth() !== cur.getMonth() ? cells.slice(0, 35) : cells;
    body = (
      <>
        <div className="grid grid-cols-7 border-b">
          {wdn.map(n => (
            <div key={n} className="px-2.5 py-2 text-xs font-medium text-muted-foreground">
              {n}
            </div>
          ))}
        </div>
        <div className="grid flex-1 auto-rows-[minmax(112px,1fr)] grid-cols-7 max-sm:auto-rows-[minmax(72px,1fr)]">
          {shown.map(x => (
            <MonthDay key={iso(x)} d={x} out={x.getMonth() !== cur.getMonth()} items={itemsOn(iso(x))} viewKey={viewKey} project={project} />
          ))}
        </div>
      </>
    );
  } else {
    const ws = startOfWeek(cur, weekStart);
    const days = Array.from({ length: 7 }, (_, i) => addD(ws, i));
    const first = days[0] ?? ws,
      last = days[6] ?? ws;
    label = `${fmtDate(iso(first))} – ${fmtDate(iso(last))}, ${last.getFullYear()}`;
    body = (
      <div className="grid min-h-0 flex-1 grid-cols-7 max-sm:grid-cols-1 max-sm:overflow-y-auto">
        {days.map(x => (
          <WeekDay key={iso(x)} d={x} items={itemsOn(iso(x)).sort((a, b) => ('ev' in a ? 0 : 1) - ('ev' in b ? 0 : 1))} project={project} />
        ))}
      </div>
    );
  }
  const projs = [...new Set(tasks.map(t => t.project))].flatMap(id => projectById(d, id) ?? []);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collide}
      onDragStart={e => {
        const t = tasks.find(x => x.id === taskId(String(e.active.id)));
        setDrag(t ?? null);
      }}
      onDragEnd={e => {
        setDrag(null);
        markDragEnd();
        if (e.over) reschedule(taskId(String(e.active.id)), String(e.over.id));
      }}
      onDragCancel={() => {
        setDrag(null);
        markDragEnd();
      }}
    >
      <div className="flex min-h-160 flex-1 flex-col">
        <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b px-(--gutter) py-2">
          <Button variant="outline" size="sm" onClick={() => calNav(0)}>
            Today
          </Button>
          <div className="flex">
            <Button variant="ghost" size="icon-sm" onClick={() => calNav(-1)} aria-label="Previous">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => calNav(1)} aria-label="Next">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h2 className="mx-1 text-[15px] font-semibold tracking-[-0.01em]" aria-live="polite">
            {label}
          </h2>
          <span className="flex-1" />
          {!project && projs.length > 1 && (
            <span className="mr-2 flex items-center gap-2.5 text-[11.5px] text-fg-2 max-sm:hidden">
              {projs.slice(0, 5).map(p => (
                <span key={p.id} className="flex items-center gap-1">
                  <Dot c={pColor(p)} />
                  {p.name}
                </span>
              ))}
            </span>
          )}
          <ToggleGroup
            spacing={0.5}
            value={[mode]}
            onValueChange={v => setUi('calMode', v[0] === 'week' ? 'week' : 'month')}
            aria-label="Calendar range"
            className="rounded-md bg-muted-strong p-0.5"
          >
            {(['month', 'week'] as const).map(k => (
              <ToggleGroupItem key={k} value={k} size="sm" className="h-6 min-w-0 px-2.25 text-xs data-pressed:bg-background data-pressed:shadow-xs">
                {k === 'month' ? 'Month' : 'Week'}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {body}
      </div>
      <DragOverlay dropAnimation={null}>
        {drag ? (
          <div
            className="flex h-5.5 w-40 items-center gap-1.25 rounded-[5px] border border-(--c)/22 bg-card px-1.5 text-xs shadow-drag"
            style={{ '--c': pColor(projectById(d, drag.project)) }}
          >
            <PriorityIcon p={drag.priority} className="size-2.75" />
            <span className="truncate">{drag.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
