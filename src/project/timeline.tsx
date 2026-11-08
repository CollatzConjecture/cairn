/* The timeline: task bars on a day grid with dependencies and milestones, grouped like a list. Bars move
   and their ends resize with @dnd-kit, by whole days; Space and the arrow keys do the same from the keyboard. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, useDraggable, useSensor, useSensors, type DragMoveEvent } from '@dnd-kit/core';
import { ChartGantt, Crosshair, Diamond, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { TaskContextMenu } from '../components/task-menu';
import { groupTasks } from '../components/view-engine';
import { MON, MONL, TODAY, addD, diffD, fmtDate, iso, parse, startOfWeek } from '../domain/date';
import { taskId } from '../domain/ids';
import type { Project, Task } from '../domain/schema';
import {
  allTasks,
  applyView,
  canSee,
  newTask,
  openTask,
  pColor,
  projectById,
  set,
  setUi,
  taskById,
  taskProg,
  useStore,
  useView,
  visibleProjects,
  type Ui,
  type ViewKey,
} from '../store';
import { Avatar, Empty, StatusIcon, Tip } from '../ui/helpers';
import { shiftTask, type BarEdge } from './actions';
import { justDragged, markDragEnd, stepKeys } from './dnd';
import { ViewToolbar } from './view-toolbar';

const RH = 36;
const SCROLLER = 'tl-right';
const GROUP_ITEMS: { value: Ui['tlGroup']; label: string }[] = [
  { value: 'status', label: 'Group: Status' },
  { value: 'assignee', label: 'Group: Assignee' },
  { value: 'project', label: 'Group: Project' },
  { value: 'none', label: 'No grouping' },
];
const isGroup = (v: unknown): v is Ui['tlGroup'] => GROUP_ITEMS.some(o => o.value === v);
const seg = 'h-6 min-w-0 px-2.25 text-xs data-pressed:bg-background data-pressed:shadow-xs';

/** Zoom, grouping, and a jump back to today. */
export function TimelineControls() {
  const zoom = useStore(s => s.ui.tlZoom);
  const group = useStore(s => s.ui.tlGroup);
  return (
    <>
      <ToggleGroup
        spacing={0.5}
        value={[zoom]}
        onValueChange={v => setUi('tlZoom', v[0] === 'month' ? 'month' : 'week')}
        aria-label="Zoom"
        className="ml-1 rounded-md bg-muted-strong p-0.5"
      >
        <ToggleGroupItem value="week" size="sm" className={seg}>
          Weeks
        </ToggleGroupItem>
        <ToggleGroupItem value="month" size="sm" className={seg}>
          Months
        </ToggleGroupItem>
      </ToggleGroup>
      <Select
        items={GROUP_ITEMS}
        value={group}
        onValueChange={v =>
          isGroup(v) &&
          set(s => {
            s.ui.tlGroup = v;
          })
        }
      >
        <SelectTrigger size="sm" className="ml-1 h-6.5 text-xs" aria-label="Group by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GROUP_ITEMS.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        className="h-6.5 gap-1.5 px-2 text-xs"
        onClick={() => {
          const r = document.getElementById(SCROLLER);
          r?.scrollTo({ left: Math.max(0, Number(r.dataset.today) - 160), behavior: 'smooth' });
        }}
      >
        <Crosshair className="size-3.5" />
        Today
      </Button>
    </>
  );
}

type Milestone = { name: string; date: string; p?: Project };
type Row = { type: 'ms' } | { type: 'g'; name: string; icon?: ReactNode; n: number } | { type: 't'; t: Task };
type Live = { id: string; edge: BarEdge; days: number };

/** The days a bar spans: from its start (or its due date when the start is missing or later) to its due date. */
function span(t: Task, live: Live | null) {
  const due = parse(t.due ?? iso(TODAY));
  let s = parse(t.start && t.due && t.start <= t.due ? t.start : (t.due ?? iso(TODAY)));
  let e = due;
  if (live && live.id === t.id) {
    if (live.edge !== 'end') s = addD(s, live.edge === 'start' ? Math.min(live.days, diffD(e, s)) : live.days);
    if (live.edge !== 'start') e = addD(e, live.edge === 'end' ? Math.max(live.days, -diffD(e, s)) : live.days);
  }
  return { s, e };
}

function Handle({ t, edge, label }: { t: Task; edge: 'start' | 'end'; label: string }) {
  const { setNodeRef, listeners, attributes } = useDraggable({ id: `${edge}:${t.id}` });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="resize handle"
      aria-label={`${label}: ${fmtDate(edge === 'end' ? t.due : (t.start ?? t.due))}`}
      className={cn(
        'absolute inset-y-0 z-10 w-1.5 cursor-ew-resize rounded-[3px] outline-none group-hover/bar:bg-(--c)/45 focus-visible:bg-(--c)',
        edge === 'start' ? 'left-0' : 'right-0',
      )}
    />
  );
}

function Bar({ t, x, y, w, c, dragging }: { t: Task; x: number; y: number; w: number; c: string; dragging: boolean }) {
  const { setNodeRef, listeners, attributes } = useDraggable({ id: `move:${t.id}` });
  const inside = w > 110;
  const s = t.start && t.due && t.start <= t.due ? t.start : t.due;
  return (
    <>
      <div className="group/bar absolute z-3 h-6" style={{ left: x, top: y + 7, width: w, '--c': c }}>
        <TaskContextMenu id={t.id}>
          <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            aria-roledescription="draggable bar"
            aria-label={t.title}
            title={`${t.title} · ${fmtDate(s)} → ${fmtDate(t.due)}`}
            className={cn(
              'absolute inset-0 isolate flex cursor-grab items-center gap-1.5 overflow-hidden rounded-md border border-(--c)/45 bg-background px-2 before:absolute before:inset-0 before:-z-20 before:bg-(--c)/16 text-sm whitespace-nowrap text-foreground transition-[border-color,box-shadow] select-none hover:border-(--c)',
              t.status === 'done' && 'opacity-60',
              dragging && 'cursor-grabbing shadow-drag',
            )}
            onClick={() => !justDragged() && openTask(t.id)}
          >
            <span className="absolute inset-y-0 left-0 -z-10 bg-(--c)/26" style={{ width: `${taskProg(t)}%` }} />
            {inside && (
              <>
                <Avatar id={t.assignee} size="sm" tip={false} />
                <span className="truncate">{t.title}</span>
              </>
            )}
          </button>
        </TaskContextMenu>
        <Handle t={t} edge="start" label={`Start of ${t.title}`} />
        <Handle t={t} edge="end" label={`Due date of ${t.title}`} />
      </div>
      {!inside && (
        <div className="pointer-events-none absolute z-3 text-xs whitespace-nowrap text-fg-2" style={{ left: x + w + 8, top: y + 10 }}>
          {t.title}
        </div>
      )}
    </>
  );
}

/** One diamond per date (same-day milestones merge); each label may use the room up to the next diamond. */
function MilestoneLane({ ms, X, dw, y }: { ms: readonly Milestone[]; X: (ds: string) => number; dw: number; y: number }) {
  const byDate = new Map<string, Milestone[]>();
  for (const m of ms) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m]);
  const pts = [...byDate].sort(([a], [b]) => (a > b ? 1 : -1)).map(([date, list]) => ({ date, list, x: X(date) + dw / 2 }));
  return pts.map((pt, i) => {
    const room = (pts[i + 1]?.x ?? Infinity) - pt.x - 24;
    const first = pt.list[0];
    if (!first) return null;
    const name = first.name + (pt.list.length > 1 ? ` +${pt.list.length - 1}` : '');
    const tip = pt.list.map(m => m.name + (m.p ? ` (${m.p.name})` : '')).join(' · ') + ' · ' + fmtDate(pt.date);
    return (
      <Tip key={pt.date} label={tip}>
        <span
          className="absolute z-3 flex h-4.5 items-center gap-2 outline-none hover:z-6"
          style={{ left: pt.x - 6, top: y + 9 }}
          tabIndex={0}
          aria-label={`Milestone: ${tip}`}
        >
          <span
            className={cn('size-3 shrink-0 rotate-45 rounded-[2px]', first.p ? 'bg-(--c)' : 'bg-foreground')}
            style={first.p ? { '--c': pColor(first.p) } : undefined}
          />
          {room >= 28 && (
            <span className="min-w-0 truncate text-xs font-medium" style={{ maxWidth: Number.isFinite(room) ? Math.round(room) : undefined }}>
              {name}
            </span>
          )}
        </span>
      </Tip>
    );
  });
}

const initialized = new Set<string>();

/** `tasks` are the view's; only tasks with a due date get a bar. */
export function TimelineView({ tasks, viewKey, project }: { tasks: readonly Task[]; viewKey: ViewKey; project?: Project }) {
  const d = useStore(s => s.data);
  const zoom = useStore(s => s.ui.tlZoom);
  const g = useStore(s => s.ui.tlGroup);
  const weekStart = useStore(s => s.prefs.weekStart);
  const [live, setLive] = useState<Live | null>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const week = zoom === 'week';
  const dw = week ? 32 : 11;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(
      KeyboardSensor,
      stepKeys(code => (code === 'ArrowRight' ? { dx: dw, dy: 0 } : code === 'ArrowLeft' ? { dx: -dw, dy: 0 } : null)),
    ),
  );
  const rs = startOfWeek(addD(TODAY, week ? -21 : -56), weekStart);
  const nDays = week ? 7 * 13 : 7 * 34;
  const X = (ds: string) => diffD(parse(ds), rs) * dw;
  const todayX = diffD(TODAY, rs) * dw;
  const scrollKey = `${viewKey}:${zoom}`;
  useEffect(() => {
    const r = right.current;
    if (!r || initialized.has(scrollKey)) return;
    initialized.add(scrollKey);
    r.scrollLeft = Math.max(0, todayX - 160);
  }, [scrollKey, todayX]);

  const groups = groupTasks(
    d,
    tasks.filter(t => t.due),
    g === 'project' && project ? 'status' : g,
  ).filter(G => G.tasks.length);
  const ms: Milestone[] = project
    ? project.milestones
    : visibleProjects(d)
        .filter(q => canSee(d, q))
        .flatMap(q => q.milestones.map(m => ({ ...m, p: q })));
  const rows: Row[] = [];
  if (ms.length) rows.push({ type: 'ms' });
  for (const G of groups) {
    if (g !== 'none') rows.push({ type: 'g', name: G.name, icon: G.icon, n: G.tasks.length });
    for (const t of [...G.tasks].sort((a, b) => ((a.start || a.due || '') > (b.start || b.due || '') ? 1 : -1))) rows.push({ type: 't', t });
  }
  if (!rows.length)
    return (
      <Empty icon={ChartGantt} title="Nothing on the timeline" text="Give tasks a start and due date to see them here.">
        <Button size="sm" onClick={() => newTask(project ? { project: project.id } : {})}>
          <Plus />
          New task
        </Button>
      </Empty>
    );
  const H = rows.length * RH;
  const W = nDays * dw;
  const rowY = new Map<string, number>();
  rows.forEach((r, i) => r.type === 't' && rowY.set(r.t.id, i * RH + RH / 2));
  const months: { d: Date; n: number }[] = [];
  for (let i = 0; i < nDays; i++) {
    const day = addD(rs, i);
    const lastM = months.at(-1);
    if (lastM && lastM.d.getMonth() === day.getMonth()) lastM.n++;
    else months.push({ d: day, n: 1 });
  }
  const barGeom = (t: Task) => {
    const { s, e } = span(t, live);
    return { x: diffD(s, rs) * dw, w: Math.max(dw, (diffD(e, s) + 1) * dw) };
  };
  const deps = tasks.flatMap(t =>
    t.deps.flatMap(dep => {
      const a = taskById(d, dep);
      const y1 = rowY.get(dep),
        y2 = rowY.get(t.id);
      if (!a?.due || y1 == null || y2 == null) return [];
      const ga = barGeom(a),
        gt = barGeom(t);
      const x1 = ga.x + ga.w,
        x2 = gt.x;
      const mx = Math.max(x1 + 10, x2 - 10);
      return [
        <g key={`${dep}-${t.id}`} fill="none" stroke="var(--muted-foreground)" strokeWidth="1.3">
          <path d={`M${x1} ${y1} C ${mx} ${y1}, ${Math.min(x1 + 10, x2 - 10)} ${y2}, ${x2 - 1} ${y2}`} strokeDasharray={x2 < x1 ? '3 3' : undefined} />
          <path d={`M${x2 - 6} ${y2 - 3.5} L${x2 - 1} ${y2} L${x2 - 6} ${y2 + 3.5}`} strokeLinecap="round" strokeLinejoin="round" />
        </g>,
      ];
    }),
  );
  const liveOf = (e: DragMoveEvent): Live | null => {
    const [edge, id] = String(e.active.id).split(':');
    if ((edge !== 'move' && edge !== 'start' && edge !== 'end') || !id) return null;
    return { id, edge, days: Math.round(e.delta.x / dw) };
  };
  const rowCls = 'flex h-9 items-center gap-2 border-b border-divider pr-3 pl-(--gutter) text-sm whitespace-nowrap';
  const grpCls = cn(rowCls, 'bg-sunken text-xs font-semibold text-fg-2');
  return (
    <DndContext
      sensors={sensors}
      onDragMove={e => setLive(liveOf(e))}
      onDragEnd={e => {
        const l = liveOf(e);
        setLive(null);
        markDragEnd();
        if (l?.days) shiftTask(taskId(l.id), l.edge, l.days);
      }}
      onDragCancel={() => {
        setLive(null);
        markDragEnd();
      }}
    >
      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] overflow-hidden max-md:grid-cols-[170px_minmax(0,1fr)] max-sm:grid-cols-1">
        <div className="flex flex-col overflow-hidden border-r max-sm:hidden">
          <div className="sticky top-0 z-4 flex h-13 shrink-0 items-end border-b bg-background pr-3 pb-2 pl-(--gutter) text-xs font-medium text-muted-foreground">
            Task
          </div>
          <div className="overflow-hidden" ref={left}>
            {rows.map((r, i) =>
              r.type === 'ms' ? (
                <div key="ms" className={grpCls}>
                  <Diamond className="size-3" />
                  Milestones
                  <span className="font-medium text-muted-foreground">{ms.length}</span>
                </div>
              ) : r.type === 'g' ? (
                <div key={`g${i}`} className={grpCls}>
                  {r.icon}
                  {r.name}
                  <span className="font-medium text-muted-foreground">{r.n}</span>
                </div>
              ) : (
                <div key={r.t.id} className={cn(rowCls, 'relative transition-colors hover:bg-muted')}>
                  <StatusIcon st={r.t.status} className="size-3.25" />
                  <button
                    className={cn(
                      'min-w-0 flex-1 truncate text-left outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring',
                      r.t.status === 'done' && 'text-muted-foreground',
                    )}
                    onClick={() => openTask(r.t.id)}
                  >
                    {r.t.title}
                  </button>
                  {r.t.subtasks.length > 0 && (
                    <span className="text-2xs text-muted-foreground tabular-nums">{`${r.t.subtasks.filter(x => x.done).length}/${r.t.subtasks.length}`}</span>
                  )}
                  <Avatar id={r.t.assignee} size="sm" />
                </div>
              ),
            )}
            <div className="h-10" />
          </div>
        </div>
        <div
          className="relative overflow-auto"
          id={SCROLLER}
          ref={right}
          data-today={todayX}
          onScroll={e => {
            if (left.current) left.current.scrollTop = e.currentTarget.scrollTop;
          }}
        >
          <div className="sticky top-0 z-4 h-13 border-b bg-background" style={{ width: W }}>
            <div className="absolute top-0 left-0 flex h-6.5">
              {months.map(m => (
                <div key={iso(m.d)} className="border-l py-1.25 text-xs font-semibold whitespace-nowrap" style={{ width: m.n * dw }}>
                  <span className="sticky left-2 px-2">{`${MONL[m.d.getMonth()]} ${m.d.getFullYear()}`}</span>
                </div>
              ))}
            </div>
            <div className="absolute top-6.5 left-0 flex h-6.5 border-t border-divider">
              {week
                ? Array.from({ length: nDays }, (_, i) => {
                    const day = addD(rs, i);
                    const today = diffD(day, TODAY) === 0;
                    return (
                      <div
                        key={i}
                        className={cn(
                          'grid place-items-center border-l border-divider text-2xs text-muted-foreground tabular-nums',
                          today && 'font-semibold text-primary',
                        )}
                        style={{ width: dw }}
                      >
                        {day.getDate()}
                      </div>
                    );
                  })
                : Array.from({ length: nDays / 7 }, (_, i) => {
                    const day = addD(rs, i * 7);
                    return (
                      <div key={i} className="grid place-items-center border-l border-divider text-2xs text-muted-foreground" style={{ width: dw * 7 }}>
                        {`${MON[day.getMonth()]} ${day.getDate()}`}
                      </div>
                    );
                  })}
            </div>
          </div>
          <div className="relative" style={{ width: W, height: H + 40 }} role="group" aria-label="Timeline">
            {week &&
              Array.from({ length: nDays }, (_, i) => {
                const wd = addD(rs, i).getDay();
                return wd === 0 || wd === 6 ? <div key={i} className="absolute inset-y-0 bg-sunken" style={{ left: i * dw, width: dw }} /> : null;
              })}
            {Array.from({ length: nDays / 7 }, (_, i) => (
              <div key={i} className="absolute inset-y-0 w-px bg-divider" style={{ left: i * 7 * dw }} />
            ))}
            <div className="absolute inset-y-0 z-2 w-0.5 bg-primary opacity-70" style={{ left: todayX + dw / 2 }} title="Today" />
            {rows.map((r, i) => {
              const y = i * RH;
              if (r.type === 'g') return <div key={`g${i}`} className="absolute inset-x-0 h-9 border-b border-divider bg-sunken/70" style={{ top: y }} />;
              if (r.type === 'ms')
                return (
                  <div key="ms">
                    <div className="absolute inset-x-0 h-9 border-b border-divider" style={{ top: y }} />
                    <MilestoneLane ms={ms} X={X} dw={dw} y={y} />
                  </div>
                );
              const t = r.t;
              const { x, w } = barGeom(t);
              const c = g === 'status' || g === 'none' ? pColor(projectById(d, t.project)) : `var(--st-${t.status})`;
              return (
                <div key={t.id}>
                  <div className="absolute inset-x-0 h-9 border-b border-divider" style={{ top: y }} />
                  <Bar t={t} x={x} y={y} w={w} c={c} dragging={live?.id === t.id} />
                </div>
              );
            })}
            <svg className="pointer-events-none absolute top-0 left-0 z-2 overflow-visible" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              {deps}
            </svg>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

let wsGrouped = false;

/** The workspace Timeline page: every visible task, grouped by project the first time it opens. */
export function TimelinePage() {
  const d = useStore(s => s.data);
  const v = useView('tl');
  useEffect(() => {
    if (wsGrouped) return;
    wsGrouped = true;
    set(s => {
      s.ui.tlGroup = 'project';
    });
  }, []);
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-start gap-3 px-(--gutter) pt-6 pb-3">
        <div>
          <h1 className="text-2xl leading-[1.2] font-semibold tracking-[-0.022em] max-sm:text-xl">Timeline</h1>
          <p className="mt-1 text-fg-2">Schedules, dependencies, and milestones across projects.</p>
        </div>
      </div>
      <ViewToolbar viewKey="tl" group={false} extra={<TimelineControls />} />
      <TimelineView tasks={applyView(d, allTasks(d), v)} viewKey="tl" />
    </div>
  );
}
